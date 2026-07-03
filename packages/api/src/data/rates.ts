/** Warstwa danych: stawki €/km per pojazd (oraz domyślne firmowe, `vehicle_id = null`). */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface Rate {
  id: string;
  vehicleId: string | null;
  ratePerKm: number;
  currency: string;
  validFrom: string;
}

interface RateRow {
  id: string;
  vehicle_id: string | null;
  rate_per_km: number;
  currency: string;
  valid_from: string;
}

const COLS = "id, vehicle_id, rate_per_km, currency, valid_from";

/** Stawki firmy (najnowsze pierwsze). RLS: członek czyta. */
export async function listRates(client: SupabaseClient, companyId: string): Promise<Rate[]> {
  const { data, error } = await client
    .from("rates")
    .select(COLS)
    .eq("company_id", companyId)
    .order("valid_from", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as RateRow[]).map((r) => ({
    id: r.id,
    vehicleId: r.vehicle_id,
    ratePerKm: r.rate_per_km,
    currency: r.currency,
    validFrom: r.valid_from,
  }));
}

/**
 * Zapisuje domyślną stawkę jako nowy wpis (`valid_from` = dziś, z domyślnej bazy).
 * Historia stawek zachowana; `pickRate` bierze najnowszą. RLS: owner.
 */
export async function saveDefaultRate(
  client: SupabaseClient,
  input: { companyId: string; vehicleId: string | null; ratePerKm: number; currency?: string },
): Promise<void> {
  const { error } = await client.from("rates").insert({
    company_id: input.companyId,
    vehicle_id: input.vehicleId,
    rate_per_km: input.ratePerKm,
    currency: input.currency ?? "EUR",
  });
  if (error) throw error;
}
