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
  load_date: string | null;
  unload_date: string | null;
  notes: string | null;
  created_at: string;
}

const COLS =
  "id, reference_no, shipper, consignee, origin, destination, cargo, weight_kg, price, currency, status, vehicle_id, load_date, unload_date, notes, created_at";

export async function listOrders(client: SupabaseClient, companyId: string): Promise<Order[]> {
  const { data, error } = await client
    .from("orders")
    .select(COLS)
    .eq("company_id", companyId)
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

export async function setOrderStatus(
  client: SupabaseClient,
  id: string,
  status: OrderStatus,
): Promise<void> {
  const { error } = await client.from("orders").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteOrder(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("orders").delete().eq("id", id);
  if (error) throw error;
}
