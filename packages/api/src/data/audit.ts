/** Warstwa danych: dziennik audytu (dostępy do PIN/PII, akcje krytyczne). */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface AuditEntry {
  id: string;
  actor_id: string | null;
  action: string;
  target: string | null;
  created_at: string;
}

const COLS = "id, actor_id, action, target, created_at";

/**
 * Wpisy audytu firmy (najnowsze pierwsze). RLS: tylko owner/developer (`audit_log_select`).
 * Filtr po `action`; `limit` ogranicza transfer (domyślnie 200).
 */
export async function listAuditLog(
  client: SupabaseClient,
  companyId: string,
  opts: { action?: string; limit?: number } = {},
): Promise<AuditEntry[]> {
  let q = client.from("audit_log").select(COLS).eq("company_id", companyId);
  if (opts.action) q = q.eq("action", opts.action);
  q = q.order("created_at", { ascending: false }).limit(opts.limit ?? 200);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AuditEntry[];
}
