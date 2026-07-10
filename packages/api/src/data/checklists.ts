/** Warstwa danych: checklisty kierowców (#273). */
import type { ChecklistAnswers, ChecklistItem } from "@e-logistic/core";
import type { Json, TypedSupabaseClient as SupabaseClient } from "../client";

export interface ChecklistTemplate {
  id: string;
  name: string;
  items: ChecklistItem[];
  active: boolean;
}

export interface ChecklistSubmission {
  id: string;
  template_name: string;
  driver_id: string | null;
  driver_label: string;
  vehicle_id: string | null;
  answers: ChecklistAnswers;
  created_at: string;
}

/** Szablony firmy (aktywne pierwsze). RLS: każdy członek czyta. */
export async function listChecklistTemplates(
  client: SupabaseClient,
  companyId: string,
  opts: { activeOnly?: boolean } = {},
): Promise<ChecklistTemplate[]> {
  let q = client
    .from("checklist_templates")
    .select("id, name, items, active")
    .eq("company_id", companyId)
    .order("name");
  if (opts.activeOnly) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    items: (r.items as unknown as ChecklistItem[]) ?? [],
    active: r.active,
  }));
}

/** Zapis/edycja szablonu (owner/dispatcher). Bez id → insert. */
export async function saveChecklistTemplate(
  client: SupabaseClient,
  companyId: string,
  tpl: { id?: string; name: string; items: ChecklistItem[]; active?: boolean },
): Promise<void> {
  const row = {
    company_id: companyId,
    name: tpl.name.trim(),
    items: tpl.items as unknown as Json,
    active: tpl.active ?? true,
    updated_at: new Date().toISOString(),
  };
  const { error } = tpl.id
    ? await client.from("checklist_templates").update(row).eq("id", tpl.id)
    : await client.from("checklist_templates").insert(row);
  if (error) throw error;
}

export interface ChecklistSubmissionInput {
  templateId: string;
  templateName: string;
  vehicleId?: string | null;
  driverLabel: string;
  answers: ChecklistAnswers;
}

/** Zgłoszenie kierowcy — driver_id/driver_user_id dopina trigger po auth.uid(). */
export async function insertChecklistSubmission(
  client: SupabaseClient,
  companyId: string,
  input: ChecklistSubmissionInput,
): Promise<string> {
  const { data, error } = await client
    .from("checklist_submissions")
    .insert({
      company_id: companyId,
      template_id: input.templateId,
      template_name: input.templateName,
      vehicle_id: input.vehicleId ?? null,
      driver_label: input.driverLabel,
      answers: input.answers as unknown as Json,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** Zgłoszenia firmy (zarząd) lub własne (kierowca — RLS zawęża). Filtry + sort. */
export async function listChecklistSubmissions(
  client: SupabaseClient,
  companyId: string,
  opts: { vehicleId?: string; driverUserId?: string; templateName?: string; limit?: number } = {},
): Promise<ChecklistSubmission[]> {
  let q = client
    .from("checklist_submissions")
    .select("id, template_name, driver_id, driver_label, vehicle_id, answers, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.vehicleId) q = q.eq("vehicle_id", opts.vehicleId);
  if (opts.driverUserId) q = q.eq("driver_user_id", opts.driverUserId);
  if (opts.templateName) q = q.eq("template_name", opts.templateName);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    template_name: r.template_name,
    driver_id: r.driver_id,
    driver_label: r.driver_label,
    vehicle_id: r.vehicle_id,
    answers: (r.answers as unknown as ChecklistAnswers) ?? {},
    created_at: r.created_at,
  }));
}

const BUCKET = "cargo-photos";

/** Upload zdjęcia do pozycji checklisty (np. lista Border Force) — zwraca ścieżkę. */
export async function uploadChecklistPhotoBinary(
  client: SupabaseClient,
  companyId: string,
  bytes: ArrayBuffer,
  opts: { mime?: string } = {},
): Promise<string> {
  const rand = crypto.randomUUID().slice(0, 12);
  const ext = opts.mime?.includes("png") ? ".png" : ".jpg";
  const path = `${companyId}/checklists/${rand}${ext}`;
  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: opts.mime ?? "image/jpeg", upsert: false });
  if (error) throw error;
  return path;
}

/** Podpisany URL do podglądu zdjęcia z checklisty (10 min). */
export async function checklistPhotoUrl(
  client: SupabaseClient,
  path: string,
): Promise<string | null> {
  const { data } = await client.storage.from(BUCKET).createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}
