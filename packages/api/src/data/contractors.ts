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

/**
 * Rejestr buduje się organicznie (`upsertContractor` przy każdej fakturze
 * i zleceniu) i nikt go nie sprząta — rośnie więc z historią firmy, a nie
 * z jej wielkością w danym momencie. Stąd sufit wyraźnie wyższy niż flotowy:
 * przewoźnik z 50 autami może mieć tysiące odbiorców uzbieranych przez lata.
 */
const CONTRACTORS_DEFAULT_LIMIT = 2000;

/** Kontrahenci firmy (alfabetycznie). RLS: członek czyta. */
export async function listContractors(
  client: SupabaseClient,
  companyId: string,
  opts?: { limit?: number },
): Promise<Contractor[]> {
  const { data, error } = await client
    .from("contractors")
    .select(COLS)
    .eq("company_id", companyId)
    .order("name")
    .limit(opts?.limit ?? CONTRACTORS_DEFAULT_LIMIT);
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

/** Aktualizuje kontrahenta po id (edycja w rejestrze, w tym zmiana nazwy). RLS: owner/dispatcher. */
export async function updateContractor(
  client: SupabaseClient,
  id: string,
  input: ContractorInput,
): Promise<void> {
  const { error } = await client
    .from("contractors")
    .update({
      name: input.name.trim(),
      tax_id: input.taxId?.trim() || null,
      address: input.address?.trim() || null,
      country: input.country?.trim() || null,
    })
    .eq("id", id);
  if (error) throw error;
}

/** Usuwa kontrahenta. RLS: owner/dispatcher. */
export async function deleteContractor(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("contractors").delete().eq("id", id);
  if (error) throw error;
}
