import { describe, expect, it } from "vitest";
import { fleetPnl, sumCostsByCategory, sumCostsByVehicle } from "./vehicleCosts";

describe("sumCostsByCategory", () => {
  it("sumuje wg kategorii malejąco i mapuje etykiety", () => {
    const r = sumCostsByCategory([
      { vehicleId: "a", category: "repair", amountEur: 100 },
      { vehicleId: "a", category: "leasing", amountEur: 300 },
      { vehicleId: "b", category: "repair", amountEur: 50 },
    ]);
    expect(r[0]).toMatchObject({ category: "leasing", amountEur: 300, label: "Leasing / rata" });
    expect(r[1]).toMatchObject({ category: "repair", amountEur: 150 });
  });

  it("nieznana kategoria → other", () => {
    const r = sumCostsByCategory([{ vehicleId: "a", category: "xyz", amountEur: 10 }]);
    expect(r).toEqual([{ category: "other", label: "Inne", amountEur: 10 }]);
  });
});

describe("sumCostsByVehicle", () => {
  it("sumuje per pojazd", () => {
    const r = sumCostsByVehicle([
      { vehicleId: "a", category: "repair", amountEur: 100 },
      { vehicleId: "a", category: "leasing", amountEur: 300 },
      { vehicleId: "b", category: "tax", amountEur: 25 },
    ]);
    expect(r).toContainEqual({ vehicleId: "a", cost: 400 });
    expect(r).toContainEqual({ vehicleId: "b", cost: 25 });
  });
});

describe("fleetPnl", () => {
  it("przychód − paliwo − pozostałe = zysk, marża %", () => {
    const p = fleetPnl(10000, 3000, 2000);
    expect(p.totalCostEur).toBe(5000);
    expect(p.profitEur).toBe(5000);
    expect(p.marginPct).toBe(50);
  });

  it("zerowy przychód → marża null", () => {
    expect(fleetPnl(0, 100, 50).marginPct).toBeNull();
  });

  it("strata gdy koszty > przychód", () => {
    const p = fleetPnl(1000, 800, 500);
    expect(p.profitEur).toBe(-300);
    expect(p.marginPct).toBe(-30);
  });
});
