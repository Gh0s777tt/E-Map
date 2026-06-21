/** Warstwa danych: powiadomienia w aplikacji. */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  severity: string;
  read_at: string | null;
  created_at: string;
};

/** Ostatnie powiadomienia zalogowanego użytkownika. */
export async function listNotifications(client: SupabaseClient, limit = 30) {
  const { data, error } = await client
    .from("notifications")
    .select("id, type, title, body, severity, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

/** Oznacza wszystkie nieprzeczytane jako przeczytane. */
export async function markNotificationsRead(client: SupabaseClient) {
  const { error } = await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}

/** Powiadamia kadrę zarządzającą firmy (RPC, member). */
export async function notifyCompany(
  client: SupabaseClient,
  p: { companyId: string; type: string; title: string; body?: string; severity?: string },
) {
  const { error } = await client.rpc("notify_company", {
    p_company: p.companyId,
    p_type: p.type,
    p_title: p.title,
    p_body: p.body ?? null,
    p_severity: p.severity ?? "info",
  });
  if (error) throw error;
}

/** Generuje powiadomienia o wygasających terminach (RPC, owner/dispatcher; idempotentne). */
export async function generateExpiryNotifications(client: SupabaseClient, companyId: string) {
  const { error } = await client.rpc("generate_expiry_notifications", { p_company: companyId });
  if (error) throw error;
}
