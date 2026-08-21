import { describe, expect, it } from "vitest";
import { mockSupabase, mockSupabasePaged } from "../test-utils";
import { listDriverPayouts, listDriverPayoutsAll } from "./driverPayouts";

describe("listDriverPayouts (kształt zapytania)", () => {
  it("company_id, sort entry_date desc, domyślny limit 1000", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listDriverPayouts(client, "comp-1");
    expect(called("from", "driver_payouts")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "comp-1"]);
    expect(argsOf("order")?.[0]).toBe("entry_date");
    expect(argsOf("limit")?.[0]).toBe(1000);
  });

  it("dokłada filtr driver_name i własny limit", async () => {
    const { client, calls } = mockSupabase({ data: [], error: null });
    await listDriverPayouts(client, "c", { driverName: "Kowalski", limit: 50 });
    const eqs = calls.filter((c) => c.method === "eq").map((c) => c.args);
    expect(eqs).toContainEqual(["company_id", "c"]);
    expect(eqs).toContainEqual(["driver_name", "Kowalski"]);
    expect(calls.find((c) => c.method === "limit")?.args[0]).toBe(50);
  });
});

/**
 * Saldo kierowcy to RÓŻNICA pozycji o przeciwnych znakach, więc obcięcie zbioru
 * nie zaniża wyniku w jedną stronę — przesuwa go w dowolną. Testy pilnują, że
 * strony schodzą po kluczu i że niekompletność jest widoczna w wyniku.
 */
describe("listDriverPayoutsAll — pobieranie stronami", () => {
  const wiersz = (id: string, entry_date = "2026-01-01") => ({ id, entry_date });

  it("schodzi stronami po kluczu aż do strony niepełnej", async () => {
    const m = mockSupabasePaged([[wiersz("a"), wiersz("b")], [wiersz("c")]]);
    const wynik = await listDriverPayoutsAll(m.client, "c1", { pageSize: 2 });
    expect(wynik.rows.map((p) => p.id).sort()).toEqual(["a", "b", "c"]);
    expect(wynik.complete).toBe(true);
    expect(m.kursory()).toEqual([["id", "b"]]);
  });

  it("po przekroczeniu twardego sufitu wynik jest oznaczony jako NIEPEŁNY", async () => {
    // Wypłacona zaliczka, która wypadła ze zbioru, zamienia saldo zerowe w dług.
    const m = mockSupabasePaged([
      [wiersz("a1"), wiersz("a2")],
      [wiersz("b1"), wiersz("b2")],
      [wiersz("c1"), wiersz("c2")],
    ]);
    const wynik = await listDriverPayoutsAll(m.client, "c1", { pageSize: 2, maxPages: 2 });
    expect(wynik.pages).toBe(2);
    expect(wynik.rows).toHaveLength(4);
    expect(wynik.complete).toBe(false);
  });

  it("zawęża zbiór PO STRONIE BAZY: firma i kierowca", async () => {
    // Dokument rozliczeniowy dotyczy jednej osoby — filtr w przeglądarce znaczyłby
    // ściąganie rozliczeń całej firmy po to, żeby pokazać jedną kolumnę.
    const m = mockSupabasePaged([[]]);
    await listDriverPayoutsAll(m.client, "c1", { driverName: "Kowalski", pageSize: 2 });
    const eqs = m.calls.filter((c) => c.method === "eq").map((c) => c.args);
    expect(eqs).toEqual([
      ["company_id", "c1"],
      ["driver_name", "Kowalski"],
    ]);
    expect(m.argsOf("order")).toEqual(["id", { ascending: true }]);
  });

  it("porządek prezentacyjny (wg daty malejąco) wraca po złożeniu stron", async () => {
    const m = mockSupabasePaged([
      [wiersz("a", "2026-01-05"), wiersz("b", "2026-03-01")],
      [wiersz("c", "2026-02-01")],
    ]);
    const wynik = await listDriverPayoutsAll(m.client, "c1", { pageSize: 2 });
    expect(wynik.rows.map((p) => p.id)).toEqual(["b", "c", "a"]);
  });
});
