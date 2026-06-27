import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { getFuelCardPin, listFuelCardsByVehicle, listFuelCardsSafe } from "./fuelCards";

describe("listFuelCardsSafe (bez PIN)", () => {
  it("company_id, sort po provider", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listFuelCardsSafe(client, "c1");
    expect(called("from", "fuel_cards")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "c1"]);
    expect(argsOf("order")?.[0]).toBe("provider");
  });
});

describe("listFuelCardsByVehicle", () => {
  it("filtruje po vehicle_id", async () => {
    const { client, argsOf } = mockSupabase({ data: [], error: null });
    await listFuelCardsByVehicle(client, "v1");
    expect(argsOf("eq")).toEqual(["vehicle_id", "v1"]);
  });
});

describe("getFuelCardPin (RPC, audytowane)", () => {
  it("woła RPC fuel_card_pin i zwraca PIN", async () => {
    const { client, argsOf } = mockSupabase({ data: "1234", error: null });
    expect(await getFuelCardPin(client, "card-1")).toBe("1234");
    expect(argsOf("rpc")).toEqual(["fuel_card_pin", { p_card: "card-1" }]);
  });

  it("null → pusty string", async () => {
    const { client } = mockSupabase({ data: null, error: null });
    expect(await getFuelCardPin(client, "card-1")).toBe("");
  });
});
