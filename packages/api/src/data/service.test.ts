import { describe, expect, it } from "vitest";
import { type MockSupabasePaged, mockSupabase, mockSupabasePaged } from "../test-utils";
import { latestOdometers, listServiceTasks, listServiceTasksAll } from "./service";

/**
 * Kursory stronicowania, czyli WYŁĄCZNIE `gt("id", …)`.
 *
 * Gotowe `kursory()` z mocka bierze każde `gt`, a filtr „śledzone przebiegiem" też nim
 * jest (`gt("interval_km", 0)`) — bez tego rozdzielenia asercja o kursorach mierzyłaby
 * dwie różne rzeczy naraz i przestałaby cokolwiek pilnować.
 */
function kursoryKlucza(m: MockSupabasePaged): unknown[][] {
  return m.calls.filter((c) => c.method === "gt" && c.args[0] === "id").map((c) => c.args);
}

describe("listServiceTasks (kształt zapytania)", () => {
  it("company_id, sort po created_at", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listServiceTasks(client, "c1");
    expect(called("from", "service_tasks")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "c1"]);
    expect(argsOf("order")?.[0]).toBe("created_at");
  });

  it("baza sortuje MALEJĄCO, a wynik wraca rosnąco", async () => {
    /*
     * Kierunek w zapytaniu decyduje, co wypada przy sufircie: malejąco → obcięcie
     * zabiera pozycje najstarsze, a nie tę dopisaną przed chwilą (dyspozytor uznałby
     * wtedy, że zapis padł, i dodał zadanie ponownie). Ekrany pokazują plan w kolejności
     * dopisywania, więc odwrócenie musi zostać po stronie klienta — te dwie rzeczy
     * trzymają się razem i tylko razem mają sens.
     */
    const { client, argsOf } = mockSupabase({
      data: [
        { id: "nowe", vehicle_id: "v1" },
        { id: "stare", vehicle_id: "v1" },
      ],
      error: null,
    });
    const rows = await listServiceTasks(client, "c1");
    expect(argsOf("order")).toEqual(["created_at", { ascending: false }]);
    expect(rows.map((r) => r.id)).toEqual(["stare", "nowe"]);
  });
});

describe("latestOdometers (agregacja max licznika per pojazd)", () => {
  it("KRYTYCZNE: liczy agregat W BAZIE, a nie z pobranej historii tankowań", async () => {
    /*
     * Historia `fuel_logs` rośnie bez końca (300 ciągników × 3 lata ≈ 140 000 wierszy),
     * więc KAŻDE pobranie jej do przeglądarki ma sufit — a powyżej sufitu maksimum
     * liczyło się z próbki jednolicie losowej (strony schodziły po `id`, czyli po
     * `gen_random_uuid()`). Zaniżony przebieg nie wygląda jak brak danych: `serviceStatus`
     * odpowiada na niego „ok" i zadanie po terminie znika z panelu „Wymaga uwagi".
     * Stąd `group by` w bazie (migracja 0111) i jeden wiersz na pojazd w odpowiedzi.
     */
    const { client, called, argsOf } = mockSupabase({
      data: [
        { vehicle_id: "v1", odometer_km: 250 },
        { vehicle_id: "v2", odometer_km: 50 },
      ],
      error: null,
    });
    const odo = await latestOdometers(client, "c1");
    expect(argsOf("rpc")).toEqual(["vehicle_odometers", { p_company: "c1" }]);
    // Ani jednego zapytania do samej tabeli — to właśnie ono było nie do udźwignięcia.
    expect(called("from", "fuel_logs")).toBe(false);
    expect(odo.byVehicle).toEqual({ v1: 250, v2: 50 });
    expect(odo.complete).toBe(true);
  });

  it("pomija pojazd z samym zerowym/null licznikiem (km nie > 0)", async () => {
    const { client } = mockSupabase({
      data: [{ vehicle_id: "v1", odometer_km: null }],
      error: null,
    });
    expect((await latestOdometers(client, "c1")).byVehicle).toEqual({});
  });

  it("odpowiedź ucięta na sufircie serwera zgłasza się jako complete: false", async () => {
    /*
     * Jeden wiersz na pojazd znaczy, że sufit `api.max_rows` (1000) odpowiada flocie
     * TYSIĄCA ciągników — ale „nieosiągalny" i „nieistniejący" to nie to samo. Brak
     * pojazdu w mapie wygląda dokładnie jak pojazd bez tankowań, czyli jak poziom „ok",
     * więc pełna odpowiedź musi dać się odróżnić od uciętej.
     */
    const pelna = Array.from({ length: 1000 }, (_, i) => ({
      vehicle_id: `v${i}`,
      odometer_km: 1000 + i,
    }));
    const { client } = mockSupabase({ data: pelna, error: null });
    expect((await latestOdometers(client, "c1")).complete).toBe(false);
  });
});

describe("sufity pobrania w module serwisowym", () => {
  it("listServiceTasks: domyślny sufit jest ŻĄDANY, a własny nadal działa", async () => {
    /*
     * 5000 nie jest obietnicą kompletu i nigdy nią nie było: PostgREST i tak utnie
     * odpowiedź na `api.max_rows` (u Supabase 1000). Test pilnuje tylko tego, że
     * wywołujący, który poda własną — mniejszą, więc osiągalną — granicę, dostanie ją
     * w zapytaniu. Komplet planu ma dziś własną funkcję (`listServiceTasksAll`).
     */
    const domyslne = mockSupabase({ data: [], error: null });
    await listServiceTasks(domyslne.client, "c1");
    expect(domyslne.argsOf("limit")?.[0]).toBe(5000);

    const wlasne = mockSupabase({ data: [], error: null });
    await listServiceTasks(wlasne.client, "c1", { limit: 25 });
    expect(wlasne.argsOf("limit")?.[0]).toBe(25);
  });

  it("latestOdometers: żadne pojedyncze zapytanie nie jest nieograniczone", async () => {
    // Agregat oddaje jeden wiersz na pojazd, ale `limit` zostaje mimo to jawny:
    // bez niego sufit odpowiedzi byłby wyłącznie po stronie serwera, a `complete`
    // nie miałoby z czym porównać długości wyniku.
    const { client, argsOf } = mockSupabase({ data: [], error: null });
    await latestOdometers(client, "c1");
    expect(argsOf("limit")).toEqual([1000]);
  });
});

describe("listServiceTasksAll (komplet planu serwisowego)", () => {
  it("KRYTYCZNE: schodzi STRONAMI, więc plan nie kończy się na sufircie serwera", async () => {
    /*
     * Wariant jednorazowy prosi o 5000 wierszy i dostaje 1000 — PostgREST tnie na
     * `api.max_rows` bez błędu. Przy 300 ciągnikach × 15 pozycji to trzy czwarte planu
     * poza zasięgiem, a brakujące zadanie nie zostawia po sobie pustego wiersza: po
     * prostu nie ma go wśród pozycji „po terminie", identycznie jak zadania wykonanego.
     */
    const strona = (od: number) =>
      Array.from({ length: 1000 }, (_, i) => ({
        id: `id-${String(od + i).padStart(5, "0")}`,
        vehicle_id: "v1",
        name: `zadanie ${od + i}`,
        created_at: `2026-01-01T00:00:${String((od + i) % 60).padStart(2, "0")}Z`,
      }));
    const paged = mockSupabasePaged([strona(0), strona(1000), []]);
    const wynik = await listServiceTasksAll(paged.client, "c1");
    expect(paged.stron()).toBe(3);
    expect(wynik.rows).toHaveLength(2000);
    expect(wynik.complete).toBe(true);
    expect(paged.argsOf("order")).toEqual(["id", { ascending: true }]);
    expect(kursoryKlucza(paged)).toEqual([
      ["id", "id-00999"],
      ["id", "id-01999"],
    ]);
  });

  it("sufit stron zgłasza się jako complete: false", async () => {
    // Ekran nie ma jak zauważyć obcięcia po samej liście (plan nie ma numeracji ani
    // zakresu dat), więc ta flaga jest jedynym śladem — i wywołujący nie ma jak jej ominąć.
    const strona = Array.from({ length: 1000 }, (_, i) => ({
      id: `id-${String(i).padStart(4, "0")}`,
      vehicle_id: "v1",
      created_at: "2026-01-01T00:00:00Z",
    }));
    const paged = mockSupabasePaged([strona, strona.map((r) => ({ ...r, id: `x${r.id}` }))]);
    const wynik = await listServiceTasksAll(paged.client, "c1", { maxPages: 2 });
    expect(wynik.complete).toBe(false);
    expect(wynik.pages).toBe(2);
  });

  it("kolejność dopisywania wraca PO złożeniu stron, nie z bazy", async () => {
    /*
     * Baza sortuje po kluczu (kursor musi być odporny na wstawki), a `id` to losowy
     * UUID — bez tego sortowania ta sama firma widziałaby plan w innej kolejności
     * zależnie od tego, którą funkcją go pobrano, i „ostatnio dodane" lądowałoby
     * w losowym miejscu listy.
     */
    const paged = mockSupabasePaged([
      [
        { id: "zzz", vehicle_id: "v1", created_at: "2026-01-01T10:00:00Z" },
        { id: "aaa", vehicle_id: "v1", created_at: "2026-03-01T10:00:00Z" },
        { id: "mmm", vehicle_id: "v1", created_at: "2026-02-01T10:00:00Z" },
      ],
    ]);
    const wynik = await listServiceTasksAll(paged.client, "c1");
    expect(wynik.rows.map((r) => r.id)).toEqual(["zzz", "mmm", "aaa"]);
  });

  it("filtry schodzą do BAZY: pojazd i zadania śledzone przebiegiem", async () => {
    /*
     * Karta pojazdu ściągała plan całej firmy i odsiewała cudze zadania w przeglądarce,
     * a harmonogramy — pozycje bez interwału km. Przy dużej flocie to właśnie te odrzuty
     * wypychały poza sufit zadania, które miały coś do powiedzenia.
     */
    const paged = mockSupabasePaged([[]]);
    await listServiceTasksAll(paged.client, "c1", { vehicleId: "v7", kmTracked: true });
    expect(paged.calls.filter((c) => c.method === "eq").map((c) => c.args)).toEqual([
      ["company_id", "c1"],
      ["vehicle_id", "v7"],
    ]);
    // `gt(interval_km, 0)`, nie `not is null`: interwał 0 zapisuje formularz mobilny,
    // a `serviceStatus` traktuje go jak brak danych — NULL też nie jest większy od zera.
    expect(paged.calls.filter((c) => c.method === "gt").map((c) => c.args)).toEqual([
      ["interval_km", 0],
    ]);
    expect(paged.argsOf("not")).toEqual(["last_done_km", "is", null]);
  });

  it("bez filtrów NIE zawęża — ekran zarządzania pokazuje też pozycje kalendarzowe", async () => {
    // Zadanie „przegląd co 12 miesięcy" nie ma interwału km i musi być widoczne na
    // liście, na której się je edytuje; zawężenie „na wszelki wypadek" ukryłoby je.
    const paged = mockSupabasePaged([[]]);
    await listServiceTasksAll(paged.client, "c1");
    expect(paged.calls.filter((c) => c.method === "gt")).toEqual([]);
    expect(paged.called("not")).toBe(false);
  });
});

describe("latestOdometers — ścieżka awaryjna, gdy migracji 0111 jeszcze nie ma", () => {
  /**
   * Mock, w którym PIERWSZE domknięcie łańcucha (to po `rpc`) zwraca „brak funkcji",
   * a kolejne oddają strony tankowań. Odtwarza dokładnie stan produkcji między deployem
   * panelu a ręcznym zastosowaniem migracji.
   */
  function mockBezRpc(strony: unknown[][]) {
    const m = mockSupabasePaged(strony);
    const builder = m.client as unknown as Record<string, unknown>;
    const dalej = builder.limit as (...a: unknown[]) => unknown;
    let pierwsze = true;
    builder.limit = (...args: unknown[]) => {
      if (!pierwsze) return dalej(...args);
      pierwsze = false;
      m.calls.push({ method: "limit", args });
      return Promise.resolve({ data: null, error: { code: "PGRST202" } });
    };
    return m;
  }

  it("brak RPC nie wywraca ekranu — przebiegi lecą starą ścieżką", async () => {
    /*
     * Migracja i kod klienta jadą osobno: kod wchodzi deployem panelu, migracja ręcznie.
     * Bez tej gałęzi kolejność „panel przed bazą" wywracała CZTERY ekrany naraz
     * (/service, /schedule, karta pojazdu, „Wymaga uwagi") u każdej firmy, nie tylko dużej.
     */
    const { client, called } = mockBezRpc([
      [
        { id: "a", vehicle_id: "v1", odometer_km: 100 },
        { id: "b", vehicle_id: "v1", odometer_km: 340 },
      ],
      [],
    ]);
    const odo = await latestOdometers(client, "c1", { pageSize: 2 });
    expect(called("from", "fuel_logs")).toBe(true);
    expect(odo.byVehicle).toEqual({ v1: 340 });
    expect(odo.complete).toBe(true);
  });

  it("INNY błąd nie jest połykany — awaria sieci ma zostać awarią", async () => {
    /*
     * Gałąź awaryjna rozpoznaje wyłącznie `PGRST202`. Gdyby łapała każdy błąd, odmowa RLS
     * albo padnięta sieć zamieniłyby się w cichy powrót do wolniejszej ścieżki — czyli
     * w ten sam rodzaj milczenia, który cała ta seria zmian usuwa.
     */
    const { client } = mockSupabase({
      data: null,
      error: { code: "PGRST301", message: "JWT expired" },
    });
    await expect(latestOdometers(client, "c1")).rejects.toMatchObject({ code: "PGRST301" });
  });
});
