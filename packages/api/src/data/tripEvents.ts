/** Warstwa danych: formularz Trip (załadunek/rozładunek/serwis/start/koniec/inne). */
import type { TripEventInput } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";
import { fetchAllByKeyset, type PagedRows } from "./pagination";

export interface TripEventContext {
  /** UUID rekordu wygenerowany na kliencie (offline-first). */
  id: string;
  companyId: string;
  driverId: string;
  deviceId?: string;
}

/** Mapuje zwalidowany input Trip na wiersz tabeli (snake_case + WKT dla PostGIS). */
export function tripEventToRow(input: TripEventInput, ctx: TripEventContext) {
  const hasGeo = input.place.lat != null && input.place.lng != null;
  const orderId = "orderId" in input ? input.orderId : undefined;
  const base = {
    id: ctx.id,
    company_id: ctx.companyId,
    driver_id: ctx.driverId,
    vehicle_id: input.vehicleId,
    action: input.action,
    country: input.place.country,
    location: input.place.location ?? input.place.city ?? null,
    postcode: input.place.postcode ?? null,
    company: input.place.company ?? null,
    geo: hasGeo ? `POINT(${input.place.lng} ${input.place.lat})` : null,
    odometer_km: input.odometerKm,
    weight_kg: "weightKg" in input ? input.weightKg : null,
    amount: "amount" in input ? (input.amount ?? null) : null,
    // [#378] Waluta kwoty. Pominięcie pola zostawia `default 'EUR'` w bazie —
    // tak zachowują się buildy mobile, które o tej kolumnie nie wiedzą.
    ...("currency" in input && input.currency ? { currency: input.currency } : {}),
    comment: input.comment ?? null,
    // [#375] Flagi ładunku — obecne tylko przy załadunku/rozładunku.
    express: "express" in input ? (input.express ?? false) : false,
    secured_parking: "securedParking" in input ? (input.securedParking ?? false) : false,
    from_vehicle_reg: "fromVehicleReg" in input ? input.fromVehicleReg : null,
    to_vehicle_reg: "toVehicleReg" in input ? input.toVehicleReg : null,
    // [#373] Pominięcie pola zostawia `default now()` w bazie — tak zachowują się
    // stare buildy mobile, które o `occurred_at` nie wiedzą.
    ...(input.occurredAt ? { occurred_at: new Date(input.occurredAt).toISOString() } : {}),
    device_id: ctx.deviceId ?? null,
  };
  // order_id dołączany TYLKO gdy wskazany — bez migracji 0052 istniejące trasy (bez zlecenia)
  // działają bez zmian; kolumna wymagana dopiero przy powiązaniu load/unload ze zleceniem.
  return orderId ? { ...base, order_id: orderId } : base;
}

/**
 * Zapis zdarzenia Trip do `trip_events` — **idempotentny** (jak `insertFuelLog`).
 * `id` to UUID klienta (PK); ponowny sync → `ON CONFLICT (id) DO NOTHING` (bez duplikatu
 * i bez błędu PK). `maybeSingle`: przy konflikcie baza nie zwraca wiersza → `null`.
 */
export async function insertTripEvent(
  client: SupabaseClient,
  input: TripEventInput,
  ctx: TripEventContext,
) {
  const { data, error } = await client
    .from("trip_events")
    .upsert(tripEventToRow(input, ctx), { onConflict: "id", ignoreDuplicates: true })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Pojedyncze zdarzenie Trip (do edycji). */
export async function getTripEvent(client: SupabaseClient, id: string) {
  const { data, error } = await client.from("trip_events").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

/** Edycja zdarzenia Trip. RLS: autor (kierowca) lub owner. Geo nadpisywane tylko gdy podane. */
export async function updateTripEvent(client: SupabaseClient, id: string, input: TripEventInput) {
  const row = tripEventToRow(input, { id, companyId: "", driverId: "" });
  const { id: _id, company_id: _c, driver_id: _d, device_id: _dev, geo, ...rest } = row;
  const patch = geo === null ? rest : { ...rest, geo };
  const { error } = await client.from("trip_events").update(patch).eq("id", id);
  if (error) throw error;
}

/** [#375] Usunięcie zdarzenia Trip. RLS: autor albo właściciel (patrz 0095). */
export async function deleteTripEvent(client: SupabaseClient, id: string): Promise<void> {
  const { error, count } = await client.from("trip_events").delete({ count: "exact" }).eq("id", id);
  if (error) throw error;
  if (!count) throw new Error("Brak uprawnień do usunięcia tego wpisu.");
}

/** Filtry listy zdarzeń Trip. Zakres po `occurred_at` (ISO), `to` WŁĄCZNIE (koniec dnia). */
export interface TripEventFilter {
  vehicleId?: string;
  from?: string;
  to?: string;
}

/** Zawężenie zbioru — jedno miejsce na filtry, bez sortowania (patrz `orders.ts`). */
function tripEventsFilter(client: SupabaseClient, opts?: TripEventFilter) {
  // [#373] Zakres po dacie ZDARZENIA — patrz komentarz w `listFuelLogs`.
  let query = client.from("trip_events").select("*");
  if (opts?.vehicleId) query = query.eq("vehicle_id", opts.vehicleId);
  if (opts?.from) query = query.gte("occurred_at", opts.from);
  if (opts?.to) query = query.lte("occurred_at", opts.to);
  return query;
}

/**
 * Lista zdarzeń Trip (RLS zawęża do kierowcy/firmy) — JEDNO zapytanie.
 *
 * `limit` ogranicza transfer, ale nie daje kompletu: powyżej `api.max_rows` odpowiedź
 * jest przycinana bez błędu (patrz `listFuelLogs`). Gdzie liczba zdarzeń ma się zgadzać
 * — `listTripEventsAll`.
 */
export async function listTripEvents(
  client: SupabaseClient,
  opts?: TripEventFilter & { limit?: number },
) {
  let query = tripEventsFilter(client, opts).order("occurred_at", { ascending: false });
  if (opts?.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Wiersz zdarzenia Trip tak, jak widzi go warstwa danych (bez powielania listy kolumn). */
export type TripEventRow = Awaited<ReturnType<typeof listTripEvents>>[number];

/** Zdarzenia Trip pobrane STRONAMI — komplet albo `complete: false` (eksport zbiorczy). */
export async function listTripEventsAll(
  client: SupabaseClient,
  opts?: TripEventFilter & { pageSize?: number; maxPages?: number },
): Promise<PagedRows<TripEventRow>> {
  const paged = await fetchAllByKeyset<TripEventRow>(
    async (afterId, pageSize) => {
      let query = tripEventsFilter(client, opts);
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

/** #314: zdarzenia Trip zalogowanego kierowcy (RLS ogranicza do własnych wpisów). */
export async function listMyTripEvents(
  client: SupabaseClient,
  opts?: { from?: string; limit?: number },
) {
  let query = client
    .from("trip_events")
    .select("id, action, odometer_km, created_at, occurred_at, country, location")
    .order("occurred_at", { ascending: false });
  if (opts?.from) query = query.gte("occurred_at", opts.from);
  query = query.limit(opts?.limit ?? 200);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
