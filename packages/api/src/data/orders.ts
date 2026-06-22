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
  if (opts?.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Order[];
}

/** Zlecenia przypisane do bieżącego użytkownika (kierowcy). RLS dopuszcza odczyt członka. */
export async function listMyOrders(client: SupabaseClient): Promise<Order[]> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return [];
  const { data, error } = await client
    .from("orders")
    .select(COLS)
    .eq("assigned_to", user.id)
    .order("created_at", { ascending: false });
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
