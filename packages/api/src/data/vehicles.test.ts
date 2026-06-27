import type { VehicleInput } from "@e-logistic/core";
import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { listVehicles, vehicleToRow } from "./vehicles";

const input: VehicleInput = {
  registration: "WL5145U",
  model: "Actros",
  make: "Mercedes",
  year: 2022,
  vehicleType: "truck",
  vin: "VIN123",
};

describe("vehicleToRow (czysta funkcja)", () => {
  it("mapuje na snake_case z company_id", () => {
    const row = vehicleToRow(input, "comp-1");
    expect(row.company_id).toBe("comp-1");
    expect(row.registration).toBe("WL5145U");
    expect(row.model).toBe("Actros");
    expect(row.make).toBe("Mercedes");
    expect(row.vin).toBe("VIN123");
    expect(row.vehicle_type).toBe("truck");
  });

  it("pola opcjonalne → null", () => {
    const row = vehicleToRow(
      { registration: "X", model: "M", year: 2020, vehicleType: "van" },
      "c",
    );
    expect(row.insurer).toBeNull();
    expect(row.fuel_tank_l).toBeNull();
    expect(row.comment).toBeNull();
  });
});

describe("listVehicles (kształt zapytania)", () => {
  it("company_id, sort po registration", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listVehicles(client, "comp-1");
    expect(called("from", "vehicles")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "comp-1"]);
    expect(argsOf("order")?.[0]).toBe("registration");
  });
});
