/**
 * #314: dane karty kierowcy (wariant A) — imię i nazwisko (RPC z kartoteki),
 * staż w firmie oraz statystyki miesiąca liczone z formularzy:
 * km z Trip (rozpiętość licznika), litry ON/AdBlue z tankowań, śr. spalanie.
 * Fail-soft: każdy blok osobno, offline → nulle.
 */
import {
  getActiveMembership,
  getMyDriverIdentity,
  listFuelLogs,
  listMyTripEvents,
} from "@e-logistic/api";
import { useCallback, useState } from "react";
import { getSupabase, supabaseConfigured } from "./supabase";

export interface DriverCardData {
  fullName: string | null;
  tenureMonths: number | null;
  kmMonth: number | null;
  dieselMonth: number | null;
  adblueMonth: number | null;
  /** l/100 km z danych miesiąca (null gdy km≈0). */
  avgConsumption: number | null;
}

const EMPTY: DriverCardData = {
  fullName: null,
  tenureMonths: null,
  kmMonth: null,
  dieselMonth: null,
  adblueMonth: null,
  avgConsumption: null,
};

function monthStartIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export function useDriverCard(): { data: DriverCardData; reload: () => Promise<void> } {
  const [data, setData] = useState<DriverCardData>(EMPTY);

  const reload = useCallback(async () => {
    if (!supabaseConfigured) return;
    const sb = getSupabase();
    const from = monthStartIso();

    const [identity, membership, trips, diesel, adblue] = await Promise.all([
      getMyDriverIdentity(sb).catch(() => null),
      getActiveMembership(sb).catch(() => null),
      listMyTripEvents(sb, { from }).catch(() => null),
      listFuelLogs(sb, { from, limit: 500 }).catch(() => null),
      listFuelLogs(sb, { from, table: "adblue_logs", limit: 500 }).catch(() => null),
    ]);

    const fullName = identity ? `${identity.firstName} ${identity.lastName}`.trim() || null : null;

    let tenureMonths: number | null = null;
    if (membership?.createdAt) {
      const ms = Date.now() - Date.parse(membership.createdAt);
      tenureMonths = Math.max(0, Math.floor(ms / (30.44 * 86_400_000)));
    }

    let kmMonth: number | null = null;
    if (trips) {
      const odo = trips
        .map((t) => t.odometer_km)
        .filter((v): v is number => typeof v === "number" && v > 0);
      if (odo.length >= 2) kmMonth = Math.max(...odo) - Math.min(...odo);
      else if (odo.length > 0) kmMonth = 0;
    }

    const sumLiters = (rows: { liters: number | null }[] | null): number | null =>
      rows === null ? null : rows.reduce((a, r) => a + (r.liters ?? 0), 0);
    const dieselMonth = sumLiters(diesel);
    const adblueMonth = sumLiters(adblue);

    const avgConsumption =
      dieselMonth != null && kmMonth != null && kmMonth > 50
        ? Math.round((dieselMonth / kmMonth) * 1000) / 10
        : null;

    setData({ fullName, tenureMonths, kmMonth, dieselMonth, adblueMonth, avgConsumption });
  }, []);

  return { data, reload };
}

/** „14 mies." / „2 lata 3 mies." — krótki format stażu. */
export function tenureLabel(months: number | null, yearWord: string, monthWord: string): string {
  if (months === null) return "—";
  if (months < 24) return `${months} ${monthWord}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} ${yearWord} ${rest} ${monthWord}` : `${years} ${yearWord}`;
}
