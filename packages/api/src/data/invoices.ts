/** Warstwa danych: faktury (generowane ze zleceń). */
import type { TypedSupabaseClient as SupabaseClient } from "../client";
import { fetchAllByKeyset, type PagedRows } from "./pagination";
import { rpcJson } from "./rpcJson";

export interface Invoice {
  id: string;
  order_id: string | null;
  number: string;
  issue_date: string;
  seller_name: string | null;
  seller_tax_id: string | null;
  seller_address: string | null;
  seller_bank: string | null;
  seller_account: string | null;
  buyer_name: string | null;
  buyer_tax_id: string | null;
  buyer_address: string | null;
  description: string | null;
  net: number;
  vat_rate: number;
  vat_amount: number;
  gross: number;
  currency: string;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

const COLS =
  "id, order_id, number, issue_date, due_date, paid_at, seller_name, seller_tax_id, seller_address, seller_bank, seller_account, buyer_name, buyer_tax_id, buyer_address, description, net, vat_rate, vat_amount, gross, currency, status, created_at";

/** Filtry wspólne dla obu trybów pobrania. Zakres po `created_at`, `to` WŁĄCZNIE. */
export interface InvoiceFilter {
  from?: string;
  to?: string;
}

/**
 * Zawężenie zbioru faktur — jedno miejsce na filtry, bez sortowania (patrz `orders.ts`).
 *
 * Granica górna jest tu WŁĄCZNA (`lte`), inaczej niż przy zleceniach i kosztach.
 * To nie niedopatrzenie do wyrównania „przy okazji": wywołujący (pulpit właściciela)
 * podaje dziś samo `from`, a zmiana progu przesunęłaby przynależność faktur z północy
 * granicznego dnia — czyli kwoty w już wystawionych zestawieniach. Zmiana semantyki
 * należy do wywołujących, nie do wariantu stronicowanego.
 */
function companyInvoicesFilter(client: SupabaseClient, companyId: string, opts?: InvoiceFilter) {
  let query = client.from("invoices").select(COLS).eq("company_id", companyId);
  if (opts?.from) query = query.gte("created_at", opts.from);
  if (opts?.to) query = query.lte("created_at", opts.to);
  return query;
}

/** Najnowsze pierwsze; `id` rozstrzyga remis, bo faktury wystawiane hurtem mają ten sam `created_at`. */
function najnowszePierwsze(a: Invoice, b: Invoice): number {
  return b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id);
}

/**
 * Faktury firmy (najnowsze pierwsze) — JEDNO zapytanie, więc obowiązuje sufit serwera.
 *
 * Brak `limit` NIE znaczy „cała historia": znaczy `api.max_rows` PostgREST (domyślnie
 * 1000), egzekwowany bez błędu. Do wyszukiwarki, listy na ekranie i podglądu ostatnich
 * faktur to wystarcza. Tam, gdzie z faktur liczy się kwoty albo szuka zaległości
 * w całej historii — `listInvoicesAll`.
 */
export async function listInvoices(
  client: SupabaseClient,
  companyId: string,
  opts?: InvoiceFilter & { limit?: number },
): Promise<Invoice[]> {
  let query = companyInvoicesFilter(client, companyId, opts).order("created_at", {
    ascending: false,
  });
  if (opts?.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Invoice[];
}

/**
 * Faktury pobrane STRONAMI — komplet albo `complete: false`.
 *
 * Faktura jest dokumentem księgowym, więc każdy jej brak w zestawieniu jest błędem
 * kwoty, nie brakiem wiersza. Dwa miejsca bolą najbardziej: sprzedaż liczona
 * z faktur (przy sortowaniu malejącym ucięcie zabiera te NAJSTARSZE z okna,
 * czyli dokładnie te, o które pyta zamknięty miesiąc) oraz szukanie przeterminowanych
 * płatności — zaległość sprzed roku leży na końcu zbioru i wypada z niego pierwsza,
 * a panel „Wymaga uwagi" milczy tym samym milczeniem, co przy braku zaległości.
 */
export async function listInvoicesAll(
  client: SupabaseClient,
  companyId: string,
  opts?: InvoiceFilter & { pageSize?: number; maxPages?: number },
): Promise<PagedRows<Invoice>> {
  const paged = await fetchAllByKeyset<Invoice>(
    async (afterId, pageSize) => {
      let query = companyInvoicesFilter(client, companyId, opts);
      if (afterId) query = query.gt("id", afterId);
      const { data, error } = await query.order("id", { ascending: true }).limit(pageSize);
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
    { pageSize: opts?.pageSize, maxPages: opts?.maxPages },
  );
  return { ...paged, rows: [...paged.rows].sort(najnowszePierwsze) };
}

/**
 * Wystawia fakturę ze zlecenia (RPC, owner/dispatcher). Gdy `vatRate` pominięty,
 * RPC bierze domyślny VAT z ustawień firmy. Zwraca numer + brutto.
 */
export async function createInvoiceFromOrder(
  client: SupabaseClient,
  orderId: string,
  vatRate?: number,
): Promise<{ id: string; number: string; gross: number }> {
  const { data, error } = await client.rpc("create_invoice", {
    p_order: orderId,
    p_vat_rate: vatRate ?? null,
  });
  if (error) throw error;
  return rpcJson<{ id: string; number: string; gross: number }>(data);
}

export async function deleteInvoice(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("invoices").delete().eq("id", id);
  if (error) throw error;
}

/** Zmiana statusu faktury (np. anulowanie). RLS: owner/dispatcher; zmiana audytowana. */
export async function setInvoiceStatus(
  client: SupabaseClient,
  id: string,
  status: "issued" | "cancelled",
): Promise<void> {
  const { error } = await client.from("invoices").update({ status }).eq("id", id);
  if (error) throw error;
}

/** Oznacza fakturę jako opłaconą (`paid=true`) lub cofa płatność. RLS: owner/dispatcher; audyt. */
export async function setInvoicePaid(
  client: SupabaseClient,
  id: string,
  paid: boolean,
): Promise<void> {
  const { error } = await client
    .from("invoices")
    .update({ paid_at: paid ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export interface BlankInvoiceInput {
  buyerName: string;
  buyerTaxId?: string;
  buyerAddress?: string;
  currency?: string;
}

/** Tworzy pustą fakturę (bez zlecenia) z dowolnym nabywcą. RPC, owner/dispatcher. */
export async function createBlankInvoice(
  client: SupabaseClient,
  companyId: string,
  input: BlankInvoiceInput,
): Promise<{ id: string; number: string }> {
  const { data, error } = await client.rpc("create_blank_invoice", {
    p_company: companyId,
    p_buyer_name: input.buyerName,
    p_buyer_tax_id: input.buyerTaxId ?? null,
    p_buyer_address: input.buyerAddress ?? null,
    p_currency: input.currency ?? "EUR",
  });
  if (error) throw error;
  return rpcJson<{ id: string; number: string }>(data);
}

// ── Pozycje faktury (wieloliniowe) ──────────────────────────────────

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  position: number;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  net: number;
  vat_amount: number;
  gross: number;
}

const ITEM_COLS =
  "id, invoice_id, position, description, quantity, unit_price, vat_rate, net, vat_amount, gross";

export async function listInvoiceItems(
  client: SupabaseClient,
  invoiceId: string,
): Promise<InvoiceItem[]> {
  const { data, error } = await client
    .from("invoice_items")
    .select(ITEM_COLS)
    .eq("invoice_id", invoiceId)
    .order("position")
    .limit(500);
  if (error) throw error;
  return (data ?? []) as InvoiceItem[];
}

export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate?: number;
  position?: number;
}

/** Dodaje pozycję faktury (kwoty i sumy faktury liczy trigger). */
export async function addInvoiceItem(
  client: SupabaseClient,
  invoiceId: string,
  input: InvoiceItemInput,
): Promise<void> {
  const { error } = await client.from("invoice_items").insert({
    invoice_id: invoiceId,
    description: input.description,
    quantity: input.quantity,
    unit_price: input.unitPrice,
    vat_rate: input.vatRate ?? 23,
    position: input.position ?? 1,
  });
  if (error) throw error;
}

export async function deleteInvoiceItem(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("invoice_items").delete().eq("id", id);
  if (error) throw error;
}

/** Tworzy duplikat faktury (z pozycjami) pod nowym numerem (RPC, owner/dispatcher). */
export async function duplicateInvoice(
  client: SupabaseClient,
  invoiceId: string,
): Promise<{ id: string; number: string }> {
  const { data, error } = await client.rpc("duplicate_invoice", { p_invoice: invoiceId });
  if (error) throw error;
  return rpcJson<{ id: string; number: string }>(data);
}
