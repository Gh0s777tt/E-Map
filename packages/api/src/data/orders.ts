/** Warstwa danych: zlecenia / ładunki. */
import type { OrderInput, OrderStatus } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";
import { fetchAllByKeyset, type PagedRows } from "./pagination";

export interface Order {
  id: string;
  reference_no: string | null;
  shipper: string | null;
  consignee: string | null;
  origin: string | null;
  destination: string | null;
  cargo: string | null;
  weight_kg: number | null;
  price: number | null;
  currency: string;
  status: OrderStatus;
  vehicle_id: string | null;
  assigned_to: string | null;
  load_date: string | null;
  unload_date: string | null;
  notes: string | null;
  created_at: string;
}

const COLS =
  "id, reference_no, shipper, consignee, origin, destination, cargo, weight_kg, price, currency, status, vehicle_id, assigned_to, load_date, unload_date, notes, created_at";

/**
 * Zawężenie zbioru zleceń firmy — jedno miejsce na filtry, bez sortowania.
 *
 * Sortowanie zostaje NA ZEWNĄTRZ, bo dwa tryby pobierania potrzebują dwóch różnych
 * porządków: zapytanie jednorazowe chce najnowsze pierwsze (tak wygląda lista na
 * ekranie), a pobranie stronami musi iść po kluczu głównym rosnąco, żeby kursor był
 * odporny na wstawki — patrz [`pagination.ts`](./pagination.ts).
 *
 * `to` jest granicą WYŁĄCZNĄ (`lt`). Wywołujący podają tu 1. dzień kolejnego miesiąca,
 * więc przy `lte` wiersz z datą dokładnie o północy tego dnia należałby naraz do dwóch
 * sąsiednich okien. Tak samo liczy okna `listPerDiemTrips`.
 */
function companyOrdersFilter(client: SupabaseClient, companyId: string, opts?: OrderFilter) {
  let query = client.from("orders").select(COLS).eq("company_id", companyId);
  if (opts?.vehicleId) query = query.eq("vehicle_id", opts.vehicleId);
  if (opts?.assignedTo) query = query.eq("assigned_to", opts.assignedTo);
  if (opts?.statuses) query = query.in("status", opts.statuses);
  if (opts?.from) query = query.or(oknoDaty("gte", opts.from));
  if (opts?.to) query = query.or(oknoDaty("lt", opts.to));
  return query;
}

/**
 * Warunek `coalesce(load_date, created_at) <op> granica` w składni PostgREST.
 *
 * Okno MUSI iść po dacie frachtu, bo po niej datuje zlecenie cała reszta aplikacji:
 * `filterSortOrders` sortuje po `load_date ?? created_at` ([`orderFilter.ts`](../../../core/src/orderFilter.ts)),
 * `rowAmountEur` bierze kurs z tego samego dnia, miesięczne kubełki na `/monthly`,
 * `/stats`, KPI i trend przychodu — również. Filtr po samym `created_at` znaczył więc
 * „data WPISU", i to bez żadnego śladu na ekranie: fracht zabukowany z wyprzedzeniem
 * (wpis w lipcu, załadunek we wrześniu) wypadał z okna, którego środek zajmował, a po
 * migracji historii importem CSV — odwrotnie: wszystkie wiersze dostawały `created_at`
 * z dnia importu i „ostatnie 3 miesiące" pokazywały frachty sprzed pięciu lat. Rozjazd
 * nie kończył się na liście: ta sama granica wyznacza zbiór trzech eksportów księgowych,
 * więc zaniżony przychód trafiał do arkusza, w którym nie da się go już odróżnić od prawdy.
 *
 * `load_date` jest kolumną typu `date`, więc do jego gałęzi idzie sam dzień granicy;
 * `created_at` to `timestamptz` i dostaje wartość w całości. Zapytanie zostaje zawężone
 * `company_id` niezależnie od tego warunku, więc skan nigdy nie wychodzi poza jedną firmę.
 */
function oknoDaty(op: "gte" | "lt", granica: string): string {
  const dzien = granica.slice(0, 10);
  return `load_date.${op}.${dzien},and(load_date.is.null,created_at.${op}.${granica})`;
}

/** Filtry wspólne dla obu trybów pobrania (jednorazowego i stronami). */
export interface OrderFilter {
  /**
   * Zakres DATY FRACHTU (`load_date`, a w jej braku `created_at`): `from` włącznie,
   * `to` WYŁĄCZNIE. To ta sama data, po której zlecenie datuje każdy ekran — patrz
   * `oknoDaty` wyżej.
   */
  from?: string;
  to?: string;
  /** Zawężenie po stronie BAZY — zamiast ściągania całej firmy i odsiewania w przeglądarce. */
  vehicleId?: string;
  assignedTo?: string;
  statuses?: OrderStatus[];
}

/** Najnowsze pierwsze; `id` rozstrzyga remis, bo `created_at` bywa identyczny w całej paczce importu. */
function najnowszePierwsze(a: Order, b: Order): number {
  return b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id);
}

/**
 * Zlecenia firmy (najnowsze pierwsze) — JEDNO zapytanie, więc obowiązuje sufit serwera.
 *
 * Brak `limit` NIE znaczy „bez granicy" — znaczy granicę CUDZĄ: sufit `api.max_rows`
 * PostgREST (domyślnie 1000), egzekwowany bez błędu i bez śladu. Ta funkcja nadaje się
 * więc wyłącznie tam, gdzie wycinek wystarcza: podpowiedzi w formularzach, wyszukiwarka,
 * lista z filtrami na ekranie. Wywołujący, któremu wystarczy okno czasowe albo kilkaset
 * najnowszych pozycji, podaje `from`/`to`/`limit` jawnie — i wtedy wie, że patrzy na wycinek.
 *
 * Tam, gdzie komplet jest warunkiem POPRAWNOŚCI LICZBY (przychód, eksport, wykrywanie
 * duplikatów przy imporcie), wołaj `listOrdersAll` — z zawężeniem po pojeździe, kierowcy
 * albo statusie, żeby komplet nie znaczył „cała historia firmy".
 */
export async function listOrders(
  client: SupabaseClient,
  companyId: string,
  opts?: OrderFilter & { limit?: number },
): Promise<Order[]> {
  let query = companyOrdersFilter(client, companyId, opts).order("created_at", {
    ascending: false,
  });
  // `!== undefined`, nie samo `opts?.limit` — wariant falsy po cichu ignorował `limit: 0`
  // i rozjeżdżał się z konwencją `listMyOrders` w tym samym pliku (linia niżej).
  if (opts?.limit !== undefined) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Order[];
}

/**
 * Zlecenia firmy pobrane STRONAMI — dla wywołujących, dla których komplet jest
 * warunkiem poprawności wyniku (eksport księgowy, przychód per pojazd i per kierowca,
 * zestawienie miesięczne, wykrywanie duplikatów przy imporcie). Każde pojedyncze
 * zapytanie jest ograniczone do jednej strony, a zbiór wraca kompletny; gdy zadziała
 * twardy sufit stron, mówi o tym `complete: false`.
 *
 * Strony schodzą po `id` rosnąco (kursor odporny na wstawki), a porządek „najnowsze
 * pierwsze" wraca dopiero tutaj, po złożeniu wszystkich stron.
 */
export async function listOrdersAll(
  client: SupabaseClient,
  companyId: string,
  opts?: OrderFilter & { pageSize?: number; maxPages?: number },
): Promise<PagedRows<Order>> {
  const paged = await fetchAllByKeyset<Order>(
    async (afterId, pageSize) => {
      let query = companyOrdersFilter(client, companyId, opts);
      if (afterId) query = query.gt("id", afterId);
      const { data, error } = await query.order("id", { ascending: true }).limit(pageSize);
      if (error) throw error;
      return (data ?? []) as Order[];
    },
    { pageSize: opts?.pageSize, maxPages: opts?.maxPages },
  );
  return { ...paged, rows: [...paged.rows].sort(najnowszePierwsze) };
}

/** Numer referencyjny zlecenia wraz z kluczem — tyle, ile trzeba do wykrycia duplikatu. */
export interface OrderReference {
  id: string;
  reference_no: string | null;
}

/**
 * KOMPLETNY zbiór numerów referencyjnych firmy — do wykrywania duplikatów przy imporcie.
 *
 * Osobna funkcja, a nie `listOrdersAll` z odrzuceniem reszty kolumn, bo tu naprawdę
 * potrzebne są dwie kolumny z każdego wiersza historii. Import czytający `listOrders`
 * porównywał plik z oknem 1000 NAJNOWSZYCH zleceń: powtórnie wgrany plik sprzed kwartału
 * nie trafiał w to okno ani jednym numerem, więc każda pozycja wjeżdżała do bazy drugi
 * raz — a potem drugi raz do przychodu w eksporcie.
 */
export async function listOrderReferences(
  client: SupabaseClient,
  companyId: string,
  opts?: { pageSize?: number; maxPages?: number },
): Promise<PagedRows<OrderReference>> {
  return fetchAllByKeyset<OrderReference>(async (afterId, pageSize) => {
    let query = client.from("orders").select("id, reference_no").eq("company_id", companyId);
    if (afterId) query = query.gt("id", afterId);
    const { data, error } = await query.order("id", { ascending: true }).limit(pageSize);
    if (error) throw error;
    return (data ?? []) as OrderReference[];
  }, opts);
}

/**
 * Zlecenia przypisane do bieżącego użytkownika (kierowcy). RLS dopuszcza odczyt członka.
 *
 * Świadomie BEZ domyślnego sufitu — w przeciwieństwie do `listOrders`, który zasila
 * wyłącznie widoki firmowe. Z tej funkcji liczy się STATYSTYKI CAŁEGO STAŻU:
 * `apps/mobile/lib/useGamification.ts` bierze stąd licznik dostaw i odsetek terminowych.
 * Domyślne obcięcie do kilkuset najnowszych zamrażałoby licznik dostaw (kierowca
 * z 900 zleceniami widziałby 500 i nigdy nie przekroczył kolejnego progu odznaki),
 * a terminowość liczyłoby z okrojonego mianownika — bez żadnego sygnału, że liczba
 * jest niepełna. Ekrany listy (`my-orders`, mobile `orders`) też nie mają stronicowania,
 * więc obcięcie znaczyłoby tam po prostu zniknięcie starszych zleceń.
 *
 * `opts.limit` zostaje dla wywołującego, któremu wystarczy kilka najnowszych pozycji.
 */
export async function listMyOrders(
  client: SupabaseClient,
  opts?: { limit?: number },
): Promise<Order[]> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return [];
  let query = client
    .from("orders")
    .select(COLS)
    .eq("assigned_to", user.id)
    .order("created_at", { ascending: false });
  if (opts?.limit !== undefined) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Order[];
}

function orderToRow(input: OrderInput, companyId: string) {
  return {
    company_id: companyId,
    reference_no: input.referenceNo ?? null,
    shipper: input.shipper ?? null,
    consignee: input.consignee ?? null,
    origin: input.origin ?? null,
    destination: input.destination ?? null,
    cargo: input.cargo ?? null,
    weight_kg: input.weightKg ?? null,
    price: input.price ?? null,
    currency: input.currency,
    vehicle_id: input.vehicleId ?? null,
    assigned_to: input.assignedTo ?? null,
    load_date: input.loadDate ?? null,
    unload_date: input.unloadDate ?? null,
    notes: input.notes ?? null,
  };
}

export async function saveOrder(
  client: SupabaseClient,
  companyId: string,
  input: OrderInput,
  id?: string,
): Promise<string> {
  const row = orderToRow(input, companyId);
  if (id) {
    const { error } = await client.from("orders").update(row).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await client.from("orders").insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

/**
 * Zmiana statusu przez RPC z kontrolą uprawnień: owner/dispatcher → dowolny status,
 * przypisany kierowca → tylko operacyjny (w trakcie / dostarczone). Audytowane.
 */
export async function setOrderStatus(
  client: SupabaseClient,
  id: string,
  status: OrderStatus,
): Promise<void> {
  const { error } = await client.rpc("order_set_status", { p_order: id, p_status: status });
  if (error) throw error;
}

export async function deleteOrder(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("orders").delete().eq("id", id);
  if (error) throw error;
}
