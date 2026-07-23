/** Warstwa danych: kartoteka kierowców (PII — RLS: owner/dispatcher). */
import type { DriverInput } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";
import { rpcJson } from "./rpcJson";

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
  passport_expiry: string | null;
  id_card_expiry: string | null;
  qualification_details: { name: string; doc_number?: string | null; expiry?: string | null }[];
  // Firma własna kierowcy (B2B / kontrakt) — dane rejestrowe, jawne (nie PII).
  company_name: string | null;
  company_tax_id: string | null;
  company_regon: string | null;
  company_address: string | null;
  company_activity: string | null;
  user_id: string | null;
}

/**
 * Lista kierowców — tożsamość (imię/nazwisko/data ur.) jest szyfrowana at-rest,
 * więc odczyt idzie przez RPC `list_drivers` (deszyfrowanie, owner/dispatcher).
 */
export async function listDrivers(client: SupabaseClient, companyId: string): Promise<DriverRow[]> {
  const { data, error } = await client.rpc("list_drivers", { p_company: companyId });
  if (error) throw error;
  return rpcJson<DriverRow[]>(data ?? []);
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
    p_passport_expiry: input.passportExpiry ?? null,
    p_id_card_expiry: input.idCardExpiry ?? null,
    p_qual_details: (input.qualificationDetails ?? []).map((q) => ({
      name: q.name,
      doc_number: q.docNumber ?? null,
      expiry: q.expiry ?? null,
    })) as unknown as import("../client").Json,
    p_company_name: input.companyName ?? null,
    p_company_tax_id: input.companyTaxId ?? null,
    p_company_regon: input.companyRegon ?? null,
    p_company_address: input.companyAddress ?? null,
    p_company_activity: input.companyActivity ?? null,
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

/** #314: własne imię i nazwisko kierowcy (RPC — deszyfrowany wiersz user_id = auth.uid()). */
export async function getMyDriverIdentity(
  client: SupabaseClient,
): Promise<{ firstName: string; lastName: string } | null> {
  const { data, error } = await client.rpc("my_driver_identity");
  if (error) throw error;
  const row = rpcJson<{ first_name?: string; last_name?: string }>(data ?? {});
  const firstName = (row.first_name ?? "").trim();
  const lastName = (row.last_name ?? "").trim();
  return firstName || lastName ? { firstName, lastName } : null;
}
