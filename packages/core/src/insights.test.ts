import { describe, expect, it } from "vitest";
import {
  buildFleetInsights,
  consumptionOutliers,
  linearTrend,
  type VehicleConsumption,
} from "./insights";

describe("linearTrend", () => {
  it("rosnący koszt: kierunek up, prognoza w górę", () => {
    const t = linearTrend([
      { month: "2026-04", value: 1000 },
      { month: "2026-05", value: 1200 },
      { month: "2026-06", value: 1400 },
    ]);
    expect(t?.direction).toBe("up");
    expect(t?.changePct).toBe(40);
    expect(t?.slope).toBe(200);
    expect(t?.forecastNext).toBe(1600);
  });

  it("malejący koszt: kierunek down", () => {
    const t = linearTrend([
      { month: "2026-04", value: 1500 },
      { month: "2026-05", value: 1200 },
      { month: "2026-06", value: 900 },
    ]);
    expect(t?.direction).toBe("down");
    expect(t?.forecastNext).toBe(600);
  });

  it("stabilny (<3%) → flat", () => {
    const t = linearTrend([
      { month: "2026-05", value: 1000 },
      { month: "2026-06", value: 1010 },
    ]);
    expect(t?.direction).toBe("flat");
  });

  it("mniej niż 2 punkty → null", () => {
    expect(linearTrend([{ month: "2026-06", value: 1000 }])).toBeNull();
  });

  it("prognoza nie schodzi poniżej zera", () => {
    const t = linearTrend([
      { month: "2026-04", value: 300 },
      { month: "2026-05", value: 150 },
      { month: "2026-06", value: 50 },
    ]);
    expect(t?.forecastNext).toBeGreaterThanOrEqual(0);
  });
});

describe("consumptionOutliers", () => {
  const fleet: VehicleConsumption[] = [
    { registration: "WA1001A", avgConsumption: 28, km: 8000 },
    { registration: "WA1002B", avgConsumption: 30, km: 9000 },
    { registration: "WA1003C", avgConsumption: 29, km: 8500 },
    { registration: "WA1004D", avgConsumption: 38, km: 10000 }, // odstający
  ];

  it("wykrywa pojazd >10% powyżej mediany i liczy dodatkowy koszt", () => {
    const { median, outliers } = consumptionOutliers(fleet, 6.5);
    expect(median).toBe(29.5);
    expect(outliers).toHaveLength(1);
    const o = outliers[0];
    expect(o?.registration).toBe("WA1004D");
    // (38-29.5)/100 * 10000 * 6.5 = 5525
    expect(o?.extraCost).toBe(5525);
    expect(o?.overMedianPct).toBeGreaterThan(10);
  });

  it("pomija pojazdy bez danych spalania i mało liczne floty", () => {
    expect(
      consumptionOutliers([{ registration: "X", avgConsumption: null, km: 100 }], 6).outliers,
    ).toEqual([]);
  });

  it("jednorodna flota → brak odstających", () => {
    const uniform: VehicleConsumption[] = [
      { registration: "A", avgConsumption: 30, km: 5000 },
      { registration: "B", avgConsumption: 30.5, km: 5000 },
      { registration: "C", avgConsumption: 29.5, km: 5000 },
    ];
    expect(consumptionOutliers(uniform, 6).outliers).toHaveLength(0);
  });
});

describe("buildFleetInsights", () => {
  it("łączy trend, odstających i sumę oszczędności", () => {
    const res = buildFleetInsights({
      monthlyFuelCost: [
        { month: "2026-05", value: 20000 },
        { month: "2026-06", value: 24000 },
      ],
      vehicles: [
        { registration: "A", avgConsumption: 28, km: 8000 },
        { registration: "B", avgConsumption: 29, km: 8000 },
        { registration: "C", avgConsumption: 40, km: 12000 },
      ],
      fuelPricePerL: 6.5,
    });
    expect(res.fuelTrend?.direction).toBe("up");
    expect(res.outliers.length).toBeGreaterThan(0);
    expect(res.potentialSavings).toBe(res.outliers.reduce((a, o) => a + o.extraCost, 0));
  });
});
