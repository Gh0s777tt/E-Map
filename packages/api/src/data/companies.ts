/** Warstwa danych: firma (dane przewoźnika do dokumentów). */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface Company {
  id: string;
  name: string;
  tax_id: string | null;
  address: string | null;
  country: string | null;
}

/** Dane firmy (RLS: tylko własna firma). Null gdy brak dostępu. */
export async function getCompany(
  client: SupabaseClient,
  companyId: string,
): Promise<Company | null> {
  const { data, error } = await client
    .from("companies")
    .select("id, name, tax_id, address, country")
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw error;
  return (data as Company) ?? null;
}
