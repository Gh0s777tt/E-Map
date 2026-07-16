/**
 * #334: dane gamifikacji kierowcy — agreguje własne statystyki (dostawy,
 * terminowość, km, spalanie, staż) i liczy profil silnikiem
 * `computeDriverGamification` z core. Fail-soft: każdy blok osobno.
 */
import { getActiveMembership, listFuelLogs, listMyOrders, listMyTripEvents } from "@e-logistic/api";
import { computeDriverGamification, type GamificationResult } from "@e-logistic/core";
import { useCallback, useState } from "react";
import { monthStartIso } from "./date";
import { getSupabase, supabaseConfigured } from "./supabase";

export function useGamification(): {
  data: GamificationResult | null;
  reload: () => Promise<void>;
} {
  const [data, setData] = useState<GamificationResult | null>(null);

  const reload = useCallback(async () => {
    if (!supabaseConfigured) return;
    const sb = getSupabase();
    const [membership, orders, trips, fuel] = await Promise.all([
      getActiveMembership(sb).catch(() => null),
      listMyOrders(sb).catch(() => null),
      listMyTripEvents(sb, { from: monthStartIso() }).catch(() => null),
      listFuelLogs(sb, { from: monthStartIso(), limit: 500 }).catch(() => null),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const mine = orders ?? [];
    const deliveries = mine.filter(
      (o) => o.status === "delivered" || o.status === "invoiced",
    ).length;
    const due = mine.filter(
      (o) => o.unload_date && o.unload_date < today && o.status !== "cancelled",
    );
    const onTime = due.filter((o) => o.status === "delivered" || o.status === "invoiced").length;
    const onTimePct = due.length > 0 ? onTime / due.length : null;

    let km = 0;
    if (trips) {
      const odo = trips
        .map((t) => t.odometer_km)
        .filter((v): v is number => typeof v === "number" && v > 0);
      if (odo.length >= 2) km = Math.max(...odo) - Math.min(...odo);
    }

    let avgConsumption: number | null = null;
    if (fuel && km > 50) {
      const liters = fuel.reduce((a, f) => a + (typeof f.liters === "number" ? f.liters : 0), 0);
      if (liters > 0) avgConsumption = Math.round((liters / km) * 100 * 10) / 10;
    }

    let tenureMonths = 0;
    if (membership?.createdAt) {
      const ms = Date.now() - Date.parse(membership.createdAt);
      tenureMonths = Math.max(0, Math.floor(ms / (30.44 * 86_400_000)));
    }

    setData(
      computeDriverGamification({
        deliveries,
        onTimePct,
        checklists: 0,
        km,
        avgConsumption,
        tenureMonths,
        defectsReported: 0,
        activeStreakDays: 0,
      }),
    );
  }, []);

  return { data, reload };
}
