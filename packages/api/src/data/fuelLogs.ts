/** Warstwa danych: formularze paliwowe (i AdBlue — ta sama struktura). */
import type { FuelLogInput } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";
import { fetchAllByKeyset, type PagedRows } from "./pagination";

export interface FuelLogContext {
  /** UUID rekordu wygenerowany na kliencie (offline-first). */
  id: string;
  companyId: string;
  driverId: string;
  deviceId?: string;
}

/** Mapuje zwalidowany input formularza na wiersz tabeli (snake_case + WKT dla PostGIS). */
export function fuelLogToRow(input: FuelLogInput, ctx: FuelLogContext) {
  const hasGeo = input.station.lat != null && input.station.lng != null;
  return {
    id: ctx.id,
    company_id: ctx.companyId,
    driver_id: ctx.driverId,
    vehicle_id: input.vehicleId,
    station_country: input.station.country,
    station_city: input.station.city ?? null,
    station_loc: input.station.location ?? null,
    station_postcode: input.station.postcode ?? null,
    station_company: input.station.company ?? null,
    geo: hasGeo ? `POINT(${input.station.lng} ${input.station.lat})` : null,
    odometer_km: input.odometerKm,
    liters: input.liters,
    is_full: input.isFull ?? true,
    payment_method: input.paymentMethod,
    fuel_card_id: input.fuelCardId ?? null,
    price_total: input.priceTotal ?? null,
    // [#373] Waluta i rozbicie kwoty. `price_total` to BRUTTO — nazwa historyczna.
    currency: input.currency ?? "EUR",
    price_net: input.priceNet ?? null,
    vat_rate: input.vatRate ?? null,
    // VAT liczymy jako różnicę brutto − netto, nie osobnym mnożeniem: inaczej
    // suma potrafi rozminąć się z brutto o grosz przez zaokrąglenia.
    vat_amount:
      input.priceTotal != null && input.priceNet != null
        ? Math.round((input.priceTotal - input.priceNet) * 100) / 100
        : null,
    // Pominięcie pola zostawia `default now()` w bazie — tak zachowują się
    // stare buildy mobile, które o `occurred_at` nie wiedzą.
    ...(input.occurredAt ? { occurred_at: new Date(input.occurredAt).toISOString() } : {}),
    comment: input.comment ?? null,
    device_id: ctx.deviceId ?? null,
  };
}

/**
 * Zapis formularza paliwowego do `fuel_logs`/`adblue_logs` — **idempotentny**.
 * `id` to UUID wygenerowany na kliencie (PK). Ponowna synchronizacja tego samego
 * wpisu (outbox offline-first) → `ON CONFLICT (id) DO NOTHING`: brak duplikatu i brak
 * błędu PK. `maybeSingle`, bo przy konflikcie (DO NOTHING) baza nie zwraca wiersza → `null`.
 */
export async function insertFuelLog(
  client: SupabaseClient,
  input: FuelLogInput,
  ctx: FuelLogContext,
  table: "fuel_logs" | "adblue_logs" = "fuel_logs",
) {
  const row = fuelLogToRow(input, ctx);
  const { data, error } = await client
    .from(table)
    .upsert(row, { onConflict: "id", ignoreDuplicates: true })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Pojedynczy wpis (do edycji). */
export async function getFuelLog(
  client: SupabaseClient,
  id: string,
  table: "fuel_logs" | "adblue_logs" = "fuel_logs",
) {
  const { data, error } = await client.from(table).select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

/** Edycja wpisu paliwo/AdBlue. RLS: autor (kierowca) lub owner. Geo nadpisywane tylko gdy podane. */
export async function updateFuelLog(
  client: SupabaseClient,
  id: string,
  input: FuelLogInput,
  table: "fuel_logs" | "adblue_logs" = "fuel_logs",
) {
  const row = fuelLogToRow(input, { id, companyId: "", driverId: "" });
  const { id: _id, company_id: _c, driver_id: _d, device_id: _dev, geo, ...rest } = row;
  const patch = geo === null ? rest : { ...rest, geo };
  const { error } = await client.from(table).update(patch).eq("id", id);
  if (error) throw error;
}

/**
 * [#375] Usunięcie wpisu paliwa/AdBlue.
 *
 * RLS (migracja 0095) dopuszcza AUTORA wpisu oraz właściciela firmy. Dotąd
 * kasować mógł wyłącznie właściciel, więc kierowca, który pomylił się przy
 * tankowaniu, mógł wpis jedynie edytować — zostawiając w bazie zdarzenie,
 * które nigdy nie miało miejsca.
 *
 * `count` rozstrzyga, czy cokolwiek zniknęło: przy braku uprawnień RLS nie
 * zwraca błędu, tylko nie dopasowuje wiersza, a interfejs pokazałby sukces.
 */
export async function deleteFuelLog(
  client: SupabaseClient,
  id: string,
  table: "fuel_logs" | "adblue_logs" = "fuel_logs",
): Promise<void> {
  const { error, count } = await client.from(table).delete({ count: "exact" }).eq("id", id);
  if (error) throw error;
  if (!count) throw new Error("Brak uprawnień do usunięcia tego wpisu.");
}

/** Filtry list paliwa/AdBlue. Zakres po `occurred_at` (ISO), `to` WŁĄCZNIE (koniec dnia). */
export interface FuelLogFilter {
  vehicleId?: string;
  table?: "fuel_logs" | "adblue_logs";
  from?: string;
  to?: string;
}

/** Zawężenie zbioru — jedno miejsce na filtry, bez sortowania (patrz `orders.ts`). */
function fuelLogsFilter(client: SupabaseClient, opts?: FuelLogFilter) {
  let query = client.from(opts?.table ?? "fuel_logs").select("*");
  if (opts?.vehicleId) query = query.eq("vehicle_id", opts.vehicleId);
  // [#373] Zakres po `occurred_at`, nie `created_at`. Wpis zrobiony offline
  // i zsynchronizowany trzy dni później miał datę zapisu, więc wypadał poza
  // zapytany miesiąc i cicho znikał z zestawienia.
  if (opts?.from) query = query.gte("occurred_at", opts.from);
  if (opts?.to) query = query.lte("occurred_at", opts.to);
  return query;
}

/**
 * Lista formularzy paliwowych (RLS zawęża do kierowcy/firmy) — JEDNO zapytanie.
 *
 * `limit` ogranicza transfer, ale NIE gwarantuje kompletu: powyżej sufitu `api.max_rows`
 * PostgREST (domyślnie 1000) odpowiedź jest przycinana bez błędu, więc `limit: 5000`
 * to liczba, która nigdy nie działa. Sortowanie jest malejące, więc ucięcie zabiera
 * wiersze NAJSTARSZE z zapytanego okna. Gdzie suma musi się zgadzać — `listFuelLogsAll`.
 */
export async function listFuelLogs(
  client: SupabaseClient,
  opts?: FuelLogFilter & { limit?: number },
) {
  let query = fuelLogsFilter(client, opts).order("occurred_at", { ascending: false });
  if (opts?.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Wiersz paliwa/AdBlue tak, jak widzi go warstwa danych (bez powielania listy kolumn). */
export type FuelLogRow = Awaited<ReturnType<typeof listFuelLogs>>[number];

/**
 * Paliwo/AdBlue pobrane STRONAMI — komplet albo `complete: false`.
 *
 * Dla eksportu księgowego i rejestru kosztów to jedyny dopuszczalny wariant: arkusz
 * „Paliwo" z 1000 najnowszych tankowań zamiast 12 000 wygląda dokładnie tak samo jak
 * kompletny, a koszt paliwa w podsumowaniu jest wtedy zaniżony o rząd wielkości.
 */
export async function listFuelLogsAll(
  client: SupabaseClient,
  opts?: FuelLogFilter & { pageSize?: number; maxPages?: number },
): Promise<PagedRows<FuelLogRow>> {
  const paged = await fetchAllByKeyset<FuelLogRow>(
    async (afterId, pageSize) => {
      let query = fuelLogsFilter(client, opts);
      if (afterId) query = query.gt("id", afterId);
      const { data, error } = await query.order("id", { ascending: true }).limit(pageSize);
      if (error) throw error;
      return data ?? [];
    },
    { pageSize: opts?.pageSize, maxPages: opts?.maxPages },
  );
  return {
    ...paged,
    rows: [...paged.rows].sort(
      (a, b) => b.occurred_at.localeCompare(a.occurred_at) || b.id.localeCompare(a.id),
    ),
  };
}
