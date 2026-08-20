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
/**
 * Ewidencja czasu pracy firmy.
 *
 * [#389] `driverId` (klucz kartoteki, `drivers.id`) to filtr, którego brakowało
 * aplikacji mobilnej. Polityka SELECT na tej tabeli to `is_member_of(company_id)`,
 * więc kierowca WIDZI wpisy wszystkich kolegów — bez filtra po stronie zapytania
 * ekran „Czas pracy" sumował godziny całej firmy i wyliczał z nich status WTD
 * jednego człowieka.
 *
 * Filtr po `driverId` jest pewniejszy niż po `driverName`: nazwisko bywa wpisane
 * z literówką albo w innej kolejności, a klucz kartoteki jest jeden.
 */
export async function listWorkTimeEntries(
  client: SupabaseClient,
  companyId: string,
  opts: { driverName?: string; driverId?: string; limit?: number } = {},
): Promise<WorkTimeRecord[]> {
  let q = client.from("work_time_entries").select(COLS).eq("company_id", companyId);
  /*
   * [#397] Sam `driver_id` NIE WYSTARCZA — i to jest regresja, którą wprowadziła
   * poprawka [#389].
   *
   * Ewidencja powstaje dwiema drogami. Ręczny wpis z panelu ustawia `driver_id`
   * (klucz kartoteki) razem z nazwiskiem. Import pliku `.ddd` z karty kierowcy
   * ustawia **tylko `driver_name`** (`tacho/page.tsx` nie ma skąd wziąć kartoteki
   * — plik zna kierowcę po nazwisku z karty, nie po naszym UUID).
   *
   * Zawężenie do `driver_id` zrobiło więc z danych z tachografu dane niewidoczne
   * dla kierowcy: ekran „Czas pracy" pokazywał 0 h, a status WTD 2002/15/WE
   * liczył się z pustego zbioru, czyli alarm przekroczenia nie zapaliłby się
   * NIGDY. To gorsze niż stan sprzed [#389], gdzie alarm zapalał się fałszywie:
   * ostrzeżenie nadmiarowe da się zauważyć, brakującego nie.
   *
   * Dlatego przy podanych obu kryteriach szukamy alternatywy: wiersz jest mój,
   * jeśli wskazuje na moją kartotekę ALBO nie ma kartoteki w ogóle i zgadza się
   * nazwisko. Warunek `driver_id.is.null` jest istotny — bez niego dopasowanie po
   * nazwisku przyciągałoby też wpisy przypisane wprost do kogoś innego,
   * a imiennicy w firmie transportowej nie są rzadkością.
   */
  if (opts.driverId && opts.driverName) {
    q = q.or(
      `driver_id.eq.${opts.driverId},and(driver_id.is.null,driver_name.eq.${opts.driverName})`,
    );
  } else if (opts.driverId) {
    q = q.eq("driver_id", opts.driverId);
  } else if (opts.driverName) {
    q = q.eq("driver_name", opts.driverName);
  }
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
