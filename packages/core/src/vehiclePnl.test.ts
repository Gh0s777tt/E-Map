import { describe, expect, it } from "vitest";
import { vehiclePnl } from "./vehiclePnl";

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
