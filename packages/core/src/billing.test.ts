import { describe, expect, it } from "vitest";
import {
  aggregateConsumptionLPer100km,
  computeTripSettlement,
  consumptionFullToFull,
  consumptionLPer100km,
  detectFuelAnomalies,
  effectiveFuelPrice,
  fuelConsumptionSeries,
  fuelCost,
  summarizeFuel,
  tripCost,
  tripDistanceKm,
  tripProfit,
  tripRevenue,
} from "./billing";

describe("anomalie spalania", () => {
  it("zwraca [] gdy za mało odcinków", () => {
    const seg = fuelConsumptionSeries([
      { odometerKm: 1000, liters: 50 },
      { odometerKm: 1500, liters: 150 },
    ]);
    expect(detectFuelAnomalies(seg)).toEqual([]);
  });

  it("flaguje odcinek znacząco powyżej mediany", () => {
    // 3 odcinki ~30 L/100km + 1 odcinek 60 (kradzież) → anomalia
    const seg = fuelConsumptionSeries([
      { odometerKm: 0, liters: 0 },
      { odometerKm: 1000, liters: 300 }, // 30
      { odometerKm: 2000, liters: 300 }, // 30
      { odometerKm: 3000, liters: 600 }, // 60 ← anomalia
      { odometerKm: 4000, liters: 300 }, // 30
    ]);
    const anomalies = detectFuelAnomalies(seg);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]?.lPer100km).toBe(60);
    expect(anomalies[0]?.deltaPct).toBeGreaterThanOrEqual(20);
  });

  it("nie flaguje równego spalania", () => {
    const seg = fuelConsumptionSeries([
      { odometerKm: 0, liters: 0 },
      { odometerKm: 1000, liters: 300 },
      { odometerKm: 2000, liters: 305 },
      { odometerKm: 3000, liters: 298 },
      { odometerKm: 4000, liters: 302 },
    ]);
    expect(detectFuelAnomalies(seg)).toEqual([]);
  });
});

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

describe("summarizeFuel", () => {
  it("liczy litry, dystans, średnie spalanie i wydatek", () => {
    const s = summarizeFuel([
      { odometerKm: 1000, liters: 50, priceTotal: 75 },
      { odometerKm: 1500, liters: 175, priceTotal: 260 },
      { odometerKm: 2000, liters: 160, priceTotal: 240 },
    ]);
    expect(s.count).toBe(3);
    expect(s.totalLiters).toBe(385);
    expect(s.totalDistanceKm).toBe(1000);
    expect(s.avgConsumptionLPer100km).toBe(33.5);
    expect(s.totalSpend).toBe(575);
  });

  it("obsługuje pusty zestaw", () => {
    const s = summarizeFuel([]);
    expect(s).toMatchObject({ count: 0, totalLiters: 0, totalDistanceKm: 0, totalSpend: 0 });
    expect(s.avgConsumptionLPer100km).toBeNull();
  });
});

describe("consumptionFullToFull", () => {
  it("liczy spalanie tylko między pełnymi bakami (z tankowaniem częściowym)", () => {
    // pełny @1000, częściowe @1300 (50L), pełny @1500 → dystans 500 km, litry 50+? po pierwszym pełnym
    const r = consumptionFullToFull([
      { odometerKm: 1000, liters: 80, isFull: true },
      { odometerKm: 1300, liters: 50, isFull: false },
      { odometerKm: 1500, liters: 30, isFull: true },
    ]);
    // litry po pierwszym pełnym = 50 + 30 = 80; dystans = 500 km → 16 L/100km
    expect(r).toBe(16);
  });

  it("zwraca null gdy mniej niż 2 pełne baki", () => {
    expect(
      consumptionFullToFull([
        { odometerKm: 1000, liters: 80, isFull: true },
        { odometerKm: 1300, liters: 50, isFull: false },
      ]),
    ).toBeNull();
  });
});
