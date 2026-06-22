/** Warstwa danych: firma (dane przewoźnika do dokumentów). */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface Company {
  id: string;
  name: string;
  tax_id: string | null;
  address: string | null;
  country: string | null;
  default_vat_rate: number;
  payment_due_days: number;
}

/** Dane firmy (RLS: tylko własna firma). Null gdy brak dostępu. */
export async function getCompany(
  client: SupabaseClient,
  companyId: string,
): Promise<Company | null> {
  const { data, error } = await client
    .from("companies")
    .select("id, name, tax_id, address, country, default_vat_rate, payment_due_days")
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw error;
  return (data as Company) ?? null;
}

export interface CompanyPatch {
  name: string;
  taxId?: string | null;
  address?: string | null;
  country?: string | null;
  defaultVatRate?: number;
  paymentDueDays?: number;
}

/** Aktualizacja danych firmy (sprzedawca + domyślne fakturowe). RLS: owner. */
export async function updateCompany(
  client: SupabaseClient,
  companyId: string,
  patch: CompanyPatch,
): Promise<void> {
  const row: {
    name: string;
    tax_id: string | null;
    address: string | null;
    country: string | null;
    default_vat_rate?: number;
    payment_due_days?: number;
  } = {
    name: patch.name,
    tax_id: patch.taxId ?? null,
    address: patch.address ?? null,
    country: patch.country ?? null,
  };
  if (patch.defaultVatRate !== undefined) row.default_vat_rate = patch.defaultVatRate;
  if (patch.paymentDueDays !== undefined) row.payment_due_days = patch.paymentDueDays;
  const { error } = await client.from("companies").update(row).eq("id", companyId);
  if (error) throw error;
}
