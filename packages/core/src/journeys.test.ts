import { describe, expect, it } from "vitest";
import { buildJourneys, type JourneyFuelEntry, type JourneyTripEvent } from "./journeys";

const T = (
  action: string,
  createdAt: string,
  opts: { odometerKm?: number; weightKg?: number; amount?: number; vehicleId?: string } = {},
): JourneyTripEvent => ({
  action,
  createdAt,
  driverId: "d1",
  vehicleId: opts.vehicleId ?? "v1",
  odometerKm: opts.odometerKm ?? null,
  weightKg: opts.weightKg ?? null,
  amount: opts.amount ?? null,
});

const F = (
  createdAt: string,
  odometerKm: number,
  liters: number,
  priceTotal: number,
): JourneyFuelEntry => ({
  vehicleId: "v1",
  createdAt,
  odometerKm,
  liters,
  priceTotal,
  isFull: true,
});

describe("buildJourneys", () => {
  it("prosty wyjazd start→load→unload→end: dystans, ładunki, waga, paliwo", () => {
    const trips = [
      T("start", "2026-06-01T08:00:00Z", { odometerKm: 1000 }),
      T("load", "2026-06-02T10:00:00Z", { weightKg: 500 }),
      T("unload", "2026-06-05T12:00:00Z", { weightKg: 500 }),
      T("end", "2026-06-06T18:00:00Z", { odometerKm: 1800 }),
    ];
    const [j] = buildJourneys({
      trips,
      fuel: [F("2026-06-03T09:00:00Z", 1400, 300, 450)],
      adblue: [],
    });
    expect(j?.distanceKm).toBe(800);
    expect(j?.loads).toBe(1);
    expect(j?.unloads).toBe(1);
    expect(j?.totalLoadKg).toBe(500);
    expect(j?.fuelings).toBe(1);
    expect(j?.fuelLiters).toBe(300);
    expect(j?.fuelCost).toBe(450);
    expect(j?.avgConsumptionLPer100km).toBe(37.5); // 300/800*100
    expect(j?.open).toBe(false);
    expect(j?.durationDays).toBe(5);
  });

  it("tankowania poza oknem wyjazdu są pomijane", () => {
    const trips = [
      T("start", "2026-06-01T00:00:00Z", { odometerKm: 1000 }),
      T("end", "2026-06-10T00:00:00Z", { odometerKm: 2000 }),
    ];
    const fuel = [
      F("2026-06-05T00:00:00Z", 1500, 200, 300),
      F("2026-06-20T00:00:00Z", 2500, 100, 150),
    ];
    const [j] = buildJourneys({ trips, fuel, adblue: [] });
    expect(j?.fuelings).toBe(1);
    expect(j?.fuelLiters).toBe(200);
  });

  it("wyjazd bez zakończenia jest otwarty (open, distance=null)", () => {
    const trips = [
      T("start", "2026-06-01T00:00:00Z", { odometerKm: 1000 }),
      T("load", "2026-06-02T00:00:00Z", { weightKg: 100 }),
    ];
    const [j] = buildJourneys({ trips, fuel: [], adblue: [] });
    expect(j?.open).toBe(true);
    expect(j?.endAt).toBeNull();
    expect(j?.distanceKm).toBeNull();
    expect(j?.loads).toBe(1);
  });

  it("dwa wyjazdy tego samego pojazdu: index 1/2, sort od najnowszego", () => {
    const trips = [
      T("start", "2026-05-01T08:00:00Z", { odometerKm: 1000 }),
      T("end", "2026-05-05T08:00:00Z", { odometerKm: 1500 }),
      T("start", "2026-06-01T08:00:00Z", { odometerKm: 1500 }),
      T("end", "2026-06-05T08:00:00Z", { odometerKm: 2200 }),
    ];
    const js = buildJourneys({ trips, fuel: [], adblue: [] });
    expect(js.length).toBe(2);
    expect(js[0]?.startAt).toBe("2026-06-01T08:00:00Z");
    expect(js[0]?.index).toBe(2);
    expect(js[0]?.distanceKm).toBe(700);
    expect(js[1]?.index).toBe(1);
  });

  it("start bez end, potem nowy start → pierwszy zostaje otwarty", () => {
    const trips = [
      T("start", "2026-06-01T00:00:00Z", { odometerKm: 1000 }),
      T("load", "2026-06-02T00:00:00Z", { weightKg: 100 }),
      T("start", "2026-06-10T00:00:00Z", { odometerKm: 1500 }),
      T("end", "2026-06-15T00:00:00Z", { odometerKm: 2000 }),
    ];
    const js = buildJourneys({ trips, fuel: [], adblue: [] });
    expect(js.length).toBe(2);
    expect(js.find((j) => j.open)?.loads).toBe(1);
    expect(js.find((j) => !j.open)?.distanceKm).toBe(500);
  });

  it("przychód i zysk ze stawki €/km", () => {
    const trips = [
      T("start", "2026-06-01T00:00:00Z", { odometerKm: 1000 }),
      T("end", "2026-06-10T00:00:00Z", { odometerKm: 2000 }),
    ];
    const [j] = buildJourneys({
      trips,
      fuel: [F("2026-06-05T00:00:00Z", 1500, 200, 300)],
      adblue: [],
      ratePerKmByVehicle: { v1: 1.2 },
    });
    expect(j?.distanceKm).toBe(1000);
    expect(j?.revenue).toBe(1200);
    expect(j?.cost).toBe(300);
    expect(j?.profit).toBe(900);
    expect(j?.marginPercent).toBe(75);
  });

  it("zdarzenia przed pierwszym startem są pomijane", () => {
    const trips = [
      T("load", "2026-06-01T00:00:00Z", { weightKg: 100 }),
      T("start", "2026-06-02T00:00:00Z", { odometerKm: 1000 }),
      T("unload", "2026-06-03T00:00:00Z", { weightKg: 100 }),
      T("end", "2026-06-05T00:00:00Z", { odometerKm: 1200 }),
    ];
    const js = buildJourneys({ trips, fuel: [], adblue: [] });
    expect(js.length).toBe(1);
    expect(js[0]?.loads).toBe(0);
    expect(js[0]?.unloads).toBe(1);
  });
});
