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

describe("karty paliwowe — sufity pobrania", () => {
  it("lista firmowa ma sufit WYŻSZY niż lista jednego auta", async () => {
    // Nie chodzi o konkretne liczby, tylko o relację: kart w firmie jest
    // tyle, ile aut razy kilka, a przy jednym aucie kilkadziesiąt kart to
    // już sygnał nieposprzątanej kartoteki, nie skali.
    const firma = mockSupabase({ data: [], error: null });
    await listFuelCardsSafe(firma.client, "c1");
    const auto = mockSupabase({ data: [], error: null });
    await listFuelCardsByVehicle(auto.client, "v1");
    expect(firma.argsOf("limit")?.[0]).toBe(1000);
    expect(auto.argsOf("limit")?.[0]).toBe(50);
  });

  it("opts.limit nadpisuje domyślny w obu", async () => {
    const firma = mockSupabase({ data: [], error: null });
    await listFuelCardsSafe(firma.client, "c1", { limit: 3 });
    expect(firma.argsOf("limit")?.[0]).toBe(3);

    const auto = mockSupabase({ data: [], error: null });
    await listFuelCardsByVehicle(auto.client, "v1", { limit: 3 });
    expect(auto.argsOf("limit")?.[0]).toBe(3);
  });
});
