/** Warstwa danych: stawki €/km per pojazd (oraz domyślne firmowe, `vehicle_id = null`). */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface Rate {
  id: string;
  vehicleId: string | null;
  ratePerKm: number;
  currency: string;
  validFrom: string;
}

interface RateRow {
  id: string;
  vehicle_id: string | null;
  rate_per_km: number;
  currency: string;
  valid_from: string;
}

const COLS = "id, vehicle_id, rate_per_km, currency, valid_from";

/**
 * `saveDefaultRate` DOPISUJE nowy wiersz zamiast nadpisywać — historia stawek
 * jest tu funkcją, nie efektem ubocznym. Zbiór rośnie więc z każdą zmianą
 * ceny za kilometr, per pojazd, przez cały czas życia firmy.
 *
 * Kolejność malejąca po `valid_from` sprawia, że obcięcie odcina najstarsze
 * stawki, a `pickRate` i tak sięga po najnowszą obowiązującą — dlatego skutkiem
 * jest utrata historii, nie błędne rozliczenie bieżącego miesiąca.
 */
const RATES_DEFAULT_LIMIT = 2000;

/** Stawki firmy (najnowsze pierwsze). RLS: członek czyta. */
export async function listRates(
  client: SupabaseClient,
  companyId: string,
  opts?: { limit?: number },
): Promise<Rate[]> {
  const { data, error } = await client
    .from("rates")
    .select(COLS)
    .eq("company_id", companyId)
    .order("valid_from", { ascending: false })
    .limit(opts?.limit ?? RATES_DEFAULT_LIMIT);
  if (error) throw error;
  return ((data ?? []) as RateRow[]).map((r) => ({
    id: r.id,
    vehicleId: r.vehicle_id,
    ratePerKm: r.rate_per_km,
    currency: r.currency,
    validFrom: r.valid_from,
  }));
}

/**
 * Zapisuje domyślną stawkę jako nowy wpis (`valid_from` = dziś, z domyślnej bazy).
 * Historia stawek zachowana; `pickRate` bierze najnowszą. RLS: owner.
 */
export async function saveDefaultRate(
  client: SupabaseClient,
  input: { companyId: string; vehicleId: string | null; ratePerKm: number; currency?: string },
): Promise<void> {
  const { error } = await client.from("rates").insert({
    company_id: input.companyId,
    vehicle_id: input.vehicleId,
    rate_per_km: input.ratePerKm,
    currency: input.currency ?? "EUR",
  });
  if (error) throw error;
}
