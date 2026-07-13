import { describe, expect, it } from "vitest";
import { DIESEL_CO2_KG_PER_L } from "./co2";
import { estimateRouteFuel, pickEcoRoute } from "./ecoRoute";

describe("estimateRouteFuel", () => {
  it("liczy litry, koszt i CO₂ dla trasy", () => {
    const e = estimateRouteFuel({ distanceKm: 500, avgConsumptionL100: 30, fuelPricePerL: 6.5 });
    expect(e.fuelLiters).toBe(150); // 500 * 30/100
    expect(e.fuelCost).toBe(975); // 150 * 6.5
    expect(e.tollCost).toBe(0);
    expect(e.totalCost).toBe(975);
    expect(e.co2Kg).toBe(Math.round(150 * DIESEL_CO2_KG_PER_L * 100) / 100);
  });

  it("dolicza myto do kosztu całkowitego", () => {
    const e = estimateRouteFuel({
      distanceKm: 100,
      avgConsumptionL100: 30,
      fuelPricePerL: 6,
      tollCost: 40,
    });
    expect(e.fuelCost).toBe(180);
    expect(e.totalCost).toBe(220);
  });

  it("domyślne spalanie 30 przy braku danych", () => {
    const e = estimateRouteFuel({ distanceKm: 100, fuelPricePerL: 6 });
    expect(e.fuelLiters).toBe(30);
  });
});

describe("pickEcoRoute", () => {
  it("wybiera najtańszy wariant i liczy oszczędność vs najszybszy", () => {
    const pick = pickEcoRoute(
      [
        { label: "najszybsza", distanceKm: 520, durationMin: 360, tollCost: 120 },
        { label: "bez autostrad", distanceKm: 500, durationMin: 420, tollCost: 0 },
      ],
      { avgConsumptionL100: 30, fuelPricePerL: 6.5 },
    );
    // szybka: 520*0.3*6.5 + 120 = 1014+120 = 1134; wolna: 500*0.3*6.5 = 975
    expect(pick?.label).toBe("bez autostrad");
    expect(pick?.estimate.totalCost).toBe(975);
    expect(pick?.savingsVsFastest).toBe(159);
    expect(pick?.extraMinutes).toBe(60); // 420 - 360
  });

  it("gdy najszybszy = najtańszy, oszczędność 0", () => {
    const pick = pickEcoRoute(
      [
        { label: "A", distanceKm: 300, durationMin: 240, tollCost: 0 },
        { label: "B", distanceKm: 400, durationMin: 300, tollCost: 50 },
      ],
      { fuelPricePerL: 6 },
    );
    expect(pick?.label).toBe("A");
    expect(pick?.savingsVsFastest).toBe(0);
    expect(pick?.extraMinutes).toBe(0);
  });

  it("pusta lista → null", () => {
    expect(pickEcoRoute([], { fuelPricePerL: 6 })).toBeNull();
  });
});
