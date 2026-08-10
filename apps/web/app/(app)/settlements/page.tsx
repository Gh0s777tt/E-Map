"use client";

import {
  listFuelLogs,
  listFxRates,
  listRates,
  listTripEvents,
  type Rate,
  saveDefaultRate,
  toFxRates,
} from "@e-logistic/api";
import {
  buildSettlement,
  effectiveModules,
  type FxRate,
  pickRate,
  round2,
  rowAmountEur,
  type Settlement,
} from "@e-logistic/core";
import type { MessageKey } from "@e-logistic/i18n";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import * as f from "@/components/formStyles";
import { useT } from "@/components/LocaleProvider";
import { useToast } from "@/components/Toast";
import { Button, PageHeader, SetupNotice } from "@/components/ui";
import { downloadCsv } from "@/lib/csv";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";
import styles from "./settlements.module.css";

type FuelRow = {
  odometer_km: number;
  liters: number;
  is_full: boolean | null;
  price_total: number | null;
  /**
   * [#389] Kolumna była w wyniku zapytania od zawsze (`select("*")`) i ANI RAZU
   * nieodczytana — kwoty szły do rachunku takie, jakie były, a wynik podpisywano
   * znakiem €. Tankowanie za 430 PLN dokładało do rachunku „430 €", czyli około
   * czterokrotność tego, co kierowca faktycznie zapłacił.
   */
  currency: string | null;
  created_at: string;
  occurred_at: string;
  station_country: string | null;
  station_city: string | null;
  station_loc: string | null;
};
type TripRow = {
  action: string;
  amount: number | null;
  /** [#389] Jak w `FuelRow` — opłaty drogowe też bywają w walucie lokalnej. */
  currency: string | null;
  odometer_km: number | null;
  country: string | null;
  location: string | null;
  created_at: string;
  occurred_at: string;
  comment: string | null;
};

const TRIP_LABEL: Record<string, MessageKey> = {
  load: "settlements.trip.load",
  unload: "settlements.trip.unload",
  start: "settlements.trip.start",
  end: "settlements.trip.end",
  service: "settlements.trip.service",
  other: "settlements.trip.other",
};

function firstOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function SettlementsPage() {
  const t = useT();
  const { vehicles, source } = useFleet();
  const toast = useToast();
  const [vehicleId, setVehicleId] = useState("");
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [ratePerKm, setRatePerKm] = useState("");
  const [tollCost, setTollCost] = useState("");
  const [fuel, setFuel] = useState<FuelRow[]>([]);
  const [adblue, setAdblue] = useState<FuelRow[]>([]);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  /**
   * [#389] Kursy EBC. Nazwa `fxRates`, a nie `rates`, świadomie: `rates` jest
   * w tym pliku zajęte przez stawki €/km firmy i pomylenie tych dwóch rzeczy
   * dałoby liczbę wyglądającą sensownie i całkowicie nieprawdziwą.
   */
  const [fxRates, setFxRates] = useState<FxRate[]>([]);
  /** Ile pozycji MA kwotę, ale nie dało się jej wycenić (brak notowania na ten dzień). */
  const [missingRate, setMissingRate] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [rates, setRates] = useState<Rate[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  const tripLabel = (a: string): string => {
    const key = TRIP_LABEL[a];
    return key ? t(key) : a;
  };

  // Strażnik modułu + wczytanie stawek (domyślne €/km per pojazd) + rola.
  useEffect(() => {
    const sb = getBrowserSupabase();
    getCachedMembership(sb)
      .then(async (m) => {
        if (!m) return;
        setDenied(!effectiveModules(m.role, m.modules).includes("settlements"));
        setIsOwner(m.role === "owner");
        try {
          setRates(await listRates(sb, m.companyId));
        } catch {
          // brak firmy/sesji — pomijamy podpowiedź stawki
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!vehicleId && vehicles[0]) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);

  // Auto-podpowiedź stawki €/km z zapisanej domyślnej stawki pojazdu.
  // Nie czyści pola, gdy brak domyślnej (nie nadpisuje ręcznego wpisu na ślepo).
  useEffect(() => {
    if (!vehicleId) return;
    const r = pickRate(rates, vehicleId);
    if (r != null) setRatePerKm(String(r));
  }, [vehicleId, rates]);

  async function saveRate() {
    if (!vehicleId) return;
    const val = Number(ratePerKm);
    if (!Number.isFinite(val) || val < 0) {
      toast(t("settlements.invalidRate"), "error");
      return;
    }
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) return;
      await saveDefaultRate(sb, { companyId: m.companyId, vehicleId, ratePerKm: val });
      setRates(await listRates(sb, m.companyId));
      toast(
        `${t("settlements.rateSavedPrefix")} ${val} €/km ${t("settlements.rateSavedFor")} ${regOf(vehicleId)}.`,
        "success",
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : t("settlements.rateSaveError"), "error");
    }
  }

  const regOf = useCallback(
    (id: string) => vehicles.find((v) => v.id === id)?.registration ?? id.slice(0, 8),
    [vehicles],
  );

  async function load() {
    if (!vehicleId) return;
    setBusy(true);
    setLoadErr(null);
    try {
      const sb = getBrowserSupabase();
      // Zakres dat filtrowany po stronie bazy (mniej danych w transferze) — `to` do końca dnia.
      const toEnd = `${to}T23:59:59.999Z`;
      const range = { from, to: toEnd };
      const [f, a, tripEv, fxRows] = await Promise.all([
        listFuelLogs(sb, { vehicleId, ...range }),
        listFuelLogs(sb, { vehicleId, table: "adblue_logs", ...range }),
        listTripEvents(sb, { vehicleId, ...range }),
        // Zapas 10 dni wstecz: kurs bierzemy z dnia zdarzenia, a EBC nie publikuje
        // w weekendy i święta — ten sam wzorzec co w /stats, /monthly i /wyjazdy.
        listFxRates(sb, {
          from: new Date(Date.parse(from) - 10 * 86_400_000).toISOString().slice(0, 10),
        }),
      ]);
      const fx = toFxRates(fxRows);
      setFxRates(fx);
      // Zakres dat już zastosowany w zapytaniu (gte/lte na occurred_at) — bez ponownego filtra w JS.
      const fFilt = f as FuelRow[];
      const aFilt = a as FuelRow[];
      const tFilt = tripEv as TripRow[];
      setFuel(fFilt);
      setAdblue(aFilt);
      setTrips(tFilt);
      /*
       * [#389] Kwoty przeliczane na euro kursem Z DNIA ZDARZENIA, a nie wrzucane
       * do sumy takie, jakie były.
       *
       * Do tej pory rachunek wyjazdu dodawał 430 PLN i 100 EUR jak dwie liczby
       * w tej samej walucie i podpisywał wynik znakiem €. Przy tankowaniach
       * w Polsce zawyżało to koszt około czterokrotnie, więc „koszt na km"
       * i marża wychodziły z rachunku, którego nie dało się obronić żadnym
       * dokumentem.
       *
       * `rowAmountEur` zwraca `null` dwuznacznie — brak kwoty ALBO brak notowania
       * na dany dzień — więc liczymy oba przypadki osobno i mówimy o nich niżej.
       * `undefined` przekazane do `buildSettlement` znaczy „pozycja bez kwoty",
       * czyli dokładnie to, czym jest wpis, którego nie umiemy wycenić. Zero
       * byłoby kłamstwem: pokazywałoby tankowanie za darmo.
       */
      const eur = (kwota: number | null, waluta: string | null, kiedy: string) =>
        rowAmountEur(kwota, waluta, kiedy, fx) ?? undefined;
      const bezKursu = (kwota: number | null, waluta: string | null, kiedy: string) =>
        kwota != null && rowAmountEur(kwota, waluta, kiedy, fx) == null;

      setMissingRate(
        fFilt.filter((r) => bezKursu(r.price_total, r.currency, r.occurred_at)).length +
          aFilt.filter((r) => bezKursu(r.price_total, r.currency, r.occurred_at)).length +
          tFilt.filter((r) => bezKursu(r.amount, r.currency, r.occurred_at)).length,
      );

      setSettlement(
        buildSettlement({
          fuel: fFilt.map((r) => ({
            odometerKm: r.odometer_km,
            liters: r.liters,
            isFull: r.is_full ?? true,
            priceTotal: eur(r.price_total, r.currency, r.occurred_at),
          })),
          adblue: aFilt.map((r) => ({
            liters: r.liters,
            priceTotal: eur(r.price_total, r.currency, r.occurred_at),
          })),
          trips: tFilt.map((r) => ({
            action: r.action,
            amount: eur(r.amount, r.currency, r.occurred_at) ?? null,
          })),
          ratePerKm: Number(ratePerKm) || 0,
          tollCost: Number(tollCost) || 0,
        }),
      );
    } catch (e) {
      setSettlement(null);
      setLoadErr(e instanceof Error ? e.message : t("settlements.loadError"));
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    if (!settlement) return;
    /*
     * [#389] Kolumna „Kwota" nie mówiła, w JAKIEJ walucie — a wiersze bywają
     * w różnych. Arkusz wyeksportowany do księgowości dawał się zsumować
     * jednym `=SUMA()` i dawał liczbę bez znaczenia.
     *
     * Rozdzielamy więc to, co dokument mówi naprawdę, od tego, co z tego wynika:
     * „Kwota" + „Waluta" to zapis z paragonu (tak zostanie w papierach),
     * a „Kwota (€)" to przeliczenie kursem z dnia zdarzenia — tą samą drogą,
     * którą policzone jest podsumowanie niżej. Puste pole w kolumnie euro
     * znaczy „nie było notowania na ten dzień" i ma zostać puste, nie zerowe.
     */
    const headers = [
      "Typ",
      "Data",
      "Licznik (km)",
      "Litry",
      "Kwota",
      "Waluta",
      "Kwota (€)",
      "Szczegóły",
    ];
    const wEur = (kwota: number | null, waluta: string | null, kiedy: string) =>
      rowAmountEur(kwota, waluta, kiedy, fxRates);
    const rows: (string | number | null)[][] = [];
    for (const r of fuel) {
      rows.push([
        r.is_full === false ? "Paliwo (częściowe)" : "Paliwo",
        r.occurred_at.slice(0, 10),
        r.odometer_km,
        r.liters,
        r.price_total,
        r.currency,
        wEur(r.price_total, r.currency, r.occurred_at),
        [r.station_country, r.station_city, r.station_loc].filter(Boolean).join(" "),
      ]);
    }
    for (const r of adblue) {
      rows.push([
        "AdBlue",
        r.occurred_at.slice(0, 10),
        r.odometer_km,
        r.liters,
        r.price_total,
        r.currency,
        wEur(r.price_total, r.currency, r.occurred_at),
        "",
      ]);
    }
    for (const r of trips) {
      rows.push([
        tripLabel(r.action),
        r.occurred_at.slice(0, 10),
        r.odometer_km,
        null,
        r.amount,
        r.currency,
        wEur(r.amount, r.currency, r.occurred_at),
        [r.country, r.location, r.comment].filter(Boolean).join(" "),
      ]);
    }
    const summary: (string | number | null)[][] = [
      [],
      ["PODSUMOWANIE", `${regOf(vehicleId)} · ${from} → ${to}`],
      // [#389] Kwoty podsumowania są w euro — po przeliczeniu kursem z dnia
      // zdarzenia. Bez tej linijki czytający miał prawo założyć złotówki.
      ["Waluta podsumowania", "EUR (kurs EBC z dnia zdarzenia)"],
      ["Dystans (km)", settlement.distanceKm],
      ["Paliwo (L)", settlement.fuelLiters],
      ["Koszt paliwa", settlement.fuelCost],
      ["Średnie spalanie (L/100km)", settlement.avgConsumptionLPer100km],
      ["AdBlue (L)", settlement.adblueLiters],
      ["Koszt AdBlue", settlement.adblueCost],
      ["Serwis", settlement.serviceCost],
      ["Inne", settlement.otherCost],
      ["Myto", settlement.tollCost],
      ["KOSZT RAZEM", settlement.totalCost],
      ["Przychód", settlement.revenue],
      ["ZYSK", settlement.profit],
      ["Marża (%)", settlement.marginPercent],
    ];
    downloadCsv(`rozliczenie_${regOf(vehicleId)}_${from}_${to}.csv`, headers, [
      ...rows,
      ...summary,
    ]);
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader title={t("settlements.title")} subtitle={t("settlements.subtitle")} />

      {/* #265: generator rozliczenia miesięcznego kierowcy (normy/stawki firmy). */}
      <p style={{ marginTop: 4 }}>
        <a href="/settlements/driver" style={{ color: palette.red, fontWeight: 700 }}>
          {t("settlements.driverGenLink")}
        </a>
      </p>

      <SetupNotice source={source} noVehicles={t("settlements.noVehicles")} />
      {denied && <p style={{ color: palette.red, marginTop: 16 }}>{t("settlements.denied")}</p>}

      {!denied && (
        <div className={`${styles.controls} no-print`}>
          <label className={styles.field}>
            <span style={f.label}>{t("common.vehicle")}</span>
            <select
              className={styles.input}
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span style={f.label}>{t("settlements.from")}</span>
            <input
              className={styles.input}
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span style={f.label}>{t("settlements.to")}</span>
            <input
              className={styles.input}
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span style={f.label}>{t("settlements.ratePerKm")}</span>
            <input
              className={styles.input}
              type="number"
              step="0.01"
              value={ratePerKm}
              onChange={(e) => setRatePerKm(e.target.value)}
              placeholder={t("settlements.ratePlaceholder")}
            />
          </label>
          {isOwner && (
            <button type="button" className={styles.ghost} onClick={saveRate}>
              {t("settlements.saveDefault")}
            </button>
          )}
          <label className={styles.field}>
            <span style={f.label}>{t("settlements.tollField")}</span>
            <input
              className={styles.input}
              type="number"
              step="0.01"
              value={tollCost}
              onChange={(e) => setTollCost(e.target.value)}
              placeholder={t("settlements.optional")}
            />
          </label>
          <Button onClick={load} disabled={busy || !vehicleId}>
            {busy ? t("settlements.computing") : t("settlements.compute")}
          </Button>
        </div>
      )}

      {loadErr && <p style={{ color: palette.red, marginTop: 12 }}>⚠️ {loadErr}</p>}
      {/* [#389] Pozycje z kwotą, których nie dało się wycenić — bo na dzień
          zdarzenia nie ma notowania waluty. Wchodzą do rachunku jako brak,
          nie jako zero, więc suma jest NIEPEŁNA i trzeba to powiedzieć.
          Milcząc, pokazalibyśmy koszt niższy niż faktyczny i marżę wyższą. */}
      {missingRate > 0 && (
        <p style={{ color: palette.warning, marginTop: 12 }}>
          ⚠️ {missingRate} {t("settlements.missingRate")}
        </p>
      )}

      {settlement && (
        <>
          {vehicleId && (
            <Link
              href={`/vehicles/${vehicleId}`}
              className="no-print"
              style={{ color: palette.red, display: "inline-block", marginBottom: 8 }}
            >
              {t("settlements.vehicleCard")}
            </Link>
          )}
          <div className={styles.cards}>
            <Card label={t("settlements.distance")} value={`${settlement.distanceKm} km`} />
            <Card
              label={t("settlements.consumption")}
              value={
                settlement.avgConsumptionLPer100km != null
                  ? `${settlement.avgConsumptionLPer100km} L/100km`
                  : "—"
              }
            />
            <Card label={t("settlements.totalCost")} value={`${settlement.totalCost} €`} />
            <Card
              label={t("settlements.profit")}
              value={`${settlement.profit} €`}
              accent={settlement.profit >= 0 ? "#22c55e" : palette.red}
            />
            <Card
              label={t("settlements.margin")}
              value={settlement.marginPercent != null ? `${settlement.marginPercent}%` : "—"}
            />
          </div>

          <table className={styles.table}>
            <tbody>
              <Tr
                k={t("settlements.fuel")}
                v={`${settlement.fuelLiters} L · ${settlement.fuelCost} €`}
              />
              <Tr k="AdBlue" v={`${settlement.adblueLiters} L · ${settlement.adblueCost} €`} />
              <Tr k={t("settlements.service")} v={`${settlement.serviceCost} €`} />
              <Tr k={t("settlements.other")} v={`${settlement.otherCost} €`} />
              <Tr k={t("settlements.toll")} v={`${settlement.tollCost} €`} />
              <Tr k={t("settlements.revenue")} v={`${settlement.revenue} €`} />
            </tbody>
          </table>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }} className="no-print">
            <Button variant="ghost" onClick={exportCsv}>
              {t("settlements.exportCsv")}
            </Button>
            <Button variant="ghost" onClick={() => window.print()}>
              {t("settlements.print")}
            </Button>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28 }}>
            {t("settlements.items")} ({fuel.length + adblue.length + trips.length})
          </h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>{t("settlements.colType")}</th>
                <th className={styles.th}>{t("common.date")}</th>
                <th className={styles.th}>{t("settlements.colOdometer")}</th>
                <th className={styles.th}>{t("settlements.colLiters")}</th>
                <th className={styles.th}>{t("settlements.colAmount")}</th>
              </tr>
            </thead>
            <tbody>
              {fuel.map((r) => (
                <tr key={`f-${r.occurred_at}-${r.odometer_km}-${r.liters}`}>
                  <td className={styles.td}>
                    {r.is_full === false
                      ? t("settlements.fuelPartialShort")
                      : t("settlements.fuel")}
                  </td>
                  <td className={styles.td}>{r.occurred_at.slice(0, 10)}</td>
                  <td className={styles.td}>{r.odometer_km}</td>
                  <td className={styles.td}>{r.liters}</td>
                  <td className={styles.td}>
                    {r.price_total != null ? `${round2(r.price_total)} €` : "—"}
                  </td>
                </tr>
              ))}
              {adblue.map((r) => (
                <tr key={`a-${r.occurred_at}-${r.odometer_km}-${r.liters}`}>
                  <td className={styles.td}>AdBlue</td>
                  <td className={styles.td}>{r.occurred_at.slice(0, 10)}</td>
                  <td className={styles.td}>{r.odometer_km}</td>
                  <td className={styles.td}>{r.liters}</td>
                  <td className={styles.td}>
                    {r.price_total != null ? `${round2(r.price_total)} €` : "—"}
                  </td>
                </tr>
              ))}
              {trips.map((r) => (
                <tr key={`t-${r.occurred_at}-${r.action}-${r.odometer_km}`}>
                  <td className={styles.td}>{tripLabel(r.action)}</td>
                  <td className={styles.td}>{r.occurred_at.slice(0, 10)}</td>
                  <td className={styles.td}>{r.odometer_km ?? "—"}</td>
                  <td className={styles.td}>—</td>
                  <td className={styles.td}>{r.amount != null ? `${round2(r.amount)} €` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className={styles.card}>
      <div style={{ fontSize: 12, color: palette.smoke }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: accent ?? palette.offWhite }}>
        {value}
      </div>
    </div>
  );
}
function Tr({ k, v }: { k: string; v: string }) {
  return (
    <tr>
      <td className={styles.td} style={{ color: palette.smoke }}>
        {k}
      </td>
      <td className={styles.td} style={{ fontWeight: 700 }}>
        {v}
      </td>
    </tr>
  );
}
