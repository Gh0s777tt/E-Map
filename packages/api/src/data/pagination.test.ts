/**
 * Pobieranie stronami — mechanizm, na którym stoi kompletność eksportu księgowego.
 *
 * Test pilnuje trzech rzeczy naraz: że wynik jest KOMPLETNY (nie gubi ostatniej,
 * niepełnej strony ani nie kończy pętli o stronę za wcześnie), że przekroczenie
 * twardego sufitu NIE wraca po cichu jako zwykły wynik, i że kursor idzie po KLUCZU,
 * a nie po pozycji — bo tylko wtedy wiersz dopisany w trakcie pobierania nie potrafi
 * wpaść do wyniku dwa razy. Ta ostatnia część jest najważniejsza: duplikat w arkuszu
 * podwaja kwotę i wygląda przy tym jak poprawny wiersz, a flaga `complete` nic o nim
 * nie mówi.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_MAX_PAGES, DEFAULT_PAGE_SIZE, fetchAllByKeyset } from "./pagination";

interface Wiersz {
  id: string;
}

/** `id` z zerami wiodącymi — porządek leksykalny zgadza się z numerycznym. */
const wiersz = (n: number): Wiersz => ({ id: `id-${String(n).padStart(4, "0")}` });

/**
 * Tabela serwowana po kluczu: `id > afterId`, rosnąco, najwyżej `pageSize` wierszy.
 * Odtwarza dokładnie to, co robi zapytanie `gt("id", …).order("id").limit(…)`.
 */
function tabela(poczatkowe: Wiersz[]) {
  const rows = [...poczatkowe];
  const kursory: (string | null)[] = [];
  return {
    rows,
    kursory,
    pobierz: async (afterId: string | null, pageSize: number) => {
      kursory.push(afterId);
      const posortowane = [...rows].sort((a, b) => a.id.localeCompare(b.id));
      return posortowane.filter((r) => afterId === null || r.id > afterId).slice(0, pageSize);
    },
  };
}

describe("fetchAllByKeyset — komplet wyniku", () => {
  it("pusty zbiór: jedno zapytanie, wynik kompletny", async () => {
    const t = tabela([]);
    const wynik = await fetchAllByKeyset(t.pobierz, { pageSize: 10 });
    expect(wynik).toEqual({ rows: [], complete: true, pages: 1 });
    expect(t.kursory).toEqual([null]);
  });

  it("zbiór krótszy niż strona: kończy na pierwszej niepełnej stronie", async () => {
    const t = tabela(Array.from({ length: 7 }, (_, i) => wiersz(i)));
    const wynik = await fetchAllByKeyset(t.pobierz, { pageSize: 10 });
    expect(wynik.rows).toHaveLength(7);
    expect(wynik.complete).toBe(true);
    expect(t.kursory).toEqual([null]);
  });

  it("zbiór równy DOKŁADNIE jednej stronie: dokłada zapytanie potwierdzające koniec", async () => {
    // Pełna strona nie dowodzi, że to koniec — baza nie zwraca „to były wszystkie".
    // Jedno zapytanie więcej jest ceną za pewność; obcięcie na pełnej stronie byłoby
    // dokładnie tym cichym gubieniem danych, przed którym ten mechanizm ma chronić.
    const t = tabela(Array.from({ length: 10 }, (_, i) => wiersz(i)));
    const wynik = await fetchAllByKeyset(t.pobierz, { pageSize: 10 });
    expect(wynik.rows).toHaveLength(10);
    expect(wynik.complete).toBe(true);
    expect(wynik.pages).toBe(2);
    expect(t.kursory).toEqual([null, "id-0009"]);
  });

  it("dwie pełne strony i trzecia niepełna: skleja wszystko w kolejności klucza", async () => {
    const t = tabela(Array.from({ length: 25 }, (_, i) => wiersz(i)));
    const wynik = await fetchAllByKeyset(t.pobierz, { pageSize: 10 });
    expect(wynik.rows.map((r) => r.id)).toEqual(Array.from({ length: 25 }, (_, i) => wiersz(i).id));
    expect(wynik.complete).toBe(true);
    expect(wynik.pages).toBe(3);
    expect(t.kursory).toEqual([null, "id-0009", "id-0019"]);
  });
});

describe("fetchAllByKeyset — odporność na zmiany zbioru w trakcie pobierania", () => {
  it("wiersz dopisany między stronami NIE wraca drugi raz", async () => {
    // To jest cała różnica między kursorem po kluczu a `range()`: przy offsecie nowy
    // wiersz przesuwał całą resztę o jedną pozycję, więc ostatni wiersz strony 1
    // wracał jako pierwszy wiersz strony 2 — i jego kwota wchodziła do sumy dwa razy.
    const t = tabela(Array.from({ length: 20 }, (_, i) => wiersz(i)));
    let strona = 0;
    const pobierzZWstawka = async (afterId: string | null, pageSize: number) => {
      const batch = await t.pobierz(afterId, pageSize);
      strona += 1;
      // Po pierwszej stronie spedytor dodaje zlecenie — trafia na POCZĄTEK zbioru
      // (najmniejszy klucz), czyli tam, gdzie kursor już był.
      if (strona === 1) t.rows.push({ id: "id-0000-nowe" });
      return batch;
    };
    const wynik = await fetchAllByKeyset(pobierzZWstawka, { pageSize: 10 });
    const idy = wynik.rows.map((r) => r.id);
    expect(new Set(idy).size).toBe(idy.length);
    expect(idy).not.toContain("id-0000-nowe");
    expect(wynik.complete).toBe(true);
  });

  it("wiersz usunięty przed kursorem nie zabiera ze sobą żadnego innego", async () => {
    // Przy offsecie usunięcie przesuwało resztę w drugą stronę i jeden wiersz
    // przeskakiwał między stronami niezauważony. Kursor po kluczu nie liczy pozycji.
    const t = tabela(Array.from({ length: 20 }, (_, i) => wiersz(i)));
    let strona = 0;
    const pobierzZKasowaniem = async (afterId: string | null, pageSize: number) => {
      const batch = await t.pobierz(afterId, pageSize);
      strona += 1;
      if (strona === 1) t.rows.splice(0, 1);
      return batch;
    };
    const wynik = await fetchAllByKeyset(pobierzZKasowaniem, { pageSize: 10 });
    expect(wynik.rows.map((r) => r.id)).toEqual(Array.from({ length: 20 }, (_, i) => wiersz(i).id));
    expect(wynik.complete).toBe(true);
  });
});

describe("fetchAllByKeyset — twardy sufit stron", () => {
  it("przerywa na sufit i ZGŁASZA niekompletność zamiast po cichu obcinać", async () => {
    const t = tabela(Array.from({ length: 1000 }, (_, i) => wiersz(i)));
    const wynik = await fetchAllByKeyset(t.pobierz, { pageSize: 10, maxPages: 3 });
    expect(wynik.pages).toBe(3);
    expect(wynik.rows).toHaveLength(30);
    // Ta asercja jest sednem całego pliku: wiersze wyglądają jak poprawny wynik,
    // jedynym śladem obcięcia jest flaga — i wywołujący nie ma jak jej przeoczyć,
    // bo nie dostanie wierszy inaczej niż przez ten sam obiekt.
    expect(wynik.complete).toBe(false);
  });

  it("nie kręci się w kółko, gdy baza ignoruje kursor i oddaje wciąż tę samą stronę", async () => {
    // Kursor, który nie drgnął, znaczy, że warunek `id > kursor` nie zadziałał.
    // Dalsze strony byłyby kopią pierwszej, więc pętla kończy się od razu — ale jako
    // wynik NIEPEŁNY, bo o reszcie zbioru nie wiemy nic.
    let zapytan = 0;
    const wynik = await fetchAllByKeyset(
      async () => {
        zapytan += 1;
        return [wiersz(1), wiersz(2), wiersz(3)];
      },
      { pageSize: 3, maxPages: 4 },
    );
    expect(zapytan).toBe(2);
    expect(wynik.complete).toBe(false);
  });

  it("odrzuca bezsensowne parametry zamiast zwracać pusty wynik oznaczony jako niepełny", async () => {
    const nigdy = async () => [];
    await expect(fetchAllByKeyset(nigdy, { pageSize: 0 })).rejects.toThrow(RangeError);
    await expect(fetchAllByKeyset(nigdy, { maxPages: 0 })).rejects.toThrow(RangeError);
  });
});

describe("fetchAllByKeyset — wartości domyślne", () => {
  it("strona równa sufitowi `api.max_rows` Supabase, sufit stron powyżej progu absurdu", () => {
    // Strona większa niż `api.max_rows` wróciłaby przycięta przez serwer, czyli
    // „niepełna" — pętla zamknęłaby się na pierwszej stronie i zgubiła resztę zbioru.
    expect(DEFAULT_PAGE_SIZE).toBe(1000);
    expect(DEFAULT_MAX_PAGES * DEFAULT_PAGE_SIZE).toBeGreaterThanOrEqual(50_000);
  });

  it("bez `pageSize` bierze stronę domyślną i zaczyna od pustego kursora", async () => {
    const wywolania: [string | null, number][] = [];
    await fetchAllByKeyset(async (afterId, pageSize) => {
      wywolania.push([afterId, pageSize]);
      return [];
    });
    expect(wywolania).toEqual([[null, DEFAULT_PAGE_SIZE]]);
  });
});
