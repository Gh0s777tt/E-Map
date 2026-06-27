import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { listWorkTimeEntries } from "./workTimeEntries";

describe("listWorkTimeEntries (kształt zapytania)", () => {
  it("company_id, sort work_date desc, domyślny limit 1000", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listWorkTimeEntries(client, "comp-1");
    expect(called("from", "work_time_entries")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "comp-1"]);
    expect(argsOf("order")?.[0]).toBe("work_date");
    expect(argsOf("limit")?.[0]).toBe(1000);
  });

  it("dokłada filtr driver_name i własny limit", async () => {
    const { client, calls } = mockSupabase({ data: [], error: null });
    await listWorkTimeEntries(client, "c", { driverName: "Nowak", limit: 7 });
    const eqs = calls.filter((c) => c.method === "eq").map((c) => c.args);
    expect(eqs).toContainEqual(["driver_name", "Nowak"]);
    expect(calls.find((c) => c.method === "limit")?.args[0]).toBe(7);
  });
});
