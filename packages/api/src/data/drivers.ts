/** Warstwa danych: kartoteka kierowców (PII — RLS: owner/dispatcher). */
import type { DriverInput } from "@e-logistic/core";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function listDrivers(client: SupabaseClient, companyId: string) {
  const { data, error } = await client
    .from("drivers")
    .select(
      "id, first_name, last_name, birth_date, license_number, id_card_number, passport_number, license_categories, qualifications, notes",
    )
    .eq("company_id", companyId)
    .order("last_name");
  if (error) throw error;
  return data ?? [];
}

function driverToRow(input: DriverInput, companyId: string) {
  return {
    company_id: companyId,
    first_name: input.firstName,
    last_name: input.lastName,
    birth_date: input.birthDate ?? null,
    license_number: input.licenseNumber ?? null,
    id_card_number: input.idCardNumber ?? null,
    passport_number: input.passportNumber ?? null,
    license_categories: input.licenseCategories,
    qualifications: input.qualifications,
    notes: input.notes ?? null,
  };
}

export async function insertDriver(client: SupabaseClient, input: DriverInput, companyId: string) {
  const { data, error } = await client
    .from("drivers")
    .insert(driverToRow(input, companyId))
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateDriver(
  client: SupabaseClient,
  driverId: string,
  input: DriverInput,
  companyId: string,
) {
  const { company_id: _ignore, ...row } = driverToRow(input, companyId);
  const { error } = await client.from("drivers").update(row).eq("id", driverId);
  if (error) throw error;
}

export async function deleteDriver(client: SupabaseClient, driverId: string) {
  const { error } = await client.from("drivers").delete().eq("id", driverId);
  if (error) throw error;
}
