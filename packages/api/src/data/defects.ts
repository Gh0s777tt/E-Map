/** Warstwa danych: usterki pojazdu (zgłoszenia kierowców → mechanik/owner). */
import type { DefectInput, DefectStatus } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";
import { fetchAllByKeyset, type PagedRows } from "./pagination";

const COLS =
  "id, vehicle_id, reported_by, part, side, severity, dashboard_light, description, status, resolved_at, created_at";

/** Filtry wspólne dla obu trybów pobrania (jednorazowego i stronami). */
export interface DefectFilter {
  vehicleId?: string;
  /** Zawężenie po stronie BAZY — zamiast ściągania zamkniętych usterek i odsiewania ich w pętli. */
  statuses?: DefectStatus[];
}

/** Zawężenie zbioru usterek — jedno miejsce na filtry, bez sortowania (patrz `orders.ts`). */
function defectsFilter(client: SupabaseClient, opts?: DefectFilter) {
  let q = client.from("vehicle_defects").select(COLS);
  if (opts?.vehicleId) q = q.eq("vehicle_id", opts.vehicleId);
  if (opts?.statuses) q = q.in("status", opts.statuses);
  return q;
}

/**
 * Usterki (RLS zawęża do firmy) — JEDNO zapytanie, więc obowiązuje sufit serwera.
 *
 * `limit` ogranicza transfer, ale kompletu nie daje: powyżej `api.max_rows` PostgREST
 * przycina odpowiedź bez błędu. Gdzie z listy czyta się, czy coś jest OTWARTE —
 * `listDefectsAll` z zawężeniem statusów.
 */
export async function listDefects(
  client: SupabaseClient,
  opts?: DefectFilter & { limit?: number },
) {
  let q = defectsFilter(client, opts).order("created_at", { ascending: false });
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Wiersz usterki tak, jak widzi go warstwa danych (bez powielania listy kolumn). */
export type Defect = Awaited<ReturnType<typeof listDefects>>[number];

/**
 * Usterki pobrane STRONAMI — komplet albo jawne `complete: false`.
 *
 * Powstało dla panelu „Wymaga uwagi": twarde okno 200 najnowszych zgłoszeń znaczyło,
 * że krytyczna usterka sprzed 250 zgłoszeń po prostu przestawała się upominać — a panel
 * wyglądał wtedy identycznie jak u firmy, która nie ma nic otwartego. Zawężenie statusów
 * idzie do bazy, więc komplet dotyczy tego, co faktycznie wymaga reakcji, a nie archiwum.
 */
export async function listDefectsAll(
  client: SupabaseClient,
  opts?: DefectFilter & { pageSize?: number; maxPages?: number },
): Promise<PagedRows<Defect>> {
  const paged = await fetchAllByKeyset<Defect>(async (afterId, pageSize) => {
    let q = defectsFilter(client, opts);
    if (afterId) q = q.gt("id", afterId);
    const { data, error } = await q.order("id", { ascending: true }).limit(pageSize);
    if (error) throw error;
    return data ?? [];
  }, opts);
  // Porządek prezentacyjny wraca dopiero po złożeniu stron — patrz `pagination.ts`.
  return {
    ...paged,
    rows: [...paged.rows].sort(
      (a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
    ),
  };
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
  const { error } = await client
    .from("vehicle_defects")
    .update({
      status,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
      resolved_by: status === "resolved" ? (resolvedBy ?? null) : null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDefect(client: SupabaseClient, id: string) {
  const { error } = await client.from("vehicle_defects").delete().eq("id", id);
  if (error) throw error;
}
