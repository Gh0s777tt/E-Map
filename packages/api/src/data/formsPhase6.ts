/**
 * [#375] Warstwa danych trzech nowych zgłoszeń: pauza, dodatkowe koszty trasy, kary.
 *
 * Uprawnienia różnią się między nimi i to jest celowe (patrz migracja 0095):
 *  • pauzę dodaje KIEROWCA i widzi swoje; zarząd widzi wszystkie,
 *  • dodatkowe koszty trasy dodaje ZARZĄD po zakończeniu trasy — kierowca
 *    ich nie widzi ani nie wprowadza,
 *  • karę dodaje ZARZĄD, ale kierowca WIDZI tę, która jego dotyczy — inaczej
 *    dowiadywałby się o mandacie dopiero z potrącenia w wypłacie.
 */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

// ── Pauza / postój ──────────────────────────────────────────────────

export interface PauseEventInput {
  companyId: string;
  vehicleId?: string | null;
  occurredAt?: string;
  country: string;
  city?: string | null;
  postcode?: string | null;
  location?: string | null;
  lat?: number | null;
  lng?: number | null;
  odometerKm?: number | null;
  priceTotal?: number | null;
  currency?: string;
  securedParking?: boolean;
  paymentMethod?: string | null;
  fuelCardId?: string | null;
  comment?: string | null;
}

export interface PauseEventRow {
  id: string;
  company_id: string;
  driver_id: string | null;
  vehicle_id: string | null;
  occurred_at: string;
  country: string;
  city: string | null;
  location: string | null;
  odometer_km: number | null;
  price_total: number | null;
  currency: string;
  secured_parking: boolean;
  payment_method: string | null;
  comment: string | null;
}

/**
 * [#378] `fuel_card_id` jest w tej liście świadomie: kolumna była zapisywana
 * od 0095, ale nie było jej w SELECT-cie, więc informacja „którą kartą zapłacono
 * za parking" fizycznie nie dawała się odczytać. To samo dotyczyło kosztów trasy.
 */
const PAUSE_COLS =
  "id, company_id, driver_id, vehicle_id, occurred_at, country, city, location, odometer_km, price_total, currency, secured_parking, payment_method, fuel_card_id, comment";

/** Zapis postoju we własnym imieniu (RLS wymaga `driver_id = auth.uid()`). */
export async function insertPauseEvent(
  client: SupabaseClient,
  input: PauseEventInput,
): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Brak sesji.");
  const hasGeo = input.lat != null && input.lng != null;
  const { error } = await client.from("pause_events").insert({
    company_id: input.companyId,
    driver_id: user.id,
    vehicle_id: input.vehicleId ?? null,
    country: input.country,
    city: input.city ?? null,
    postcode: input.postcode ?? null,
    location: input.location ?? null,
    geo: hasGeo ? `POINT(${input.lng} ${input.lat})` : null,
    odometer_km: input.odometerKm ?? null,
    price_total: input.priceTotal ?? null,
    currency: input.currency ?? "EUR",
    secured_parking: input.securedParking ?? false,
    payment_method: input.paymentMethod ?? null,
    fuel_card_id: input.fuelCardId ?? null,
    comment: input.comment ?? null,
    ...(input.occurredAt ? { occurred_at: new Date(input.occurredAt).toISOString() } : {}),
  });
  if (error) throw error;
}

export async function listPauseEvents(
  client: SupabaseClient,
  opts?: { from?: string; to?: string; vehicleId?: string; limit?: number },
): Promise<PauseEventRow[]> {
  let q = client.from("pause_events").select(PAUSE_COLS).order("occurred_at", { ascending: false });
  if (opts?.vehicleId) q = q.eq("vehicle_id", opts.vehicleId);
  if (opts?.from) q = q.gte("occurred_at", opts.from);
  if (opts?.to) q = q.lte("occurred_at", opts.to);
  const { data, error } = await q.limit(opts?.limit ?? 500);
  if (error) throw error;
  return (data ?? []) as PauseEventRow[];
}

export async function deletePauseEvent(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("pause_events").delete().eq("id", id);
  if (error) throw error;
}

// ── Dodatkowe koszty trasy ──────────────────────────────────────────

/** Rodzaje kosztów — muszą zgadzać się z CHECK z migracji 0095. */
export const ROUTE_COST_KINDS = [
  "hotel",
  "toll",
  "motorway",
  "ferry",
  "tunnel",
  "train",
  "bridge",
  "vignette",
  "parking",
  "wash",
  "repair",
  "fine_admin",
  "other",
] as const;
export type RouteCostKind = (typeof ROUTE_COST_KINDS)[number];

export interface RouteExtraCostInput {
  companyId: string;
  vehicleId?: string | null;
  orderId?: string | null;
  occurredAt?: string;
  kind: RouteCostKind;
  country?: string | null;
  city?: string | null;
  location?: string | null;
  amount: number;
  currency?: string;
  paymentMethod?: string | null;
  fuelCardId?: string | null;
  comment?: string | null;
}

export interface RouteExtraCostRow {
  id: string;
  company_id: string;
  vehicle_id: string | null;
  order_id: string | null;
  occurred_at: string;
  kind: RouteCostKind;
  country: string | null;
  city: string | null;
  location: string | null;
  amount: number;
  currency: string;
  payment_method: string | null;
  comment: string | null;
}

const ROUTE_COST_COLS =
  "id, company_id, vehicle_id, order_id, occurred_at, kind, country, city, location, amount, currency, payment_method, fuel_card_id, comment";

export async function insertRouteExtraCost(
  client: SupabaseClient,
  input: RouteExtraCostInput,
): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser();
  const { error } = await client.from("route_extra_costs").insert({
    company_id: input.companyId,
    vehicle_id: input.vehicleId ?? null,
    order_id: input.orderId ?? null,
    kind: input.kind,
    country: input.country ?? null,
    city: input.city ?? null,
    location: input.location ?? null,
    amount: input.amount,
    currency: input.currency ?? "EUR",
    payment_method: input.paymentMethod ?? null,
    fuel_card_id: input.fuelCardId ?? null,
    comment: input.comment ?? null,
    created_by: user?.id ?? null,
    ...(input.occurredAt ? { occurred_at: new Date(input.occurredAt).toISOString() } : {}),
  });
  if (error) throw error;
}

export async function listRouteExtraCosts(
  client: SupabaseClient,
  opts?: { from?: string; to?: string; vehicleId?: string; orderId?: string; limit?: number },
): Promise<RouteExtraCostRow[]> {
  let q = client
    .from("route_extra_costs")
    .select(ROUTE_COST_COLS)
    .order("occurred_at", { ascending: false });
  if (opts?.vehicleId) q = q.eq("vehicle_id", opts.vehicleId);
  if (opts?.orderId) q = q.eq("order_id", opts.orderId);
  if (opts?.from) q = q.gte("occurred_at", opts.from);
  if (opts?.to) q = q.lte("occurred_at", opts.to);
  const { data, error } = await q.limit(opts?.limit ?? 500);
  if (error) throw error;
  return (data ?? []) as RouteExtraCostRow[];
}

export async function deleteRouteExtraCost(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("route_extra_costs").delete().eq("id", id);
  if (error) throw error;
}

// ── Kary i mandaty ──────────────────────────────────────────────────

export const PENALTY_STATUSES = ["open", "paid", "appealed", "cancelled"] as const;
export type PenaltyStatus = (typeof PENALTY_STATUSES)[number];

export interface PenaltyInput {
  companyId: string;
  vehicleId?: string | null;
  driverId?: string | null;
  occurredAt?: string;
  country?: string | null;
  city?: string | null;
  location?: string | null;
  amount: number;
  currency?: string;
  reason: string;
  status?: PenaltyStatus;
  dueDate?: string | null;
  comment?: string | null;
}

export interface PenaltyRow {
  id: string;
  company_id: string;
  vehicle_id: string | null;
  driver_id: string | null;
  occurred_at: string;
  country: string | null;
  city: string | null;
  location: string | null;
  amount: number;
  currency: string;
  reason: string;
  status: PenaltyStatus;
  due_date: string | null;
  comment: string | null;
}

const PENALTY_COLS =
  "id, company_id, vehicle_id, driver_id, occurred_at, country, city, location, amount, currency, reason, status, due_date, comment";

export async function insertPenalty(client: SupabaseClient, input: PenaltyInput): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser();
  const { error } = await client.from("penalties").insert({
    company_id: input.companyId,
    vehicle_id: input.vehicleId ?? null,
    driver_id: input.driverId ?? null,
    country: input.country ?? null,
    city: input.city ?? null,
    location: input.location ?? null,
    amount: input.amount,
    currency: input.currency ?? "EUR",
    reason: input.reason,
    status: input.status ?? "open",
    due_date: input.dueDate ?? null,
    comment: input.comment ?? null,
    created_by: user?.id ?? null,
    ...(input.occurredAt ? { occurred_at: new Date(input.occurredAt).toISOString() } : {}),
  });
  if (error) throw error;
}

export async function listPenalties(
  client: SupabaseClient,
  opts?: { from?: string; to?: string; vehicleId?: string; limit?: number },
): Promise<PenaltyRow[]> {
  let q = client.from("penalties").select(PENALTY_COLS).order("occurred_at", { ascending: false });
  if (opts?.vehicleId) q = q.eq("vehicle_id", opts.vehicleId);
  if (opts?.from) q = q.gte("occurred_at", opts.from);
  if (opts?.to) q = q.lte("occurred_at", opts.to);
  const { data, error } = await q.limit(opts?.limit ?? 500);
  if (error) throw error;
  return (data ?? []) as PenaltyRow[];
}

export async function setPenaltyStatus(
  client: SupabaseClient,
  id: string,
  status: PenaltyStatus,
): Promise<void> {
  const { error } = await client.from("penalties").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deletePenalty(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("penalties").delete().eq("id", id);
  if (error) throw error;
}
