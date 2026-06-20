/** Warstwa danych: formularze paliwowe (i AdBlue — ta sama struktura). */
import type { FuelLogInput } from "@e-logistic/core";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface FuelLogContext {
  /** UUID rekordu wygenerowany na kliencie (offline-first). */
  id: string;
  companyId: string;
  driverId: string;
  deviceId?: string;
}

/** Mapuje zwalidowany input formularza na wiersz tabeli (snake_case + WKT dla PostGIS). */
export function fuelLogToRow(input: FuelLogInput, ctx: FuelLogContext) {
  const hasGeo = input.station.lat != null && input.station.lng != null;
  return {
    id: ctx.id,
    company_id: ctx.companyId,
    driver_id: ctx.driverId,
    vehicle_id: input.vehicleId,
    station_country: input.station.country,
    station_city: input.station.city ?? null,
    station_loc: input.station.location ?? null,
    geo: hasGeo ? `POINT(${input.station.lng} ${input.station.lat})` : null,
    odometer_km: input.odometerKm,
    liters: input.liters,
    payment_method: input.paymentMethod,
    fuel_card_id: input.fuelCardId ?? null,
    price_total: input.priceTotal ?? null,
    comment: input.comment ?? null,
    device_id: ctx.deviceId ?? null,
  };
}

/** Zapis formularza paliwowego do tabeli `fuel_logs`. */
export async function insertFuelLog(
  client: SupabaseClient,
  input: FuelLogInput,
  ctx: FuelLogContext,
  table: "fuel_logs" | "adblue_logs" = "fuel_logs",
) {
  const row = fuelLogToRow(input, ctx);
  const { data, error } = await client.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}

/** Lista formularzy paliwowych (RLS zawęża do kierowcy/firmy). */
export async function listFuelLogs(
  client: SupabaseClient,
  opts?: { vehicleId?: string; table?: "fuel_logs" | "adblue_logs" },
) {
  let query = client
    .from(opts?.table ?? "fuel_logs")
    .select("*")
    .order("created_at", { ascending: false });
  if (opts?.vehicleId) query = query.eq("vehicle_id", opts.vehicleId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
