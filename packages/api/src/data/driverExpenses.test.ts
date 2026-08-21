import { describe, expect, it } from "vitest";
import { mockSupabase, mockSupabasePaged } from "../test-utils";
import { listDriverExpenses, listDriverExpensesAll } from "./driverExpenses";

describe("listDriverExpenses (kształt zapytania)", () => {
  it("sortuje malejąco po created_at i ogranicza do 200 — okno ekranu, nie komplet", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listDriverExpenses(client);
    expect(called("from", "driver_expenses")).toBe(true);
    expect(argsOf("order")?.[0]).toBe("created_at");
    expect(argsOf("limit")?.[0]).toBe(200);
    // Zasięg firmy daje RLS — dokładanie `company_id` sugerowałoby wybór, którego
    // wywołujący nie ma (kierowca widzi swoje wpisy, zarząd całą firmę).
    expect(called("eq", "company_id")).toBe(false);
  });

  it("dokłada filtr statusu i własny limit", async () => {
    const { client, argsOf } = mockSupabase({ data: [], error: null });
    await listDriverExpenses(client, { status: "submitted", limit: 30 });
    expect(argsOf("eq")).toEqual(["status", "submitted"]);
    expect(argsOf("limit")?.[0]).toBe(30);
  });
});

/**
 * Wydatki wchodzą do rejestru kosztów i do rozliczenia kierowcy, a domyślne okno
 * wariantu jednorazowego (200 wierszy) wygląda jak świadoma decyzja, nie jak brak
 * danych — suma opłat drogowych policzona z takiego wycinka jest po prostu kwotą
 * z innego okresu i niczym się nie różni od poprawnej.
 */
describe("listDriverExpensesAll — pobieranie stronami", () => {
  const wiersz = (id: string, created_at = "2026-01-01") => ({ id, created_at });

  it("schodzi stronami po kluczu aż do strony niepełnej", async () => {
    const m = mockSupabasePaged([[wiersz("a"), wiersz("b")], [wiersz("c")]]);
    const wynik = await listDriverExpensesAll(m.client, { pageSize: 2 });
    expect(wynik.rows.map((w) => w.id).sort()).toEqual(["a", "b", "c"]);
    expect(wynik.complete).toBe(true);
    expect(m.kursory()).toEqual([["id", "b"]]);
  });

  it("po przekroczeniu twardego sufitu wynik jest oznaczony jako NIEPEŁNY", async () => {
    const m = mockSupabasePaged([
      [wiersz("a1"), wiersz("a2")],
      [wiersz("b1"), wiersz("b2")],
      [wiersz("c1"), wiersz("c2")],
    ]);
    const wynik = await listDriverExpensesAll(m.client, { pageSize: 2, maxPages: 2 });
    expect(wynik.pages).toBe(2);
    expect(wynik.rows).toHaveLength(4);
    expect(wynik.complete).toBe(false);
  });

  it("filtr statusu zostaje PO STRONIE BAZY, a strony idą po `id` rosnąco", async () => {
    const m = mockSupabasePaged([[]]);
    await listDriverExpensesAll(m.client, { status: "approved", pageSize: 2 });
    expect(m.argsOf("eq")).toEqual(["status", "approved"]);
    expect(m.argsOf("order")).toEqual(["id", { ascending: true }]);
    expect(m.argsOf("limit")?.[0]).toBe(2);
  });

  it("porządek prezentacyjny (najnowsze pierwsze) wraca po złożeniu stron", async () => {
    const m = mockSupabasePaged([
      [wiersz("a", "2026-01-05"), wiersz("b", "2026-03-01")],
      [wiersz("c", "2026-02-01")],
    ]);
    const wynik = await listDriverExpensesAll(m.client, { pageSize: 2 });
    expect(wynik.rows.map((w) => w.id)).toEqual(["b", "c", "a"]);
  });
});
