"use client";

import { listFuelLogs, listOrders } from "@e-logistic/api";
import {
  effectiveModules,
  type MonthlyCostEntry,
  type MonthlyOrderEntry,
  monthlyFleetSummary,
  toCsv,
} from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ListStatus } from "@/components/ListStatus";
import { Button, PageHeader, SetupNotice } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

function thisMonth(): string {
  return new Date().toISOString().slice(0, 7);
}
function download(filename: string, text: string) {
  const blob = new Blob([`﻿${text}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MonthlyPage() {
  const { vehicles, source } = useFleet();
  const [month, setMonth] = useState(thisMonth);
  const [orders, setOrders] = useState<MonthlyOrderEntry[]>([]);
  const [fuel, setFuel] = useState<MonthlyCostEntry[]>([]);
  const [adblue, setAdblue] = useState<MonthlyCostEntry[]>([]);
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
      const [ord, f, a] = await Promise.all([
        listOrders(sb, m.companyId),
        listFuelLogs(sb, { limit: 5000 }),
        listFuelLogs(sb, { table: "adblue_logs", limit: 5000 }),
      ]);
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const regOf = (id: string | null) =>
    id ? (vehicles.find((v) => v.id === id)?.registration ?? id.slice(0, 8)) : "Bez pojazdu";

  const summary = useMemo(
    () => monthlyFleetSummary({ month, orders, fuel, adblue }),
    [month, orders, fuel, adblue],
  );

  function exportCsv() {
    const headers = ["Pojazd", "Przychód EUR", "Paliwo", "AdBlue", "Wynik"];
    const rows: (string | number)[][] = summary.rows.map((r) => [
      regOf(r.vehicleId),
      r.revenueEur,
      r.fuelCost,
      r.adblueCost,
      r.net,
    ]);
    rows.push([]);
    rows.push([
      "RAZEM",
      summary.totals.revenueEur,
      summary.totals.fuelCost,
      summary.totals.adblueCost,
      summary.totals.net,
    ]);
    download(`zestawienie_${month}.csv`, toCsv(headers, rows));
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
    <div style={{ maxWidth: 900 }}>
      <PageHeader
        title="Zestawienie miesięczne (flota)"
        subtitle="Przychód ze zleceń (dostarczone i zafakturowane, EUR) zestawiony z kosztami paliwa i AdBlue — per pojazd, dla wybranego miesiąca. Eksport CSV (Excel) i wydruk/PDF."
      />

      <SetupNotice source={source} />

      <div style={styles.controls} className="no-print">
        <label style={styles.field}>
          <span style={styles.label}>Miesiąc</span>
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
            <Card label="Przychód (EUR)" value={`${summary.totals.revenueEur} €`} />
            <Card label="Koszt paliwa" value={`${summary.totals.fuelCost} €`} />
            <Card label="Koszt AdBlue" value={`${summary.totals.adblueCost} €`} />
            <Card
              label="Wynik"
              value={`${summary.totals.net} €`}
              accent={summary.totals.net >= 0 ? "#22c55e" : palette.red}
            />
          </div>

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
                  <td style={styles.td}>{regOf(r.vehicleId)}</td>
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

      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={styles.card}>
      <div style={{ fontSize: 12, color: palette.smoke }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: accent ?? palette.offWhite }}>
        {value}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  controls: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginTop: 16 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, color: palette.smoke },
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
};
