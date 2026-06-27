"use client";

import { listDriverPayouts, listFuelLogs, listOrders, listPerDiemTrips } from "@e-logistic/api";
import {
  computePerDiem,
  monthlyFleetSummary,
  settleDriverPayouts,
  sumPerDiem,
} from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

interface Kpi {
  inProgress: number;
  toInvoice: number;
  revenue: number;
  net: number;
  perDiem: string;
  payout: string;
}

const OPEN = new Set(["new", "assigned", "in_progress"]);

type CostRow = { vehicle_id: string; price_total: number | null; created_at: string };

/**
 * Pasek KPI na pulpit (owner/dispatcher) — operacyjny skrót na start dnia:
 * zlecenia w toku, do zafakturowania, wynik bieżącego miesiąca (EUR), należne
 * diety i saldo do wypłaty. Liczony na żywo; dla kierowcy nic nie renderuje.
 */
export function KpiStrip() {
  const [kpi, setKpi] = useState<Kpi | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const m = await getCachedMembership(sb);
        if (!m || (m.role !== "owner" && m.role !== "dispatcher")) return;
        const month = new Date().toISOString().slice(0, 7);
        const from = `${month}-01`;
        const toD = new Date(`${month}-01T00:00:00Z`);
        toD.setUTCMonth(toD.getUTCMonth() + 1);
        const to = toD.toISOString().slice(0, 10);
        const [orders, fuel, adblue, pds, pays] = await Promise.all([
          listOrders(sb, m.companyId),
          listFuelLogs(sb, { from, to, limit: 5000 }),
          listFuelLogs(sb, { table: "adblue_logs", from, to, limit: 5000 }),
          listPerDiemTrips(sb, m.companyId, { limit: 5000 }),
          listDriverPayouts(sb, m.companyId, { limit: 5000 }),
        ]);
        const toCost = (r: CostRow) => ({
          vehicleId: r.vehicle_id,
          priceTotal: r.price_total,
          date: r.created_at.slice(0, 10),
        });
        const summary = monthlyFleetSummary({
          month,
          orders: orders.map((o) => ({
            vehicleId: o.vehicle_id,
            price: o.price,
            currency: o.currency,
            status: o.status,
            date: o.load_date ?? o.created_at.slice(0, 10),
          })),
          fuel: (fuel as CostRow[]).map(toCost),
          adblue: (adblue as CostRow[]).map(toCost),
        });
        const pdTotals = sumPerDiem(
          pds
            .filter((p) => p.trip_date?.startsWith(month))
            .map((p) =>
              computePerDiem({
                destination: p.destination ?? "",
                mode: p.mode,
                hours: p.hours,
                dailyRate: p.daily_rate,
                currency: p.currency,
              }),
            ),
        );
        const payBalances = settleDriverPayouts(
          pays.map((p) => ({ kind: p.kind, amount: p.amount, currency: p.currency })),
        ).filter((b) => b.balance !== 0);
        setKpi({
          inProgress: orders.filter((o) => OPEN.has(o.status)).length,
          toInvoice: orders.filter((o) => o.status === "delivered").length,
          revenue: summary.totals.revenueEur,
          net: summary.totals.net,
          perDiem: pdTotals.length
            ? pdTotals.map((t) => `${t.amount} ${t.currency}`).join(" · ")
            : "—",
          payout: payBalances.length
            ? payBalances.map((b) => `${b.balance} ${b.currency}`).join(" · ")
            : "—",
        });
      } catch {
        // offline / brak dostępu → ukryj pasek
      }
    })();
  }, []);

  if (!kpi) return null;
  const month = new Date().toISOString().slice(0, 7);

  return (
    <div style={styles.strip}>
      <Card href="/orders" label="Zlecenia w toku" value={String(kpi.inProgress)} />
      <Card href="/orders" label="Do zafakturowania" value={String(kpi.toInvoice)} accentZero />
      <Card
        href="/monthly"
        label={`Wynik ${month} (EUR)`}
        value={`${kpi.net} €`}
        accent={kpi.net >= 0 ? palette.success : palette.red}
        sub={`przychód ${kpi.revenue} €`}
      />
      <Card href="/per-diem" label="Diety (mies.)" value={kpi.perDiem} small />
      <Card href="/payouts" label="Saldo do wypłaty" value={kpi.payout} small />
    </div>
  );
}

function Card({
  href,
  label,
  value,
  sub,
  accent,
  accentZero,
  small,
}: {
  href: string;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  accentZero?: boolean;
  small?: boolean;
}) {
  const isZero = value === "0";
  return (
    <Link href={href} style={styles.card}>
      <div style={{ fontSize: 12, color: palette.smoke }}>{label}</div>
      <div
        style={{
          fontSize: small ? 18 : 24,
          fontWeight: 800,
          marginTop: 4,
          color: accent ?? (accentZero && !isZero ? palette.warning : palette.offWhite),
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: palette.smoke, marginTop: 2 }}>{sub}</div>}
    </Link>
  );
}

const styles: Record<string, React.CSSProperties> = {
  strip: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 },
  card: {
    flex: 1,
    minWidth: 160,
    padding: "14px 18px",
    borderRadius: 12,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    color: palette.offWhite,
    textDecoration: "none",
  },
};
