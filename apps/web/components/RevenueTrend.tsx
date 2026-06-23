"use client";

import { listOrders } from "@e-logistic/api";
import { monthlyFleetTrend, monthsEndingAt } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useEffect, useState } from "react";
import { BarChart } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

interface Point {
  label: string;
  value: number;
}

/**
 * Mini-wykres przychodu floty (6 mies.) na pulpicie — owner/dispatcher.
 * Przychód EUR ze zleceń dostarczonych/zafakturowanych per miesiąc (rdzeń
 * `monthlyFleetTrend`; paliwo/AdBlue pominięte — liczymy tylko przychód).
 * Liczony na żywo; brak danych / kierowca → nic nie renderuje.
 */
export function RevenueTrend() {
  const [points, setPoints] = useState<Point[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const m = await getCachedMembership(sb);
        if (!m || (m.role !== "owner" && m.role !== "dispatcher")) return;
        const month = new Date().toISOString().slice(0, 7);
        const months = monthsEndingAt(month, 6);
        const from = months.length ? `${months[0]}-01` : undefined;
        const ord = await listOrders(sb, m.companyId, { from, limit: 5000 });
        const trend = monthlyFleetTrend({
          months,
          orders: ord.map((o) => ({
            vehicleId: o.vehicle_id,
            price: o.price,
            currency: o.currency,
            status: o.status,
            date: o.load_date ?? o.created_at.slice(0, 10),
          })),
          fuel: [],
          adblue: [],
        });
        setPoints(
          trend.map((t) => ({
            label: `${t.month.slice(5)}.${t.month.slice(2, 4)}`,
            value: t.revenueEur,
          })),
        );
      } catch {
        // offline / brak dostępu → ukryj
      }
    })();
  }, []);

  if (!points || points.every((p) => p.value === 0)) return null;

  return (
    <div style={styles.card}>
      <div style={styles.head}>
        📈 Przychód — ostatnie {points.length} mies.{" "}
        <span style={{ color: palette.smoke, fontSize: 12, fontWeight: 400 }}>
          (zlecenia EUR · dostarczone/zafakturowane)
        </span>
      </div>
      <BarChart data={points} unit=" €" />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
  head: { fontWeight: 800, marginBottom: 10 },
};
