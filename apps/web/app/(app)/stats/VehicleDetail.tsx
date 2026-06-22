"use client";

import {
  consumptionFullToFull,
  detectFuelAnomalies,
  fuelConsumptionSeries,
  round2,
  summarizeFuel,
} from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
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
  onBack,
}: {
  reg: string;
  fuel: FuelRaw[];
  adblue: FuelRaw[];
  trips: TripRaw[];
  onBack: () => void;
}) {
  const t = useT();
  const cost = useMemo(() => monthlyCost([...fuel, ...adblue]), [fuel, adblue]);
  const consSeries = useMemo(
    () =>
      fuelConsumptionSeries(fuel.map(entry))
        .slice(-8)
        .map((s, i) => ({ label: String(i + 1), value: s.lPer100km })),
    [fuel],
  );
  const anomalies = useMemo(
    () => detectFuelAnomalies(fuelConsumptionSeries(fuel.map(entry))),
    [fuel],
  );
  return (
    <div style={{ marginTop: 20 }}>
      {anomalies.length > 0 && (
        <div style={styles.anomalyBox}>
          ⚠️ <strong>Wykryto anomalie spalania</strong> (powyżej mediany pojazdu) — możliwy wyciek,
          kradzież lub usterka:
          <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
            {anomalies.map((a) => (
              <li key={`${a.fromKm}-${a.toKm}`}>
                {a.fromKm}–{a.toKm} km: <strong>{a.lPer100km} L/100km</strong> (+{a.deltaPct}% vs
                mediana {a.medianLPer100km})
              </li>
            ))}
          </ul>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button type="button" style={styles.back} onClick={onBack}>
          ← Wszystkie pojazdy
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{reg}</h2>
        <span style={{ flex: 1 }} />
        <Link href={`/forms/history`} style={{ color: palette.red, fontSize: 14 }}>
          Historia formularzy →
        </Link>
      </div>

      {(cost.length > 0 || consSeries.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 24 }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>
              📈 Koszty miesięczne
            </h3>
            <BarChart data={cost} unit=" €" />
          </div>
          {consSeries.length > 0 && (
            <div style={{ flex: 1, minWidth: 280 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>
                📉 Spalanie wg tankowań (L/100km)
              </h3>
              <BarChart data={consSeries} color="#f59e0b" />
            </div>
          )}
        </div>
      )}

      <FuelBlock title="⛽ Paliwo" rows={fuel} full />
      <FuelBlock title="💧 AdBlue" rows={adblue} />

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 28 }}>🚚 Trasy</h3>
      {trips.length === 0 ? (
        <p style={{ color: palette.smoke }}>Brak zdarzeń.</p>
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
  full = false,
}: {
  title: string;
  rows: FuelRaw[];
  full?: boolean;
}) {
  if (rows.length === 0) return null;
  const entries = rows.map(entry);
  const s = summarizeFuel(entries);
  const cons = full ? consumptionFullToFull(entries) : s.avgConsumptionLPer100km;
  const sorted = [...rows].sort((a, b) => b.odometer_km - a.odometer_km);

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h3>
      <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
        <Stat label="Wpisów" value={String(s.count)} />
        <Stat label="Litry" value={`${s.totalLiters} L`} />
        <Stat label="Śr. zużycie" value={cons != null ? `${cons} L/100km` : "—"} />
        <Stat label="Wydatek" value={String(s.totalSpend)} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
        {sorted.map((r) => (
          <div key={r.id} style={styles.line}>
            <span style={{ minWidth: 90 }}>{round2(Number(r.liters))} L</span>
            <span style={styles.dim}>{r.odometer_km} km</span>
            {!full ? null : r.is_full !== false ? (
              <span style={{ ...styles.badge, color: "#22c55e", borderColor: "#22c55e" }}>
                do pełna
              </span>
            ) : (
              <span
                style={{ ...styles.badge, color: palette.warning, borderColor: palette.warning }}
              >
                częściowe
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
