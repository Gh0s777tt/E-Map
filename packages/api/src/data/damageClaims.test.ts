import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { listDamageClaims } from "./damageClaims";

describe("listDamageClaims (kształt zapytania)", () => {
  it("company_id, sort claim_date desc, domyślny limit 1000", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listDamageClaims(client, "comp-1");
    expect(called("from", "damage_claims")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "comp-1"]);
    expect(argsOf("order")?.[0]).toBe("claim_date");
    expect(argsOf("limit")?.[0]).toBe(1000);
  });

  it("respektuje własny limit", async () => {
    const { client, argsOf } = mockSupabase({ data: [], error: null });
    await listDamageClaims(client, "c", { limit: 25 });
    expect(argsOf("limit")?.[0]).toBe(25);
  });

  it("rzuca przy błędzie", async () => {
    const { client } = mockSupabase({ data: null, error: new Error("RLS") });
    await expect(listDamageClaims(client, "c")).rejects.toThrow("RLS");
  });
});
