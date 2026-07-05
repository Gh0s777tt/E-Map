/** Warstwa danych: rozliczenia kierowcy (należność / zaliczka / potrącenie / wypłata). */
import type { PayoutKind } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface DriverPayoutRecord {
  id: string;
  driver_name: string | null;
  kind: PayoutKind;
  amount: number;
  currency: string;
  entry_date: string;
  note: string | null;
  created_at: string;
}

export interface DriverPayoutInput {
  driverName?: string | null;
  /** #271: FK do kartoteki — spójna tożsamość kierowcy obok nazwy. */
  driverId?: string | null;
  kind: PayoutKind;
  amount: number;
  currency: string;
  entryDate: string;
  note?: string | null;
}

const COLS = "id, driver_name, kind, amount, currency, entry_date, note, created_at";

/** Pozycje rozliczeń firmy (wg daty malejąco). Filtr: kierowca. RLS: członek czyta. */
export async function listDriverPayouts(
  client: SupabaseClient,
  companyId: string,
  opts: { driverName?: string; limit?: number } = {},
): Promise<DriverPayoutRecord[]> {
  let q = client.from("driver_payouts").select(COLS).eq("company_id", companyId);
  if (opts.driverName) q = q.eq("driver_name", opts.driverName);
  q = q.order("entry_date", { ascending: false }).limit(opts.limit ?? 1000);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DriverPayoutRecord[];
}

/** Dodaje pozycję rozliczenia. RLS: owner/dispatcher. Zwraca id. */
export async function insertDriverPayout(
  client: SupabaseClient,
  input: DriverPayoutInput,
  companyId: string,
): Promise<string> {
  const { data, error } = await client
    .from("driver_payouts")
    .insert({
      company_id: companyId,
      driver_name: input.driverName?.trim() || null,
      driver_id: input.driverId ?? null,
      kind: input.kind,
      amount: input.amount,
      currency: input.currency,
      entry_date: input.entryDate,
      note: input.note?.trim() || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/** Usuwa pozycję rozliczenia. RLS: owner/dispatcher. */
export async function deleteDriverPayout(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("driver_payouts").delete().eq("id", id);
  if (error) throw error;
}
