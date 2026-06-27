import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { listVehicleCosts } from "./vehicleCosts";

describe("listVehicleCosts (kształt zapytania)", () => {
  it("company_id, sort cost_date desc, domyślny limit 1000", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listVehicleCosts(client, "comp-1");
    expect(called("from", "vehicle_costs")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "comp-1"]);
    expect(argsOf("order")?.[0]).toBe("cost_date");
    expect(argsOf("limit")?.[0]).toBe(1000);
  });

  it("dokłada filtr vehicle_id, zakres cost_date i własny limit", async () => {
    const { client, calls } = mockSupabase({ data: [], error: null });
    await listVehicleCosts(client, "c", { vehicleId: "v1", from: "2026-01-01", limit: 30 });
    const eqs = calls.filter((c) => c.method === "eq").map((c) => c.args);
    expect(eqs).toContainEqual(["company_id", "c"]);
    expect(eqs).toContainEqual(["vehicle_id", "v1"]);
    expect(calls.find((c) => c.method === "gte")?.args).toEqual(["cost_date", "2026-01-01"]);
    expect(calls.find((c) => c.method === "limit")?.args[0]).toBe(30);
  });
});
