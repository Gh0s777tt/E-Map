/** Wspólne typy, helpery i style ekranu statystyk (współdzielone przez page + podkomponenty). */
import { type FuelStatsEntry, round2 } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";

export type FuelRaw = {
  id: string;
  vehicle_id: string;
  odometer_km: number;
  liters: number;
  price_total: number | null;
  is_full?: boolean;
  station_country: string;
  created_at: string;
};
export type TripRaw = {
  id: string;
  vehicle_id: string;
  action: string;
  weight_kg: number | null;
  amount: number | null;
  country: string;
  created_at: string;
};

export const entry = (r: FuelRaw): FuelStatsEntry & { isFull?: boolean } => ({
  odometerKm: r.odometer_km,
  liters: Number(r.liters),
  priceTotal: r.price_total != null ? Number(r.price_total) : undefined,
  isFull: r.is_full !== false,
});

/** Suma kosztów wg miesiąca (ostatnie 6) — do wykresu słupkowego. */
export function monthlyCost(rows: FuelRaw[]): { label: string; value: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.price_total == null) continue;
    const m = r.created_at.slice(0, 7);
    map.set(m, (map.get(m) ?? 0) + Number(r.price_total));
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([m, v]) => ({ label: `${m.slice(5)}.${m.slice(2, 4)}`, value: round2(v) }));
}

export function FleetStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 130,
        padding: 14,
        borderRadius: 12,
        background: palette.nearBlack,
        border: `1px solid ${palette.graphite}`,
      }}
    >
      <div style={{ color: palette.smoke, fontSize: 12 }}>{label}</div>
      <div
        style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: accent ?? palette.offWhite }}
      >
        {value}
      </div>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        minWidth: 140,
        padding: 14,
        borderRadius: 12,
        background: palette.nearBlack,
        border: `1px solid ${palette.graphite}`,
      }}
    >
      <div style={{ color: palette.smoke, fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: palette.red }}>{value}</div>
    </div>
  );
}

export const styles: Record<string, React.CSSProperties> = {
  fleet: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 },
  analytics: { display: "flex", gap: 14, flexWrap: "wrap", marginTop: 24 },
  anCol: {
    flex: 1,
    minWidth: 280,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 12,
    padding: "12px 16px",
  },
  anHead: { fontWeight: 800, fontSize: 14, marginBottom: 8 },
  anRow: { display: "flex", gap: 10, alignItems: "center", padding: "5px 0", fontSize: 14 },
  pnl: {
    marginTop: 24,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 12,
    padding: "14px 16px",
  },
  pnlTag: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 999,
    padding: "4px 12px",
    fontSize: 13,
  },
  profitWrap: {
    marginTop: 24,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 12,
    padding: "14px 16px",
  },
  profitTotals: { display: "flex", gap: 12, flexWrap: "wrap" },
  profitRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: "6px 0",
    fontSize: 14,
    borderBottom: `1px solid ${palette.graphite}`,
  },
  profitCol: { width: 84, textAlign: "right", flexShrink: 0 },
  profitNote: { color: palette.smoke, fontSize: 12, marginTop: 10, lineHeight: 1.5 },
  trendSelect: {
    background: palette.black,
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 13,
    maxWidth: 220,
  },
  alertWrap: {
    marginTop: 24,
    padding: "14px 16px",
    borderRadius: 12,
    background: "#2a0d0d",
    border: `1px solid ${palette.red}`,
  },
  alertPill: {
    background: palette.red,
    color: palette.white,
    borderRadius: 999,
    padding: "1px 9px",
    fontSize: 12,
    fontWeight: 700,
  },
  alertRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "6px 0",
    fontSize: 14,
    borderBottom: `1px solid ${palette.graphite}`,
  },
  anomalyBox: {
    background: "#2a0d0d",
    border: `1px solid ${palette.red}`,
    borderRadius: 12,
    padding: "12px 16px",
    color: palette.offWhite,
    fontSize: 14,
  },
  tile: {
    minWidth: 200,
    textAlign: "left",
    padding: 18,
    borderRadius: 14,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    color: palette.offWhite,
    cursor: "pointer",
  },
  back: {
    background: "transparent",
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "7px 12px",
    cursor: "pointer",
  },
  line: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: 8,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    fontSize: 14,
  },
  dim: { color: palette.smoke, fontSize: 13 },
  badge: { fontSize: 11, padding: "2px 8px", borderRadius: 999, border: "1px solid" },
};
