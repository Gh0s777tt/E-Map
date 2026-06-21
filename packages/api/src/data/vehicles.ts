/** Warstwa danych: pojazdy. */
import type { VehicleInput } from "@e-logistic/core";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function listVehicles(client: SupabaseClient, companyId: string) {
  const { data, error } = await client
    .from("vehicles")
    .select(
      "id, registration, make, model, vehicle_type, vin, curb_weight_kg, max_payload_kg, height_cm, inspection_expiry, insurance_expiry, insurer, license_number, leasing_end, year",
    )
    .eq("company_id", companyId)
    .order("registration");
  if (error) throw error;
  return data ?? [];
}

/** Pojazdy z datami ważności (przegląd/OC/leasing) — do przypomnień. */
export async function listVehiclesExpiry(client: SupabaseClient, companyId: string) {
  const { data, error } = await client
    .from("vehicles")
    .select("id, registration, inspection_expiry, insurance_expiry, leasing_end")
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
    make: input.make ?? null,
    model: input.model,
    vin: input.vin ?? null,
    insurer: input.insurer ?? null,
    year: input.year,
    first_registration_date: input.firstRegistrationDate ?? null,
    inspection_expiry: input.inspectionExpiry ?? null,
    insurance_expiry: input.insuranceExpiry ?? null,
    license_number: input.licenseNumber ?? null,
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

/** Edytuje pojazd. RLS: owner/dispatcher. */
export async function updateVehicle(
  client: SupabaseClient,
  vehicleId: string,
  input: VehicleInput,
  companyId: string,
) {
  const { company_id: _ignore, ...row } = vehicleToRow(input, companyId);
  const { error } = await client.from("vehicles").update(row).eq("id", vehicleId);
  if (error) throw error;
}

/** Usuwa pojazd (kaskadowo: powiązane wpisy paliwa/AdBlue/trip). RLS: owner/dispatcher. */
export async function deleteVehicle(client: SupabaseClient, vehicleId: string) {
  const { error } = await client.from("vehicles").delete().eq("id", vehicleId);
  if (error) throw error;
}
