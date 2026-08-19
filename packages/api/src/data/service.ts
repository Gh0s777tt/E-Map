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

/**
 * Bieżący przebieg per pojazd = max licznika z tankowań. RLS zawęża do firmy.
 *
 * TA funkcja jako jedyna w module świadomie NIE MA domyślnego sufitu i to jest decyzja,
 * nie przeoczenie. `fuel_logs` rośnie najszybciej z tabel modułu (kilka wierszy dziennie
 * NA AUTO), a wynik nie trafia na listę — zasila `serviceStatus`, panel „Wymaga uwagi"
 * i harmonogram. Globalny sufit z sortowaniem malejącym po liczniku jest tu
 * DETERMINISTYCZNIE STRONNICZY: pułap wypełniają wiersze aut o najwyższym przebiegu,
 * więc z wyniku wypadają CAŁE pojazdy o najniższym — czyli te nowe. A brak przebiegu nie
 * daje pustego ekranu: `serviceStatus(null, …)` zwraca poziom „ok", więc panel uwagi
 * pomija taki pojazd MILCZĄCO. Przekroczony o 15 tys. km olej na nowym ciągniku wyglądał
 * wtedy identycznie jak flota w normie — a to jest gorsze niż wolne zapytanie.
 *
 * `opts.limit` zostaje dla wywołującego, który świadomie próbkuje (sortowanie malejące
 * włącza się wtedy razem z nim, żeby obcięcie mogło co najwyżej usunąć pojazd, a nie
 * zaniżyć jego przebieg). Domyślnie skanujemy komplet: dwie wąskie kolumny w zasięgu
 * jednej firmy.
 */
export async function latestOdometers(
  client: SupabaseClient,
  companyId: string,
  opts?: { limit?: number },
): Promise<Record<string, number>> {
  let query = client
    .from("fuel_logs")
    .select("vehicle_id, odometer_km")
    .eq("company_id", companyId);
  if (opts?.limit !== undefined) {
    query = query.order("odometer_km", { ascending: false }).limit(opts.limit);
  }
  const { data, error } = await query;
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
