import { describe, expect, it } from "vitest";
import { mockSupabase, mockSupabasePaged } from "../test-utils";
import { listDocuments, listDocumentsAll } from "./documents";

describe("listDocuments (kształt zapytania)", () => {
  it("company_id, sort po created_at malejąco", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listDocuments(client, "c1");
    expect(called("from", "documents")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "c1"]);
    expect(argsOf("order")?.[0]).toBe("created_at");
  });

  it("rzuca przy błędzie Supabase", async () => {
    const { client } = mockSupabase({ data: null, error: new Error("RLS") });
    await expect(listDocuments(client, "c1")).rejects.toThrow("RLS");
  });

  it("jawny opts.limit trafia do zapytania", async () => {
    const { client, argsOf } = mockSupabase({ data: [], error: null });
    await listDocuments(client, "c1", { limit: 25 });
    expect(argsOf("limit")?.[0]).toBe(25);
  });
});

describe("listDocumentsAll — komplet dla terminów ważności", () => {
  it("schodzi kursorem po id i zwraca complete", async () => {
    /*
     * Wariant jednorazowy jest objęty sufitem `api.max_rows` (1000), a obcięcie działa
     * po `created_at` — panel „Wymaga uwagi" sprawdza natomiast `expiry_date`. Te daty
     * w tej domenie nie korelują: licencja wspólnotowa (10 lat) czy świadectwo kierowcy
     * (5 lat) to skany wgrane dawno, z terminem daleko w przyszłości. Wypadały poza okno
     * najnowszych wpisów i termin ustawowy mijał bez jednego ostrzeżenia.
     */
    const paged = mockSupabasePaged([
      [
        { id: "b", created_at: "2024-01-02T00:00:00Z", expiry_date: "2026-01-01" },
        { id: "a", created_at: "2024-03-02T00:00:00Z", expiry_date: "2026-02-01" },
      ],
    ]);
    const wynik = await listDocumentsAll(paged.client, "c1");
    expect(paged.argsOf("order")).toEqual(["id", { ascending: true }]);
    expect(wynik.complete).toBe(true);
    // Porządek prezentacyjny (najnowsze pierwsze) wraca dopiero po złożeniu stron.
    expect(wynik.rows.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("withExpiry zawęża po stronie BAZY, nie w pętli w przeglądarce", async () => {
    // Skany CMR i faktur nie mają `expiry_date` i stanowią gros sejfu — bez tego
    // filtra panel ściągałby całą historię załączników, żeby ją natychmiast odrzucić.
    const paged = mockSupabasePaged([[]]);
    await listDocumentsAll(paged.client, "c1", { withExpiry: true });
    expect(paged.argsOf("not")).toEqual(["expiry_date", "is", null]);
  });
});
