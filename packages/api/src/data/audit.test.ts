import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { listAuditLog } from "./audit";

describe("listAuditLog (kształt zapytania)", () => {
  it("company_id, sort created_at desc, domyślny limit 200", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listAuditLog(client, "comp-1");
    expect(called("from", "audit_log")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "comp-1"]);
    expect(argsOf("order")?.[0]).toBe("created_at");
    expect(argsOf("limit")?.[0]).toBe(200);
  });

  it("dokłada filtr action i własny limit", async () => {
    const { client, calls } = mockSupabase({ data: [], error: null });
    await listAuditLog(client, "c", { action: "fuel_card.read_pin", limit: 50 });
    const eqs = calls.filter((c) => c.method === "eq").map((c) => c.args);
    expect(eqs).toContainEqual(["action", "fuel_card.read_pin"]);
    expect(calls.find((c) => c.method === "limit")?.args[0]).toBe(50);
  });
});
