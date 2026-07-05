/** Warstwa danych: zapisane podróże do rozliczenia diet kierowcy (per diem). */
import type { DietMode } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface PerDiemTrip {
  id: string;
  driver_name: string | null;
  destination: string | null;
  mode: DietMode;
  hours: number;
  daily_rate: number;
  currency: string;
  trip_date: string | null;
  note: string | null;
  created_at: string;
}

export interface PerDiemTripInput {
  driverName?: string | null;
  /** #271: FK do kartoteki — spójna tożsamość kierowcy obok nazwy. */
  driverId?: string | null;
  destination?: string | null;
  mode: DietMode;
  hours: number;
  dailyRate: number;
  currency: string;
  tripDate?: string | null;
  note?: string | null;
}

const COLS =
  "id, driver_name, destination, mode, hours, daily_rate, currency, trip_date, note, created_at";

/** Zapisane podróże firmy (najnowsze pierwsze). Filtr: kierowca. RLS: członek czyta. */
export async function listPerDiemTrips(
  client: SupabaseClient,
  companyId: string,
  opts: { driverName?: string; limit?: number } = {},
): Promise<PerDiemTrip[]> {
  let q = client.from("per_diem_trips").select(COLS).eq("company_id", companyId);
  if (opts.driverName) q = q.eq("driver_name", opts.driverName);
  q = q.order("created_at", { ascending: false }).limit(opts.limit ?? 1000);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PerDiemTrip[];
}

/** Dodaje jedną podróż. RLS: owner/dispatcher. Zwraca id. */
export async function insertPerDiemTrip(
  client: SupabaseClient,
  input: PerDiemTripInput,
  companyId: string,
): Promise<string> {
  const { data, error } = await client
    .from("per_diem_trips")
    .insert({
      company_id: companyId,
      driver_name: input.driverName?.trim() || null,
      driver_id: input.driverId ?? null,
      destination: input.destination?.trim() || null,
      mode: input.mode,
      hours: input.hours,
      daily_rate: input.dailyRate,
      currency: input.currency,
      trip_date: input.tripDate || null,
      note: input.note?.trim() || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/** Usuwa podróż. RLS: owner/dispatcher. */
export async function deletePerDiemTrip(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("per_diem_trips").delete().eq("id", id);
  if (error) throw error;
}
