import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { listDocuments } from "./documents";

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
});

describe("listDocuments — sufit pobrania", () => {
  it("domyślnie NIE ucina listy, bo z niej liczą się terminy ważności", async () => {
    /*
     * Obcięcie działałoby po `created_at`, a panel „Wymaga uwagi" sprawdza `expiry_date`.
     * Te daty w tej domenie nie korelują: licencja wspólnotowa (10 lat) czy świadectwo
     * kierowcy (5 lat) to skany wgrane dawno, z terminem daleko w przyszłości — wypadałyby
     * poza okno najnowszych wpisów i termin ustawowy mijałby bez ostrzeżenia.
     */
    const domyslne = mockSupabase({ data: [], error: null });
    await listDocuments(domyslne.client, "c1");
    expect(domyslne.argsOf("limit")).toBeUndefined();

    const wlasne = mockSupabase({ data: [], error: null });
    await listDocuments(wlasne.client, "c1", { limit: 25 });
    expect(wlasne.argsOf("limit")?.[0]).toBe(25);
  });
});
