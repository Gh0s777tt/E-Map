import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { listContractors } from "./contractors";

describe("listContractors (kształt zapytania)", () => {
  it("company_id, sort alfabetyczny po name", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listContractors(client, "comp-1");
    expect(called("from", "contractors")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "comp-1"]);
    expect(argsOf("order")?.[0]).toBe("name");
  });

  it("rzuca przy błędzie Supabase", async () => {
    const { client } = mockSupabase({ data: null, error: new Error("RLS") });
    await expect(listContractors(client, "c")).rejects.toThrow("RLS");
  });
});
