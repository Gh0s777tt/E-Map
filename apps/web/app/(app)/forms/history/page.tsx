"use client";

import {
  deleteFuelLog,
  deleteTripEvent,
  listFuelLogsAll,
  listTripEventsAll,
  listVehicles,
} from "@e-logistic/api";
import { type FuelLogInput, type TripEventInput, toCsv } from "@e-logistic/core";
import type { MessageKey } from "@e-logistic/i18n";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import { useT } from "@/components/LocaleProvider";
import { ShowMore } from "@/components/ShowMore";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui";
import { vehicleLabel } from "@/lib/demo";
import { tripActionLabel } from "@/lib/labels";
import { getCachedMembership } from "@/lib/membership";
import { listOutbox, type OutboxItem, removeOutbox, trySync } from "@/lib/outbox";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useRenderWindow } from "@/lib/useRenderWindow";

type T = (key: MessageKey) => string;
type Kind = "fuel" | "adblue" | "trip";
type Status = "queued" | "synced" | "error";

type Row = {
  key: string;
  kind: Kind;
  vehicle: string;
  title: string;
  sub: string;
  /** Znacznik czasu ISO — jedyne źródło porządku listy.
      Wcześniej sortowaliśmy po `sub` („KRAJ · data"), co dawało kolejność
      alfabetyczną po kraju, a chronologię dopiero w drugiej kolejności. */
  at: string;
  /** [#375] Pola strukturalne — po sklejonym `sub` nie dało się filtrować. */
  country: string;
  paymentMethod?: "card" | "cash" | null;
  isFull?: boolean | null;
  /**
   * [#375] Liczby osobno, nie tylko w `title`. Eksport bez nich był do oglądania,
   * a nie do liczenia: księgowa dostawała komórkę „WX1234 · 620 L · 812345 km"
   * i musiała rozbijać ją ręcznie, zanim policzyła cokolwiek.
   */
  city?: string | null;
  odometerKm?: number | null;
  liters?: number | null;
  priceTotal?: number | null;
  currency?: string | null;
  priceNet?: number | null;
  vatRate?: number | null;
  action?: string | null;
  weightKg?: number | null;
  status: Status;
  error?: string;
  outboxId?: string;
  dbId?: string;
};

const STATUS_COLOR: Record<Status, string> = {
  queued: palette.warning,
  synced: palette.success,
  error: palette.red,
};
const STATUS_KEY: Record<Status, MessageKey> = {
  queued: "sync.queued",
  synced: "sync.synced",
  error: "sync.error",
};

function download(filename: string, text: string) {
  const blob = new Blob([`﻿${text}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function localRow(item: OutboxItem, labelOf: (id: string) => string, t: T): Row {
  const when = new Date(item.createdAt).toLocaleString("pl-PL");
  if (item.kind === "trip") {
    const i = item.input as TripEventInput;
    const w = "weightKg" in i ? ` · ${i.weightKg} kg` : "";
    return {
      key: `local/${item.id}`,
      kind: "trip",
      vehicle: labelOf(i.vehicleId),
      title: `${labelOf(i.vehicleId)} · ${tripActionLabel(t, i.action)} · ${i.odometerKm} km${w}`,
      sub: `${i.place.country} · ${when}`,
      at: item.createdAt,
      country: i.place.country,
      city: i.place.city ?? i.place.location ?? null,
      odometerKm: i.odometerKm,
      action: i.action,
      weightKg: "weightKg" in i ? (i.weightKg ?? null) : null,
      status: item.status,
      error: item.error,
      outboxId: item.id,
    };
  }
  const i = item.input as FuelLogInput;
  return {
    key: `local/${item.id}`,
    kind: item.kind,
    vehicle: labelOf(i.vehicleId),
    title: `${labelOf(i.vehicleId)} · ${i.liters} L · ${i.odometerKm} km`,
    sub: `${i.station.country} · ${when}`,
    at: item.createdAt,
    country: i.station.country,
    city: i.station.city ?? i.station.location ?? null,
    odometerKm: i.odometerKm,
    liters: i.liters,
    priceTotal: i.priceTotal ?? null,
    currency: i.currency ?? null,
    priceNet: i.priceNet ?? null,
    vatRate: i.vatRate ?? null,
    paymentMethod: i.paymentMethod,
    isFull: i.isFull,
    status: item.status,
    error: item.error,
    outboxId: item.id,
  };
}

/**
 * Okno czasowe historii: etykieta i16n → liczba miesięcy wstecz (`null` = cała historia).
 *
 * Ekran pobiera swoje trzy zbiory w KOMPLECIE (stronami), bo z nich liczy się zwrot VAT —
 * a komplet bez zakresu dat znaczy przy dużej flocie kilkadziesiąt sekwencyjnych zapytań
 * i dziesiątki tysięcy wierszy przy każdym wejściu. Dotychczasowe `limit: 1000` też było
 * oknem, tylko niejawnym i tym krótszym, im więcej firma tankuje. Jawne 12 miesięcy
 * pokrywa rozliczenie roczne, a szersze zakresy zostają dostępne wprost — z ceną, którą
 * użytkownik wybiera świadomie, zamiast dostawać ją w zależności od wielkości floty.
 */
const PERIODS = [
  { value: "m3", months: 3, labelKey: "history.period.m3" },
  { value: "m12", months: 12, labelKey: "history.period.m12" },
  { value: "m24", months: 24, labelKey: "history.period.m24" },
  { value: "all", months: null, labelKey: "history.period.all" },
] as const satisfies readonly { value: string; months: number | null; labelKey: MessageKey }[];

type Period = (typeof PERIODS)[number]["value"];

/** Początek okna (ISO) albo `undefined` dla „cała historia". */
function periodFrom(period: Period): string | undefined {
  const months = PERIODS.find((p) => p.value === period)?.months ?? null;
  if (months == null) return undefined;
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, now.getUTCDate()),
  ).toISOString();
}

export default function FormsHistoryPage() {
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>([]);
  const [source, setSource] = useState<"baza" | "lokalne">("lokalne");
  /**
   * Któryś ze zbiorów urwał się na sufit pobrania. Trzymane osobno od `rows`, bo
   * z samej listy nie da się tego odczytać — niepełna wygląda identycznie jak pełna.
   */
  const [incomplete, setIncomplete] = useState(false);
  const [kindFilter, setKindFilter] = useState<Kind | "all">("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  // [#375] Filtr po kraju — kierowca jeżdżący po pół Europie inaczej nie znajdzie
  // tankowań z jednego kraju, a od nich zależy zwrot VAT.
  const [countryFilter, setCountryFilter] = useState<string>("all");
  /** Okno czasowe pobrania — jedyny filtr tego ekranu, który schodzi do BAZY. */
  const [period, setPeriod] = useState<Period>("m12");

  const load = useCallback(async () => {
    const outbox = listOutbox();
    setIncomplete(false);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (m) {
        // Trzy zbiory pobierane STRONAMI, ale w OKNIE wybranym przez użytkownika.
        // Dawne `limit: 1000` było równe sufitowi `api.max_rows`, więc nie chroniło
        // przed niczym — wyznaczało go, i to niejawnie: kierowca z dwoma tysiącami
        // tankowań widział tu ostatni tysiąc i eksportował go do zwrotu VAT jako
        // komplet. Komplet bez okna byłby jednak wymianą jednego cichego kosztu na
        // drugi: kilkadziesiąt sekwencyjnych zapytań przy każdym wejściu na zakładkę.
        const from = periodFrom(period);
        const [fuelPaged, adbluePaged, tripsPaged, vehicles] = await Promise.all([
          listFuelLogsAll(sb, { from }),
          listFuelLogsAll(sb, { table: "adblue_logs", from }),
          listTripEventsAll(sb, { from }),
          listVehicles(sb, m.companyId),
        ]);
        setIncomplete(!fuelPaged.complete || !adbluePaged.complete || !tripsPaged.complete);
        const fuel = fuelPaged.rows;
        const adblue = adbluePaged.rows;
        const trips = tripsPaged.rows;
        const map = new Map(
          (vehicles as { id: string; registration: string }[]).map((v) => [v.id, v.registration]),
        );
        const labelOf = (id: string) => map.get(id) ?? vehicleLabel(id);
        const fuelRows = (kind: Kind, logs: unknown[]) =>
          (
            logs as {
              id: string;
              vehicle_id: string;
              liters: number;
              odometer_km: number;
              station_country: string;
              station_city: string | null;
              price_total: number | null;
              currency: string | null;
              price_net: number | null;
              vat_rate: number | null;
              payment_method: "card" | "cash";
              is_full: boolean | null;
              created_at: string;
              occurred_at: string;
            }[]
          ).map<Row>((r) => ({
            key: `${kind}/${r.id}`,
            kind,
            vehicle: labelOf(r.vehicle_id),
            title: `${labelOf(r.vehicle_id)} · ${r.liters} L · ${r.odometer_km} km`,
            sub: `${r.station_country} · ${new Date(r.occurred_at).toLocaleString("pl-PL")}`,
            // [#376] Data ZDARZENIA, nie synchronizacji — wpis zrobiony offline
            // i zsynchronizowany trzy dni później pokazywał w historii złą datę.
            at: r.occurred_at,
            country: r.station_country,
            city: r.station_city,
            odometerKm: r.odometer_km,
            liters: r.liters,
            priceTotal: r.price_total,
            currency: r.currency,
            priceNet: r.price_net,
            vatRate: r.vat_rate,
            paymentMethod: r.payment_method,
            isFull: r.is_full,
            status: "synced",
            dbId: r.id,
          }));
        const tripRows = (
          trips as {
            id: string;
            vehicle_id: string;
            action: string;
            odometer_km: number;
            weight_kg: number | null;
            country: string;
            // Trip zapisuje „lokalizację" (adres/miejsce), nie miasto —
            // to jedna kolumna mniej niż w tankowaniu i tak ma zostać.
            location: string | null;
            created_at: string;
            occurred_at: string;
          }[]
        ).map<Row>((r) => ({
          key: `trip/${r.id}`,
          kind: "trip",
          vehicle: labelOf(r.vehicle_id),
          title: `${labelOf(r.vehicle_id)} · ${tripActionLabel(t, r.action)} · ${r.odometer_km} km${r.weight_kg != null ? ` · ${r.weight_kg} kg` : ""}`,
          sub: `${r.country} · ${new Date(r.occurred_at).toLocaleString("pl-PL")}`,
          at: r.occurred_at,
          country: r.country,
          city: r.location,
          odometerKm: r.odometer_km,
          action: r.action,
          weightKg: r.weight_kg,
          status: "synced",
          dbId: r.id,
        }));

        const pending = outbox
          .filter((i) => i.status !== "synced")
          .map((i) => localRow(i, labelOf, t));

        setRows(
          [...pending, ...fuelRows("fuel", fuel), ...fuelRows("adblue", adblue), ...tripRows].sort(
            (a, b) => Date.parse(b.at) - Date.parse(a.at),
          ),
        );
        setSource("baza");
        return;
      }
    } catch {
      // offline → lokalne
    }
    setRows(outbox.map((i) => localRow(i, vehicleLabel, t)));
    setSource("lokalne");
  }, [t, period]);

  useEffect(() => {
    load();
  }, [load]);

  async function resync(outboxId: string) {
    await trySync(outboxId);
    await load();
  }

  function remove(outboxId: string) {
    removeOutbox(outboxId);
    void load();
  }

  /**
   * [#375] Usunięcie wpisu z BAZY. Dotąd kasować dało się wyłącznie pozycje
   * czekające w kolejce — zsynchronizowany wpis zostawał na zawsze, a kierowca,
   * który pomylił się przy tankowaniu, mógł go tylko edytować.
   */
  async function removeFromDb(row: Row) {
    if (!row.dbId) return;
    const ok = await confirm(t("history.deleteConfirm"), { danger: true });
    if (!ok) return;
    try {
      if (row.kind === "trip") {
        await deleteTripEvent(getBrowserSupabase(), row.dbId);
      } else {
        await deleteFuelLog(
          getBrowserSupabase(),
          row.dbId,
          row.kind === "adblue" ? "adblue_logs" : "fuel_logs",
        );
      }
      // Usuwamy z widoku od razu — `load()` i tak przeładuje, ale bez tego
      // wiersz mrugnąłby jeszcze raz przed zniknięciem.
      setRows((list) => list.filter((x) => x.key !== row.key));
      toast(t("history.deleted"), "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : t("history.deleteError"), "error");
    }
  }

  const vehicleOptions = useMemo(
    () =>
      [...new Set(rows.map((r) => r.vehicle).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );
  const countryOptions = useMemo(
    () =>
      [...new Set(rows.map((r) => r.country).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (kindFilter === "all" || r.kind === kindFilter) &&
          (vehicleFilter === "all" || r.vehicle === vehicleFilter) &&
          (countryFilter === "all" || r.country === countryFilter),
      ),
    [rows, kindFilter, vehicleFilter, countryFilter],
  );
  /**
   * Okno renderowania. Eksport i licznik „X z Y" biorą `filtered`, czyli komplet z okna
   * czasowego; w DOM ląduje tylko tyle wierszy, ile ktoś realnie przegląda. Bez tego
   * kierowca z trzyletnią historią montował ich naraz kilkadziesiąt tysięcy — zakładka,
   * która otwierała się w sekundę, przestawała się otwierać w ogóle.
   */
  const okno = useRenderWindow(filtered);

  const KIND_FILTERS: { value: Kind | "all"; label: string }[] = [
    { value: "all", label: t("common.all") },
    { value: "fuel", label: t("history.kind.fuel") },
    { value: "adblue", label: t("history.kind.adblue") },
    { value: "trip", label: t("history.kind.trip") },
  ];

  /**
   * [#375] Osobne kolumny zamiast sklejonego tekstu — arkusz ma być filtrowalny
   * po kraju i metodzie płatności i policzalny, a nie zmuszać do rozbijania
   * jednej komórki. Ten sam zestaw zasila CSV i Excel: gdyby powstały dwa,
   * rozjechałyby się przy pierwszej dołożonej kolumnie.
   */
  const exportTable = useCallback(() => {
    const headers = [
      t("history.csv.type"),
      t("common.vehicle"),
      t("common.date"),
      t("form.field.country"),
      t("form.field.city"),
      t("form.field.odometer"),
      t("form.field.liters"),
      t("history.col.gross"),
      t("form.field.currency"),
      t("history.col.net"),
      t("invoices.vatPercent"),
      t("forms.common.paymentMethod"),
      t("history.full"),
      t("history.col.action"),
      t("form.field.weight"),
      t("common.status"),
    ];
    // Liczby zostają liczbami: w Excelu tekst „620" nie sumuje się, a właśnie
    // sumowanie jest jedynym powodem, dla którego ktoś eksportuje ten arkusz.
    const rowsOut = filtered.map<(string | number | null)[]>((r) => [
      t(`history.kind.${r.kind}`),
      r.vehicle,
      r.at.slice(0, 16).replace("T", " "),
      r.country,
      r.city ?? "",
      r.odometerKm ?? null,
      r.liters ?? null,
      r.priceTotal ?? null,
      r.currency ?? "",
      r.priceNet ?? null,
      r.vatRate ?? null,
      r.paymentMethod ? t(`pay.${r.paymentMethod}`) : "",
      r.isFull == null ? "" : r.isFull ? t("history.full") : t("history.partial"),
      r.action ? tripActionLabel(t, r.action) : "",
      r.weightKg ?? null,
      t(STATUS_KEY[r.status]),
    ]);
    return { headers, rows: rowsOut };
  }, [filtered, t]);

  function exportCsv() {
    const { headers, rows: out } = exportTable();
    download(
      `historia_${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        headers,
        out.map((row) => row.map((c) => (c == null ? "" : String(c)))),
      ),
    );
  }

  /** Excel doładowywany dynamicznie — `exceljs` jest ciężki i nie ma go w bundlu. */
  async function exportExcel() {
    const { headers, rows: out } = exportTable();
    const { downloadXlsx } = await import("@/lib/xlsx");
    await downloadXlsx(
      `historia_${new Date().toISOString().slice(0, 10)}.xlsx`,
      headers,
      out,
      t("common.history"),
    );
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("common.history")}</h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        {t("history.subtitle")}{" "}
        <strong>{t(source === "baza" ? "history.source.db" : "history.source.local")}</strong>
      </p>

      {/* Nad listą i nad filtrami, bo unieważnia każdą liczbę niżej — także licznik
          „X z Y", który przy uciętym zbiorze podaje dwie nieprawdziwe wartości. */}
      {incomplete && <div style={styles.warn}>⛔ {t("history.incomplete")}</div>}

      {rows.length === 0 ? (
        <p style={{ color: palette.smoke, marginTop: 24 }}>{t("history.empty")}</p>
      ) : (
        <>
          <div style={styles.filters}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {KIND_FILTERS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setKindFilter(k.value)}
                  style={kindFilter === k.value ? styles.chipActive : styles.chip}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              style={styles.select}
              aria-label={t("history.period")}
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {t(p.labelKey)}
                </option>
              ))}
            </select>
            {countryOptions.length > 1 && (
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                style={styles.select}
                aria-label={t("history.allCountries")}
              >
                <option value="all">{t("history.allCountries")}</option>
                {countryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
            {vehicleOptions.length > 1 && (
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                style={styles.select}
              >
                <option value="all">{t("history.allVehicles")}</option>
                {vehicleOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            )}
            <span style={{ flex: 1 }} />
            {/* Oba eksporty zablokowane przy niepełnym zbiorze: arkusz po zapisaniu
                nie niesie już informacji, że czegoś w nim brakuje, a to z niego liczy
                się zwrot VAT. Filtry na ekranie niczego tu nie ratują — odsiewają
                z tego, co dojechało. */}
            <Button
              variant="ghost"
              onClick={exportCsv}
              disabled={incomplete}
              title={incomplete ? t("history.exportBlocked") : undefined}
            >
              ⬇️ CSV
            </Button>
            <Button
              variant="ghost"
              onClick={exportExcel}
              disabled={incomplete}
              title={incomplete ? t("history.exportBlocked") : undefined}
            >
              ⬇️ Excel
            </Button>
            <Link href="/forms/import" style={{ textDecoration: "none" }}>
              <Button variant="ghost">{t("history.importOpen")}</Button>
            </Link>
            <span style={{ color: palette.smoke, fontSize: 13, whiteSpace: "nowrap" }}>
              {filtered.length} z {rows.length}
            </span>
          </div>
          {filtered.length === 0 ? (
            <p style={{ color: palette.smoke, marginTop: 20 }}>{t("history.noResults")}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
              {okno.visible.map((r) => {
                const color = STATUS_COLOR[r.status];
                return (
                  <div key={r.key} style={styles.row}>
                    <span style={styles.kind}>{t(`history.kind.${r.kind}`)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{r.title}</div>
                      <div style={{ color: palette.smoke, fontSize: 13 }}>{r.sub}</div>
                      {/* [#375] Metoda płatności i „do pełna" widoczne od razu —
                          dotąd trzeba było wejść w edycję, żeby je sprawdzić. */}
                      {(r.paymentMethod || r.isFull != null) && (
                        <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                          {r.paymentMethod && (
                            <span style={styles.tag}>
                              {r.paymentMethod === "card"
                                ? `💳 ${t("pay.card")}`
                                : `💵 ${t("pay.cash")}`}
                            </span>
                          )}
                          {r.isFull != null && (
                            <span style={styles.tag}>
                              {r.isFull ? t("history.full") : t("history.partial")}
                            </span>
                          )}
                        </div>
                      )}
                      {r.error && <div style={{ color: palette.red, fontSize: 12 }}>{r.error}</div>}
                    </div>
                    <span style={{ ...styles.badge, color, borderColor: color }}>
                      {t(STATUS_KEY[r.status])}
                    </span>
                    {r.status === "synced" && r.dbId && (
                      <>
                        <Link
                          href={`/forms/${r.kind}?edit=${r.dbId}`}
                          style={{ ...styles.btn, textDecoration: "none" }}
                        >
                          {t("common.edit")}
                        </Link>
                        <Button variant="danger" onClick={() => removeFromDb(r)}>
                          {t("common.delete")}
                        </Button>
                      </>
                    )}
                    {r.status !== "synced" && r.outboxId && (
                      <>
                        <Button variant="ghost" onClick={() => resync(r.outboxId as string)}>
                          {t("common.retry")}
                        </Button>
                        <Button variant="danger" onClick={() => remove(r.outboxId as string)}>
                          {t("common.delete")}
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
              <ShowMore hidden={okno.hidden} onShowMore={okno.showMore} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  /** Ostrzeżenie o niepełnym zbiorze — ten sam styl co na /monthly i /vehicles/[id]. */
  warn: {
    border: `1px solid ${palette.warning}`,
    borderRadius: 10,
    padding: "10px 14px",
    marginTop: 16,
    color: palette.offWhite,
    fontSize: 13,
    lineHeight: 1.5,
    background: palette.nearBlack,
  },
  tag: {
    fontSize: 11,
    color: palette.smoke,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 999,
    padding: "1px 7px",
  },
  row: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
  kind: {
    fontSize: 11,
    color: palette.red,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 6,
    padding: "3px 8px",
    minWidth: 56,
    textAlign: "center",
  },
  badge: { fontSize: 12, padding: "4px 10px", borderRadius: 999, border: "1px solid" },
  btn: {
    background: "transparent",
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "7px 12px",
    cursor: "pointer",
  },
  filters: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 20,
  },
  chip: {
    background: "transparent",
    color: palette.smoke,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
  chipActive: {
    background: palette.red,
    color: palette.white,
    border: `1px solid ${palette.red}`,
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  select: {
    background: palette.black,
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 13,
  },
};
