/** Warstwa danych: usterki pojazdu (zgłoszenia kierowców → mechanik/owner). */
import type { DefectInput, DefectStatus } from "@e-logistic/core";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function listDefects(
  client: SupabaseClient,
  opts?: { vehicleId?: string; limit?: number },
) {
  let q = client
    .from("vehicle_defects")
    .select(
      "id, vehicle_id, reported_by, part, side, severity, dashboard_light, description, status, resolved_at, created_at",
    )
    .order("created_at", { ascending: false });
  if (opts?.vehicleId) q = q.eq("vehicle_id", opts.vehicleId);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function insertDefect(
  client: SupabaseClient,
  input: DefectInput,
  ctx: { companyId: string; reportedBy: string },
) {
  const { data, error } = await client
    .from("vehicle_defects")
    .insert({
      company_id: ctx.companyId,
      vehicle_id: input.vehicleId,
      reported_by: ctx.reportedBy,
      part: input.part,
      side: input.side ?? null,
      severity: input.severity,
      dashboard_light: input.dashboardLight,
      description: input.description,
      status: "open",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Zmiana statusu usterki (owner/dispatcher = mechanik, lub autor). */
export async function updateDefectStatus(
  client: SupabaseClient,
  id: string,
  status: DefectStatus,
  resolvedBy?: string,
) {
  const patch: Record<string, unknown> = { status };
  patch.resolved_at = status === "resolved" ? new Date().toISOString() : null;
  patch.resolved_by = status === "resolved" ? (resolvedBy ?? null) : null;
  const { error } = await client.from("vehicle_defects").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteDefect(client: SupabaseClient, id: string) {
  const { error } = await client.from("vehicle_defects").delete().eq("id", id);
  if (error) throw error;
}
