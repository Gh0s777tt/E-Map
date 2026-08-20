"use client";

import {
  consumptionFullToFull,
  detectFuelAnomalies,
  type FxRate,
  fuelConsumptionSeries,
  round2,
  summarizeFuel,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useMemo } from "react";
import { useT } from "@/components/LocaleProvider";
import { BarChart } from "@/components/ui";
import { tripActionLabel } from "@/lib/labels";
import { entry, type FuelRaw, monthlyCost, Stat, styles, type TripRaw } from "./shared";

export function VehicleDetail({
  reg,
  fuel,
  adblue,
  trips,
  rates,
  onBack,
}: {
  reg: string;
  fuel: FuelRaw[];
  adblue: FuelRaw[];
  trips: TripRaw[];
  /** [#378] Kursy EBC — kwoty przeliczamy na euro po dniu zdarzenia. */
  rates: readonly FxRate[];
  onBack: () => void;
}) {
  const t = useT();
  const cost = useMemo(() => monthlyCost([...fuel, ...adblue], rates), [fuel, adblue, rates]);
  const consSeries = useMemo(
    () =>
      fuelConsumptionSeries(fuel.map((r) => entry(r, rates)))
        .slice(-8)
        .map((s, i) => ({ label: String(i + 1), value: s.lPer100km })),
    [fuel, rates],
  );
  const anomalies = useMemo(
    () => detectFuelAnomalies(fuelConsumptionSeries(fuel.map((r) => entry(r, rates)))),
    [fuel, rates],
  );
  return (
    <div style={{ marginTop: 20 }}>
      {anomalies.length > 0 && (
        <div style={styles.anomalyBox}>
          ⚠️ <strong>{t("stats.detail.anomalyTitle")}</strong> {t("stats.detail.anomalyDesc")}
          <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
            {anomalies.map((a) => (
              <li key={`${a.fromKm}-${a.toKm}`}>
                {a.fromKm}–{a.toKm} km: <strong>{a.lPer100km} L/100km</strong> (+{a.deltaPct}%{" "}
                {t("stats.detail.anomalyVsMedian").replace("{median}", String(a.medianLPer100km))})
              </li>
            ))}
          </ul>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button type="button" style={styles.back} onClick={onBack}>
          ← {t("stats.detail.back")}
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{reg}</h2>
        <span style={{ flex: 1 }} />
        <Link href={`/forms/history`} style={{ color: palette.red, fontSize: 14 }}>
          {t("stats.detail.formsHistory")} →
        </Link>
      </div>

      {(cost.length > 0 || consSeries.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 24 }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>
              📈 {t("stats.detail.monthlyCosts")}
            </h3>
            <BarChart data={cost} unit=" €" />
          </div>
          {consSeries.length > 0 && (
            <div style={{ flex: 1, minWidth: 280 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>
                📉 {t("stats.detail.consumptionSeries")}
              </h3>
              <BarChart data={consSeries} color="#f59e0b" />
            </div>
          )}
        </div>
      )}

      <FuelBlock title={`⛽ ${t("settlements.fuel")}`} rows={fuel} rates={rates} full />
      <FuelBlock title="💧 AdBlue" rows={adblue} rates={rates} />

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 28 }}>🚚 {t("stats.fleet.trips")}</h3>
      {trips.length === 0 ? (
        <p style={{ color: palette.smoke }}>{t("stats.detail.noEvents")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          {trips.map((r) => (
            <div key={r.id} style={styles.line}>
              <span style={{ minWidth: 110 }}>{tripActionLabel(t, r.action)}</span>
              <span style={styles.dim}>{r.country}</span>
              <span style={{ flex: 1 }} />
              {r.weight_kg != null && <span style={styles.dim}>{r.weight_kg} kg</span>}
              {r.amount != null && <span style={styles.dim}>{r.amount}</span>}
              <span style={styles.dim}>{new Date(r.created_at).toLocaleDateString("pl-PL")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FuelBlock({
  title,
  rows,
  rates,
  full = false,
}: {
  title: string;
  rows: FuelRaw[];
  rates: readonly FxRate[];
  full?: boolean;
}) {
  const t = useT();
  if (rows.length === 0) return null;
  const entries = rows.map((r) => entry(r, rates));
  const s = summarizeFuel(entries);
  const cons = full ? consumptionFullToFull(entries) : s.avgConsumptionLPer100km;
  const sorted = [...rows].sort((a, b) => b.odometer_km - a.odometer_km);

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h3>
      <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
        <Stat label={t("stats.detail.entries")} value={String(s.count)} />
        <Stat label={t("form.field.liters")} value={`${s.totalLiters} L`} />
        <Stat label={t("stats.detail.avgUsage")} value={cons != null ? `${cons} L/100km` : "—"} />
        <Stat label={t("stats.detail.spend")} value={String(s.totalSpend)} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
        {sorted.map((r) => (
          <div key={r.id} style={styles.line}>
            <span style={{ minWidth: 90 }}>{round2(Number(r.liters))} L</span>
            <span style={styles.dim}>{r.odometer_km} km</span>
            {/* [#382] Te same dwa stany opisuje już historia formularzy, więc
                badge woła jej klucze zamiast zakładać własną parę o tym samym
                znaczeniu — inaczej „do pełna" mogłoby się rozjechać między
                ekranami przy pierwszej korekcie tłumaczenia. */}
            {!full ? null : r.is_full !== false ? (
              <span style={{ ...styles.badge, color: "#22c55e", borderColor: "#22c55e" }}>
                {t("history.full")}
              </span>
            ) : (
              <span
                style={{ ...styles.badge, color: palette.warning, borderColor: palette.warning }}
              >
                {t("history.partial")}
              </span>
            )}
            <span style={styles.dim}>{r.station_country}</span>
            <span style={{ flex: 1 }} />
            {r.price_total != null && <span style={styles.dim}>{r.price_total}</span>}
            <span style={styles.dim}>{new Date(r.created_at).toLocaleDateString("pl-PL")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
