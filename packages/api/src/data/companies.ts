/** Warstwa danych: firma (dane przewoźnika do dokumentów). */
import type { TypedSupabaseClient as SupabaseClient } from "../client";
import { rpcJson } from "./rpcJson";

export interface Company {
  id: string;
  name: string;
  tax_id: string | null;
  address: string | null;
  country: string | null;
  default_vat_rate: number;
  payment_due_days: number;
  bank_name: string | null;
  bank_account: string | null;
}

/** Dane firmy (RLS: tylko własna firma). Null gdy brak dostępu. */
export async function getCompany(
  client: SupabaseClient,
  companyId: string,
): Promise<Company | null> {
  const { data, error } = await client
    .from("companies")
    .select(
      "id, name, tax_id, address, country, default_vat_rate, payment_due_days, bank_name, bank_account",
    )
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
  bankName?: string | null;
  bankAccount?: string | null;
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
    bank_name?: string | null;
    bank_account?: string | null;
  } = {
    name: patch.name,
    tax_id: patch.taxId ?? null,
    address: patch.address ?? null,
    country: patch.country ?? null,
  };
  if (patch.defaultVatRate !== undefined) row.default_vat_rate = patch.defaultVatRate;
  if (patch.paymentDueDays !== undefined) row.payment_due_days = patch.paymentDueDays;
  if (patch.bankName !== undefined) row.bank_name = patch.bankName ?? null;
  if (patch.bankAccount !== undefined) row.bank_account = patch.bankAccount ?? null;
  const { error } = await client.from("companies").update(row).eq("id", companyId);
  if (error) throw error;
}

/**
 * Czyszczenie danych firmy (strefa niebezpieczna, #259) — RPC `company_wipe_data`:
 * tylko owner, potwierdzenie DOKŁADNĄ nazwą firmy; zostają firma/zespół/audyt/tokeny push.
 * Zwraca liczbę usuniętych wierszy per tabela (wpis trafia też do audit_log).
 */
export async function wipeCompanyData(
  client: SupabaseClient,
  companyId: string,
  confirmName: string,
): Promise<Record<string, number>> {
  const { data, error } = await client.rpc("company_wipe_data", {
    p_company: companyId,
    p_confirm_name: confirmName,
  });
  if (error) throw error;
  return rpcJson<Record<string, number>>(data);
}
