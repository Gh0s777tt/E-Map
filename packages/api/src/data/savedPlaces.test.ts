import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { insertSavedPlace, listSavedPlaces } from "./savedPlaces";

describe("listSavedPlaces (kształt zapytania)", () => {
  it("company_id, sort alfabetyczny po name", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listSavedPlaces(client, "c1");
    expect(called("from", "saved_places")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "c1"]);
    expect(argsOf("order")?.[0]).toBe("name");
  });
});

describe("insertSavedPlace", () => {
  it("pusta/biała nazwa → fallback 'Bez nazwy'; dokłada company_id", async () => {
    const { client, argsOf } = mockSupabase({
      data: { id: "x", name: "Bez nazwy", category: "fuel", lat: 1, lng: 2 },
      error: null,
    });
    await insertSavedPlace(client, "c1", { name: "   ", category: "fuel", lat: 1, lng: 2 });
    const row = argsOf("insert")?.[0] as { name: string; company_id: string };
    expect(row.name).toBe("Bez nazwy");
    expect(row.company_id).toBe("c1");
  });
});
