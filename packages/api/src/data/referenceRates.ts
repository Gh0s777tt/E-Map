/**
 * [#373] Odczyt danych referencyjnych: kursy walut (EBC) i stawki VAT per kraj.
 *
 * Osobno od `data/rates.ts`, które dotyczy stawek €/km per pojazd — to zupełnie
 * inna dziedzina mimo podobnej nazwy.
 *
 * Obie tabele są WSPÓLNE dla wszystkich firm (nie podlegają multi-tenant) i mają
 * politykę wyłącznie na SELECT — zapisuje je cron przez `service_role`.
 */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface FxRateRow {
  as_of: string;
  currency: string;
  units_per_eur: number;
}

export interface VatRateRow {
  country_code: string;
  valid_from: string;
  rate: number;
  fuel_refundable: boolean;
}

/**
 * Kursy potrzebne do przeliczeń na ekranie.
 *
 * `from` warto podać — bez niego pobralibyśmy całą historię notowań, która
 * rośnie o kilkadziesiąt wierszy dziennie i po roku byłaby sporym transferem
 * przy każdym wejściu na statystyki.
 *
 * [#378] Limit jest podnoszony świadomie i wprost. Zapytanie sortuje malejąco
 * po dacie, więc domyślny pułap PostgREST obcinał **najstarsze** notowania —
 * czyli dokładnie te, których potrzebuje starszy koniec okna. Objaw był
 * podstępny: nowsze miesiące przeliczały się normalnie, a starsze po cichu
 * traciły kwoty, bo `pickFxRate` nie znajdowało kursu. Przy 12 walutach i ~250
 * dniach roboczych rok historii to ~3000 wierszy, stąd ten rząd wielkości.
 */
const FX_DEFAULT_LIMIT = 20_000;

export async function listFxRates(
  client: SupabaseClient,
  opts?: { from?: string; to?: string; currencies?: string[]; limit?: number },
): Promise<FxRateRow[]> {
  let q = client.from("fx_rates").select("as_of, currency, units_per_eur");
  if (opts?.from) q = q.gte("as_of", opts.from);
  if (opts?.to) q = q.lte("as_of", opts.to);
  if (opts?.currencies?.length) q = q.in("currency", opts.currencies);
  const { data, error } = await q
    .order("as_of", { ascending: false })
    .limit(opts?.limit ?? FX_DEFAULT_LIMIT);
  if (error) throw error;
  return (data ?? []) as FxRateRow[];
}

/** Wszystkie stawki VAT — zbiór jest mały (kilkadziesiąt wierszy), więc bez filtrów. */
export async function listVatRates(client: SupabaseClient): Promise<VatRateRow[]> {
  const { data, error } = await client
    .from("vat_rates")
    .select("country_code, valid_from, rate, fuel_refundable")
    .order("country_code");
  if (error) throw error;
  return (data ?? []) as VatRateRow[];
}

/** Mapowanie wierszy bazy na typy z `@e-logistic/core` (camelCase). */
export function toFxRates(rows: readonly FxRateRow[]) {
  return rows.map((r) => ({
    asOf: r.as_of,
    currency: r.currency,
    unitsPerEur: Number(r.units_per_eur),
  }));
}

export function toVatRates(rows: readonly VatRateRow[]) {
  return rows.map((r) => ({
    countryCode: r.country_code,
    validFrom: r.valid_from,
    rate: Number(r.rate),
    fuelRefundable: r.fuel_refundable,
  }));
}
