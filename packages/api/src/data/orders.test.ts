import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { listMyOrders, listOrders } from "./orders";

describe("listOrders (kształt zapytania)", () => {
  it("filtruje po company_id i sortuje malejąco po created_at", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listOrders(client, "comp-1");
    expect(called("from", "orders")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "comp-1"]);
    expect(argsOf("order")?.[0]).toBe("created_at");
    expect(called("limit")).toBe(false);
  });

  it("stosuje from/to/limit gdy podane", async () => {
    const { client, argsOf } = mockSupabase({ data: [], error: null });
    await listOrders(client, "c", { from: "2026-01-01", to: "2026-02-01", limit: 50 });
    expect(argsOf("gte")).toEqual(["created_at", "2026-01-01"]);
    expect(argsOf("lte")).toEqual(["created_at", "2026-02-01"]);
    expect(argsOf("limit")?.[0]).toBe(50);
  });
});

describe("listMyOrders (kierowca, RLS)", () => {
  it("zwraca pustą listę bez sesji", async () => {
    const { client } = mockSupabase({ data: [], error: null });
    Object.assign(client, { auth: { getUser: async () => ({ data: { user: null } }) } });
    expect(await listMyOrders(client)).toEqual([]);
  });

  it("filtruje po assigned_to = id zalogowanego kierowcy", async () => {
    const { client, argsOf } = mockSupabase({ data: [], error: null });
    Object.assign(client, { auth: { getUser: async () => ({ data: { user: { id: "u9" } } }) } });
    await listMyOrders(client);
    expect(argsOf("eq")).toEqual(["assigned_to", "u9"]);
  });
});
