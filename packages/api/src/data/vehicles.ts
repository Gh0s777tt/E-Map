/** Warstwa danych: pojazdy. */
import type { VehicleInput } from "@e-logistic/core";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function listVehicles(client: SupabaseClient, companyId: string) {
  const { data, error } = await client
    .from("vehicles")
    .select("id, registration, model, vehicle_type")
    .eq("company_id", companyId)
    .order("registration");
  if (error) throw error;
  return data ?? [];
}

/** Mapuje zwalidowany input pojazdu na wiersz tabeli (snake_case). */
export function vehicleToRow(input: VehicleInput, companyId: string) {
  return {
    company_id: companyId,
    registration: input.registration,
    model: input.model,
    year: input.year,
    first_registration_date: input.firstRegistrationDate ?? null,
    inspection_expiry: input.inspectionExpiry ?? null,
    insurance_expiry: input.insuranceExpiry ?? null,
    leasing_end: input.leasingEnd ?? null,
    curb_weight_kg: input.curbWeightKg ?? null,
    max_payload_kg: input.maxPayloadKg ?? null,
    height_cm: input.heightCm ?? null,
    width_cm: input.widthCm ?? null,
    length_cm: input.lengthCm ?? null,
    vehicle_type: input.vehicleType,
    forwarder: input.forwarder ?? null,
    comment: input.comment ?? null,
  };
}

export async function insertVehicle(
  client: SupabaseClient,
  input: VehicleInput,
  companyId: string,
) {
  const { data, error } = await client
    .from("vehicles")
    .insert(vehicleToRow(input, companyId))
    .select()
    .single();
  if (error) throw error;
  return data;
}
