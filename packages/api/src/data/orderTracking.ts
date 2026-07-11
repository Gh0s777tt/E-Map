/**
 * Warstwa danych: publiczne śledzenie zlecenia (#289) — sekretny token w QR
 * dla odbiorcy/klienta. Odczyt publiczny wyłącznie przez RPC `order_tracking`
 * (bezpieczny podzbiór pól), token widzi tylko członek firmy (RLS orders).
 */
import type { OrderStatus } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface OrderTracking {
  reference_no: string | null;
  origin: string | null;
  destination: string | null;
  status: OrderStatus;
  load_date: string | null;
  unload_date: string | null;
  updated_at: string;
}

/** Token śledzenia zlecenia (RLS: członek firmy). */
export async function getOrderTrackingToken(
  client: SupabaseClient,
  orderId: string,
): Promise<string> {
  const { data, error } = await client
    .from("orders")
    .select("tracking_token")
    .eq("id", orderId)
    .single();
  if (error) throw error;
  return data.tracking_token as string;
}

/** Publiczny status przesyłki po tokenie (działa też bez sesji — anon). */
export async function fetchOrderTracking(
  client: SupabaseClient,
  token: string,
): Promise<OrderTracking | null> {
  const { data, error } = await client.rpc("order_tracking", { p_token: token });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as OrderTracking) ?? null;
}

/** Link do publicznej strony śledzenia (QR/klient). */
export function trackingUrl(token: string, base = "https://e-logistic-one.vercel.app"): string {
  return `${base}/track/${token}`;
}
