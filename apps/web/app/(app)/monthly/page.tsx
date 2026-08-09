"use client";

import {
  getCompany,
  listFuelLogs,
  listFxRates,
  listOrders,
  listPerDiemTrips,
  listVehicleCosts,
  type PerDiemTrip,
  toFxRates,
  type VehicleCost,
} from "@e-logistic/api";
import {
  computePerDiem,
  costRegister,
  type DietTrip,
  effectiveModules,
  type MonthlyCostEntry,
  type MonthlyOrderEntry,
  monthlyFleetSummary,
  monthlyFleetTrend,
  monthsEndingAt,
  round2,
  rowAmountEur,
  sumPerDiem,
  VEHICLE_COST_CATEGORY_LABELS,
  type VehicleCostCategory,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as f from "@/components/formStyles";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { BarChart, Button, PageHeader, SetupNotice } from "@/components/ui";
import { downloadCsv } from "@/lib/csv";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

function thisMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * [#378] Szerokość okna danych — jedna liczba dla pobierania, trendu i liczników.
 *
 * Rozjazd tych trzech miejsc był źródłem usterki: ostrzeżenie o brakujących kursach
 * liczyło pozycje w jednym miesiącu, a wykres i Δ m/m brały dane z sześciu.
 */
const TREND_MONTHS = 6;

/**
 * [#378] Znacznik „kwota jest, tylko nie ma kursu".
 *
 * Po przeliczeniu na euro kwota bywa `null` z dwóch zupełnie różnych powodów:
 * albo nikt jej nie wpisał, albo na dzień zdarzenia brakuje notowania. Ekran musi
 * je rozróżniać, bo prowadzą do różnych działań — komunikat „uzupełnij kwotę"
 * jest niewykonalny dla kogoś, kto wpisał 1200 PLN.
 */
type MissingRate = { missingRate: boolean };
type MonthlyOrderRow = MonthlyOrderEntry & MissingRate;
type MonthlyCostRow = MonthlyCostEntry & MissingRate;
/** Koszt pojazdu z kwotą przeliczoną na euro po kursie z dnia poniesienia. */
type VehicleCostRow = VehicleCost & { amountEur: number | null };

export default function MonthlyPage() {
  const t = useT();
  const { vehicles, source } = useFleet();
  const [month, setMonth] = useState(thisMonth);
  const [orders, setOrders] = useState<MonthlyOrderRow[]>([]);
  const [fuel, setFuel] = useState<MonthlyCostRow[]>([]);
  const [adblue, setAdblue] = useState<MonthlyCostRow[]>([]);
  const [costs, setCosts] = useState<VehicleCostRow[]>([]);
  const [perDiems, setPerDiems] = useState<PerDiemTrip[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        setOrders([]);
        return;
      }
      if (!effectiveModules(m.role, m.modules).includes("settlements")) {
        setDenied(true);
        return;
      }
      // Okno danych = 6 miesięcy kończących na wybranym (trend + porównanie m/m).
      // Przeładowanie przy zmianie miesiąca — zamiast pobierania całej historii.
      const window6 = monthsEndingAt(month, TREND_MONTHS);
      const from = window6.length ? `${window6[0]}-01` : undefined;
      const toDate = new Date(`${month}-01T00:00:00Z`);
      toDate.setUTCMonth(toDate.getUTCMonth() + 1);
      const to = toDate.toISOString().slice(0, 10); // 1. dzień kolejnego miesiąca
      const [ord, f, a, vc, pd, comp, fxRows] = await Promise.all([
        listOrders(sb, m.companyId, { from, to }),
        listFuelLogs(sb, { from, to, limit: 5000 }),
        listFuelLogs(sb, { table: "adblue_logs", from, to, limit: 5000 }),
        listVehicleCosts(sb, m.companyId, { from, limit: 5000 }),
        listPerDiemTrips(sb, m.companyId, { limit: 5000 }),
        getCompany(sb, m.companyId),
        // Zapas wstecz: kurs z dnia zdarzenia, a EBC nie publikuje w weekendy.
        listFxRates(sb, {
          from: from
            ? new Date(Date.parse(from) - 10 * 86_400_000).toISOString().slice(0, 10)
            : undefined,
        }),
      ]);
      const rates = toFxRates(fxRows);
      setCompanyName(comp?.name ?? "");
      // [#378] Koszt pojazdu przeliczony na euro po kursie z dnia poniesienia.
      // Kwota surowa zostaje w wierszu — rejestr kosztów pokazuje ją w uwadze,
      // gdy notowania zabrakło.
      setCosts(
        vc.map((c) => ({
          ...c,
          amountEur: rowAmountEur(Number(c.amount), c.currency, c.cost_date, rates),
        })),
      );
      setPerDiems(pd);
      // [#378] Zlecenia normalizowane do euro TU, na granicy odczytu. Dalej liczy
      // `monthlyFleetSummary`, który odsiewa wszystko, co nie jest EUR — więc
      // zlecenie wystawione w złotówkach po cichu wypadało z przychodu, a wynik
      // pojazdu (przychód − paliwo) wychodził zaniżony, czasem ujemny bez powodu.
      // Zamiast zmieniać sygnaturę silnika w `packages/core`, podajemy mu kwotę
      // już przeliczoną i walutę „EUR" — granica przeliczenia jest w jednym miejscu.
      setOrders(
        ord.map((o) => {
          // Data ZAŁADUNKU, nie utworzenia: kurs ma odpowiadać momentowi zdarzenia.
          const date = o.load_date ?? o.created_at.slice(0, 10);
          const priceEur = rowAmountEur(o.price, o.currency, date, rates);
          return {
            vehicleId: o.vehicle_id,
            price: priceEur,
            currency: "EUR",
            status: o.status,
            date,
            missingRate: o.price != null && priceEur == null,
          };
        }),
      );
      type Raw = {
        vehicle_id: string;
        price_total: number | null;
        currency: string | null;
        occurred_at: string;
      };
      const toCost = (r: Raw): MonthlyCostRow => {
        // [#376] Przeliczenie na EUR po kursie z dnia zdarzenia. Wcześniej
        // wchodziła tu surowa kwota — 1200 PLN sumowało się jako 1200 €.
        const priceTotal = rowAmountEur(r.price_total, r.currency, r.occurred_at, rates);
        return {
          vehicleId: r.vehicle_id,
          priceTotal,
          date: r.occurred_at.slice(0, 10),
          // [#378] Kwota jest, brakuje tylko notowania — to inny przypadek niż
          // pusty formularz i musi dostać inny komunikat.
          missingRate: r.price_total != null && priceTotal == null,
        };
      };
      setFuel((f as Raw[]).map(toCost));
      setAdblue((a as Raw[]).map(toCost));
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Nie udało się pobrać danych.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const regOf = (id: string | null) =>
    id ? (vehicles.find((v) => v.id === id)?.registration ?? id.slice(0, 8)) : "Bez pojazdu";

  const summary = useMemo(
    () => monthlyFleetSummary({ month, orders, fuel, adblue }),
    [month, orders, fuel, adblue],
  );

  // Okno trendu: TREND_MONTHS miesięcy kończących na wybranym. Ten sam zakres,
  // z którego liczone są słupki wykresu i baza porównania Δ m/m.
  const trendMonths = useMemo(() => monthsEndingAt(month, TREND_MONTHS), [month]);
  const trend = useMemo(
    () => monthlyFleetTrend({ months: trendMonths, orders, fuel, adblue }),
    [trendMonths, orders, fuel, adblue],
  );
  const prev = trend.length >= 2 ? trend[trend.length - 2] : null;

  /**
   * [#378] Dwa powody, dla których pozycja nie weszła do sumy — i właściwy ZASIĘG.
   *
   * 1) `missingPrice` z rdzenia zlicza każdy `priceTotal === null`, a po przeliczeniu
   *    na euro wpadają tam także wpisy Z kwotą, ale bez notowania na dany dzień.
   *    Rozdzielamy je, bo „uzupełnij kwotę" jest niewykonalne dla kogoś, kto kwotę wpisał.
   * 2) Poprzednio licznik obejmował wyłącznie wybrany miesiąc, a `monthlyFleetSummary`
   *    liczy nieprzeliczalną kwotę jako `?? 0` w KAŻDYM miesiącu, który dostanie.
   *    Wykres trendu i Δ m/m biorą dane z całego okna, więc pozycja bez kursu sprzed
   *    kilku miesięcy cicho zaniżała tamten słupek i bazę porównania — Δ pokazywała
   *    wzrost, którego nie było, a ostrzeżenie milczało. Liczymy więc per miesiąc
   *    całego okna i osobno raportujemy „w tym miesiącu" i „w oknie trendu".
   */
  const missing = useMemo(() => {
    const monthOf = (d: string) => d.slice(0, 7);
    const inWindow = new Set(trendMonths);
    // Miesiąc → ile pozycji nie weszło do sumy (osobno: brak kursu / brak kwoty).
    const byMonth = new Map<string, { rate: number; amount: number }>();
    const bump = (date: string, kind: "rate" | "amount") => {
      const m = monthOf(date);
      if (!inWindow.has(m)) return;
      const e = byMonth.get(m) ?? { rate: 0, amount: 0 };
      e[kind] += 1;
      byMonth.set(m, e);
    };
    for (const r of [...fuel, ...adblue]) {
      if (r.priceTotal != null) continue;
      bump(r.date, r.missingRate ? "rate" : "amount");
    }
    for (const o of orders) {
      // Do przychodu wchodzą tylko zlecenia dostarczone/zafakturowane — reszta
      // nie zaniża sumy, więc nie ma o czym ostrzegać.
      if (!o.missingRate) continue;
      if (o.status !== "delivered" && o.status !== "invoiced") continue;
      bump(o.date, "rate");
    }

    const amountIn = (rows: MonthlyCostRow[]) =>
      rows.filter((r) => r.priceTotal == null && !r.missingRate && monthOf(r.date) === month)
        .length;
    // Miesiące, których słupek/porównanie stoi na niepełnych danych — do oznaczenia
    // przy samym wykresie, nie tylko przy kafelkach wybranego miesiąca.
    const incompleteMonths = new Set(
      trendMonths.filter((m) => {
        const e = byMonth.get(m);
        return e != null && e.rate + e.amount > 0;
      }),
    );
    const prevMonth = trendMonths.length >= 2 ? trendMonths[trendMonths.length - 2] : null;
    return {
      amountFuel: amountIn(fuel),
      amountAdblue: amountIn(adblue),
      rateMonth: byMonth.get(month)?.rate ?? 0,
      rateWindow: trendMonths.reduce((s, m) => s + (byMonth.get(m)?.rate ?? 0), 0),
      incompleteMonths,
      prevIncomplete: prevMonth != null && incompleteMonths.has(prevMonth),
    };
  }, [fuel, adblue, orders, month, trendMonths]);

  // Diety należne w wybranym miesiącu (filtr po dacie podróży), osobno per waluta.
  const perDiemTotals = useMemo(() => {
    const toTrip = (p: PerDiemTrip): DietTrip => ({
      destination: p.destination ?? "",
      mode: p.mode,
      hours: p.hours,
      dailyRate: p.daily_rate,
      currency: p.currency,
    });
    const results = perDiems
      .filter((p) => p.trip_date?.startsWith(month))
      .map((p) => computePerDiem(toTrip(p)));
    return sumPerDiem(results);
  }, [perDiems, month]);

  function exportCsv() {
    const headers = [
      t("common.vehicle"),
      t("monthly.csv.revenue"),
      t("monthly.csv.fuel"),
      t("monthly.csv.adblue"),
      t("monthly.csv.result"),
    ];
    const rows: (string | number)[][] = summary.rows.map((r) => [
      regOf(r.vehicleId),
      r.revenueEur,
      r.fuelCost,
      r.adblueCost,
      r.net,
    ]);
    rows.push([]);
    rows.push([
      t("common.total"),
      summary.totals.revenueEur,
      summary.totals.fuelCost,
      summary.totals.adblueCost,
      summary.totals.net,
    ]);
    downloadCsv(`zestawienie_${month}.csv`, headers, rows);
  }

  /** Eksport księgowy: rejestr kosztów miesiąca (paliwo + AdBlue + koszty pojazdu) + podsumowanie wg kategorii. */
  function exportCostRegister() {
    const inMonth = (d: string) => d.startsWith(month);
    const catLabel = (c: string) => VEHICLE_COST_CATEGORY_LABELS[c as VehicleCostCategory] ?? c;
    /**
     * [#378] Kwota `null` jedzie do pliku jako puste pole, nie jako zero.
     *
     * Wcześniej `round2(Number(r.priceTotal ?? 0))` wpisywało księgowej 0 € —
     * czyli twierdzenie „ten wydatek nic nie kosztował" — także wtedy, gdy kwota
     * była, tylko zabrakło kursu na dzień zdarzenia. Zero w rejestrze kosztów
     * cicho zaniża podstawę; puste pole plus powód w kolumnie „Uwaga" widać.
     */
    type Entry = {
      date: string;
      vehicleId: string | null;
      category: string;
      amountEur: number | null;
      note: string;
    };
    const logEntry = (r: MonthlyCostRow, category: string): Entry => ({
      date: r.date,
      vehicleId: r.vehicleId,
      category,
      amountEur: r.priceTotal,
      note:
        r.priceTotal != null
          ? ""
          : r.missingRate
            ? "kwota w innej walucie — brak kursu na dzień zdarzenia"
            : "brak kwoty we wpisie",
    });
    const entries: Entry[] = [
      ...fuel.filter((r) => inMonth(r.date)).map((r) => logEntry(r, "Paliwo")),
      ...adblue.filter((r) => inMonth(r.date)).map((r) => logEntry(r, "AdBlue")),
      // [#378] Było `c.currency === "EUR"` — naprawa opłacona w złotówkach
      // wypadała z rejestru bez śladu, więc miesięczna suma kosztów była zaniżona
      // i nie zgadzała się z tym, co widać na karcie pojazdu.
      ...costs
        .filter((c) => inMonth(c.cost_date))
        .map((c) => ({
          date: c.cost_date,
          vehicleId: c.vehicle_id,
          category: catLabel(c.category),
          amountEur: c.amountEur,
          note:
            c.amountEur != null
              ? ""
              : `kwota ${c.amount} ${c.currency} — brak kursu na ${c.cost_date}`,
        })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    // Do sumy wchodzi tylko to, co da się wyrazić w euro — reszta zostaje w wierszach
    // jako pozycja bez kwoty, żeby nikt nie uznał rejestru za kompletny.
    const priced = entries.filter((e): e is Entry & { amountEur: number } => e.amountEur != null);
    const reg = costRegister(priced.map((e) => ({ category: e.category, amount: e.amountEur })));
    const headers = [t("common.date"), t("common.vehicle"), "Kategoria", "Kwota (EUR)", "Uwaga"];
    const rows: (string | number | null)[][] = entries.map((e) => [
      e.date,
      regOf(e.vehicleId),
      e.category,
      e.amountEur,
      e.note,
    ]);
    rows.push([]);
    rows.push(["Podsumowanie wg kategorii"]);
    for (const g of reg.groups) rows.push([g.category, "", `${g.count} szt.`, g.amount]);
    rows.push([t("common.total"), "", `${reg.count} szt.`, reg.total]);
    const skipped = entries.length - priced.length;
    if (skipped > 0) {
      rows.push([
        "Poza sumą (kwota nieprzeliczona)",
        "",
        `${skipped} szt.`,
        null,
        "patrz kolumna Uwaga przy pozycjach z pustą kwotą",
      ]);
    }

    // Diety osobno per waluta (nie sumowane do EUR — bez kursów).
    if (perDiemTotals.length > 0) {
      rows.push([]);
      rows.push(["Diety kierowców (wg waluty)"]);
      for (const d of perDiemTotals) {
        rows.push([`${d.days} dób`, "", `${d.count} podróże/-y`, `${d.amount} ${d.currency}`]);
      }
    }
    downloadCsv(`rejestr_kosztow_${month}.csv`, headers, rows);
  }

  if (denied) {
    return (
      <div style={{ maxWidth: 900 }}>
        <PageHeader title="Zestawienie miesięczne" subtitle="" />
        <p style={{ color: palette.red, marginTop: 16 }}>
          ⛔ Brak dostępu do modułu Rozliczenia. Poproś właściciela o nadanie uprawnień.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900 }} className="monthly-print">
      {/* Nagłówek tylko do druku/PDF (firma + miesiąc) */}
      <div className="print-only" style={styles.printHead}>
        <strong style={{ fontSize: 18 }}>{companyName || "E-Logistic"}</strong>
        <div>Zestawienie miesięczne floty — {month}</div>
      </div>

      <PageHeader
        title="Zestawienie miesięczne (flota)"
        subtitle="Przychód ze zleceń (dostarczone i zafakturowane, przeliczony na EUR) zestawiony z kosztami paliwa i AdBlue — per pojazd, dla wybranego miesiąca. Eksport CSV (Excel) i wydruk/PDF."
      />

      <SetupNotice source={source} />

      <div style={styles.controls} className="no-print">
        <label style={styles.field}>
          <span style={f.label}>Miesiąc</span>
          <input
            style={styles.input}
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" onClick={exportCsv}>
          ⬇️ Eksport CSV
        </Button>
        <Button variant="ghost" onClick={exportCostRegister}>
          🧮 Rejestr kosztów (księgowość)
        </Button>
        <Button variant="ghost" onClick={() => window.print()}>
          🖨️ Drukuj / PDF
        </Button>
      </div>

      <ListStatus
        loading={loading}
        error={loadErr}
        empty={!loading && summary.rows.length === 0}
        emptyText="Brak danych dla wybranego miesiąca."
        onRetry={load}
      />

      {!loading && !loadErr && missing.amountFuel + missing.amountAdblue > 0 && (
        <div style={styles.warn}>
          <strong>Koszt jest niepełny.</strong> W tym miesiącu{" "}
          {missing.amountFuel > 0 && `${missing.amountFuel} tankowań`}
          {missing.amountFuel > 0 && missing.amountAdblue > 0 && " i "}
          {missing.amountAdblue > 0 && `${missing.amountAdblue} wpisów AdBlue`} nie ma wpisanej
          kwoty — te pozycje liczą się jako 0 €. Uzupełnij je w{" "}
          <Link href="/forms/history" style={styles.warnLink}>
            historii formularzy
          </Link>
          , aby zestawienie było prawdziwe.
        </div>
      )}

      {/* [#378] Brak kursu to nie brak kwoty — wcześniej jedno i drugie wpadało do
          komunikatu „uzupełnij kwotę", nie do wykonania dla kogoś, kto kwotę wpisał
          w złotówkach. Tu mówimy wprost, czego brakuje — i w jakim zakresie, bo
          ostrzeżenie musi obejmować całe okno, z którego liczone są pokazywane liczby. */}
      {!loading && !loadErr && missing.rateWindow > 0 && (
        <div style={styles.warn}>
          <strong>Suma jest niepełna.</strong> Pozycje z kwotą w walucie bez notowania na dzień
          zdarzenia: <strong>w tym miesiącu {missing.rateMonth}</strong>, w oknie trendu (
          {trendMonths.length} mies.) <strong>{missing.rateWindow}</strong>. Kwoty są wpisane;
          brakuje kursu, więc nie weszły do przeliczenia na euro i liczą się jako 0 € — także w
          miesiącach wcześniejszych, na których stoi wykres trendu i porównanie Δ m/m.
        </div>
      )}

      {!loading && !loadErr && summary.rows.length > 0 && (
        <>
          <div style={styles.cards}>
            {/* [#378] `baseIncomplete` — Δ liczy się względem miesiąca poprzedniego,
                a ten bywa zaniżony o pozycje bez kursu/bez kwoty. Bez oznaczenia
                kafelek pokazywał wzrost, którego nie było. */}
            <Card
              label="Przychód (EUR)"
              value={`${summary.totals.revenueEur} €`}
              sub={
                <Delta
                  now={summary.totals.revenueEur}
                  prev={prev?.revenueEur ?? null}
                  baseIncomplete={missing.prevIncomplete}
                />
              }
            />
            <Card
              label="Koszt paliwa"
              value={`${summary.totals.fuelCost} €`}
              sub={
                <Delta
                  now={summary.totals.fuelCost}
                  prev={prev?.fuelCost ?? null}
                  baseIncomplete={missing.prevIncomplete}
                  invert
                />
              }
            />
            <Card
              label="Koszt AdBlue"
              value={`${summary.totals.adblueCost} €`}
              sub={
                <Delta
                  now={summary.totals.adblueCost}
                  prev={prev?.adblueCost ?? null}
                  baseIncomplete={missing.prevIncomplete}
                  invert
                />
              }
            />
            <Card
              label="Wynik"
              value={`${summary.totals.net} €`}
              accent={summary.totals.net >= 0 ? "#22c55e" : palette.red}
              sub={
                <Delta
                  now={summary.totals.net}
                  prev={prev?.net ?? null}
                  baseIncomplete={missing.prevIncomplete}
                />
              }
            />
          </div>

          {trend.length > 1 && (
            <div style={{ marginTop: 24 }} className="no-print">
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                Przychód — ostatnie {trend.length} mies.{" "}
                <span style={{ color: palette.smoke, fontSize: 12, fontWeight: 400 }}>
                  (Δ na kartach = vs poprzedni miesiąc)
                </span>
              </h2>
              {/* [#378] Gwiazdka przy miesiącu, w którym część pozycji nie weszła do sumy.
                  Taki słupek jest zaniżony, a użytkownik musi to widzieć przy wykresie —
                  ostrzeżenie nad kafelkami dotyczyło samego wybranego miesiąca i milczało
                  o miesiącach wcześniejszych, na których stoi cały trend. */}
              <BarChart
                data={trend.map((p) => ({
                  label: `${p.month.slice(5)}.${p.month.slice(2, 4)}${
                    missing.incompleteMonths.has(p.month) ? "*" : ""
                  }`,
                  value: p.revenueEur,
                }))}
                unit=" €"
              />
              {missing.incompleteMonths.size > 0 && (
                <p style={{ color: palette.smoke, fontSize: 12, marginTop: 6 }}>
                  * miesiąc, w którym część pozycji nie weszła do sumy (brak kursu na dzień
                  zdarzenia albo brak kwoty we wpisie) — słupek jest zaniżony, a porównanie m/m
                  liczone względem takiego miesiąca zawyża wzrost.
                </p>
              )}
            </div>
          )}

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Pojazd</th>
                <th style={styles.thR}>Przychód (EUR)</th>
                <th style={styles.thR}>Paliwo</th>
                <th style={styles.thR}>AdBlue</th>
                <th style={styles.thR}>Wynik</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((r) => (
                <tr key={r.vehicleId ?? "none"}>
                  <td style={styles.td}>
                    {r.vehicleId ? (
                      <Link href={`/vehicles/${r.vehicleId}`} style={{ color: palette.red }}>
                        {regOf(r.vehicleId)}
                      </Link>
                    ) : (
                      regOf(r.vehicleId)
                    )}
                  </td>
                  <td style={styles.tdR}>{r.revenueEur} €</td>
                  <td style={styles.tdR}>{r.fuelCost} €</td>
                  <td style={styles.tdR}>{r.adblueCost} €</td>
                  <td
                    style={{
                      ...styles.tdR,
                      fontWeight: 700,
                      color: r.net >= 0 ? "#22c55e" : palette.red,
                    }}
                  >
                    {r.net} €
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...styles.td, fontWeight: 800 }}>RAZEM</td>
                <td style={{ ...styles.tdR, fontWeight: 800 }}>{summary.totals.revenueEur} €</td>
                <td style={{ ...styles.tdR, fontWeight: 800 }}>{summary.totals.fuelCost} €</td>
                <td style={{ ...styles.tdR, fontWeight: 800 }}>{summary.totals.adblueCost} €</td>
                <td
                  style={{
                    ...styles.tdR,
                    fontWeight: 800,
                    color: summary.totals.net >= 0 ? "#22c55e" : palette.red,
                  }}
                >
                  {summary.totals.net} €
                </td>
              </tr>
            </tfoot>
          </table>

          {/* [#378] Nota mówiła „kwoty w innych walutach przeliczone na euro" bez
              zastrzeżeń — a przeliczenie udaje się tylko wtedy, gdy jest notowanie na
              dzień zdarzenia. Ekran wyglądał przez to na kompletniejszy, niż jest.
              Warunek dopisany wprost, razem ze skutkiem (pozycja liczy się jako 0 €). */}
          <p style={{ color: palette.smoke, fontSize: 12, marginTop: 12 }}>
            Kwoty w innych walutach przeliczane na euro po kursie z dnia zdarzenia (załadunku dla
            zleceń, tankowania dla paliwa i AdBlue). Gdy notowania z tego dnia brakuje, pozycja nie
            wchodzi do sumy i liczy się jako 0 € — takie pozycje wykazuje ostrzeżenie nad tabelą.
            Atrybucja po dacie załadunku (lub utworzenia zlecenia).
          </p>
        </>
      )}

      {!loading && !loadErr && perDiemTotals.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            Diety kierowców — {month}{" "}
            <span style={{ color: palette.smoke, fontSize: 12, fontWeight: 400 }}>
              (należne, wg waluty)
            </span>
          </h2>
          {perDiemTotals.map((d) => (
            <div key={d.currency} style={styles.dietRow}>
              <span style={{ color: palette.smoke }}>
                {d.count} {d.count === 1 ? "podróż" : "podróże/-y"} · {d.days} dób
              </span>
              <strong style={{ color: palette.red }}>
                {d.amount} {d.currency}
              </strong>
            </div>
          ))}
          <p style={{ color: palette.smoke, fontSize: 12, marginTop: 8 }}>
            Diety liczone osobno per waluta (nie sumowane do wyniku EUR — bez kursów). Filtr po
            dacie podróży.
          </p>
        </div>
      )}

      <style>{`
        .print-only { display: none; }
        @media print {
          .no-print, .app-sidebar { display: none !important; }
          .print-only { display: block !important; }
          .app-main { padding: 0 !important; }
          .monthly-print, .monthly-print * { color: #111 !important; background: transparent !important; }
          .monthly-print table { border-collapse: collapse; width: 100%; }
          .monthly-print th, .monthly-print td { border: 1px solid #bbb !important; }
        }
      `}</style>
    </div>
  );
}

function Card({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string;
  accent?: string;
  sub?: React.ReactNode;
}) {
  return (
    <div style={styles.card}>
      <div style={{ fontSize: 12, color: palette.smoke }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: accent ?? palette.offWhite }}>
        {value}
      </div>
      {sub && <div style={{ marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/**
 * Zmiana wartości m/m. `invert` = niżej znaczy lepiej (koszty).
 *
 * [#378] `baseIncomplete` = miesiąc porównania (poprzedni) ma pozycje, które nie weszły
 * do sumy. Δ jest wtedy policzona względem zaniżonej bazy — liczbę pokazujemy, ale
 * jawnie oznaczoną, zamiast udawać, że porównanie jest wiarygodne.
 */
function Delta({
  now,
  prev,
  invert,
  baseIncomplete,
}: {
  now: number;
  prev: number | null;
  invert?: boolean;
  baseIncomplete?: boolean;
}) {
  if (prev == null) return <span style={{ fontSize: 12, color: palette.smoke }}>—</span>;
  const flag = baseIncomplete ? (
    <span
      title="Miesiąc porównania ma pozycje, które nie weszły do sumy — Δ liczona względem zaniżonej bazy."
      style={{ color: "#f0d98a" }}
    >
      {" "}
      ⚠ baza niepełna
    </span>
  ) : null;
  const d = round2(now - prev);
  if (d === 0)
    return (
      <span style={{ fontSize: 12, color: palette.smoke }}>
        = bez zmian
        {flag}
      </span>
    );
  const good = invert ? d < 0 : d > 0;
  return (
    <span style={{ fontSize: 12, color: good ? "#22c55e" : palette.red }}>
      {d > 0 ? "▲" : "▼"} {Math.abs(d)} € m/m
      {flag}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  printHead: { marginBottom: 12, lineHeight: 1.4 },
  controls: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginTop: 16 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  input: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "9px 10px",
    color: palette.offWhite,
  },
  cards: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 },
  // Ostrzeżenie o niepełnych danych — brak kwoty ma być widoczny jako brak,
  // nigdy jako koszt równy zeru.
  warn: {
    marginTop: 20,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #6b4a00",
    background: "#241c05",
    color: "#f0d98a",
    fontSize: 13,
    lineHeight: 1.6,
  },
  warnLink: { color: "#ffcf4a", textDecoration: "underline" },
  card: {
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 12,
    padding: "14px 18px",
    minWidth: 140,
  },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 16, fontSize: 14 },
  th: {
    textAlign: "left",
    color: palette.smoke,
    fontSize: 12,
    padding: "8px 10px",
    borderBottom: `1px solid ${palette.graphite}`,
  },
  thR: {
    textAlign: "right",
    color: palette.smoke,
    fontSize: 12,
    padding: "8px 10px",
    borderBottom: `1px solid ${palette.graphite}`,
  },
  td: { padding: "8px 10px", borderBottom: `1px solid ${palette.graphite}` },
  tdR: { padding: "8px 10px", borderBottom: `1px solid ${palette.graphite}`, textAlign: "right" },
  dietRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 10px",
    borderBottom: `1px solid ${palette.graphite}`,
    maxWidth: 420,
  },
};
