/** Warstwa danych: formularz Trip (załadunek/rozładunek/serwis/start/koniec/inne). */
import type { TripEventInput } from "@e-logistic/core";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface TripEventContext {
  /** UUID rekordu wygenerowany na kliencie (offline-first). */
  id: string;
  companyId: string;
  driverId: string;
  deviceId?: string;
}

/** Mapuje zwalidowany input Trip na wiersz tabeli (snake_case + WKT dla PostGIS). */
export function tripEventToRow(input: TripEventInput, ctx: TripEventContext) {
  const hasGeo = input.place.lat != null && input.place.lng != null;
  return {
    id: ctx.id,
    company_id: ctx.companyId,
    driver_id: ctx.driverId,
    vehicle_id: input.vehicleId,
    action: input.action,
    country: input.place.country,
    location: input.place.location ?? input.place.city ?? null,
    geo: hasGeo ? `POINT(${input.place.lng} ${input.place.lat})` : null,
    odometer_km: input.odometerKm,
    weight_kg: "weightKg" in input ? input.weightKg : null,
    amount: "amount" in input ? (input.amount ?? null) : null,
    comment: input.comment ?? null,
    device_id: ctx.deviceId ?? null,
  };
}

/** Zapis zdarzenia Trip do tabeli `trip_events`. */
export async function insertTripEvent(
  client: SupabaseClient,
  input: TripEventInput,
  ctx: TripEventContext,
) {
  const { data, error } = await client
    .from("trip_events")
    .insert(tripEventToRow(input, ctx))
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Lista zdarzeń Trip (RLS zawęża do kierowcy/firmy). */
export async function listTripEvents(client: SupabaseClient, opts?: { vehicleId?: string }) {
  let query = client.from("trip_events").select("*").order("created_at", { ascending: false });
  if (opts?.vehicleId) query = query.eq("vehicle_id", opts.vehicleId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
