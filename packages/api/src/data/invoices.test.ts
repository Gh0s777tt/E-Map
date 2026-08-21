import { describe, expect, it } from "vitest";
import { mockSupabase, mockSupabasePaged } from "../test-utils";
import { listInvoiceItems, listInvoices, listInvoicesAll } from "./invoices";

describe("listInvoices (kształt zapytania)", () => {
  it("filtruje po company_id i sortuje malejąco po created_at", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listInvoices(client, "comp-1");
    expect(called("from", "invoices")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "comp-1"]);
    expect(argsOf("order")?.[0]).toBe("created_at");
    expect(called("limit")).toBe(false);
  });

  it("stosuje from/to/limit gdy podane", async () => {
    const { client, argsOf } = mockSupabase({ data: [], error: null });
    await listInvoices(client, "c", { from: "2026-01-01", to: "2026-03-01", limit: 100 });
    expect(argsOf("gte")).toEqual(["created_at", "2026-01-01"]);
    expect(argsOf("lte")).toEqual(["created_at", "2026-03-01"]);
    expect(argsOf("limit")?.[0]).toBe(100);
  });

  it("rzuca przy błędzie", async () => {
    const { client } = mockSupabase({ data: null, error: new Error("boom") });
    await expect(listInvoices(client, "c")).rejects.toThrow("boom");
  });
});

describe("listInvoiceItems (limit ochronny)", () => {
  it("filtruje po invoice_id, sortuje po position, ogranicza do 500", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listInvoiceItems(client, "inv-1");
    expect(called("from", "invoice_items")).toBe(true);
    expect(argsOf("eq")).toEqual(["invoice_id", "inv-1"]);
    expect(argsOf("order")?.[0]).toBe("position");
    expect(argsOf("limit")?.[0]).toBe(500);
  });
});

/**
 * Faktura jest dokumentem księgowym, więc każdy jej brak w zestawieniu jest błędem
 * KWOTY, nie brakiem wiersza — a przy sortowaniu malejącym z okna wypadają
 * najstarsze, czyli te, o które pyta zamknięty miesiąc i przegląd zaległości.
 */
describe("listInvoicesAll — pobieranie stronami", () => {
  const wiersz = (id: string, created_at = "2026-01-01") => ({ id, created_at });

  it("schodzi stronami po kluczu aż do strony niepełnej", async () => {
    const m = mockSupabasePaged([[wiersz("a"), wiersz("b")], [wiersz("c")]]);
    const wynik = await listInvoicesAll(m.client, "c1", { pageSize: 2 });
    expect(wynik.rows.map((i) => i.id).sort()).toEqual(["a", "b", "c"]);
    expect(wynik.complete).toBe(true);
    expect(m.kursory()).toEqual([["id", "b"]]);
  });

  it("po przekroczeniu twardego sufitu wynik jest oznaczony jako NIEPEŁNY", async () => {
    const m = mockSupabasePaged([
      [wiersz("a1"), wiersz("a2")],
      [wiersz("b1"), wiersz("b2")],
      [wiersz("c1"), wiersz("c2")],
    ]);
    const wynik = await listInvoicesAll(m.client, "c1", { pageSize: 2, maxPages: 2 });
    expect(wynik.pages).toBe(2);
    expect(wynik.rows).toHaveLength(4);
    expect(wynik.complete).toBe(false);
  });

  it("zawęża zbiór PO STRONIE BAZY: firma i okno created_at (górna granica WŁĄCZNA)", async () => {
    // `lte`, nie `lt` — jak w wariancie jednorazowym. Wyrównanie progu do zleceń
    // przesunęłoby przynależność faktur z północy granicznego dnia, czyli kwoty
    // w już wystawionych zestawieniach.
    const m = mockSupabasePaged([[]]);
    await listInvoicesAll(m.client, "c1", { from: "2026-01-01", to: "2026-03-01", pageSize: 2 });
    expect(m.argsOf("eq")).toEqual(["company_id", "c1"]);
    expect(m.argsOf("gte")).toEqual(["created_at", "2026-01-01"]);
    expect(m.argsOf("lte")).toEqual(["created_at", "2026-03-01"]);
    expect(m.called("lt")).toBe(false);
  });

  it("porządek prezentacyjny (najnowsze pierwsze) wraca po złożeniu stron", async () => {
    const m = mockSupabasePaged([
      [wiersz("a", "2026-01-05"), wiersz("b", "2026-03-01")],
      [wiersz("c", "2026-02-01")],
    ]);
    const wynik = await listInvoicesAll(m.client, "c1", { pageSize: 2 });
    expect(wynik.rows.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("błąd którejkolwiek strony przerywa pobranie — zamiast oddać zbiór po cichu krótszy", async () => {
    const m = mockSupabasePaged([[wiersz("a"), wiersz("b")]]);
    const builder = m.client as unknown as Record<string, unknown>;
    builder.limit = () => Promise.resolve({ data: null, error: new Error("RLS") });
    await expect(listInvoicesAll(m.client, "c1", { pageSize: 2 })).rejects.toThrow("RLS");
  });
});
