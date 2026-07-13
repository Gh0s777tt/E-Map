/** Warstwa danych: pojazdy. */
import type { VehicleInput } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export async function listVehicles(client: SupabaseClient, companyId: string) {
  const { data, error } = await client
    .from("vehicles")
    // select("*") zamiast listy kolumn: schema-safe udostępnia nowe kolumny (naczepa #250) —
    // przed migracją 0055 ich brak nie wywala zapytania, po niej dochodzą automatycznie.
    .select("*")
    .eq("company_id", companyId)
    .order("registration");
  if (error) throw error;
  return data ?? [];
}

/** Pojazdy z datami ważności (przegląd/OC/leasing) — do przypomnień. */
export async function listVehiclesExpiry(client: SupabaseClient, companyId: string) {
  const { data, error } = await client
    .from("vehicles")
    .select("id, registration, inspection_expiry, insurance_expiry, leasing_end, license_expiry")
    .eq("company_id", companyId)
    .order("registration");
  if (error) throw error;
  return data ?? [];
}

/** Mapuje zwalidowany input pojazdu na wiersz tabeli (snake_case). */
export function vehicleToRow(input: VehicleInput, companyId: string) {
  const base = {
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
    license_expiry: input.licenseExpiry ?? null,
    license_number: input.licenseNumber ?? null,
    leasing_end: input.leasingEnd ?? null,
    curb_weight_kg: input.curbWeightKg ?? null,
    max_payload_kg: input.maxPayloadKg ?? null,
    fuel_tank_l: input.fuelTankL ?? null,
    adblue_tank_l: input.adblueTankL ?? null,
    height_cm: input.heightCm ?? null,
    width_cm: input.widthCm ?? null,
    length_cm: input.lengthCm ?? null,
    vehicle_type: input.vehicleType,
    forwarder: input.forwarder ?? null,
    comment: input.comment ?? null,
  };
  // #250: naczepa dołączana do wiersza TYLKO gdy podana. Rzut do `typeof base` ukrywa kolumny
  // naczepy przed typem Insert (RejectExcessProperties odrzuca nieznane kolumny) — dojdą runtime,
  // a typ dogoni po migracji 0055 + gen:types. Bez migracji zapis bez naczepy działa bez zmian.
  const row = {
    ...base,
    ...(input.trailerRegistration ? { trailer_registration: input.trailerRegistration } : {}),
    ...(input.trailerType ? { trailer_type: input.trailerType } : {}),
  };
  return row as typeof base;
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
