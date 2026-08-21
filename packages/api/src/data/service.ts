/** Warstwa danych: plan serwisowy pojazdu (interwały km/miesiące). */
import type { TypedSupabaseClient as SupabaseClient } from "../client";
import { fetchAllByKeyset, type PagedRows } from "./pagination";

export interface ServiceTask {
  id: string;
  vehicle_id: string;
  name: string;
  interval_km: number | null;
  interval_months: number | null;
  last_done_km: number | null;
  last_done_date: string | null;
  notes: string | null;
  /**
   * Data dopisania — kolumna PREZENTACYJNA, nie techniczna.
   *
   * Plan pokazuje się w kolejności dopisywania i przy pobraniu jednym zapytaniem
   * dawała ją baza (`order("created_at")`). Wariant stronicowany schodzi po kluczu
   * głównym, więc porządek trzeba odtworzyć w pamięci — bez tej kolumny lista
   * ustawiałaby się po losowym UUID i ta sama firma widziałaby plan w innej
   * kolejności zależnie od tego, którą funkcją go pobrano.
   */
  created_at: string;
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
  "id, vehicle_id, name, interval_km, interval_months, last_done_km, last_done_date, notes, created_at";

/**
 * Zawężenie planu po stronie BAZY — jedno miejsce na filtry, bez sortowania.
 *
 * Sortowanie zostaje na zewnątrz z tego samego powodu co w `companyOrdersFilter`:
 * pobranie jednorazowe chce porządek prezentacyjny, a stronicowane musi iść po kluczu
 * głównym rosnąco, żeby kursor był odporny na wstawki (patrz [`pagination.ts`](./pagination.ts)).
 */
function companyServiceTasksFilter(
  client: SupabaseClient,
  companyId: string,
  opts?: ServiceTaskFilter,
) {
  let query = client.from("service_tasks").select(COLS).eq("company_id", companyId);
  if (opts?.vehicleId) query = query.eq("vehicle_id", opts.vehicleId);
  // `gt(interval_km, 0)`, a nie `not is null`: interwał 0 przechodzi przez formularz
  // mobilny (`optInt("0")` → 0) i daje zadanie „wymagane zawsze" — każdy ekran i tak
  // odsiewał je warunkiem `task.interval_km &&`, a `serviceStatus` traktuje `<= 0`
  // jak brak danych. NULL w SQL nie jest większy od zera, więc ten warunek załatwia
  // oba przypadki naraz.
  if (opts?.kmTracked) {
    query = query.gt("interval_km", 0).not("last_done_km", "is", null);
  }
  return query;
}

/** Filtry wspólne dla obu trybów pobrania (jednorazowego i stronami). */
export interface ServiceTaskFilter {
  /** Zawężenie po stronie BAZY — zamiast ściągania planu całej firmy i odsiewania w przeglądarce. */
  vehicleId?: string;
  /**
   * Tylko zadania śledzone PRZEBIEGIEM: `interval_km > 0` i ustawione `last_done_km`.
   *
   * Dla wywołujących, którzy liczą wyłącznie „ile km do serwisu" (harmonogramy web
   * i mobile, panel „Wymaga uwagi"). Bez tego ściągali cały plan firmy po to, żeby
   * natychmiast odrzucić pozycje czysto kalendarzowe i te bez ostatniego serwisu —
   * a przy dużej flocie to właśnie one wypychały poza sufit zadania, które miały
   * coś do powiedzenia.
   */
  kmTracked?: boolean;
}

/** Kolejność dopisywania (najstarsze pierwsze); `id` rozstrzyga remis co do sekundy. */
function wgDopisania(a: ServiceTask, b: ServiceTask): number {
  return a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
}

/**
 * Sufit ŻĄDANY, nie otrzymany — i tak nie da się go osiągnąć.
 *
 * Liczba brała się z rachunku „300 ciągników × 15 pozycji = 4500 wierszy" i miała ten
 * rachunek pokryć, tylko że nie ma jak: PostgREST przycina odpowiedź na własnym
 * `api.max_rows` (u Supabase 1000), więc powyżej tysiąca ta wartość niczego nie zmienia.
 * Zostaje jako granica dla wywołującego, który poda własną, mniejszą — nie jako obietnica.
 */
const SERVICE_TASKS_DEFAULT_LIMIT = 5000;

/**
 * Plan serwisowy firmy — JEDNO zapytanie, więc obowiązuje sufit serwera (patrz wyżej).
 *
 * Wynik jest WYCINKIEM, nie kompletem: nadaje się na podgląd listy albo podpowiedzi
 * w formularzu. Tam, gdzie brak pozycji ma znaczyć „nie ma takiego zadania" — bo od
 * tego zależy, czy ktoś pojedzie po terminie przeglądu — wołaj `listServiceTasksAll`.
 *
 * Kierunek sortowania decyduje o tym, CO wypada przy obcięciu — tak samo jak przy
 * `listTachoDownloads`, tylko z odwrotnym wnioskiem. Ekrany pokazują plan w kolejności
 * dopisywania, więc wynik musi zostać rosnący — ale gdyby to baza sortowała rosnąco,
 * sufit odcinałby zadania DOPISANE NAJPÓŹNIEJ. To najgorszy możliwy wariant: dyspozytor
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
  const { data, error } = await companyServiceTasksFilter(client, companyId)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? SERVICE_TASKS_DEFAULT_LIMIT);
  if (error) throw error;
  return ((data ?? []) as ServiceTask[]).reverse();
}

/**
 * Plan serwisowy pobrany STRONAMI — komplet albo jawne `complete: false`.
 *
 * Zbiór rośnie ILOCZYNOWO z flotą: kilkanaście pozycji na pojazd (olej, klocki, pasek,
 * tacho, gaśnica…), więc 300 ciągników × 15 pozycji to 4500 wierszy — czterokrotność
 * sufitu `api.max_rows`. Wariant jednorazowy prosił o 5000 i dostawał 1000, po czym
 * ekrany pokazywały ten tysiąc jako cały plan. To nie jest strata kosmetyczna jak
 * ucięta lista: brakujące zadanie nie zostawia pustego wiersza, tylko po prostu nie ma
 * go wśród pozycji „po terminie" — a na drugim końcu tej ciszy jeździ auto po terminie
 * przeglądu, którego nikt nie zgłosił, bo aplikacja o nim nie wspomniała.
 *
 * Strony schodzą po `id` rosnąco (kursor odporny na wstawki), a porządek dopisywania
 * wraca dopiero tutaj, po złożeniu wszystkich stron.
 */
export async function listServiceTasksAll(
  client: SupabaseClient,
  companyId: string,
  opts?: ServiceTaskFilter & { pageSize?: number; maxPages?: number },
): Promise<PagedRows<ServiceTask>> {
  const paged = await fetchAllByKeyset<ServiceTask>(
    async (afterId, pageSize) => {
      let query = companyServiceTasksFilter(client, companyId, opts);
      if (afterId) query = query.gt("id", afterId);
      const { data, error } = await query.order("id", { ascending: true }).limit(pageSize);
      if (error) throw error;
      return (data ?? []) as ServiceTask[];
    },
    { pageSize: opts?.pageSize, maxPages: opts?.maxPages },
  );
  return { ...paged, rows: [...paged.rows].sort(wgDopisania) };
}

/** Przebiegi pojazdów razem z informacją, czy policzono je z KOMPLETU floty. */
export interface OdometerReadout {
  /** `vehicle_id` → najwyższy stan licznika z tankowań pojazdu. */
  byVehicle: Record<string, number>;
  /**
   * `false` = odpowiedź serwera została ucięta, więc części pojazdów w mapie NIE MA.
   *
   * Flaga jest w typie z tego samego powodu co `complete` w `PagedRows`: brak pojazdu
   * w mapie nie wygląda jak brak danych, tylko jak `serviceStatus(null, …)`, czyli
   * poziom „ok" — a to jest odpowiedź nieodróżnialna od floty w normie. Wywołujący
   * musi obok tego pola przejść.
   */
  complete: boolean;
}

/**
 * Ile pojazdów mieści się w jednej odpowiedzi.
 *
 * Równe domyślnemu `api.max_rows` Supabase — o wartość wyższą i tak nie da się poprosić,
 * bo serwer przycina odpowiedź po cichu. Wynik agregatu to JEDEN wiersz na pojazd, więc
 * ten sufit odpowiada flocie tysiąca ciągników; nie jest progiem pracy, tylko granicą,
 * po przekroczeniu której `complete` mówi wprost, że mapa jest niepełna.
 */
const ODOMETER_MAX_VEHICLES = 1000;

/**
 * Bieżący przebieg per pojazd = `max(odometer_km)` z tankowań, liczony W BAZIE (migracja 0111).
 *
 * Wcześniej ta funkcja ściągała całą historię `fuel_logs` firmy i liczyła maksimum
 * w przeglądarce — najpierw jednym zapytaniem bez `limit` (czyli z cudzym sufitem
 * `api.max_rows`), potem stronami po `id`. Stronicowanie tego NIE naprawiło, bo historia
 * rośnie bez końca (300 ciągników × 3 tankowania tygodniowo × 3 lata ≈ 140 000 wierszy),
 * a każde pobranie musi mieć sufit. Powyżej sufitu wynikiem był `max` z próbki — i to
 * jednolicie LOSOWEJ, bo `id` to `gen_random_uuid()`, więc porządek pobierania nie ma nic
 * wspólnego z czasem. Ucięcie nie zabierało „starszych" tankowań, tylko losową część
 * wszystkich, razem z najświeższymi: przy tankowaniu co ~900 km auto realnie 500 km po
 * terminie wymiany oleju raportowało zapas +2000 km i wypadało z panelu „Wymaga uwagi".
 *
 * Agregat należy do bazy i tylko baza umie go policzyć bez sufitu — `group by` oddaje
 * jeden wiersz na pojazd, więc odpowiedź jest o trzy rzędy wielkości mniejsza od zbioru,
 * z którego powstaje. RLS zawęża do firmy tak samo jak przy odczycie samych tankowań
 * (funkcja jest `security invoker`).
 */
/**
 * Czy błąd znaczy „RPC jeszcze nie ma w bazie".
 *
 * PostgREST oddaje wtedy `PGRST202` (nie znaleziono funkcji w cache schematu). Rozpoznajemy
 * WĄSKO, po kodzie — łapanie każdego błędu zamieniłoby awarię sieci albo odmowę RLS w cichy
 * powrót do wolniejszej ścieżki, czyli w dokładnie ten rodzaj milczenia, który ta gałąź usuwa.
 */
function brakRpcPrzebiegow(error: { code?: string } | null): boolean {
  return error?.code === "PGRST202";
}

export async function latestOdometers(
  client: SupabaseClient,
  companyId: string,
  opts?: { pageSize?: number; maxPages?: number },
): Promise<OdometerReadout> {
  const { data, error } = await client
    .rpc("vehicle_odometers", { p_company: companyId })
    .limit(ODOMETER_MAX_VEHICLES);
  /*
   * Ścieżka awaryjna na czas wdrożenia. Migracja 0111 i ten kod jadą osobno: kod wchodzi
   * z deployem panelu, migracja ręcznie. Bez tego gałąź wymuszałaby kolejność „najpierw
   * baza, potem panel", a odwrotna kolejność wywracała CZTERY ekrany naraz (/service,
   * /schedule, karta pojazdu, panel „Wymaga uwagi") — i to u wszystkich firm, nie tylko
   * dużych. Skanowanie tankowań stronami jest gorsze (powyżej sufitu daje maksimum
   * z losowej próbki), ale zwraca `complete`, więc niepewność jest WIDOCZNA, a nie ukryta.
   * Po zastosowaniu migracji ta gałąź przestaje się wykonywać sama z siebie.
   */
  if (error && brakRpcPrzebiegow(error)) {
    const paged = await fetchAllByKeyset<{
      id: string;
      vehicle_id: string;
      odometer_km: number | null;
    }>(async (afterId, pageSize) => {
      let query = client
        .from("fuel_logs")
        .select("id, vehicle_id, odometer_km")
        .eq("company_id", companyId);
      if (afterId) query = query.gt("id", afterId);
      const { data: strona, error: bladStrony } = await query
        .order("id", { ascending: true })
        .limit(pageSize);
      if (bladStrony) throw bladStrony;
      return strona ?? [];
    }, opts);
    const zapasowe: Record<string, number> = {};
    for (const r of paged.rows) {
      const km = r.odometer_km ?? 0;
      if (km > (zapasowe[r.vehicle_id] ?? 0)) zapasowe[r.vehicle_id] = km;
    }
    return { byVehicle: zapasowe, complete: paged.complete };
  }
  if (error) throw error;
  const rows = data ?? [];
  const byVehicle: Record<string, number> = {};
  for (const r of rows) {
    // `max` z samych NULL-i daje NULL, a licznik „0 km" nie jest odczytem, tylko brakiem
    // odczytu — `serviceStatus` i tak potraktowałby go jak przebieg sprzed pierwszego
    // tankowania i zgłosił każdy serwis jako przeterminowany.
    if (r.odometer_km != null && r.odometer_km > 0) byVehicle[r.vehicle_id] = r.odometer_km;
  }
  return { byVehicle, complete: rows.length < ODOMETER_MAX_VEHICLES };
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
