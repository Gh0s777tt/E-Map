"use client";

import { listFuelLogs, listTripEvents, listVehicles } from "@e-logistic/api";
import {
  consumptionFullToFull,
  type FuelStatsEntry,
  round2,
  summarizeFuel,
} from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

const t = createTranslator("pl");

type FuelRaw = {
  id: string;
  vehicle_id: string;
  odometer_km: number;
  liters: number;
  price_total: number | null;
  is_full?: boolean;
  station_country: string;
  created_at: string;
};
type TripRaw = {
  id: string;
  vehicle_id: string;
  action: string;
  weight_kg: number | null;
  amount: number | null;
  country: string;
  created_at: string;
};

const ACTION_PL: Record<string, string> = {
  load: "Załadunek",
  unload: "Rozładunek",
  start: "Start",
  end: "Koniec",
  service: "Serwis",
  other: "Inne",
};

const entry = (r: FuelRaw): FuelStatsEntry & { isFull?: boolean } => ({
  odometerKm: r.odometer_km,
  liters: Number(r.liters),
  priceTotal: r.price_total != null ? Number(r.price_total) : undefined,
  isFull: r.is_full !== false,
});

export default function StatsPage() {
  const [vehicles, setVehicles] = useState<{ id: string; registration: string }[]>([]);
  const [fuel, setFuel] = useState<FuelRaw[]>([]);
  const [adblue, setAdblue] = useState<FuelRaw[]>([]);
  const [trips, setTrips] = useState<TripRaw[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const m = await getCachedMembership(sb);
        if (!m) return;
        const [f, a, tr, vs] = await Promise.all([
          listFuelLogs(sb, { limit: 2000 }),
          listFuelLogs(sb, { table: "adblue_logs", limit: 2000 }),
          listTripEvents(sb, { limit: 2000 }),
          listVehicles(sb, m.companyId),
        ]);
        setFuel(f as FuelRaw[]);
        setAdblue(a as FuelRaw[]);
        setTrips(tr as TripRaw[]);
        setVehicles(
          (vs as { id: string; registration: string }[]).map((v) => ({
            id: v.id,
            registration: v.registration,
          })),
        );
      } finally {
        setReady(true);
      }
    })();
  }, []);

  function byV<T extends { vehicle_id: string }>(rows: T[], id: string): T[] {
    return rows.filter((r) => r.vehicle_id === id);
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("nav.stats")}</h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        Wybierz pojazd, by zobaczyć jego tankowania i trasy. Spalanie liczone „od pełna do pełna";
        tankowania częściowe są wliczane do litrów i kosztów.
      </p>

      {ready && vehicles.length === 0 && (
        <p style={{ color: palette.smoke, marginTop: 24 }}>Brak pojazdów / danych.</p>
      )}

      {!selected ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 24 }}>
          {vehicles.map((v) => {
            const fEntries = byV(fuel, v.id).map(entry);
            const s = summarizeFuel(fEntries);
            const cons = consumptionFullToFull(fEntries);
            const tripCount = byV(trips, v.id).length;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelected(v.id)}
                style={styles.tile}
              >
                <div style={{ fontSize: 18, fontWeight: 800 }}>{v.registration}</div>
                <div style={{ color: palette.smoke, fontSize: 13, marginTop: 8 }}>
                  ⛽ {s.count} tank. · {s.totalLiters} L
                </div>
                <div style={{ color: palette.red, fontWeight: 700, marginTop: 4 }}>
                  {cons != null ? `${cons} L/100km` : "— L/100km"}
                </div>
                <div style={{ color: palette.smoke, fontSize: 12, marginTop: 4 }}>
                  🚚 {tripCount} zdarzeń trasy
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <VehicleDetail
          reg={vehicles.find((v) => v.id === selected)?.registration ?? "?"}
          fuel={byV(fuel, selected)}
          adblue={byV(adblue, selected)}
          trips={byV(trips, selected)}
          onBack={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function VehicleDetail({
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
  return (
    <div style={{ marginTop: 20 }}>
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

      <FuelBlock title="⛽ Paliwo" rows={fuel} full />
      <FuelBlock title="💧 AdBlue" rows={adblue} />

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 28 }}>🚚 Trasy</h3>
      {trips.length === 0 ? (
        <p style={{ color: palette.smoke }}>Brak zdarzeń.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          {trips.map((r) => (
            <div key={r.id} style={styles.line}>
              <span style={{ minWidth: 110 }}>{ACTION_PL[r.action] ?? r.action}</span>
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

function Stat({ label, value }: { label: string; value: string }) {
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

const styles: Record<string, React.CSSProperties> = {
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
