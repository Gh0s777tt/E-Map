/** Warstwa danych: zapisane podróże do rozliczenia diet kierowcy (per diem). */
import type { DietMode } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";
import { fetchAllByKeyset, type PagedRows } from "./pagination";

export interface PerDiemTrip {
  id: string;
  driver_name: string | null;
  destination: string | null;
  mode: DietMode;
  hours: number;
  daily_rate: number;
  currency: string;
  trip_date: string | null;
  note: string | null;
  created_at: string;
}

export interface PerDiemTripInput {
  driverName?: string | null;
  /** #271: FK do kartoteki — spójna tożsamość kierowcy obok nazwy. */
  driverId?: string | null;
  destination?: string | null;
  mode: DietMode;
  hours: number;
  dailyRate: number;
  currency: string;
  tripDate?: string | null;
  note?: string | null;
}

const COLS =
  "id, driver_name, destination, mode, hours, daily_rate, currency, trip_date, note, created_at";

/** Filtry wspólne dla obu trybów pobrania (jednorazowego i stronami). */
export interface PerDiemTripFilter {
  driverName?: string;
  /** Zakres `trip_date`: `from` włącznie, `to` WYŁĄCZNIE (1. dzień kolejnego miesiąca). */
  from?: string;
  to?: string;
}

/**
 * Zawężenie zbioru podróży — jedno miejsce na filtry, bez sortowania (patrz `orders.ts`).
 *
 * Sortowanie zostaje na zewnątrz, bo dwa tryby pobierania potrzebują dwóch porządków:
 * zapytanie jednorazowe chce najnowsze pierwsze, a pobranie stronami musi iść po kluczu
 * głównym rosnąco, żeby kursor był odporny na wstawki.
 */
function companyTripsFilter(client: SupabaseClient, companyId: string, opts: PerDiemTripFilter) {
  let q = client.from("per_diem_trips").select(COLS).eq("company_id", companyId);
  if (opts.driverName) q = q.eq("driver_name", opts.driverName);
  if (opts.from) q = q.or(`trip_date.gte.${opts.from},trip_date.is.null`);
  if (opts.to) q = q.or(`trip_date.lt.${opts.to},trip_date.is.null`);
  return q;
}

/** Najnowsze pierwsze; `id` rozstrzyga remis, bo cała paczka wpisów bywa dodana w tej samej sekundzie. */
function najnowszePierwsze(a: PerDiemTrip, b: PerDiemTrip): number {
  return b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id);
}

/** Zapisane podróże firmy (najnowsze pierwsze). Filtr: kierowca. RLS: członek czyta. */
/**
 * Podróże służbowe (diety).
 *
 * [#390] `from`/`to` doszły, bo raport miesięczny pobierał CAŁĄ historię firmy
 * i dopiero potem filtrował po miesiącu w przeglądarce. Przy limicie 5000
 * wierszy i kilkuletniej historii najstarsze miesiące wypadały poza limit —
 * i to bez śladu: sekcja diet pokazywała kwotę zaniżoną albo znikała zupełnie,
 * wyglądając identycznie jak miesiąc, w którym nikt nie jeździł.
 *
 * Filtrujemy po `trip_date` (dzień podróży), a nie po `created_at` (dzień
 * wpisania do systemu) — z tego samego powodu, dla którego reszta repozytorium
 * liczy okresy po dacie zdarzenia. Wiersze bez `trip_date` (kolumna jest
 * nullowalna) przepuszczamy, żeby zawężenie zakresu nie ukryło danych,
 * których nie umiemy umiejscowić w czasie.
 *
 * Domyślny `limit` 1000 nie jest ochroną, tylko powtórzeniem sufitu serwera
 * (`api.max_rows` PostgREST). Podanie tu większej liczby — jak `limit: 5000`
 * na ekranie miesięcznym — niczego nie zmienia: odpowiedź i tak zostaje przycięta
 * do tysiąca, bez błędu i bez śladu, a sortowanie malejące zabiera wtedy wiersze
 * NAJSTARSZE z zapytanego okna. Gdzie z diet liczy się kwotę — `listPerDiemTripsAll`.
 */
export async function listPerDiemTrips(
  client: SupabaseClient,
  companyId: string,
  opts: PerDiemTripFilter & { limit?: number } = {},
): Promise<PerDiemTrip[]> {
  const { data, error } = await companyTripsFilter(client, companyId, opts)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 1000);
  if (error) throw error;
  return (data ?? []) as PerDiemTrip[];
}

/**
 * Diety pobrane STRONAMI — komplet albo `complete: false`.
 *
 * Diety wchodzą do rejestru kosztów i do rozliczenia kierowcy, więc niepełny zbiór
 * to nie krótsza lista, tylko ZANIŻONA KWOTA — nieodróżnialna od miesiąca, w którym
 * nikt nie jeździł. Firma z kilkuletnią historią przekracza sufit `api.max_rows`
 * bez trudu, a wywołujący, który prosił o `limit: 5000`, jest przekonany, że ma komplet.
 *
 * Strony schodzą po `id` rosnąco (kursor odporny na wstawki), porządek „najnowsze
 * pierwsze" wraca dopiero po ich złożeniu.
 */
export async function listPerDiemTripsAll(
  client: SupabaseClient,
  companyId: string,
  opts: PerDiemTripFilter & { pageSize?: number; maxPages?: number } = {},
): Promise<PagedRows<PerDiemTrip>> {
  const paged = await fetchAllByKeyset<PerDiemTrip>(
    async (afterId, pageSize) => {
      let q = companyTripsFilter(client, companyId, opts);
      if (afterId) q = q.gt("id", afterId);
      const { data, error } = await q.order("id", { ascending: true }).limit(pageSize);
      if (error) throw error;
      return (data ?? []) as PerDiemTrip[];
    },
    { pageSize: opts.pageSize, maxPages: opts.maxPages },
  );
  return { ...paged, rows: [...paged.rows].sort(najnowszePierwsze) };
}

/** Dodaje jedną podróż. RLS: owner/dispatcher. Zwraca id. */
export async function insertPerDiemTrip(
  client: SupabaseClient,
  input: PerDiemTripInput,
  companyId: string,
): Promise<string> {
  const { data, error } = await client
    .from("per_diem_trips")
    .insert({
      company_id: companyId,
      driver_name: input.driverName?.trim() || null,
      driver_id: input.driverId ?? null,
      destination: input.destination?.trim() || null,
      mode: input.mode,
      hours: input.hours,
      daily_rate: input.dailyRate,
      currency: input.currency,
      trip_date: input.tripDate || null,
      note: input.note?.trim() || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/** Usuwa podróż. RLS: owner/dispatcher. */
export async function deletePerDiemTrip(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("per_diem_trips").delete().eq("id", id);
  if (error) throw error;
}
