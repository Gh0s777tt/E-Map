import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { listPerDiemTrips } from "./perDiemTrips";

describe("listPerDiemTrips (kształt zapytania)", () => {
  it("company_id, sort created_at desc, domyślny limit 1000", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listPerDiemTrips(client, "comp-1");
    expect(called("from", "per_diem_trips")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "comp-1"]);
    expect(argsOf("order")?.[0]).toBe("created_at");
    expect(argsOf("limit")?.[0]).toBe(1000);
  });

  it("dokłada filtr driver_name", async () => {
    const { client, calls } = mockSupabase({ data: [], error: null });
    await listPerDiemTrips(client, "c", { driverName: "Nowak" });
    const eqs = calls.filter((c) => c.method === "eq").map((c) => c.args);
    expect(eqs).toContainEqual(["driver_name", "Nowak"]);
  });
});
