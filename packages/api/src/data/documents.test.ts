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
