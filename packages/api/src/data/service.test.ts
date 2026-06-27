import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { latestOdometers, listServiceTasks } from "./service";

describe("listServiceTasks (kształt zapytania)", () => {
  it("company_id, sort po created_at", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listServiceTasks(client, "c1");
    expect(called("from", "service_tasks")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "c1"]);
    expect(argsOf("order")?.[0]).toBe("created_at");
  });
});

describe("latestOdometers (agregacja max licznika per pojazd)", () => {
  it("zwraca najwyższy licznik dla każdego pojazdu", async () => {
    const { client } = mockSupabase({
      data: [
        { vehicle_id: "v1", odometer_km: 100 },
        { vehicle_id: "v1", odometer_km: 250 },
        { vehicle_id: "v2", odometer_km: 50 },
        { vehicle_id: "v1", odometer_km: 200 },
      ],
      error: null,
    });
    expect(await latestOdometers(client, "c1")).toEqual({ v1: 250, v2: 50 });
  });

  it("pomija pojazd z samym zerowym/null licznikiem (km nie > 0)", async () => {
    const { client } = mockSupabase({
      data: [{ vehicle_id: "v1", odometer_km: null }],
      error: null,
    });
    expect(await latestOdometers(client, "c1")).toEqual({});
  });
});
