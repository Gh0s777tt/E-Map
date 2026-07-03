"use client";

import {
  getCompany,
  listFuelLogs,
  listOrders,
  listPerDiemTrips,
  listVehicleCosts,
  type PerDiemTrip,
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

export default function MonthlyPage() {
  const t = useT();
  const { vehicles, source } = useFleet();
  const [month, setMonth] = useState(thisMonth);
  const [orders, setOrders] = useState<MonthlyOrderEntry[]>([]);
  const [fuel, setFuel] = useState<MonthlyCostEntry[]>([]);
  const [adblue, setAdblue] = useState<MonthlyCostEntry[]>([]);
  const [costs, setCosts] = useState<VehicleCost[]>([]);
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
      const window6 = monthsEndingAt(month, 6);
      const from = window6.length ? `${window6[0]}-01` : undefined;
      const toDate = new Date(`${month}-01T00:00:00Z`);
      toDate.setUTCMonth(toDate.getUTCMonth() + 1);
      const to = toDate.toISOString().slice(0, 10); // 1. dzień kolejnego miesiąca
      const [ord, f, a, vc, pd, comp] = await Promise.all([
        listOrders(sb, m.companyId, { from, to }),
        listFuelLogs(sb, { from, to, limit: 5000 }),
        listFuelLogs(sb, { table: "adblue_logs", from, to, limit: 5000 }),
        listVehicleCosts(sb, m.companyId, { from, limit: 5000 }),
        listPerDiemTrips(sb, m.companyId, { limit: 5000 }),
        getCompany(sb, m.companyId),
      ]);
      setCompanyName(comp?.name ?? "");
      setCosts(vc);
      setPerDiems(pd);
      setOrders(
        ord.map((o) => ({
          vehicleId: o.vehicle_id,
          price: o.price,
          currency: o.currency,
          status: o.status,
          date: o.load_date ?? o.created_at.slice(0, 10),
        })),
      );
      const toCost = (r: {
        vehicle_id: string;
        price_total: number | null;
        created_at: string;
      }) => ({
        vehicleId: r.vehicle_id,
        priceTotal: r.price_total,
        date: r.created_at.slice(0, 10),
      });
      setFuel(
        (f as { vehicle_id: string; price_total: number | null; created_at: string }[]).map(toCost),
      );
      setAdblue(
        (a as { vehicle_id: string; price_total: number | null; created_at: string }[]).map(toCost),
      );
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

  // Trend 6 miesięcy kończący na wybranym + poprzedni miesiąc do porównania m/m.
  const trend = useMemo(
    () => monthlyFleetTrend({ months: monthsEndingAt(month, 6), orders, fuel, adblue }),
    [month, orders, fuel, adblue],
  );
  const prev = trend.length >= 2 ? trend[trend.length - 2] : null;

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
    type Entry = { date: string; vehicleId: string | null; category: string; amount: number };
    const entries: Entry[] = [
      ...fuel
        .filter((r) => inMonth(r.date))
        .map((r) => ({
          date: r.date,
          vehicleId: r.vehicleId,
          category: "Paliwo",
          amount: round2(Number(r.priceTotal ?? 0)),
        })),
      ...adblue
        .filter((r) => inMonth(r.date))
        .map((r) => ({
          date: r.date,
          vehicleId: r.vehicleId,
          category: "AdBlue",
          amount: round2(Number(r.priceTotal ?? 0)),
        })),
      ...costs
        .filter((c) => c.currency === "EUR" && inMonth(c.cost_date))
        .map((c) => ({
          date: c.cost_date,
          vehicleId: c.vehicle_id,
          category: catLabel(c.category),
          amount: round2(Number(c.amount)),
        })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    const reg = costRegister(entries.map((e) => ({ category: e.category, amount: e.amount })));
    const headers = [t("common.date"), t("common.vehicle"), "Kategoria", "Kwota (EUR)"];
    const rows: (string | number)[][] = entries.map((e) => [
      e.date,
      regOf(e.vehicleId),
      e.category,
      e.amount,
    ]);
    rows.push([]);
    rows.push(["Podsumowanie wg kategorii"]);
    for (const g of reg.groups) rows.push([g.category, "", `${g.count} szt.`, g.amount]);
    rows.push([t("common.total"), "", `${reg.count} szt.`, reg.total]);

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
        subtitle="Przychód ze zleceń (dostarczone i zafakturowane, EUR) zestawiony z kosztami paliwa i AdBlue — per pojazd, dla wybranego miesiąca. Eksport CSV (Excel) i wydruk/PDF."
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

      {!loading && !loadErr && summary.rows.length > 0 && (
        <>
          <div style={styles.cards}>
            <Card
              label="Przychód (EUR)"
              value={`${summary.totals.revenueEur} €`}
              sub={<Delta now={summary.totals.revenueEur} prev={prev?.revenueEur ?? null} />}
            />
            <Card
              label="Koszt paliwa"
              value={`${summary.totals.fuelCost} €`}
              sub={<Delta now={summary.totals.fuelCost} prev={prev?.fuelCost ?? null} invert />}
            />
            <Card
              label="Koszt AdBlue"
              value={`${summary.totals.adblueCost} €`}
              sub={<Delta now={summary.totals.adblueCost} prev={prev?.adblueCost ?? null} invert />}
            />
            <Card
              label="Wynik"
              value={`${summary.totals.net} €`}
              accent={summary.totals.net >= 0 ? "#22c55e" : palette.red}
              sub={<Delta now={summary.totals.net} prev={prev?.net ?? null} />}
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
              <BarChart
                data={trend.map((t) => ({
                  label: `${t.month.slice(5)}.${t.month.slice(2, 4)}`,
                  value: t.revenueEur,
                }))}
                unit=" €"
              />
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

          <p style={{ color: palette.smoke, fontSize: 12, marginTop: 12 }}>
            Uwaga: przychód liczony tylko dla zleceń w EUR (inne waluty pominięte — bez kursów).
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

/** Zmiana wartości m/m. `invert` = niżej znaczy lepiej (koszty). */
function Delta({ now, prev, invert }: { now: number; prev: number | null; invert?: boolean }) {
  if (prev == null) return <span style={{ fontSize: 12, color: palette.smoke }}>—</span>;
  const d = round2(now - prev);
  if (d === 0) return <span style={{ fontSize: 12, color: palette.smoke }}>= bez zmian</span>;
  const good = invert ? d < 0 : d > 0;
  return (
    <span style={{ fontSize: 12, color: good ? "#22c55e" : palette.red }}>
      {d > 0 ? "▲" : "▼"} {Math.abs(d)} € m/m
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
