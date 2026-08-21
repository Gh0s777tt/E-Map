import { describe, expect, it } from "vitest";
import { mockSupabase, mockSupabasePaged } from "../test-utils";
import { listMyOrders, listOrderReferences, listOrders, listOrdersAll } from "./orders";

describe("listOrders (kształt zapytania)", () => {
  it("filtruje po company_id i sortuje malejąco po created_at", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listOrders(client, "comp-1");
    expect(called("from", "orders")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "comp-1"]);
    expect(argsOf("order")?.[0]).toBe("created_at");
    expect(called("limit")).toBe(false);
  });

  it("stosuje from/to/limit gdy podane", async () => {
    const { client, calls, argsOf, called } = mockSupabase({ data: [], error: null });
    await listOrders(client, "c", { from: "2026-01-01", to: "2026-02-01", limit: 50 });
    /*
     * Okno idzie po DACIE FRACHTU, nie po dacie wpisu. Sam `gte("created_at", …)`
     * wyrzucał z zakresu fracht zabukowany z wyprzedzeniem (wpis w lipcu, załadunek
     * we wrześniu) i wpuszczał do niego historię wgraną importem CSV, której wszystkie
     * wiersze mają `created_at` z dnia importu — a po tej samej granicy powstają trzy
     * eksporty księgowe. Granica górna zostaje WYŁĄCZNA: wywołujący podaje 1. dzień
     * kolejnego miesiąca, więc `lte` wpuszczałby wiersz z tego dnia do dwóch okien naraz.
     */
    expect(calls.filter((c) => c.method === "or").map((c) => c.args[0])).toEqual([
      "load_date.gte.2026-01-01,and(load_date.is.null,created_at.gte.2026-01-01)",
      "load_date.lt.2026-02-01,and(load_date.is.null,created_at.lt.2026-02-01)",
    ]);
    expect(called("gte")).toBe(false);
    expect(called("lte")).toBe(false);
    expect(argsOf("limit")?.[0]).toBe(50);
  });

  it("do gałęzi `load_date` (kolumna date) idzie sam dzień granicy", async () => {
    // Granica bywa pełnym znacznikiem czasu (selektor okresu na `/orders` liczy ją
    // z `toISOString()`). `load_date` jest typu `date`, więc porównanie z całym
    // znacznikiem opierałoby się na niejawnym rzutowaniu po stronie bazy.
    const { client, calls } = mockSupabase({ data: [], error: null });
    await listOrders(client, "c", { from: "2026-01-15T09:30:00.000Z" });
    expect(calls.filter((c) => c.method === "or").map((c) => c.args[0])).toEqual([
      "load_date.gte.2026-01-15,and(load_date.is.null,created_at.gte.2026-01-15T09:30:00.000Z)",
    ]);
  });
});

describe("listMyOrders (kierowca, RLS)", () => {
  it("zwraca pustą listę bez sesji", async () => {
    const { client } = mockSupabase({ data: [], error: null });
    Object.assign(client, { auth: { getUser: async () => ({ data: { user: null } }) } });
    expect(await listMyOrders(client)).toEqual([]);
  });

  it("filtruje po assigned_to = id zalogowanego kierowcy", async () => {
    const { client, argsOf } = mockSupabase({ data: [], error: null });
    Object.assign(client, { auth: { getUser: async () => ({ data: { user: { id: "u9" } } }) } });
    await listMyOrders(client);
    expect(argsOf("eq")).toEqual(["assigned_to", "u9"]);
  });
});

describe("listMyOrders — sufit pobrania", () => {
  /** Sesja jest tu warunkiem wejścia — bez niej funkcja wraca przed zapytaniem. */
  const zSesja = () => {
    const m = mockSupabase({ data: [], error: null });
    Object.assign(m.client, { auth: { getUser: async () => ({ data: { user: { id: "u9" } } }) } });
    return m;
  };

  it("domyślnie NIE ucina historii — liczą się z niej statystyki całego stażu", async () => {
    // `useGamification` bierze stąd licznik dostaw i odsetek terminowych. Obcięcie
    // do kilkuset najnowszych zamrażałoby licznik i liczyło terminowość z okrojonego
    // mianownika, bez żadnego sygnału, że liczba jest niepełna.
    const domyslne = zSesja();
    await listMyOrders(domyslne.client);
    expect(domyslne.argsOf("limit")).toBeUndefined();

    const wlasne = zSesja();
    await listMyOrders(wlasne.client, { limit: 25 });
    expect(wlasne.argsOf("limit")?.[0]).toBe(25);
  });
});

/**
 * Eksport księgowy stoi na TEJ funkcji. Brak `limit` nigdy nie znaczył „bez granicy" —
 * znaczył granicę PostgREST (`api.max_rows`, domyślnie 1000), egzekwowaną bez błędu
 * i bez śladu. Poniższe testy pilnują, że zbiór schodzi stronami do końca, że kursor
 * idzie po KLUCZU (a nie po pozycji, którą wstawka przesuwa), i że przekroczenie sufitu
 * widać w wyniku.
 */
describe("listOrdersAll — pobieranie stronami", () => {
  const wiersz = (id: string, created_at = "2026-01-01") => ({ id, created_at });

  it("dokładnie jedna strona: kolejne zapytanie potwierdza koniec zbioru", async () => {
    const m = mockSupabasePaged([[wiersz("a"), wiersz("b")], []]);
    const wynik = await listOrdersAll(m.client, "c1", { pageSize: 2 });
    expect(wynik.rows).toHaveLength(2);
    expect(wynik.complete).toBe(true);
    expect(m.stron()).toBe(2);
  });

  it("kursor kolejnej strony to `id` OSTATNIEGO wiersza poprzedniej, nie jej numer", async () => {
    // Offset (`range`) po zbiorze sortowanym malejąco przesuwał się przy każdej wstawce:
    // wiersz z końca strony 1 wracał na początku strony 2 i doliczał swoją kwotę drugi
    // raz. Kursor po kluczu głównym nie ma jak tego zrobić.
    const m = mockSupabasePaged([[wiersz("a"), wiersz("b")], [wiersz("c"), wiersz("d")], []]);
    const wynik = await listOrdersAll(m.client, "c1", { pageSize: 2 });
    expect(wynik.rows.map((o) => o.id).sort()).toEqual(["a", "b", "c", "d"]);
    expect(wynik.complete).toBe(true);
    expect(m.kursory()).toEqual([
      ["id", "b"],
      ["id", "d"],
    ]);
  });

  it("ostatnia strona niepełna: kończy na niej, bez zapytania na zapas", async () => {
    const m = mockSupabasePaged([[wiersz("a"), wiersz("b")], [wiersz("c")]]);
    const wynik = await listOrdersAll(m.client, "c1", { pageSize: 2 });
    expect(wynik.rows.map((o) => o.id).sort()).toEqual(["a", "b", "c"]);
    expect(wynik.complete).toBe(true);
    expect(m.stron()).toBe(2);
  });

  it("zbiór pusty: jedno zapytanie bez kursora, wynik pusty i kompletny", async () => {
    const m = mockSupabasePaged([[]]);
    const wynik = await listOrdersAll(m.client, "c1", { pageSize: 2 });
    expect(wynik.rows).toEqual([]);
    expect(wynik.complete).toBe(true);
    expect(m.kursory()).toEqual([]);
  });

  it("po przekroczeniu twardego sufitu wynik jest oznaczony jako NIEPEŁNY", async () => {
    // Same wiersze wyglądają jak poprawny eksport — bez `complete` różnicy nie widać,
    // a arkusz z zaniżoną sumą trafiłby do księgowej nieodróżnialny od prawdziwego.
    const m = mockSupabasePaged([
      [wiersz("a1"), wiersz("a2")],
      [wiersz("b1"), wiersz("b2")],
      [wiersz("c1"), wiersz("c2")],
      [wiersz("d1"), wiersz("d2")],
    ]);
    const wynik = await listOrdersAll(m.client, "c1", { pageSize: 2, maxPages: 3 });
    expect(wynik.pages).toBe(3);
    expect(wynik.rows).toHaveLength(6);
    expect(wynik.complete).toBe(false);
    expect(m.stron()).toBe(3);
  });

  it("porządek prezentacyjny (najnowsze pierwsze) wraca po złożeniu stron", async () => {
    // Baza oddaje strony po `id` rosnąco — to warunek stabilnego kursora, a nie
    // kolejność, w jakiej ktokolwiek chce oglądać zlecenia.
    const m = mockSupabasePaged([
      [wiersz("a", "2026-01-05"), wiersz("b", "2026-03-01")],
      [wiersz("c", "2026-02-01")],
    ]);
    const wynik = await listOrdersAll(m.client, "c1", { pageSize: 2 });
    expect(wynik.rows.map((o) => o.id)).toEqual(["b", "c", "a"]);
  });

  it("zawęża zbiór PO STRONIE BAZY: firma, okno dat, pojazd, kierowca, status", async () => {
    // Filtr w przeglądarce znaczyłby ściąganie całej historii firmy po to, żeby
    // pokazać kilkanaście wierszy jednego pojazdu — i tyleż samo stron zapytań.
    const m = mockSupabasePaged([[]]);
    await listOrdersAll(m.client, "c1", {
      from: "2026-01-01",
      to: "2026-02-01",
      vehicleId: "v1",
      assignedTo: "u9",
      statuses: ["delivered"],
      pageSize: 2,
    });
    const eqs = m.calls.filter((c) => c.method === "eq").map((c) => c.args);
    expect(eqs).toEqual([
      ["company_id", "c1"],
      ["vehicle_id", "v1"],
      ["assigned_to", "u9"],
    ]);
    expect(m.argsOf("in")).toEqual(["status", ["delivered"]]);
    // Okno po dacie frachtu — ten sam warunek, z którego powstaje lista na ekranie,
    // więc plik eksportu opisuje dokładnie ten zbiór, którego sumę widział użytkownik.
    expect(m.calls.filter((c) => c.method === "or").map((c) => c.args[0])).toEqual([
      "load_date.gte.2026-01-01,and(load_date.is.null,created_at.gte.2026-01-01)",
      "load_date.lt.2026-02-01,and(load_date.is.null,created_at.lt.2026-02-01)",
    ]);
    // Strony schodzą po kluczu głównym — jedyny porządek odporny na wstawki.
    expect(m.argsOf("order")).toEqual(["id", { ascending: true }]);
    // Żadne pojedyncze zapytanie nie jest nieograniczone: granicę stawia rozmiar strony.
    expect(m.argsOf("limit")).toEqual([2]);
  });
});

/**
 * Wykrywanie duplikatów przy imporcie — te same zasady co eksport, bo zasila ten sam
 * dokument. Numer referencyjny sprzed roku musi się znaleźć, choć w oknie 1000
 * najnowszych zleceń go nie ma.
 */
describe("listOrderReferences — komplet numerów referencyjnych", () => {
  it("pobiera dwie kolumny, stronami po kluczu, dla całej historii firmy", async () => {
    const m = mockSupabasePaged([
      [
        { id: "1", reference_no: "A" },
        { id: "2", reference_no: "B" },
      ],
      [{ id: "3", reference_no: null }],
    ]);
    const wynik = await listOrderReferences(m.client, "c1", { pageSize: 2 });
    expect(wynik.rows.map((r) => r.reference_no)).toEqual(["A", "B", null]);
    expect(wynik.complete).toBe(true);
    expect(m.argsOf("select")).toEqual(["id, reference_no"]);
    expect(m.argsOf("eq")).toEqual(["company_id", "c1"]);
    expect(m.kursory()).toEqual([["id", "2"]]);
  });

  it("obcięcie na sufit stron zgłasza niekompletność — import musi móc odmówić", async () => {
    const m = mockSupabasePaged([
      [{ id: "1", reference_no: "A" }],
      [{ id: "2", reference_no: "B" }],
    ]);
    const wynik = await listOrderReferences(m.client, "c1", { pageSize: 1, maxPages: 2 });
    expect(wynik.complete).toBe(false);
  });
});
