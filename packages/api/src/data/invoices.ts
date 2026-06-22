/** Warstwa danych: faktury (generowane ze zleceń). */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface Invoice {
  id: string;
  order_id: string | null;
  number: string;
  issue_date: string;
  seller_name: string | null;
  seller_tax_id: string | null;
  seller_address: string | null;
  buyer_name: string | null;
  buyer_tax_id: string | null;
  buyer_address: string | null;
  description: string | null;
  net: number;
  vat_rate: number;
  vat_amount: number;
  gross: number;
  currency: string;
  created_at: string;
}

const COLS =
  "id, order_id, number, issue_date, seller_name, seller_tax_id, seller_address, buyer_name, buyer_tax_id, buyer_address, description, net, vat_rate, vat_amount, gross, currency, created_at";

export async function listInvoices(client: SupabaseClient, companyId: string): Promise<Invoice[]> {
  const { data, error } = await client
    .from("invoices")
    .select(COLS)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Invoice[];
}

/** Wystawia fakturę ze zlecenia (RPC, owner/dispatcher). Zwraca numer + brutto. */
export async function createInvoiceFromOrder(
  client: SupabaseClient,
  orderId: string,
  vatRate = 23,
): Promise<{ id: string; number: string; gross: number }> {
  const { data, error } = await client.rpc("create_invoice", {
    p_order: orderId,
    p_vat_rate: vatRate,
  });
  if (error) throw error;
  return data as unknown as { id: string; number: string; gross: number };
}

export async function deleteInvoice(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("invoices").delete().eq("id", id);
  if (error) throw error;
}
