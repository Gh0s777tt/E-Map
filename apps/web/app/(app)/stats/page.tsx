"use client";

import { getActiveMembership, listFuelLogs, listTripEvents, listVehicles } from "@e-logistic/api";
import {
  consumptionFullToFull,
  type FuelStatsEntry,
  round2,
  summarizeFuel,
} from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

const t = createTranslator("pl");

type FuelEntry = FuelStatsEntry & { isFull?: boolean };
type Group = { id: string; label: string; entries: FuelEntry[] };
type TripRow = {
  vehicle_id: string;
  action: string;
  weight_kg: number | null;
  amount: number | null;
};
type TripSummary = {
  count: number;
  loadKg: number;
  unloadKg: number;
  serviceCost: number;
};

const ACTION_PL: Record<string, string> = {
  load: "Załadunki",
  unload: "Rozładunki",
  start: "Starty",
  end: "Zakończenia",
  service: "Serwisy",
  other: "Inne",
};

function groupFuel(
  logs: {
    vehicle_id: string;
    odometer_km: number;
    liters: number;
    price_total: number | null;
    is_full?: boolean;
  }[],
  labelOf: (id: string) => string,
): Group[] {
  const byV = new Map<string, FuelEntry[]>();
  for (const r of logs) {
    const arr = byV.get(r.vehicle_id) ?? [];
    arr.push({
      odometerKm: r.odometer_km,
      liters: Number(r.liters),
      priceTotal: r.price_total != null ? Number(r.price_total) : undefined,
      isFull: r.is_full !== false,
    });
    byV.set(r.vehicle_id, arr);
  }
  return [...byV.entries()].map(([id, entries]) => ({ id, label: labelOf(id), entries }));
}

export default function StatsPage() {
  const [fuel, setFuel] = useState<Group[]>([]);
  const [adblue, setAdblue] = useState<Group[]>([]);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [source, setSource] = useState<"baza" | "brak">("brak");

  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const m = await getActiveMembership(sb);
        if (!m) return;
        const [fuelLogs, adblueLogs, tripEvents, vehicles] = await Promise.all([
          listFuelLogs(sb),
          listFuelLogs(sb, { table: "adblue_logs" }),
          listTripEvents(sb),
          listVehicles(sb, m.companyId),
        ]);
        const map = new Map(
          (vehicles as { id: string; registration: string }[]).map((v) => [v.id, v.registration]),
        );
        const labelOf = (id: string) => map.get(id) ?? id.slice(0, 8);
        setFuel(groupFuel(fuelLogs as never[], labelOf));
        setAdblue(groupFuel(adblueLogs as never[], labelOf));
        setTrips(tripEvents as TripRow[]);
        setSource("baza");
      } catch {
        setSource("brak");
      }
    })();
  }, []);

  const tripSummary: TripSummary = trips.reduce(
    (acc, r) => {
      acc.count += 1;
      if (r.action === "load") acc.loadKg += r.weight_kg ?? 0;
      if (r.action === "unload") acc.unloadKg += r.weight_kg ?? 0;
      if (r.action === "service" || r.action === "other") acc.serviceCost += r.amount ?? 0;
      return acc;
    },
    { count: 0, loadKg: 0, unloadKg: 0, serviceCost: 0 },
  );
  const tripByAction = trips.reduce<Record<string, number>>((acc, r) => {
    acc[r.action] = (acc[r.action] ?? 0) + 1;
    return acc;
  }, {});

  const hasAny = fuel.length > 0 || adblue.length > 0 || trips.length > 0;

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("nav.stats")}</h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        Liczone silnikiem <code>@e-logistic/core</code> · źródło: <strong>{source}</strong>.
        Spalanie paliwa liczone metodą „od pełna do pełna".
      </p>

      {!hasAny ? (
        <p style={{ color: palette.smoke, marginTop: 24 }}>
          Brak danych — dodaj wpisy w formularzach.
        </p>
      ) : (
        <>
          <ConsumptionSection title="⛽ Paliwo" groups={fuel} unit="L" full />
          <ConsumptionSection title="💧 AdBlue" groups={adblue} unit="L" />

          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 36 }}>🚚 Trasy</h2>
          {trips.length === 0 ? (
            <p style={{ color: palette.smoke }}>Brak zdarzeń trasy.</p>
          ) : (
            <>
              <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
                <Stat label="Zdarzeń" value={String(tripSummary.count)} />
                <Stat label="Załadowano" value={`${round2(tripSummary.loadKg)} kg`} />
                <Stat label="Rozładowano" value={`${round2(tripSummary.unloadKg)} kg`} />
                <Stat label="Koszt serwis/inne" value={String(round2(tripSummary.serviceCost))} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {Object.entries(tripByAction).map(([a, n]) => (
                  <span key={a} style={styles.tag}>
                    {ACTION_PL[a] ?? a}: <strong>{n}</strong>
                  </span>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function ConsumptionSection({
  title,
  groups,
  unit,
  full = false,
}: {
  title: string;
  groups: Group[];
  unit: string;
  full?: boolean;
}) {
  if (groups.length === 0) return null;
  const all = groups.flatMap((g) => g.entries);
  const overall = summarizeFuel(all);
  const overallCons = full ? consumptionFullToFull(all) : overall.avgConsumptionLPer100km;

  return (
    <>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 36 }}>{title}</h2>
      <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
        <Stat label="Wpisów" value={String(overall.count)} />
        <Stat label={`Litry (${unit})`} value={String(overall.totalLiters)} />
        <Stat
          label="Śr. zużycie"
          value={overallCons != null ? `${overallCons} ${unit}/100km` : "—"}
        />
        <Stat label="Wydatek" value={String(overall.totalSpend)} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
        {groups.map((g) => {
          const s = summarizeFuel(g.entries);
          const cons = full ? consumptionFullToFull(g.entries) : s.avgConsumptionLPer100km;
          return (
            <div key={g.id} style={styles.row}>
              <strong style={{ minWidth: 110 }}>{g.label}</strong>
              <span style={styles.cell}>{s.count} wp.</span>
              <span style={styles.cell}>
                {s.totalLiters} {unit}
              </span>
              <span style={styles.cell}>{cons != null ? `${cons} ${unit}/100km` : "—"}</span>
              <span style={styles.cell}>{s.totalSpend}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        minWidth: 150,
        padding: 18,
        borderRadius: 12,
        background: palette.nearBlack,
        border: `1px solid ${palette.graphite}`,
      }}
    >
      <div style={{ color: palette.smoke, fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color: palette.red }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
  cell: { color: palette.smoke, fontSize: 14, minWidth: 90 },
  tag: {
    color: palette.offWhite,
    fontSize: 13,
    background: palette.coal,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "4px 10px",
  },
};
