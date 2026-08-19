/** Warstwa danych: zlecenia / ładunki. */
import type { OrderInput, OrderStatus } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface Order {
  id: string;
  reference_no: string | null;
  shipper: string | null;
  consignee: string | null;
  origin: string | null;
  destination: string | null;
  cargo: string | null;
  weight_kg: number | null;
  price: number | null;
  currency: string;
  status: OrderStatus;
  vehicle_id: string | null;
  assigned_to: string | null;
  load_date: string | null;
  unload_date: string | null;
  notes: string | null;
  created_at: string;
}

const COLS =
  "id, reference_no, shipper, consignee, origin, destination, cargo, weight_kg, price, currency, status, vehicle_id, assigned_to, load_date, unload_date, notes, created_at";

/**
 * Zlecenia firmy (najnowsze pierwsze). `opts` ogranicza zakres dla stron analitycznych:
 * `from`/`to` filtrują po `created_at`, `limit` zabezpiecza przed pobraniem całej historii.
 *
 * Domyślnego sufitu tu NIE MA i to jest decyzja, nie przeoczenie — inaczej niż w listach,
 * które tylko się wyświetlają. Z tej funkcji liczy się PIENIĄDZE: `apps/web/lib/exportAll.ts`
 * buduje z niej arkusz „Statystyki" (suma `revenue` per pojazd) do eksportu księgowego,
 * a `components/KpiStrip.tsx` — kafelki przychodu na pulpicie. Domyślne obcięcie
 * zaniżyłoby te sumy o kwotę, której nikt nie zobaczy: wynik nadal wygląda jak pełna
 * liczba. Wywołujący, któremu wystarczy okno czasowe albo kilkaset najnowszych pozycji
 * (`stats`, `scoring`, `route-costs`), podaje `from`/`to`/`limit` jawnie — i wtedy wie,
 * że patrzy na wycinek.
 */
export async function listOrders(
  client: SupabaseClient,
  companyId: string,
  opts?: { from?: string; to?: string; limit?: number },
): Promise<Order[]> {
  let query = client
    .from("orders")
    .select(COLS)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (opts?.from) query = query.gte("created_at", opts.from);
  if (opts?.to) query = query.lte("created_at", opts.to);
  // `!== undefined`, nie samo `opts?.limit` — wariant falsy po cichu ignorował `limit: 0`
  // i rozjeżdżał się z konwencją `listMyOrders` w tym samym pliku (linia niżej).
  if (opts?.limit !== undefined) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Order[];
}

/**
 * Zlecenia przypisane do bieżącego użytkownika (kierowcy). RLS dopuszcza odczyt członka.
 *
 * Świadomie BEZ domyślnego sufitu — w przeciwieństwie do `listOrders`, który zasila
 * wyłącznie widoki firmowe. Z tej funkcji liczy się STATYSTYKI CAŁEGO STAŻU:
 * `apps/mobile/lib/useGamification.ts` bierze stąd licznik dostaw i odsetek terminowych.
 * Domyślne obcięcie do kilkuset najnowszych zamrażałoby licznik dostaw (kierowca
 * z 900 zleceniami widziałby 500 i nigdy nie przekroczył kolejnego progu odznaki),
 * a terminowość liczyłoby z okrojonego mianownika — bez żadnego sygnału, że liczba
 * jest niepełna. Ekrany listy (`my-orders`, mobile `orders`) też nie mają stronicowania,
 * więc obcięcie znaczyłoby tam po prostu zniknięcie starszych zleceń.
 *
 * `opts.limit` zostaje dla wywołującego, któremu wystarczy kilka najnowszych pozycji.
 */
export async function listMyOrders(
  client: SupabaseClient,
  opts?: { limit?: number },
): Promise<Order[]> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return [];
  let query = client
    .from("orders")
    .select(COLS)
    .eq("assigned_to", user.id)
    .order("created_at", { ascending: false });
  if (opts?.limit !== undefined) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Order[];
}

function orderToRow(input: OrderInput, companyId: string) {
  return {
    company_id: companyId,
    reference_no: input.referenceNo ?? null,
    shipper: input.shipper ?? null,
    consignee: input.consignee ?? null,
    origin: input.origin ?? null,
    destination: input.destination ?? null,
    cargo: input.cargo ?? null,
    weight_kg: input.weightKg ?? null,
    price: input.price ?? null,
    currency: input.currency,
    vehicle_id: input.vehicleId ?? null,
    assigned_to: input.assignedTo ?? null,
    load_date: input.loadDate ?? null,
    unload_date: input.unloadDate ?? null,
    notes: input.notes ?? null,
  };
}

export async function saveOrder(
  client: SupabaseClient,
  companyId: string,
  input: OrderInput,
  id?: string,
): Promise<string> {
  const row = orderToRow(input, companyId);
  if (id) {
    const { error } = await client.from("orders").update(row).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await client.from("orders").insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

/**
 * Zmiana statusu przez RPC z kontrolą uprawnień: owner/dispatcher → dowolny status,
 * przypisany kierowca → tylko operacyjny (w trakcie / dostarczone). Audytowane.
 */
export async function setOrderStatus(
  client: SupabaseClient,
  id: string,
  status: OrderStatus,
): Promise<void> {
  const { error } = await client.rpc("order_set_status", { p_order: id, p_status: status });
  if (error) throw error;
}

export async function deleteOrder(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("orders").delete().eq("id", id);
  if (error) throw error;
}
