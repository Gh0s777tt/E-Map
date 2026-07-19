"use client";

/**
 * #335: Analityka floty — insighty właściciela liczone z realnych danych
 * (bez zewnętrznego AI): trend i prognoza kosztu paliwa, pojazdy odstające
 * spalaniem i szacunek możliwych oszczędności. Silnik `buildFleetInsights`.
 */
import { listFuelLogs, listVehicles } from "@e-logistic/api";
import {
  buildFleetInsights,
  type FleetInsights,
  type MonthlyPoint,
  type VehicleConsumption,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { BarChart, PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

interface FuelRow {
  vehicle_id: string | null;
  liters: number | null;
  odometer_km: number | null;
  price_total: number | null;
  created_at: string;
}

const zl = (n: number) => `${n.toLocaleString("pl-PL", { maximumFractionDigits: 0 })} zł`;

export default function AnalyticsPage() {
  const t = useT();
  const [insights, setInsights] = useState<FleetInsights | null>(null);
  const [series, setSeries] = useState<MonthlyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) throw new Error(t("analytics.noCompany"));
      const from = new Date(Date.now() - 190 * 86_400_000).toISOString();
      const [logs, vehicles] = await Promise.all([
        listFuelLogs(sb, { from, limit: 5000 }) as Promise<FuelRow[]>,
        listVehicles(sb, m.companyId) as Promise<{ id: string; registration: string }[]>,
      ]);

      // Miesięczny koszt paliwa (ostatnie 6 miesięcy z danymi).
      const byMonth = new Map<string, number>();
      let totalLiters = 0;
      let totalCost = 0;
      for (const l of logs) {
        const month = l.created_at.slice(0, 7);
        byMonth.set(month, (byMonth.get(month) ?? 0) + (l.price_total ?? 0));
        totalLiters += l.liters ?? 0;
        totalCost += l.price_total ?? 0;
      }
      const monthlyFuelCost: MonthlyPoint[] = [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, value]) => ({ month, value: Math.round(value) }));
      setSeries(monthlyFuelCost);

      const fuelPricePerL = totalLiters > 0 && totalCost > 0 ? totalCost / totalLiters : 6.5;

      // Spalanie per pojazd: litry / rozpiętość licznika × 100 (gdy ≥2 tankowania i sensowny dystans).
      const regOf = new Map(vehicles.map((v) => [v.id, v.registration]));
      const perVehicle = new Map<string, { liters: number; odos: number[] }>();
      for (const l of logs) {
        if (!l.vehicle_id) continue;
        const cur = perVehicle.get(l.vehicle_id) ?? { liters: 0, odos: [] };
        cur.liters += l.liters ?? 0;
        if (typeof l.odometer_km === "number" && l.odometer_km > 0) cur.odos.push(l.odometer_km);
        perVehicle.set(l.vehicle_id, cur);
      }
      const vehicleConsumption: VehicleConsumption[] = [...perVehicle.entries()].map(
        ([id, { liters, odos }]) => {
          const km = odos.length >= 2 ? Math.max(...odos) - Math.min(...odos) : 0;
          const avgConsumption = km > 50 ? Math.round((liters / km) * 100 * 10) / 10 : null;
          return { registration: regOf.get(id) ?? "—", avgConsumption, km };
        },
      );

      setInsights(
        buildFleetInsights({ monthlyFuelCost, vehicles: vehicleConsumption, fuelPricePerL }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("analytics.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  const trend = insights?.fuelTrend ?? null;
  const trendIcon = trend
    ? trend.direction === "up"
      ? "📈"
      : trend.direction === "down"
        ? "📉"
        : "➖"
    : "";
  const trendColor = trend
    ? trend.direction === "up"
      ? palette.danger
      : trend.direction === "down"
        ? palette.success
        : palette.smoke
    : palette.smoke;

  return (
    <div style={{ maxWidth: 860 }}>
      <PageHeader title={t("analytics.title")} subtitle={t("analytics.subtitle")} />

      <ListStatus
        loading={loading}
        error={error}
        empty={!loading && !error && series.length === 0}
        emptyText={t("analytics.empty")}
        onRetry={load}
      />

      {insights && series.length > 0 && (
        <>
          <div style={s.kpiRow}>
            <div style={s.kpi}>
              <div style={{ ...s.kpiVal, color: trendColor }}>
                {trendIcon} {trend ? `${trend.changePct > 0 ? "+" : ""}${trend.changePct}%` : "—"}
              </div>
              <div style={s.kpiLbl}>{t("analytics.kpiTrend")}</div>
            </div>
            <div style={s.kpi}>
              <div style={s.kpiVal}>{trend ? zl(trend.forecastNext) : "—"}</div>
              <div style={s.kpiLbl}>{t("analytics.kpiForecast")}</div>
            </div>
            <div style={s.kpi}>
              <div
                style={{
                  ...s.kpiVal,
                  color: insights.potentialSavings > 0 ? palette.red : palette.success,
                }}
              >
                {zl(insights.potentialSavings)}
              </div>
              <div style={s.kpiLbl}>{t("analytics.kpiSavings")}</div>
            </div>
          </div>

          <h3 style={s.h3}>{t("analytics.monthlyFuelCost")}</h3>
          <BarChart
            data={series.map((p) => ({ label: p.month.slice(5), value: p.value }))}
            unit=" zł"
            color={palette.red}
          />

          <h3 style={s.h3}>{t("analytics.outliersHeading")}</h3>
          {insights.outliers.length === 0 ? (
            <p style={s.dim}>
              ✅ {t("analytics.noOutliers")}
              {insights.outliers.length === 0 && series.length > 0 ? "." : ""}{" "}
              {t("analytics.fleetUniform")}
            </p>
          ) : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {[
                      t("analytics.colVehicle"),
                      t("analytics.colConsumption"),
                      t("analytics.colFleetMedian"),
                      t("analytics.colAbove"),
                      t("analytics.colExtraCost"),
                    ].map((h) => (
                      <th key={h} style={s.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {insights.outliers.map((o) => (
                    <tr key={o.registration}>
                      <td style={{ ...s.td, fontWeight: 700 }}>{o.registration}</td>
                      <td style={s.td}>{o.avgConsumption} l/100</td>
                      <td style={s.td}>{o.fleetMedian} l/100</td>
                      <td style={{ ...s.td, color: palette.danger, fontWeight: 700 }}>
                        +{o.overMedianPct}%
                      </td>
                      <td style={{ ...s.td, color: palette.red, fontWeight: 700 }}>
                        {zl(o.extraCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p style={s.note}>{t("analytics.note")}</p>
        </>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    marginTop: 8,
  },
  kpi: {
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 14,
    padding: "16px 18px",
  },
  kpiVal: { fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums" },
  kpiLbl: { color: palette.smoke, fontSize: 12, marginTop: 4 },
  h3: { fontSize: 16, fontWeight: 700, margin: "28px 0 12px" },
  dim: { color: palette.smoke, fontSize: 14 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    textAlign: "left",
    color: palette.smoke,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    padding: "10px 12px",
    borderBottom: `1px solid ${palette.graphite}`,
  },
  td: { padding: "12px", borderBottom: `1px solid ${palette.graphite}` },
  note: { color: palette.smoke, fontSize: 12.5, marginTop: 18, lineHeight: 1.6 },
};
