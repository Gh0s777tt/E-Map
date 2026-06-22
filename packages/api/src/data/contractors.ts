/** Warstwa danych: rejestr kontrahentów (nabywcy/nadawcy) per firma. */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface Contractor {
  id: string;
  name: string;
  tax_id: string | null;
  address: string | null;
  country: string | null;
}

const COLS = "id, name, tax_id, address, country";

/** Kontrahenci firmy (alfabetycznie). RLS: członek czyta. */
export async function listContractors(
  client: SupabaseClient,
  companyId: string,
): Promise<Contractor[]> {
  const { data, error } = await client
    .from("contractors")
    .select(COLS)
    .eq("company_id", companyId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Contractor[];
}

export interface ContractorInput {
  name: string;
  taxId?: string | null;
  address?: string | null;
  country?: string | null;
}

/**
 * Upsert kontrahenta po (company_id, name) — buduje rejestr organicznie przy
 * wystawianiu faktur/zleceń. RLS: owner/dispatcher. Pusta nazwa → no-op.
 */
export async function upsertContractor(
  client: SupabaseClient,
  companyId: string,
  input: ContractorInput,
): Promise<void> {
  const name = input.name.trim();
  if (!name) return;
  const { error } = await client.from("contractors").upsert(
    {
      company_id: companyId,
      name,
      tax_id: input.taxId?.trim() || null,
      address: input.address?.trim() || null,
      country: input.country?.trim() || null,
    },
    { onConflict: "company_id,name" },
  );
  if (error) throw error;
}

/** Usuwa kontrahenta. RLS: owner/dispatcher. */
export async function deleteContractor(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("contractors").delete().eq("id", id);
  if (error) throw error;
}
