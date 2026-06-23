/** Warstwa danych: kartoteka kierowców (PII — RLS: owner/dispatcher). */
import type { DriverInput } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

/** Wiersz kartoteki (tożsamość deszyfrowana po stronie bazy). */
export interface DriverRow {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  license_categories: string[];
  qualifications: string[];
  notes: string | null;
  license_expiry: string | null;
  code95_expiry: string | null;
  medical_expiry: string | null;
  psychotech_expiry: string | null;
  adr_expiry: string | null;
  user_id: string | null;
}

/**
 * Lista kierowców — tożsamość (imię/nazwisko/data ur.) jest szyfrowana at-rest,
 * więc odczyt idzie przez RPC `list_drivers` (deszyfrowanie, owner/dispatcher).
 */
export async function listDrivers(client: SupabaseClient, companyId: string): Promise<DriverRow[]> {
  const { data, error } = await client.rpc("list_drivers", { p_company: companyId });
  if (error) throw error;
  return (data ?? []) as unknown as DriverRow[];
}

/** Zapis tożsamości (szyfrowanie) przez RPC — owner/dispatcher, audytowane. */
async function saveDriverIdentity(
  client: SupabaseClient,
  id: string | null,
  input: DriverInput,
  companyId: string,
): Promise<string> {
  const { data, error } = await client.rpc("driver_save", {
    p_id: id,
    p_company: companyId,
    p_first: input.firstName,
    p_last: input.lastName,
    p_birth: input.birthDate ?? null,
    p_categories: input.licenseCategories,
    p_quals: input.qualifications,
    p_notes: input.notes ?? null,
    p_license_expiry: input.licenseExpiry ?? null,
    p_code95_expiry: input.code95Expiry ?? null,
    p_medical_expiry: input.medicalExpiry ?? null,
    p_adr_expiry: input.adrExpiry ?? null,
    p_psychotech_expiry: input.psychotechExpiry ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function insertDriver(client: SupabaseClient, input: DriverInput, companyId: string) {
  return saveDriverIdentity(client, null, input, companyId);
}

export async function updateDriver(
  client: SupabaseClient,
  driverId: string,
  input: DriverInput,
  companyId: string,
) {
  await saveDriverIdentity(client, driverId, input, companyId);
}

/** Zapis (szyfrowanie) numerów dokumentów — RPC, owner/dispatcher, audytowane. */
export async function setDriverDocuments(
  client: SupabaseClient,
  driverId: string,
  docs: { idCard?: string; passport?: string; license?: string },
) {
  const { error } = await client.rpc("driver_set_documents", {
    p_driver: driverId,
    p_id_card: docs.idCard ?? null,
    p_passport: docs.passport ?? null,
    p_license: docs.license ?? null,
  });
  if (error) throw error;
}

/** Odczyt (deszyfrowanie) numerów dokumentów — RPC, owner/dispatcher, audytowane. */
export async function getDriverDocuments(client: SupabaseClient, driverId: string) {
  const { data, error } = await client.rpc("driver_documents", { p_driver: driverId });
  if (error) throw error;
  return (data ?? {}) as { idCard: string | null; passport: string | null; license: string | null };
}

export async function deleteDriver(client: SupabaseClient, driverId: string) {
  const { error } = await client.from("drivers").delete().eq("id", driverId);
  if (error) throw error;
}

/** Powiązuje kartotekę kierowcy z kontem aplikacji (lub odłącza: userId = null). RPC, owner/dispatcher. */
export async function linkDriverUser(
  client: SupabaseClient,
  driverId: string,
  companyId: string,
  userId: string | null,
): Promise<void> {
  const { error } = await client.rpc("driver_link_user", {
    p_driver: driverId,
    p_company: companyId,
    p_user: userId,
  });
  if (error) throw error;
}
