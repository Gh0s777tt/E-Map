"use client";

import { listDrivers, listFuelLogs, listRates, listTripEvents } from "@e-logistic/api";
import { buildJourneys, effectiveModules, type Journey, pickRate } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ListStatus } from "@/components/ListStatus";
import { PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

interface TripRow {
  action: string;
  driver_id: string | null;
  vehicle_id: string | null;
  odometer_km: number | null;
  weight_kg: number | null;
  amount: number | null;
  created_at: string;
}
interface FuelRow {
  vehicle_id: string | null;
  created_at: string;
  odometer_km: number;
  liters: number;
  price_total: number | null;
  is_full: boolean | null;
}
interface DriverRow {
  user_id: string | null;
  first_name: string;
  last_name: string;
}
interface RateRow {
  vehicleId: string | null;
  ratePerKm: number;
  validFrom: string;
}

const money = (n: number | null) => (n == null ? "—" : `${n} €`);
const num = (n: number | null, unit = "") => (n == null ? "—" : `${n}${unit}`);

export default function JourneysPage() {
  const { vehicles } = useFleet();
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [fuel, setFuel] = useState<FuelRow[]>([]);
  const [adblue, setAdblue] = useState<FuelRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [rates, setRates] = useState<RateRow[]>([]);
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
        setTrips([]);
        return;
      }
      const manage = m.role === "owner" || m.role === "dispatcher";
      setDenied(!manage && !effectiveModules(m.role, m.modules).includes("stats"));
      const [t, f, a, d, r] = await Promise.all([
        listTripEvents(sb, {}),
        listFuelLogs(sb, { table: "fuel_logs" }),
        listFuelLogs(sb, { table: "adblue_logs" }),
        listDrivers(sb, m.companyId).catch(() => []),
        listRates(sb, m.companyId).catch(() => []),
      ]);
      setTrips(t as unknown as TripRow[]);
      setFuel(f as unknown as FuelRow[]);
      setAdblue(a as unknown as FuelRow[]);
      setDrivers(d as unknown as DriverRow[]);
      setRates(r as unknown as RateRow[]);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Nie udało się pobrać wyjazdów.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const regOf = useCallback(
    (id: string | null) => (id ? (vehicles.find((v) => v.id === id)?.registration ?? "—") : "—"),
    [vehicles],
  );

  const driverName = useCallback(
    (id: string | null) => {
      if (!id) return "Nieprzypisany kierowca";
      const d = drivers.find((x) => x.user_id === id);
      return d ? `${d.last_name} ${d.first_name}` : `Kierowca ${id.slice(0, 8)}`;
    },
    [drivers],
  );

  const journeys = useMemo(() => {
    const rateMap: Record<string, number> = {};
    for (const v of vehicles) {
      const r = pickRate(rates, v.id);
      if (r != null) rateMap[v.id] = r;
    }
    return buildJourneys({
      trips: trips.map((r) => ({
        action: r.action,
        driverId: r.driver_id,
        vehicleId: r.vehicle_id,
        odometerKm: r.odometer_km,
        weightKg: r.weight_kg,
        amount: r.amount,
        createdAt: r.created_at,
      })),
      fuel: fuel.map((r) => ({
        vehicleId: r.vehicle_id,
        createdAt: r.created_at,
        odometerKm: r.odometer_km,
        liters: r.liters,
        priceTotal: r.price_total,
        isFull: r.is_full ?? true,
      })),
      adblue: adblue.map((r) => ({
        vehicleId: r.vehicle_id,
        createdAt: r.created_at,
        odometerKm: r.odometer_km,
        liters: r.liters,
        priceTotal: r.price_total,
        isFull: r.is_full ?? true,
      })),
      ratePerKmByVehicle: rateMap,
    });
  }, [trips, fuel, adblue, rates, vehicles]);

  const groups = useMemo(() => {
    const byDriver = new Map<string, Journey[]>();
    for (const j of journeys) {
      const key = j.driverId ?? "unassigned";
      const arr = byDriver.get(key) ?? [];
      arr.push(j);
      byDriver.set(key, arr);
    }
    return [...byDriver.entries()];
  }, [journeys]);

  return (
    <div style={{ maxWidth: 920 }}>
      <PageHeader
        title="Wyjazdy (trasy)"
        subtitle="Zdarzenia trasy pogrupowane w wyjazdy — od rozpoczęcia do zakończenia, per kierowca i pojazd. Statystyki: dystans, spalanie, ładunki, koszt i zysk."
      />

      {denied && (
        <p style={{ color: palette.red, marginTop: 16 }}>
          ⛔ Brak dostępu do statystyk. Poproś właściciela o uprawnienia.
        </p>
      )}

      <ListStatus
        loading={loading}
        error={loadErr}
        empty={!denied && journeys.length === 0}
        emptyText="Brak wyjazdów. Kierowca zaczyna wyjazd akcją Rozpoczęcie, a kończy Zakończenie (formularz Trasa)."
        onRetry={load}
      />

      {!loading &&
        !loadErr &&
        groups.map(([driverId, list]) => (
          <div key={driverId} style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>
              🧑‍✈️ {driverName(driverId === "unassigned" ? null : driverId)}
              <span style={{ color: palette.smoke, fontWeight: 400, fontSize: 14 }}>
                {" "}
                · {list.length} {list.length === 1 ? "wyjazd" : "wyjazdy"}
              </span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {list.map((j) => (
                <div key={`${j.vehicleId}-${j.index}`} style={card}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 15 }}>
                      Wyjazd #{j.index} · {regOf(j.vehicleId)}
                    </strong>
                    <span style={j.open ? badgeOpen : badgeDone}>
                      {j.open ? "w toku" : "zakończony"}
                    </span>
                    <span style={{ flex: 1 }} />
                    <span style={{ color: palette.smoke, fontSize: 13 }}>
                      {j.startAt.slice(0, 10)} → {j.endAt ? j.endAt.slice(0, 10) : "…"}
                      {j.durationDays != null ? ` · ${j.durationDays} dni` : ""}
                    </span>
                  </div>
                  <div style={statRow}>
                    <span>
                      Dystans: <b>{num(j.distanceKm, " km")}</b>
                    </span>
                    <span>
                      Spalanie: <b>{num(j.avgConsumptionLPer100km, " L/100km")}</b>
                    </span>
                    <span>
                      Tankowań: <b>{j.fuelings}</b> ({j.fuelLiters} L)
                    </span>
                    <span>
                      Załadunki/rozładunki: <b>{j.loads}</b>/<b>{j.unloads}</b>
                    </span>
                    <span>
                      Waga ładunków: <b>{j.totalLoadKg} kg</b>
                    </span>
                  </div>
                  <div style={{ ...statRow, marginTop: 4 }}>
                    <span>
                      Koszt: <b>{money(j.cost)}</b>
                    </span>
                    <span>
                      Przychód: <b>{money(j.revenue)}</b>
                    </span>
                    <span>
                      Zysk:{" "}
                      <b style={{ color: (j.profit ?? 0) >= 0 ? "#22c55e" : palette.red }}>
                        {money(j.profit)}
                      </b>
                      {j.marginPercent != null ? ` (${j.marginPercent}%)` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

const card: React.CSSProperties = {
  background: palette.nearBlack,
  border: `1px solid ${palette.graphite}`,
  borderRadius: 12,
  padding: "12px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};
const statRow: React.CSSProperties = {
  display: "flex",
  gap: 18,
  flexWrap: "wrap",
  fontSize: 13,
  color: palette.smoke,
};
const badgeOpen: React.CSSProperties = {
  fontSize: 11,
  padding: "2px 8px",
  borderRadius: 999,
  background: "rgba(245,158,11,.15)",
  color: "#f59e0b",
  border: "1px solid rgba(245,158,11,.35)",
};
const badgeDone: React.CSSProperties = {
  fontSize: 11,
  padding: "2px 8px",
  borderRadius: 999,
  background: "rgba(34,197,94,.14)",
  color: "#7ee2a0",
  border: "1px solid rgba(34,197,94,.35)",
};
