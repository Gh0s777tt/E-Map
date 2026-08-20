/**
 * Warstwa danych: pobieranie stronami dla zbiorów, które muszą być KOMPLETNE.
 *
 * Powód istnienia tego pliku jest jeden i konkretny. PostgREST — a więc Data API
 * Supabase — ma własny sufit `db-max-rows` (w konfiguracji Supabase `api.max_rows`,
 * domyślnie **1000**: „the maximum number of rows returned from a view, table, or
 * function"). Po jego przekroczeniu odpowiedź NIE jest błędem: wraca 200 z krótszą
 * tablicą. `supabase-js` nie porównuje jej z nagłówkiem `Content-Range`, więc
 * wywołujący dostaje listę, która wygląda dokładnie tak samo jak kompletna.
 *
 * Dla listy, która się tylko wyświetla, to strata kosmetyczna. Dla zbioru, z którego
 * liczy się PIENIĄDZE (eksport księgowy, rejestr kosztów, przychód per pojazd), to zła
 * liczba bez żadnego sygnału — i to nie ryzyko na przyszłość, tylko zachowanie
 * działające dziś u każdej firmy z ponad tysiącem wierszy w tabeli.
 *
 * ## Dlaczego KLUCZEM, a nie `range()`
 *
 * Pierwsza wersja schodziła stronami offsetowo (`range(page * pageSize, …)`) po zbiorze
 * sortowanym malejąco po dacie. To jest najgorszy z możliwych wyborów: nowy wiersz
 * wchodzi na POCZĄTEK takiego zbioru i przesuwa wszystkie offsety o jeden w dół.
 * Zlecenie dopisane między pierwszą a drugą stroną (a pobranie kilku stron trwa
 * sekundy) wracało wtedy DWA razy — i drugi raz doliczało swoją kwotę do sumy
 * przychodu. Usunięcie wiersza dawało efekt odwrotny: jeden zniknięty bez śladu.
 * Snapshotu transakcyjnego nad Data API nie ma, więc pojedynczego zapytania nie da
 * się „zamrozić"; jedyne, co jest w naszych rękach, to porządek pobierania.
 *
 * Dlatego strony schodzą po KLUCZU GŁÓWNYM rosnąco: `id > <ostatni pobrany>`. `id` to
 * UUID nadany przy wstawieniu — unikalny i nigdy nie zmieniany, więc kursor wskazuje
 * to samo miejsce zbioru niezależnie od tego, co dzieje się z sąsiednimi wierszami.
 * Wstawka trafia w losowe miejsce klucza: jeśli za kursor — wpadnie do wyniku, jeśli
 * przed — nie wpadnie (i dobrze: w chwili startu eksportu jeszcze nie istniała).
 * Duplikat nie jest możliwy w żadnym z tych przypadków, a usunięcie cudzego wiersza
 * nie przesuwa niczego, bo kursor nie jest liczbą pozycji.
 *
 * Porządek prezentacyjny (najnowsze pierwsze) odtwarzają funkcje wywołujące, już po
 * złożeniu stron w pamięci — sortowanie zbioru, który i tak jest kompletny, nic nie
 * kosztuje, a mieszanie go do warunku stronicowania kosztowało poprawność.
 */

/**
 * Rozmiar strony. Równy domyślnemu `api.max_rows` Supabase — większa wartość i tak
 * zostałaby po cichu przycięta przez serwer, co wyglądałoby jak „strona niepełna"
 * i przedwcześnie zakończyłoby pętlę na pierwszej stronie. To nie jest liczba do
 * podkręcania w górę bez zmiany konfiguracji projektu.
 */
export const DEFAULT_PAGE_SIZE = 1000;

/**
 * Twardy sufit bezpieczeństwa: ile stron wolno pobrać, zanim uznamy, że coś jest nie tak.
 *
 * Bez niego błąd po stronie bazy (kursor ignorowany, strona zawsze pełna) albo
 * złośliwie spreparowany zbiór zapętliłby przeglądarkę na dobre. 50 × 1000 to
 * 50 000 wierszy — próg absurdu dla jednej tabeli JEDNEJ firmy, a nie próg pracy.
 */
export const DEFAULT_MAX_PAGES = 50;

/**
 * Wiersz nadający się do stronicowania kluczem.
 *
 * Warunek jest mocniejszy, niż wygląda: `id` musi być kluczem GŁÓWNYM — unikalnym
 * i niezmiennym. Kolumna, którą da się zaktualizować, przesunęłaby wiersz względem
 * kursora i pozwoliła zobaczyć go dwa razy albo wcale.
 */
export interface Keyed {
  id: string;
}

/**
 * Wynik pobrania wielostronicowego.
 *
 * `complete` jest w typie CELOWO, zamiast rzucania wyjątku w samym helperze.
 * Helper nie wie, czy woła go dokument księgowy (który przy niekompletnych danych
 * nie powinien w ogóle powstać), czy ekran analityczny (który lepiej pokaże dane
 * z ostrzeżeniem, niż nie pokaże nic). Decyzję podejmuje wywołujący — ale musi ją
 * podjąć świadomie, bo nie da się dostać wierszy, nie przechodząc obok tego pola.
 */
export interface PagedRows<T> {
  rows: T[];
  /** `false` = pobieranie przerwał sufit stron, zbiór jest NIEPEŁNY. */
  complete: boolean;
  /** Ile stron faktycznie pobrano (diagnostyka i asercje w testach). */
  pages: number;
}

/**
 * Pobranie jednej strony: wiersze o `id` większym niż `afterId` (`null` = od początku),
 * posortowane po `id` rosnąco, najwyżej `pageSize` sztuk.
 */
export type KeysetFetcher<T> = (afterId: string | null, pageSize: number) => Promise<T[]>;

/**
 * Pobiera kolejne strony po kluczu, aż wróci strona niepełna albo zadziała sufit `maxPages`.
 *
 * Uwaga na jeden świadomy kompromis: gdy zbiór ma DOKŁADNIE `maxPages * pageSize`
 * wierszy, ostatnia pobrana strona jest pełna i funkcja zgłosi `complete: false`,
 * choć niczego nie zgubiła. Fałszywy alarm jest tu tańszy niż dodatkowe zapytanie
 * poza sufitem — a przede wszystkim tańszy niż cicha strata w drugą stronę.
 */
export async function fetchAllByKeyset<T extends Keyed>(
  fetchPage: KeysetFetcher<T>,
  opts?: { pageSize?: number; maxPages?: number },
): Promise<PagedRows<T>> {
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;
  const maxPages = opts?.maxPages ?? DEFAULT_MAX_PAGES;
  // Bez tego `pageSize <= 0` dawałby wyłącznie puste strony (pętla kręciłaby się
  // do sufitu i zwracała pusty, „niepełny" wynik), a `maxPages <= 0` — pusty wynik
  // oznaczony jako niepełny mimo braku jakiegokolwiek zapytania. Oba przypadki są
  // błędem wywołania, nie stanem danych, więc mają wywalić się od razu i głośno.
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError(
      `fetchAllByKeyset: pageSize musi być dodatnią liczbą całkowitą (${pageSize})`,
    );
  }
  if (!Number.isInteger(maxPages) || maxPages < 1) {
    throw new RangeError(
      `fetchAllByKeyset: maxPages musi być dodatnią liczbą całkowitą (${maxPages})`,
    );
  }

  const rows: T[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < maxPages; page += 1) {
    const batch = await fetchPage(cursor, pageSize);
    for (const row of batch) rows.push(row);
    const ostatni = batch.at(-1);
    // Strona krótsza niż żądana = koniec zbioru. To jedyny wiarygodny sygnał końca,
    // jaki daje stronicowanie bez dokładania zapytania zliczającego (`count: "exact"`),
    // które przy dużych tabelach kosztuje pełny skan. Pusta strona (`!ostatni`) to ten
    // sam przypadek — nie osobny stan, tylko jego skrajna postać.
    if (batch.length < pageSize || !ostatni) return { rows, complete: true, pages: page + 1 };
    // Kursor, który nie drgnął, znaczy, że baza zignorowała warunek `id > kursor`
    // (błąd zapytania albo mock w teście). Kolejne strony byłyby tym samym zbiorem
    // w kółko, więc przerywamy — ale jako wynik NIEPEŁNY, bo nim właśnie jest.
    if (ostatni.id === cursor) return { rows, complete: false, pages: page + 1 };
    cursor = ostatni.id;
  }
  return { rows, complete: false, pages: maxPages };
}
