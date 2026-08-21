/** Warstwa danych: plan serwisowy pojazdu (interwały km/miesiące). */
import type { TypedSupabaseClient as SupabaseClient } from "../client";
import { fetchAllByKeyset } from "./pagination";

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

/**
 * Plan serwisowy to kilkanaście pozycji NA POJAZD (olej, klocki, pasek, tacho,
 * gaśnica…), więc zbiór rośnie iloczynowo z flotą — a nie liniowo jak kartoteka
 * aut. Stąd sufit kilkukrotnie wyższy niż flotowy: 300 ciągników × 15 pozycji
 * to już 4500 wierszy i przy niższym progu plan po cichu gubiłby zadania.
 */
const SERVICE_TASKS_DEFAULT_LIMIT = 5000;

/**
 * Pobranie idzie MALEJĄCO po `created_at`, a kolejność odwracamy dopiero na kliencie.
 *
 * Kierunek sortowania decyduje o tym, CO wypada przy obcięciu — tak samo jak przy
 * `listTachoDownloads`, tylko z odwrotnym wnioskiem. Ekrany (`/service`,
 * `vehicles/[id]`, mobile `manage-service`) pokazują plan w kolejności dopisywania,
 * więc wynik musi zostać rosnący — ale gdyby to baza sortowała rosnąco, sufit
 * odcinałby zadania DOPISANE NAJPÓŹNIEJ. To najgorszy możliwy wariant: dyspozytor
 * zapisuje nową pozycję, zapis się udaje, pozycja nie pojawia się na liście — więc
 * dodaje ją drugi raz i plan puchnie duplikatami dokładnie tam, gdzie już brakuje
 * miejsca. Przy sortowaniu malejącym obcięcie może co najwyżej ukryć NAJSTARSZE
 * pozycje, a te nikt w tej chwili nie wprowadza i nie pomyśli, że zapis padł.
 */
export async function listServiceTasks(
  client: SupabaseClient,
  companyId: string,
  opts?: { limit?: number },
): Promise<ServiceTask[]> {
  const { data, error } = await client
    .from("service_tasks")
    .select(COLS)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? SERVICE_TASKS_DEFAULT_LIMIT);
  if (error) throw error;
  return ((data ?? []) as ServiceTask[]).reverse();
}

/** Przebiegi pojazdów razem z informacją, czy policzono je z KOMPLETU tankowań. */
export interface OdometerReadout {
  /** `vehicle_id` → najwyższy stan licznika, jaki wystąpił w pobranych tankowaniach. */
  byVehicle: Record<string, number>;
  /**
   * `false` = pobieranie przerwał sufit stron, więc przebiegi mogą być ZANIŻONE.
   *
   * Flaga jest w typie z tego samego powodu co `complete` w `PagedRows`: zaniżony
   * przebieg nie wygląda jak brak danych, tylko jak niższy przebieg, a `serviceStatus`
   * odpowiada na niego poziomem „ok". Wywołujący musi obok tego pola przejść.
   */
  complete: boolean;
}

/** Wiersz `fuel_logs` w zakresie potrzebnym do agregacji — `id` niesie kursor stronicowania. */
interface OdometerRow {
  id: string;
  vehicle_id: string;
  odometer_km: number | null;
}

/**
 * Bieżący przebieg per pojazd = max licznika z tankowań, liczony ze STRON. RLS zawęża do firmy.
 *
 * Brak `limit` nie znaczył tu „komplet", tylko granicę CUDZĄ: sufit `api.max_rows`
 * PostgREST (u Supabase 1000), egzekwowany bez błędu i bez sortowania, czyli w kolejności
 * nieokreślonej — w praktyce od najstarszych wierszy sterty. Firma z dwoma latami tankowań
 * dostawała maksimum z tankowań sprzed dwóch lat i żadnego sygnału, że tak jest.
 * A zaniżony przebieg nie daje pustego ekranu: `serviceStatus(zaniżony, …)` zwraca „ok",
 * więc panel „Wymaga uwagi" milczy dokładnie tak samo jak przy flocie w normie.
 *
 * Trzy wąskie kolumny zamiast wiersza tankowania — jak `listOrderReferences`: tu naprawdę
 * potrzebna jest każda pozycja historii, ale wyłącznie po to, żeby wziąć z niej maksimum.
 * Sortowania prezentacyjnego nie ma, bo wynikiem jest mapa, a nie lista.
 */
export async function latestOdometers(
  client: SupabaseClient,
  companyId: string,
  opts?: { pageSize?: number; maxPages?: number },
): Promise<OdometerReadout> {
  const paged = await fetchAllByKeyset<OdometerRow>(async (afterId, pageSize) => {
    let query = client
      .from("fuel_logs")
      .select("id, vehicle_id, odometer_km")
      .eq("company_id", companyId);
    if (afterId) query = query.gt("id", afterId);
    const { data, error } = await query.order("id", { ascending: true }).limit(pageSize);
    if (error) throw error;
    return (data ?? []) as OdometerRow[];
  }, opts);
  const byVehicle: Record<string, number> = {};
  for (const r of paged.rows) {
    const km = r.odometer_km ?? 0;
    if (km > (byVehicle[r.vehicle_id] ?? 0)) byVehicle[r.vehicle_id] = km;
  }
  return { byVehicle, complete: paged.complete };
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
