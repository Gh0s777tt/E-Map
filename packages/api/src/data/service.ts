/** Warstwa danych: plan serwisowy pojazdu (interwały km/miesiące). */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface ServiceTask {
  id: string;
  vehicle_id: string;
  name: string;
  interval_km: number | null;
  interval_months: number | null;
  last_done_km: number | null;
  last_done_date: string | null;
  notes: string | null;
}

export interface ServiceTaskInput {
  vehicleId: string;
  name: string;
  intervalKm?: number | null;
  intervalMonths?: number | null;
  lastDoneKm?: number | null;
  lastDoneDate?: string | null;
  notes?: string | null;
}

const COLS =
  "id, vehicle_id, name, interval_km, interval_months, last_done_km, last_done_date, notes";

export async function listServiceTasks(
  client: SupabaseClient,
  companyId: string,
): Promise<ServiceTask[]> {
  const { data, error } = await client
    .from("service_tasks")
    .select(COLS)
    .eq("company_id", companyId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as ServiceTask[];
}

/** Bieżący przebieg per pojazd = max licznika z tankowań. RLS zawęża do firmy. */
export async function latestOdometers(
  client: SupabaseClient,
  companyId: string,
): Promise<Record<string, number>> {
  const { data, error } = await client
    .from("fuel_logs")
    .select("vehicle_id, odometer_km")
    .eq("company_id", companyId);
  if (error) throw error;
  const map: Record<string, number> = {};
  for (const r of data ?? []) {
    const km = r.odometer_km ?? 0;
    if (km > (map[r.vehicle_id] ?? 0)) map[r.vehicle_id] = km;
  }
  return map;
}

export async function saveServiceTask(
  client: SupabaseClient,
  companyId: string,
  input: ServiceTaskInput,
  id?: string,
): Promise<string> {
  const row = {
    company_id: companyId,
    vehicle_id: input.vehicleId,
    name: input.name,
    interval_km: input.intervalKm ?? null,
    interval_months: input.intervalMonths ?? null,
    last_done_km: input.lastDoneKm ?? null,
    last_done_date: input.lastDoneDate ?? null,
    notes: input.notes ?? null,
  };
  if (id) {
    const { error } = await client.from("service_tasks").update(row).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await client.from("service_tasks").insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function markServiceDone(
  client: SupabaseClient,
  id: string,
  doneKm: number | null,
  doneDate: string,
): Promise<void> {
  const { error } = await client
    .from("service_tasks")
    .update({ last_done_km: doneKm, last_done_date: doneDate })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteServiceTask(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("service_tasks").delete().eq("id", id);
  if (error) throw error;
}
