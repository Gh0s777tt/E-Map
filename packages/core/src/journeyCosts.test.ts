import { describe, expect, it } from "vitest";
import { attachOperatingCosts, type JourneyOperatingCost, summarizeJourneys } from "./journeyCosts";
import type { Journey } from "./journeys";

const j = (over: Partial<Journey> = {}): Journey => ({
  vehicleId: "v1",
  driverId: null,
  index: 1,
  startAt: "2026-07-01T06:00:00Z",
  endAt: "2026-07-05T18:00:00Z",
  startKm: 100_000,
  endKm: 103_000,
  distanceKm: 3000,
  durationDays: 4,
  loads: 1,
  unloads: 1,
  totalLoadKg: 20_000,
  fuelings: 2,
  fuelLiters: 360,
  fuelCost: 500,
  adblueLiters: 20,
  adblueCost: 30,
  serviceCost: 0,
  otherCost: 0,
  avgConsumptionLPer100km: 12,
  cost: 530,
  revenue: 1000,
  profit: 470,
  marginPercent: 47,
  open: false,
  ...over,
});

const c = (over: Partial<JourneyOperatingCost> = {}): JourneyOperatingCost => ({
  vehicleId: "v1",
  occurredAt: "2026-07-03T12:00:00Z",
  kind: "route",
  eur: 100,
  ...over,
});

describe("attachOperatingCosts", () => {
  it("przypisuje koszt do wyjazdu, w którego okno wpada", () => {
    const r = attachOperatingCosts([j()], [c()]);
    expect(r.byJourney.get("v1-1")?.eur).toBe(100);
    expect(r.unassignedCount).toBe(0);
  });

  it("sumuje i rozbija na rodzaje", () => {
    const r = attachOperatingCosts(
      [j()],
      [c(), c({ kind: "pause", eur: 25 }), c({ kind: "route", eur: 50 })],
    );
    const x = r.byJourney.get("v1-1");
    expect(x?.eur).toBe(175);
    expect(x?.count).toBe(3);
    // Malejąco po kwocie: myto 150 przed parkingiem 25.
    expect(x?.byKind).toEqual([
      { kind: "route", eur: 150 },
      { kind: "pause", eur: 25 },
    ]);
  });

  it("koszt innego pojazdu nie trafia do tego wyjazdu", () => {
    const r = attachOperatingCosts([j()], [c({ vehicleId: "v2" })]);
    expect(r.byJourney.size).toBe(0);
    expect(r.unassignedEur).toBe(100);
  });

  it("koszt poza oknem NIE jest doklejany do najbliższego wyjazdu", () => {
    // Doklejenie „na oko" wyglądałoby jak precyzja, a byłoby zgadywaniem.
    const r = attachOperatingCosts([j()], [c({ occurredAt: "2026-07-20T12:00:00Z" })]);
    expect(r.byJourney.size).toBe(0);
    expect(r.unassignedCount).toBe(1);
    expect(r.unassignedEur).toBe(100);
  });

  it("wyjazd otwarty łapie wszystko od swojego startu", () => {
    const open = j({ endAt: null, open: true });
    const r = attachOperatingCosts([open], [c({ occurredAt: "2026-09-01T00:00:00Z" })]);
    expect(r.byJourney.get("v1-1")?.eur).toBe(100);
  });

  it("koszt bez pojazdu idzie do nieprzypisanych", () => {
    const r = attachOperatingCosts([j()], [c({ vehicleId: null })]);
    expect(r.unassignedCount).toBe(1);
    expect(r.byJourney.size).toBe(0);
  });

  it("rozdziela między dwa wyjazdy tego samego auta", () => {
    const first = j({ index: 1, startAt: "2026-07-01T00:00:00Z", endAt: "2026-07-05T00:00:00Z" });
    const second = j({ index: 2, startAt: "2026-07-10T00:00:00Z", endAt: "2026-07-15T00:00:00Z" });
    const r = attachOperatingCosts(
      [first, second],
      [
        c({ occurredAt: "2026-07-02T00:00:00Z" }),
        c({ occurredAt: "2026-07-12T00:00:00Z", eur: 40 }),
      ],
    );
    expect(r.byJourney.get("v1-1")?.eur).toBe(100);
    expect(r.byJourney.get("v1-2")?.eur).toBe(40);
  });
});

describe("summarizeJourneys", () => {
  it("pusta lista nie wymyśla liczb", () => {
    const d = summarizeJourneys([]);
    expect(d.count).toBe(0);
    expect(d.avgConsumption).toBeNull();
    expect(d.revenueEur).toBeNull();
    expect(d.worst).toBeNull();
  });

  it("sumuje dystans i koszt, liczy zysk i marżę", () => {
    const d = summarizeJourneys([j(), j({ index: 2 })]);
    expect(d.count).toBe(2);
    expect(d.distanceKm).toBe(6000);
    expect(d.costEur).toBe(1060);
    expect(d.revenueEur).toBe(2000);
    expect(d.profitEur).toBe(940);
    expect(d.marginPercent).toBe(47);
  });

  it("spalanie ważone dystansem, nie średnia ze średnich", () => {
    // 3000 km po 12 L i 300 km po 30 L → (12*3000 + 30*300) / 3300 = 13,64,
    // a nie (12+30)/2 = 21, czyli liczba, której nie przejechał żaden wyjazd.
    const d = summarizeJourneys([
      j(),
      j({ index: 2, distanceKm: 300, avgConsumptionLPer100km: 30 }),
    ]);
    expect(d.avgConsumption).toBe(13.64);
  });

  it("brak przychodu w całości → zysk pusty, a nie strata równa kosztom", () => {
    const d = summarizeJourneys([j({ revenue: null, profit: null, marginPercent: null })]);
    expect(d.revenueEur).toBeNull();
    expect(d.profitEur).toBeNull();
    expect(d.marginPercent).toBeNull();
  });

  it("wskazuje NAJGORSZY wyjazd wg marży — to on wymaga uwagi", () => {
    const d = summarizeJourneys([
      j({ index: 1, marginPercent: 40 }),
      j({ index: 2, marginPercent: -12 }),
      j({ index: 3, marginPercent: 55 }),
    ]);
    expect(d.worst).toEqual({ vehicleId: "v1", index: 2, marginPercent: -12 });
  });

  it("liczy wyjazdy otwarte", () => {
    const d = summarizeJourneys([j(), j({ index: 2, open: true, endAt: null })]);
    expect(d.open).toBe(1);
  });
});
