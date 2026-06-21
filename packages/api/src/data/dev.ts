/** Warstwa danych: panel developera (diagnostyka). Dostęp tylko dla roli developer. */
import type { SupabaseClient } from "@supabase/supabase-js";

export type DevStats = Record<string, number>;

/** Liczniki encji (RPC dev_stats, security definer + is_developer). */
export async function getDevStats(client: SupabaseClient): Promise<DevStats> {
  const { data, error } = await client.rpc("dev_stats");
  if (error) throw error;
  return data as DevStats;
}

/** Ostatnie wpisy audytu (RLS: owner/developer). */
export async function listRecentAudit(client: SupabaseClient, limit = 25) {
  const { data, error } = await client
    .from("audit_log")
    .select("id, action, target, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
