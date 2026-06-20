import { describe, expect, it } from "vitest";
import {
  aggregateConsumptionLPer100km,
  computeTripSettlement,
  consumptionLPer100km,
  effectiveFuelPrice,
  fuelConsumptionSeries,
  fuelCost,
  tripCost,
  tripDistanceKm,
  tripProfit,
  tripRevenue,
} from "./billing";

describe("spalanie", () => {
  it("liczy L/100km dla odcinka", () => {
    expect(consumptionLPer100km(500, 175)).toBe(35);
  });

  it("rzuca dla dystansu <= 0", () => {
    expect(() => consumptionLPer100km(0, 10)).toThrow(RangeError);
  });

  it("zwraca serię odcinków posortowaną po liczniku", () => {
    const series = fuelConsumptionSeries([
      { odometerKm: 2000, liters: 160 },
      { odometerKm: 1000, liters: 50 },
      { odometerKm: 1500, liters: 175 },
    ]);
    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({ fromKm: 1000, toKm: 1500, lPer100km: 35 });
    expect(series[1]).toMatchObject({ fromKm: 1500, toKm: 2000, lPer100km: 32 });
  });

  it("agreguje spalanie pomijając litry pierwszego wpisu", () => {
    const result = aggregateConsumptionLPer100km([
      { odometerKm: 1000, liters: 50 },
      { odometerKm: 1500, liters: 175 },
      { odometerKm: 2000, liters: 160 },
    ]);
    // dystans 1000 km, litry 175 + 160 = 335 → 33.5
    expect(result).toBe(33.5);
  });

  it("zwraca null przy za małej liczbie danych", () => {
    expect(aggregateConsumptionLPer100km([{ odometerKm: 1000, liters: 50 }])).toBeNull();
  });
});

describe("koszt paliwa", () => {
  it("uwzględnia rabat karty", () => {
    expect(effectiveFuelPrice(1.5, 2)).toBe(1.47);
  });

  it("liczy koszt tankowania po rabacie", () => {
    expect(fuelCost(100, 1.5, 2)).toBe(147);
  });

  it("rzuca dla rabatu spoza zakresu", () => {
    expect(() => effectiveFuelPrice(1.5, 150)).toThrow(RangeError);
  });
});

describe("ekonomia trasy", () => {
  it("liczy dystans i rzuca gdy koniec < start", () => {
    expect(tripDistanceKm(1000, 1500)).toBe(500);
    expect(() => tripDistanceKm(1500, 1000)).toThrow(RangeError);
  });

  it("liczy przychód i koszt", () => {
    expect(tripRevenue(500, 1.2)).toBe(600);
    expect(tripCost({ fuel: 147, adblue: 20 })).toBe(167);
  });

  it("liczy zysk i marżę", () => {
    const p = tripProfit(600, 167);
    expect(p.profit).toBe(433);
    expect(p.marginPercent).toBe(72.17);
  });

  it("marża = null gdy przychód = 0", () => {
    expect(tripProfit(0, 50).marginPercent).toBeNull();
  });

  it("składa pełne rozliczenie trasy", () => {
    const s = computeTripSettlement({
      startKm: 1000,
      endKm: 1500,
      ratePerKm: 1.2,
      costs: { fuel: 147, adblue: 20 },
    });
    expect(s).toMatchObject({ distanceKm: 500, revenue: 600, cost: 167, profit: 433 });
  });
});
