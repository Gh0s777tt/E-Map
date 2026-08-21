import { describe, expect, it } from "vitest";
import { mockSupabase, mockSupabasePaged } from "../test-utils";
import { listPerDiemTrips, listPerDiemTripsAll } from "./perDiemTrips";

describe("listPerDiemTrips (kształt zapytania)", () => {
  it("company_id, sort created_at desc, domyślny limit 1000", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listPerDiemTrips(client, "comp-1");
    expect(called("from", "per_diem_trips")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "comp-1"]);
    expect(argsOf("order")?.[0]).toBe("created_at");
    expect(argsOf("limit")?.[0]).toBe(1000);
  });

  it("dokłada filtr driver_name", async () => {
    const { client, calls } = mockSupabase({ data: [], error: null });
    await listPerDiemTrips(client, "c", { driverName: "Nowak" });
    const eqs = calls.filter((c) => c.method === "eq").map((c) => c.args);
    expect(eqs).toContainEqual(["driver_name", "Nowak"]);
  });
});

/**
 * Rejestr kosztów i dokument rozliczeniowy liczą kwotę Z TEGO zbioru. Niepełne
 * pobranie nie skraca tu listy — zaniża sumę, nieodróżnialnie od miesiąca, w którym
 * nikt nie jeździł. Testy pilnują, że strony schodzą po KLUCZU, że filtry zostają
 * po stronie bazy i że przekroczenie sufitu widać w wyniku.
 */
describe("listPerDiemTripsAll — pobieranie stronami", () => {
  const wiersz = (id: string, created_at = "2026-01-01") => ({ id, created_at });

  it("schodzi stronami po kluczu aż do strony niepełnej", async () => {
    const m = mockSupabasePaged([[wiersz("a"), wiersz("b")], [wiersz("c")]]);
    const wynik = await listPerDiemTripsAll(m.client, "c1", { pageSize: 2 });
    expect(wynik.rows.map((t) => t.id).sort()).toEqual(["a", "b", "c"]);
    expect(wynik.complete).toBe(true);
    expect(m.kursory()).toEqual([["id", "b"]]);
    expect(m.stron()).toBe(2);
  });

  it("po przekroczeniu twardego sufitu wynik jest oznaczony jako NIEPEŁNY", async () => {
    // Bez `complete` te same wiersze wyglądają jak komplet — a suma diet jest wtedy
    // po prostu mniejsza, bez jednego sygnału, że czegoś w niej brakuje.
    const m = mockSupabasePaged([
      [wiersz("a1"), wiersz("a2")],
      [wiersz("b1"), wiersz("b2")],
      [wiersz("c1"), wiersz("c2")],
    ]);
    const wynik = await listPerDiemTripsAll(m.client, "c1", { pageSize: 2, maxPages: 2 });
    expect(wynik.pages).toBe(2);
    expect(wynik.rows).toHaveLength(4);
    expect(wynik.complete).toBe(false);
    expect(m.stron()).toBe(2);
  });

  it("zawęża zbiór PO STRONIE BAZY: firma, kierowca i okno trip_date", async () => {
    const m = mockSupabasePaged([[]]);
    await listPerDiemTripsAll(m.client, "c1", {
      driverName: "Nowak",
      from: "2026-01-01",
      to: "2026-02-01",
      pageSize: 2,
    });
    const eqs = m.calls.filter((c) => c.method === "eq").map((c) => c.args);
    expect(eqs).toEqual([
      ["company_id", "c1"],
      ["driver_name", "Nowak"],
    ]);
    // Wiersze bez `trip_date` przepuszczamy — tak samo jak wariant jednorazowy.
    const ors = m.calls.filter((c) => c.method === "or").map((c) => c.args[0]);
    expect(ors).toEqual([
      "trip_date.gte.2026-01-01,trip_date.is.null",
      "trip_date.lt.2026-02-01,trip_date.is.null",
    ]);
  });

  it("porządek prezentacyjny (najnowsze pierwsze) wraca po złożeniu stron", async () => {
    // Baza oddaje strony po `id` rosnąco — to warunek stabilnego kursora, a nie
    // kolejność, w jakiej ktokolwiek chce oglądać diety.
    const m = mockSupabasePaged([
      [wiersz("a", "2026-01-05"), wiersz("b", "2026-03-01")],
      [wiersz("c", "2026-02-01")],
    ]);
    const wynik = await listPerDiemTripsAll(m.client, "c1", { pageSize: 2 });
    expect(wynik.rows.map((t) => t.id)).toEqual(["b", "c", "a"]);
  });
});
