import { describe, expect, it } from "vitest";
import { mockSupabase, mockSupabasePaged } from "../test-utils";
import { listDefects, listDefectsAll } from "./defects";

describe("listDefects (kształt zapytania)", () => {
  it("sort malejąco po created_at, limit tylko na żądanie", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listDefects(client, { limit: 30 });
    expect(called("from", "vehicle_defects")).toBe(true);
    expect(argsOf("order")).toEqual(["created_at", { ascending: false }]);
    expect(argsOf("limit")?.[0]).toBe(30);
  });

  it("zawężenie po statusach idzie do bazy", async () => {
    const { client, argsOf } = mockSupabase({ data: [], error: null });
    await listDefects(client, { statuses: ["open", "in_progress"] });
    expect(argsOf("in")).toEqual(["status", ["open", "in_progress"]]);
  });
});

describe("listDefectsAll — komplet otwartych zgłoszeń", () => {
  it("schodzi kursorem po id i oddaje najnowsze pierwsze", async () => {
    /*
     * Panel „Wymaga uwagi" czytał usterki oknem 200 NAJNOWSZYCH zgłoszeń. Krytyczna
     * usterka sprzed 250 zgłoszeń przestawała się wtedy upominać — a panel wyglądał
     * identycznie jak u firmy, która nie ma nic otwartego.
     */
    const paged = mockSupabasePaged([
      [
        { id: "b", created_at: "2024-01-02T00:00:00Z", status: "open" },
        { id: "a", created_at: "2024-05-02T00:00:00Z", status: "in_progress" },
      ],
    ]);
    const wynik = await listDefectsAll(paged.client, { statuses: ["open", "in_progress"] });
    expect(paged.argsOf("in")).toEqual(["status", ["open", "in_progress"]]);
    expect(paged.argsOf("order")).toEqual(["id", { ascending: true }]);
    expect(wynik.complete).toBe(true);
    expect(wynik.rows.map((r) => r.id)).toEqual(["a", "b"]);
  });
});
