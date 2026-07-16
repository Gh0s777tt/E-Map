import { describe, expect, it } from "vitest";
import {
  aggregateConsumptionLPer100km,
  buildSettlement,
  consumptionFullToFull,
  consumptionLPer100km,
  detectFuelAnomalies,
  effectiveFuelPrice,
  fuelConsumptionSeries,
  fuelCost,
  latestUnitPrice,
  monthlyFleetSummary,
  monthlyFleetTrend,
  monthsEndingAt,
  summarizeFuel,
  tripProfit,
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
  it("liczy zysk i marżę", () => {
    const p = tripProfit(600, 167);
    expect(p.profit).toBe(433);
    expect(p.marginPercent).toBe(72.17);
  });

  it("marża = null gdy przychód = 0", () => {
    expect(tripProfit(0, 50).marginPercent).toBeNull();
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

describe("monthlyFleetSummary", () => {
  const base = {
    month: "2026-06",
    orders: [
      // przychód EUR, dostarczone — wliczone do v1
      { vehicleId: "v1", price: 2000, currency: "EUR", status: "delivered", date: "2026-06-10" },
      // zafakturowane EUR — wliczone do v1
      { vehicleId: "v1", price: 1000, currency: "EUR", status: "invoiced", date: "2026-06-20" },
      // nowy status — pominięte
      { vehicleId: "v1", price: 500, currency: "EUR", status: "new", date: "2026-06-05" },
      // inna waluta — pominięte z sumy EUR
      { vehicleId: "v2", price: 3000, currency: "PLN", status: "delivered", date: "2026-06-12" },
      // inny miesiąc — pominięte
      { vehicleId: "v1", price: 999, currency: "EUR", status: "delivered", date: "2026-05-30" },
    ],
    fuel: [
      { vehicleId: "v1", priceTotal: 600, date: "2026-06-03" },
      { vehicleId: "v1", priceTotal: 400, date: "2026-06-18" },
      { vehicleId: "v2", priceTotal: 250, date: "2026-06-09" },
      { vehicleId: "v1", priceTotal: 100, date: "2026-07-01" }, // inny miesiąc
    ],
    adblue: [{ vehicleId: "v1", priceTotal: 80, date: "2026-06-15" }],
  };

  it("liczy przychód EUR i koszty per pojazd z atrybucją miesięczną", () => {
    const s = monthlyFleetSummary(base);
    const v1 = s.rows.find((r) => r.vehicleId === "v1");
    expect(v1).toEqual({
      vehicleId: "v1",
      revenueEur: 3000,
      fuelCost: 1000,
      adblueCost: 80,
      net: 1920,
    });
    // v2: brak przychodu EUR (PLN pominięte), koszt paliwa 250 → net -250
    const v2 = s.rows.find((r) => r.vehicleId === "v2");
    expect(v2?.net).toBe(-250);
  });

  it("sumuje totals i sortuje malejąco po net", () => {
    const s = monthlyFleetSummary(base);
    expect(s.totals).toEqual({ revenueEur: 3000, fuelCost: 1250, adblueCost: 80, net: 1670 });
    expect(s.rows[0]?.vehicleId).toBe("v1"); // najwyższy net pierwszy
  });

  it("pozycje bez pojazdu trafiają do wiersza null", () => {
    const s = monthlyFleetSummary({
      month: "2026-06",
      orders: [
        { vehicleId: null, price: 500, currency: "EUR", status: "delivered", date: "2026-06-01" },
      ],
      fuel: [],
      adblue: [],
    });
    expect(s.rows.find((r) => r.vehicleId === null)?.revenueEur).toBe(500);
  });
});

describe("monthsEndingAt", () => {
  it("zwraca N miesięcy kończąc na anchor (z przeniesieniem roku)", () => {
    expect(monthsEndingAt("2026-02", 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });

  it("pojedynczy miesiąc", () => {
    expect(monthsEndingAt("2026-06", 1)).toEqual(["2026-06"]);
  });

  it("odporne na zły format / count", () => {
    expect(monthsEndingAt("xxxx", 3)).toEqual([]);
    expect(monthsEndingAt("2026-13", 3)).toEqual([]);
    expect(monthsEndingAt("2026-06", 0)).toEqual([]);
  });
});

describe("monthlyFleetTrend", () => {
  it("liczy totals per miesiąc w zadanej kolejności", () => {
    const t = monthlyFleetTrend({
      months: ["2026-05", "2026-06"],
      orders: [
        { vehicleId: "v1", price: 1000, currency: "EUR", status: "delivered", date: "2026-05-10" },
        { vehicleId: "v1", price: 2000, currency: "EUR", status: "invoiced", date: "2026-06-10" },
      ],
      fuel: [{ vehicleId: "v1", priceTotal: 300, date: "2026-06-05" }],
      adblue: [],
    });
    expect(t).toHaveLength(2);
    expect(t[0]).toMatchObject({ month: "2026-05", revenueEur: 1000, net: 1000 });
    expect(t[1]).toMatchObject({ month: "2026-06", revenueEur: 2000, fuelCost: 300, net: 1700 });
  });
});

describe("latestUnitPrice", () => {
  it("zwraca cenę jednostkową najnowszego wpisu z kwotą", () => {
    expect(
      latestUnitPrice([
        { liters: 0, priceTotal: null },
        { liters: 100, priceTotal: 165 },
        { liters: 50, priceTotal: 90 },
      ]),
    ).toBe(1.65);
  });
  it("zwraca null bez danych", () => {
    expect(latestUnitPrice([{ liters: 0, priceTotal: 0 }])).toBeNull();
  });
});

describe("buildSettlement", () => {
  it("liczy dystans, koszty, przychód i zysk", () => {
    const s = buildSettlement({
      fuel: [
        { odometerKm: 1000, liters: 0, isFull: true, priceTotal: 0 },
        { odometerKm: 1500, liters: 400, isFull: true, priceTotal: 600 },
      ],
      adblue: [{ liters: 20, priceTotal: 30 }],
      trips: [
        { action: "service", amount: 100 },
        { action: "other", amount: 50 },
        { action: "load", amount: null },
      ],
      ratePerKm: 2,
      tollCost: 120,
    });
    expect(s.distanceKm).toBe(500);
    expect(s.fuelLiters).toBe(400);
    expect(s.fuelCost).toBe(600);
    expect(s.adblueCost).toBe(30);
    expect(s.serviceCost).toBe(100);
    expect(s.otherCost).toBe(50);
    expect(s.tollCost).toBe(120);
    expect(s.totalCost).toBe(900); // 600+30+100+50+120
    expect(s.revenue).toBe(1000); // 500 * 2
    expect(s.profit).toBe(100); // 1000-900
    expect(s.avgConsumptionLPer100km).toBe(80); // 400L / 500km
  });

  it("brak stawki → przychód i zysk 0/ujemny", () => {
    const s = buildSettlement({
      fuel: [{ odometerKm: 0, liters: 10, priceTotal: 15 }],
      adblue: [],
      trips: [],
    });
    expect(s.revenue).toBe(0);
    expect(s.totalCost).toBe(15);
    expect(s.profit).toBe(-15);
  });
});
