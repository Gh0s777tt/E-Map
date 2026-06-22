import { describe, expect, it } from "vitest";
import { fleetAlerts } from "./alerts";

describe("fleetAlerts", () => {
  it("ujemna marża → alert krytyczny", () => {
    const a = fleetAlerts({ clients: [{ client: "A", marginPct: -12, revenueEur: 1000 }] });
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ severity: "critical", kind: "negativeMargin", label: "A" });
  });

  it("niska (ale dodatnia) marża poniżej progu → ostrzeżenie", () => {
    const a = fleetAlerts({
      clients: [{ client: "B", marginPct: 3, revenueEur: 1000 }],
      lowMarginThresholdPct: 5,
    });
    expect(a[0]).toMatchObject({ severity: "warn", kind: "lowMargin", value: 3 });
  });

  it("marża powyżej progu → brak alertu", () => {
    const a = fleetAlerts({ clients: [{ client: "C", marginPct: 20, revenueEur: 1000 }] });
    expect(a).toHaveLength(0);
  });

  it("klient bez przychodu lub bez marży pomijany", () => {
    const a = fleetAlerts({
      clients: [
        { client: "Z", marginPct: -50, revenueEur: 0 },
        { client: "N", marginPct: null, revenueEur: 1000 },
      ],
    });
    expect(a).toHaveLength(0);
  });

  it("anomalie spalania → ostrzeżenie z liczbą", () => {
    const a = fleetAlerts({ anomalyVehicles: [{ registration: "WX 123", anomalies: 4 }] });
    expect(a[0]).toMatchObject({ kind: "fuelAnomaly", label: "WX 123", value: 4 });
  });

  it("skok kosztu paliwa m/m powyżej progu → ostrzeżenie", () => {
    const a = fleetAlerts({
      fuelCostByMonth: [
        { month: "2026-04", cost: 1000 },
        { month: "2026-05", cost: 1400 },
      ],
      fuelSpikePct: 30,
    });
    expect(a[0]).toMatchObject({ kind: "fuelSpike", value: 40 });
  });

  it("umiarkowany wzrost kosztu poniżej progu → brak", () => {
    const a = fleetAlerts({
      fuelCostByMonth: [
        { month: "2026-04", cost: 1000 },
        { month: "2026-05", cost: 1100 },
      ],
    });
    expect(a).toHaveLength(0);
  });

  it("krytyczne przed ostrzeżeniami w sortowaniu", () => {
    const a = fleetAlerts({
      clients: [
        { client: "Low", marginPct: 2, revenueEur: 500 },
        { client: "Neg", marginPct: -5, revenueEur: 500 },
      ],
      anomalyVehicles: [{ registration: "WX 1", anomalies: 1 }],
    });
    expect(a[0]?.severity).toBe("critical");
    expect(a.filter((x) => x.severity === "warn")).toHaveLength(2);
  });

  it("brak danych → pusta lista", () => {
    expect(fleetAlerts({})).toEqual([]);
  });
});
