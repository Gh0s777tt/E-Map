/** Warstwa danych: formularz Trip (załadunek/rozładunek/serwis/start/koniec/inne). */
import type { TripEventInput } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

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
  const orderId = "orderId" in input ? input.orderId : undefined;
  const base = {
    id: ctx.id,
    company_id: ctx.companyId,
    driver_id: ctx.driverId,
    vehicle_id: input.vehicleId,
    action: input.action,
    country: input.place.country,
    location: input.place.location ?? input.place.city ?? null,
    postcode: input.place.postcode ?? null,
    company: input.place.company ?? null,
    geo: hasGeo ? `POINT(${input.place.lng} ${input.place.lat})` : null,
    odometer_km: input.odometerKm,
    weight_kg: "weightKg" in input ? input.weightKg : null,
    amount: "amount" in input ? (input.amount ?? null) : null,
    comment: input.comment ?? null,
    from_vehicle_reg: "fromVehicleReg" in input ? input.fromVehicleReg : null,
    to_vehicle_reg: "toVehicleReg" in input ? input.toVehicleReg : null,
    device_id: ctx.deviceId ?? null,
  };
  // order_id dołączany TYLKO gdy wskazany — bez migracji 0052 istniejące trasy (bez zlecenia)
  // działają bez zmian; kolumna wymagana dopiero przy powiązaniu load/unload ze zleceniem.
  return orderId ? { ...base, order_id: orderId } : base;
}

/**
 * Zapis zdarzenia Trip do `trip_events` — **idempotentny** (jak `insertFuelLog`).
 * `id` to UUID klienta (PK); ponowny sync → `ON CONFLICT (id) DO NOTHING` (bez duplikatu
 * i bez błędu PK). `maybeSingle`: przy konflikcie baza nie zwraca wiersza → `null`.
 */
export async function insertTripEvent(
  client: SupabaseClient,
  input: TripEventInput,
  ctx: TripEventContext,
) {
  const { data, error } = await client
    .from("trip_events")
    .upsert(tripEventToRow(input, ctx), { onConflict: "id", ignoreDuplicates: true })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Pojedyncze zdarzenie Trip (do edycji). */
export async function getTripEvent(client: SupabaseClient, id: string) {
  const { data, error } = await client.from("trip_events").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

/** Edycja zdarzenia Trip. RLS: autor (kierowca) lub owner. Geo nadpisywane tylko gdy podane. */
export async function updateTripEvent(client: SupabaseClient, id: string, input: TripEventInput) {
  const row = tripEventToRow(input, { id, companyId: "", driverId: "" });
  const { id: _id, company_id: _c, driver_id: _d, device_id: _dev, geo, ...rest } = row;
  const patch = geo === null ? rest : { ...rest, geo };
  const { error } = await client.from("trip_events").update(patch).eq("id", id);
  if (error) throw error;
}

/**
 * Lista zdarzeń Trip (RLS zawęża do kierowcy/firmy).
 * Filtry `from`/`to` (zakres `created_at`, ISO) i `limit` ograniczają transfer.
 */
export async function listTripEvents(
  client: SupabaseClient,
  opts?: { vehicleId?: string; from?: string; to?: string; limit?: number },
) {
  let query = client.from("trip_events").select("*").order("created_at", { ascending: false });
  if (opts?.vehicleId) query = query.eq("vehicle_id", opts.vehicleId);
  if (opts?.from) query = query.gte("created_at", opts.from);
  if (opts?.to) query = query.lte("created_at", opts.to);
  if (opts?.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** #314: zdarzenia Trip zalogowanego kierowcy (RLS ogranicza do własnych wpisów). */
export async function listMyTripEvents(
  client: SupabaseClient,
  opts?: { from?: string; limit?: number },
) {
  let query = client
    .from("trip_events")
    .select("id, action, odometer_km, created_at, country, location")
    .order("created_at", { ascending: false });
  if (opts?.from) query = query.gte("created_at", opts.from);
  query = query.limit(opts?.limit ?? 200);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
