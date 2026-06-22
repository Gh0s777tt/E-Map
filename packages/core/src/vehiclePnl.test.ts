import { describe, expect, it } from "vitest";
import { fleetPnlByVehicle, vehiclePnl } from "./vehiclePnl";

describe("vehiclePnl", () => {
  it("liczy zysk i marżę", () => {
    const r = vehiclePnl({ revenueEur: 10000, fuelEur: 3000, costsEur: 2000 });
    expect(r).toEqual({ revenue: 10000, fuel: 3000, costs: 2000, net: 5000, marginPct: 50 });
  });
  it("zysk ujemny gdy koszty > przychód", () => {
    const r = vehiclePnl({ revenueEur: 1000, fuelEur: 800, costsEur: 500 });
    expect(r.net).toBe(-300);
    expect(r.marginPct).toBe(-30);
  });
  it("brak przychodu → marża null", () => {
    const r = vehiclePnl({ revenueEur: 0, fuelEur: 200, costsEur: 0 });
    expect(r).toMatchObject({ net: -200, marginPct: null });
  });
  it("ujemne wejścia traktowane jak zero", () => {
    const r = vehiclePnl({ revenueEur: -5, fuelEur: -5, costsEur: -5 });
    expect(r).toEqual({ revenue: 0, fuel: 0, costs: 0, net: 0, marginPct: null });
  });
  it("zaokrągla marżę do 2 miejsc", () => {
    const r = vehiclePnl({ revenueEur: 3000, fuelEur: 1000, costsEur: 0 });
    expect(r.marginPct).toBe(66.67); // 2000/3000*100
  });
});

describe("fleetPnlByVehicle", () => {
  it("liczy P&L per pojazd, sortuje malejąco wg zysku", () => {
    const rows = fleetPnlByVehicle(
      [
        { vehicleId: "v1", price: 5000, currency: "EUR", status: "delivered" },
        { vehicleId: "v2", price: 2000, currency: "EUR", status: "invoiced" },
        { vehicleId: "v1", price: 1000, currency: "PLN", status: "delivered" }, // pominięte (PLN)
        { vehicleId: "v2", price: 999, currency: "EUR", status: "new" }, // pominięte (niezrealizowane)
      ],
      [
        { vehicleId: "v1", eur: 1000 },
        { vehicleId: "v2", eur: 500 },
      ],
      [{ vehicleId: "v1", eur: 500 }],
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      vehicleId: "v1",
      revenue: 5000,
      fuel: 1000,
      costs: 500,
      net: 3500,
    });
    expect(rows[1]).toMatchObject({
      vehicleId: "v2",
      revenue: 2000,
      fuel: 500,
      costs: 0,
      net: 1500,
    });
  });

  it("uwzględnia pojazd z kosztem bez przychodu (zysk ujemny)", () => {
    const rows = fleetPnlByVehicle([], [{ vehicleId: "v9", eur: 300 }], []);
    expect(rows[0]).toMatchObject({ vehicleId: "v9", revenue: 0, net: -300, marginPct: null });
  });

  it("pusto → pusto", () => {
    expect(fleetPnlByVehicle([], [], [])).toEqual([]);
  });
});
