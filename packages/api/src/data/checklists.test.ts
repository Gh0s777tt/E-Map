import { describe, expect, it } from "vitest";
import { mockSupabase, mockSupabasePaged } from "../test-utils";
import { listChecklistSubmissions, listChecklistSubmissionsAll } from "./checklists";

describe("listChecklistSubmissions (kształt zapytania)", () => {
  it("company_id, sort created_at desc, domyślny limit 200", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listChecklistSubmissions(client, "comp-1");
    expect(called("from", "checklist_submissions")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "comp-1"]);
    expect(argsOf("order")?.[0]).toBe("created_at");
    expect(argsOf("limit")?.[0]).toBe(200);
  });

  it("dokłada filtry pojazdu, kierowcy i szablonu", async () => {
    const { client, calls } = mockSupabase({ data: [], error: null });
    await listChecklistSubmissions(client, "c", {
      vehicleId: "v1",
      driverUserId: "u9",
      templateName: "Wyjazd",
    });
    const eqs = calls.filter((c) => c.method === "eq").map((c) => c.args);
    expect(eqs).toEqual([
      ["company_id", "c"],
      ["vehicle_id", "v1"],
      ["driver_user_id", "u9"],
      ["template_name", "Wyjazd"],
    ]);
  });
});

/**
 * Scoring liczy ze zgłoszeń ODSETEK, więc obcięty zbiór psuje MIANOWNIK — i psuje go
 * nierówno: tysiąc najnowszych zgłoszeń całej firmy to głównie wpisy kierowców
 * jeżdżących najczęściej, a kierowca wypełniający checklisty rzadziej wypada z niego
 * niemal w całości i dostaje wynik z kilku przypadkowych zgłoszeń.
 */
describe("listChecklistSubmissionsAll — pobieranie stronami", () => {
  const wiersz = (id: string, created_at = "2026-01-01") => ({
    id,
    template_name: "Wyjazd",
    driver_id: null,
    driver_user_id: "u9",
    driver_label: "Nowak",
    vehicle_id: null,
    answers: { hamulce: "ok" },
    created_at,
  });

  it("schodzi stronami po kluczu aż do strony niepełnej", async () => {
    const m = mockSupabasePaged([[wiersz("a"), wiersz("b")], [wiersz("c")]]);
    const wynik = await listChecklistSubmissionsAll(m.client, "c1", { pageSize: 2 });
    expect(wynik.rows.map((z) => z.id).sort()).toEqual(["a", "b", "c"]);
    expect(wynik.complete).toBe(true);
    expect(m.kursory()).toEqual([["id", "b"]]);
  });

  it("po przekroczeniu twardego sufitu wynik jest oznaczony jako NIEPEŁNY", async () => {
    const m = mockSupabasePaged([
      [wiersz("a1"), wiersz("a2")],
      [wiersz("b1"), wiersz("b2")],
      [wiersz("c1"), wiersz("c2")],
    ]);
    const wynik = await listChecklistSubmissionsAll(m.client, "c1", { pageSize: 2, maxPages: 2 });
    expect(wynik.pages).toBe(2);
    expect(wynik.rows).toHaveLength(4);
    expect(wynik.complete).toBe(false);
  });

  it("zawęża zbiór PO STRONIE BAZY: firma, pojazd, kierowca, szablon", async () => {
    const m = mockSupabasePaged([[]]);
    await listChecklistSubmissionsAll(m.client, "c1", {
      vehicleId: "v1",
      driverUserId: "u9",
      templateName: "Wyjazd",
      pageSize: 2,
    });
    const eqs = m.calls.filter((c) => c.method === "eq").map((c) => c.args);
    expect(eqs).toEqual([
      ["company_id", "c1"],
      ["vehicle_id", "v1"],
      ["driver_user_id", "u9"],
      ["template_name", "Wyjazd"],
    ]);
    expect(m.argsOf("order")).toEqual(["id", { ascending: true }]);
  });

  it("okno dat też schodzi do bazy — inaczej `complete` mówiłoby o innym zbiorze", async () => {
    /*
     * Scoring liczy okno 90 dni. Odsianie go dopiero w przeglądarce znaczyło dwie rzeczy
     * naraz: ściągnięcie całej historii firmy razem z kolumną `answers` (JSON) po to, żeby
     * odrzucić 97% wierszy — i `complete` odnoszące się do tej historii, a nie do okna.
     * Baner „ranking jest niepełny, nie opieraj na nim premii" zapalał się wtedy na stałe
     * u firmy, której okno 90 dni mieści się w jednej stronie.
     */
    const m = mockSupabasePaged([[]]);
    await listChecklistSubmissionsAll(m.client, "c1", {
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-04-01T00:00:00.000Z",
    });
    expect(m.argsOf("gte")).toEqual(["created_at", "2026-01-01T00:00:00.000Z"]);
    expect(m.argsOf("lt")).toEqual(["created_at", "2026-04-01T00:00:00.000Z"]);
  });

  it("mapuje odpowiedzi każdej strony, a brak `answers` daje pusty obiekt", async () => {
    // Scoring iteruje po `answers` — `null` z bazy (wiersz sprzed migracji z domyślną
    // wartością) wywróciłby liczenie zamiast dać zero zgłoszonych usterek.
    const m = mockSupabasePaged([[{ ...wiersz("a"), answers: null }], []]);
    const wynik = await listChecklistSubmissionsAll(m.client, "c1", { pageSize: 1 });
    expect(wynik.rows[0]?.answers).toEqual({});
    expect(wynik.rows[0]?.driver_label).toBe("Nowak");
  });

  it("porządek prezentacyjny (najnowsze pierwsze) wraca po złożeniu stron", async () => {
    const m = mockSupabasePaged([
      [wiersz("a", "2026-01-05"), wiersz("b", "2026-03-01")],
      [wiersz("c", "2026-02-01")],
    ]);
    const wynik = await listChecklistSubmissionsAll(m.client, "c1", { pageSize: 2 });
    expect(wynik.rows.map((z) => z.id)).toEqual(["b", "c", "a"]);
  });
});
