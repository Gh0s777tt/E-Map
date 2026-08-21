/** Warstwa danych: rozliczenia kierowcy (należność / zaliczka / potrącenie / wypłata). */
import type { PayoutKind } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";
import { fetchAllByKeyset, type PagedRows } from "./pagination";

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

/** Filtry wspólne dla obu trybów pobrania (jednorazowego i stronami). */
export interface DriverPayoutFilter {
  driverName?: string;
}

/** Zawężenie zbioru rozliczeń — jedno miejsce na filtry, bez sortowania (patrz `orders.ts`). */
function companyPayoutsFilter(client: SupabaseClient, companyId: string, opts: DriverPayoutFilter) {
  let q = client.from("driver_payouts").select(COLS).eq("company_id", companyId);
  if (opts.driverName) q = q.eq("driver_name", opts.driverName);
  return q;
}

/** Najnowsze pierwsze; `id` rozstrzyga remis, bo `entry_date` to sam DZIEŃ, bez godziny. */
function najnowszePierwsze(a: DriverPayoutRecord, b: DriverPayoutRecord): number {
  return b.entry_date.localeCompare(a.entry_date) || b.id.localeCompare(a.id);
}

/**
 * Pozycje rozliczeń firmy (wg daty malejąco). Filtr: kierowca. RLS: członek czyta.
 *
 * Domyślny `limit` 1000 powtarza sufit serwera (`api.max_rows`), więc nie chroni przed
 * niczym — przy większym zbiorze odpowiedź jest przycinana bez błędu, a sortowanie
 * malejące zabiera pozycje NAJSTARSZE. Dla ekranu z listą to wycinek, dla salda
 * kierowcy (należności − zaliczki − potrącenia) to zła liczba: `listDriverPayoutsAll`.
 */
export async function listDriverPayouts(
  client: SupabaseClient,
  companyId: string,
  opts: DriverPayoutFilter & { limit?: number } = {},
): Promise<DriverPayoutRecord[]> {
  const { data, error } = await companyPayoutsFilter(client, companyId, opts)
    .order("entry_date", { ascending: false })
    .limit(opts.limit ?? 1000);
  if (error) throw error;
  return (data ?? []) as DriverPayoutRecord[];
}

/**
 * Rozliczenia pobrane STRONAMI — komplet albo `complete: false`.
 *
 * Saldo kierowcy jest RÓŻNICĄ pozycji różnych znaków (należność, zaliczka, potrącenie,
 * wypłata), więc obcięcie zbioru nie zaniża wyniku w jedną stronę — przesuwa go
 * w dowolną. Wypłacone zaliczki sprzed roku wypadają, saldo rośnie i dokument
 * rozliczeniowy pokazuje dług, którego nie ma. Dlatego dokument i KPI liczy się
 * z KOMPLETU, a nie z tysiąca najnowszych wierszy.
 *
 * Zawężenie po kierowcy zostaje po stronie bazy: dokument rozliczeniowy dotyczy
 * jednej osoby, więc „komplet" nie musi znaczyć całej historii firmy.
 */
export async function listDriverPayoutsAll(
  client: SupabaseClient,
  companyId: string,
  opts: DriverPayoutFilter & { pageSize?: number; maxPages?: number } = {},
): Promise<PagedRows<DriverPayoutRecord>> {
  const paged = await fetchAllByKeyset<DriverPayoutRecord>(
    async (afterId, pageSize) => {
      let q = companyPayoutsFilter(client, companyId, opts);
      if (afterId) q = q.gt("id", afterId);
      const { data, error } = await q.order("id", { ascending: true }).limit(pageSize);
      if (error) throw error;
      return (data ?? []) as DriverPayoutRecord[];
    },
    { pageSize: opts.pageSize, maxPages: opts.maxPages },
  );
  return { ...paged, rows: [...paged.rows].sort(najnowszePierwsze) };
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
