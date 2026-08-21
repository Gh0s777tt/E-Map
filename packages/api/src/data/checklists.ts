/** Warstwa danych: checklisty kierowców (#273). */
import { type ChecklistAnswers, type ChecklistItem, newId } from "@e-logistic/core";
import type { Json, TypedSupabaseClient as SupabaseClient } from "../client";
import { fetchAllByKeyset, type PagedRows } from "./pagination";

export interface ChecklistTemplate {
  id: string;
  name: string;
  items: ChecklistItem[];
  active: boolean;
  /** #338: przypisani kierowcy (id z kartoteki). Pusta = dla wszystkich. */
  assignedDrivers: string[];
}

export interface ChecklistSubmission {
  id: string;
  template_name: string;
  /** FK do kartoteki `drivers(id)` (trigger: po user_id wypełniającego). */
  driver_id: string | null;
  /** #audyt B1: `auth.uid()` wypełniającego (user_id) — do złączeń po użytkowniku (scoring). */
  driver_user_id: string | null;
  driver_label: string;
  vehicle_id: string | null;
  answers: ChecklistAnswers;
  created_at: string;
}

/**
 * Szablony pisze się ręcznie i używa wielokrotnie — firma ma ich kilka
 * (wyjazd, powrót, ADR, zima), a nie kilkaset. Wysoki sufit niczego by tu nie
 * uratował, bo każdy szablon niesie ze sobą pełną listę pozycji w `items`,
 * więc koszt zapytania rośnie z ZAWARTOŚCIĄ wierszy, nie z ich liczbą.
 */
const CHECKLIST_TEMPLATES_DEFAULT_LIMIT = 200;

/** Szablony firmy (aktywne pierwsze). RLS: każdy członek czyta. */
export async function listChecklistTemplates(
  client: SupabaseClient,
  companyId: string,
  opts: { activeOnly?: boolean; limit?: number } = {},
): Promise<ChecklistTemplate[]> {
  let q = client
    .from("checklist_templates")
    .select("id, name, items, active, assigned_drivers")
    .eq("company_id", companyId)
    .order("name");
  if (opts.activeOnly) q = q.eq("active", true);
  q = q.limit(opts.limit ?? CHECKLIST_TEMPLATES_DEFAULT_LIMIT);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    items: (r.items as unknown as ChecklistItem[]) ?? [],
    active: r.active,
    assignedDrivers: (r.assigned_drivers as string[] | null) ?? [],
  }));
}

/**
 * #338: szablony WIDOCZNE dla zalogowanego kierowcy (tylko aktywne i
 * przypisane do niego lub dla wszystkich). RPC security definer.
 */
export async function listVisibleChecklistTemplates(
  client: SupabaseClient,
): Promise<ChecklistTemplate[]> {
  const { data, error } = await client.rpc("list_visible_checklist_templates");
  if (error) throw error;
  return (
    (data as {
      id: string;
      name: string;
      items: unknown;
      active: boolean;
      assigned_drivers: string[] | null;
    }[]) ?? []
  ).map((r) => ({
    id: r.id,
    name: r.name,
    items: (r.items as unknown as ChecklistItem[]) ?? [],
    active: r.active,
    assignedDrivers: r.assigned_drivers ?? [],
  }));
}

/** #338: szybkie włącz/wyłącz szablonu (owner/dispatcher). */
export async function setChecklistActive(
  client: SupabaseClient,
  id: string,
  active: boolean,
): Promise<void> {
  const { error } = await client
    .from("checklist_templates")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Zapis/edycja szablonu (owner/dispatcher). Bez id → insert. */
export async function saveChecklistTemplate(
  client: SupabaseClient,
  companyId: string,
  tpl: {
    id?: string;
    name: string;
    items: ChecklistItem[];
    active?: boolean;
    assignedDrivers?: string[];
  },
): Promise<void> {
  const row = {
    company_id: companyId,
    name: tpl.name.trim(),
    items: tpl.items as unknown as Json,
    active: tpl.active ?? true,
    assigned_drivers: tpl.assignedDrivers ?? [],
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
/** [#391] Jak przy wydatkach: `id` z kolejki offline zamienia powtórkę w brak zmian. */
export async function insertChecklistSubmission(
  client: SupabaseClient,
  companyId: string,
  input: ChecklistSubmissionInput,
  /** Identyfikator z kolejki offline — czyni ponowną wysyłkę bezpieczną. */
  id?: string,
): Promise<string> {
  const { data, error } = await client
    .from("checklist_submissions")
    .upsert(
      {
        ...(id ? { id } : {}),
        company_id: companyId,
        template_id: input.templateId,
        template_name: input.templateName,
        vehicle_id: input.vehicleId ?? null,
        driver_label: input.driverLabel,
        answers: input.answers as unknown as Json,
      },
      { onConflict: "id", ignoreDuplicates: true },
    )
    // [#391] `maybeSingle` — patrz `insertDriverExpense`: przy powtórce z kolejki
    // `ignoreDuplicates` nie zwraca wiersza, a to poprawne zakończenie, nie błąd.
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? id ?? "";
}

const SUBMISSION_COLS =
  "id, template_name, driver_id, driver_user_id, driver_label, vehicle_id, answers, created_at";

/** Filtry wspólne dla obu trybów pobrania (jednorazowego i stronami). */
export interface ChecklistSubmissionFilter {
  vehicleId?: string;
  driverUserId?: string;
  templateName?: string;
  /**
   * Zakres `created_at`: `from` włącznie, `to` WYŁĄCZNIE — ta sama konwencja co
   * w `orders.ts`, żeby wiersz z północy granicznego dnia nie należał do dwóch okien.
   *
   * Zakres jest tu ważniejszy niż wygoda: scoring liczy okno 90 dni, a `answers`
   * to kolumna JSON, więc odsianie okna dopiero w przeglądarce znaczy ściągnięcie
   * kilkudziesięciu megabajtów po to, żeby odrzucić 97% z nich. Do tego `complete`
   * mówiłoby wtedy o CAŁEJ historii firmy, a nie o oknie, które ekran naprawdę liczy —
   * czyli baner „ranking jest niepełny" zapalałby się przy komplecie danych.
   */
  from?: string;
  to?: string;
}

/** Zawężenie zbioru zgłoszeń — jedno miejsce na filtry, bez sortowania (patrz `orders.ts`). */
function companySubmissionsFilter(
  client: SupabaseClient,
  companyId: string,
  opts: ChecklistSubmissionFilter,
) {
  let q = client.from("checklist_submissions").select(SUBMISSION_COLS).eq("company_id", companyId);
  if (opts.vehicleId) q = q.eq("vehicle_id", opts.vehicleId);
  if (opts.driverUserId) q = q.eq("driver_user_id", opts.driverUserId);
  if (opts.templateName) q = q.eq("template_name", opts.templateName);
  if (opts.from) q = q.gte("created_at", opts.from);
  if (opts.to) q = q.lt("created_at", opts.to);
  return q;
}

/** Wiersz `checklist_submissions` w kształcie z `SUBMISSION_COLS` — przed mapowaniem `answers`. */
interface ChecklistSubmissionRow {
  id: string;
  template_name: string;
  driver_id: string | null;
  driver_user_id: string | null;
  driver_label: string;
  vehicle_id: string | null;
  answers: Json;
  created_at: string;
}

/** `answers` przychodzi z bazy jako `Json` — kształt odpowiedzi znamy dopiero tutaj. */
function toChecklistSubmission(r: ChecklistSubmissionRow): ChecklistSubmission {
  return { ...r, answers: (r.answers as unknown as ChecklistAnswers) ?? {} };
}

/** Najnowsze pierwsze; `id` rozstrzyga remis przy paczce zgłoszeń z jednej synchronizacji. */
function najnowszePierwsze(a: ChecklistSubmission, b: ChecklistSubmission): number {
  return b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id);
}

/**
 * Zgłoszenia firmy (zarząd) lub własne (kierowca — RLS zawęża). Filtry + sort.
 *
 * Domyślne 200 to okno ostatnich zgłoszeń dla listy na ekranie. Większy `limit`
 * kompletu nie daje: powyżej `api.max_rows` PostgREST przycina odpowiedź bez błędu,
 * więc `limit: 1000` na ekranie scoringu jest dokładnie sufitem serwera, nie ochroną.
 * Gdzie ze zgłoszeń liczy się WSKAŹNIK — `listChecklistSubmissionsAll`.
 */
export async function listChecklistSubmissions(
  client: SupabaseClient,
  companyId: string,
  opts: ChecklistSubmissionFilter & { limit?: number } = {},
): Promise<ChecklistSubmission[]> {
  const { data, error } = await companySubmissionsFilter(client, companyId, opts)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (error) throw error;
  return (data ?? []).map(toChecklistSubmission);
}

/**
 * Zgłoszenia pobrane STRONAMI — komplet albo `complete: false`.
 *
 * Scoring kierowców liczy ODSETEK: ile checklist wypełnionych, ile pozycji zgłoszonych
 * jako usterka. Obcięty zbiór psuje tu MIANOWNIK, a nie tylko licznik — i psuje go
 * nierówno, bo tysiąc najnowszych zgłoszeń całej firmy to głównie wpisy kierowców
 * jeżdżących najczęściej. Kierowca, który wypełnia checklisty rzadziej, wypada ze
 * zbioru prawie w całości i dostaje wynik policzony z kilku przypadkowych zgłoszeń.
 */
export async function listChecklistSubmissionsAll(
  client: SupabaseClient,
  companyId: string,
  opts: ChecklistSubmissionFilter & { pageSize?: number; maxPages?: number } = {},
): Promise<PagedRows<ChecklistSubmission>> {
  const paged = await fetchAllByKeyset<ChecklistSubmission>(
    async (afterId, pageSize) => {
      let q = companySubmissionsFilter(client, companyId, opts);
      if (afterId) q = q.gt("id", afterId);
      const { data, error } = await q.order("id", { ascending: true }).limit(pageSize);
      if (error) throw error;
      return (data ?? []).map(toChecklistSubmission);
    },
    { pageSize: opts.pageSize, maxPages: opts.maxPages },
  );
  return { ...paged, rows: [...paged.rows].sort(najnowszePierwsze) };
}

const BUCKET = "cargo-photos";

/** Upload zdjęcia do pozycji checklisty (np. lista Border Force) — zwraca ścieżkę. */
export async function uploadChecklistPhotoBinary(
  client: SupabaseClient,
  companyId: string,
  bytes: ArrayBuffer,
  opts: { mime?: string } = {},
): Promise<string> {
  const rand = newId().slice(0, 12);
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
