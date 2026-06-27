import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { listDriverPayouts } from "./driverPayouts";

describe("listDriverPayouts (kształt zapytania)", () => {
  it("company_id, sort entry_date desc, domyślny limit 1000", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listDriverPayouts(client, "comp-1");
    expect(called("from", "driver_payouts")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "comp-1"]);
    expect(argsOf("order")?.[0]).toBe("entry_date");
    expect(argsOf("limit")?.[0]).toBe(1000);
  });

  it("dokłada filtr driver_name i własny limit", async () => {
    const { client, calls } = mockSupabase({ data: [], error: null });
    await listDriverPayouts(client, "c", { driverName: "Kowalski", limit: 50 });
    const eqs = calls.filter((c) => c.method === "eq").map((c) => c.args);
    expect(eqs).toContainEqual(["company_id", "c"]);
    expect(eqs).toContainEqual(["driver_name", "Kowalski"]);
    expect(calls.find((c) => c.method === "limit")?.args[0]).toBe(50);
  });
});
