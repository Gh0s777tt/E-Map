/** Warstwa danych: ewidencja czasu pracy kierowcy (jazda / inna praca / odpoczynek). */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface WorkTimeRecord {
  id: string;
  driver_name: string | null;
  /** #271: FK do kartoteki (obok driver_name) — realny filtr zestawień po kierowcy. */
  driver_id: string | null;
  work_date: string;
  driving: number;
  other_work: number;
  rest: number;
  note: string | null;
  created_at: string;
}

export interface WorkTimeInput {
  driverName?: string | null;
  /** #271: FK do kartoteki — spójna tożsamość kierowcy obok nazwy. */
  driverId?: string | null;
  workDate: string;
  driving: number;
  otherWork: number;
  rest: number;
  note?: string | null;
}

const COLS = "id, driver_name, driver_id, work_date, driving, other_work, rest, note, created_at";

/** Wpisy czasu pracy firmy (wg daty malejąco). Filtr: kierowca. RLS: członek czyta. */
export async function listWorkTimeEntries(
  client: SupabaseClient,
  companyId: string,
  opts: { driverName?: string; limit?: number } = {},
): Promise<WorkTimeRecord[]> {
  let q = client.from("work_time_entries").select(COLS).eq("company_id", companyId);
  if (opts.driverName) q = q.eq("driver_name", opts.driverName);
  q = q.order("work_date", { ascending: false }).limit(opts.limit ?? 1000);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as WorkTimeRecord[];
}

/** Dodaje jeden dzień pracy. RLS: owner/dispatcher. Zwraca id. */
export async function insertWorkTimeEntry(
  client: SupabaseClient,
  input: WorkTimeInput,
  companyId: string,
): Promise<string> {
  const { data, error } = await client
    .from("work_time_entries")
    .insert({
      company_id: companyId,
      driver_name: input.driverName?.trim() || null,
      driver_id: input.driverId ?? null,
      work_date: input.workDate,
      driving: input.driving,
      other_work: input.otherWork,
      rest: input.rest,
      note: input.note?.trim() || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/** Usuwa wpis czasu pracy. RLS: owner/dispatcher. */
export async function deleteWorkTimeEntry(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("work_time_entries").delete().eq("id", id);
  if (error) throw error;
}
