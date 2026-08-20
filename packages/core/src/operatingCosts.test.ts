import { describe, expect, it } from "vitest";
import type { FxRate } from "./fx";
import { type OperatingCostEntry, summarizeOperatingCosts } from "./operatingCosts";

const FX: FxRate[] = [
  { asOf: "2026-07-15", currency: "EUR", unitsPerEur: 1 },
  { asOf: "2026-07-15", currency: "PLN", unitsPerEur: 4 },
];

const e = (over: Partial<OperatingCostEntry> = {}): OperatingCostEntry => ({
  kind: "route",
  subKind: "toll",
  amount: 100,
  currency: "EUR",
  occurredAt: "2026-07-15T08:00:00Z",
  vehicleId: "v1",
  ...over,
});

describe("summarizeOperatingCosts", () => {
  it("sumuje i grupuje po rodzaju oraz podrodzaju", () => {
    const s = summarizeOperatingCosts(
      [e(), e({ subKind: "ferry", amount: 50 }), e({ kind: "pause", subKind: null, amount: 20 })],
      FX,
    );
    expect(s.totalEur).toBe(170);
    const route = s.groups.find((g) => g.kind === "route");
    expect(route?.eur).toBe(150);
    expect(route?.bySubKind.map((x) => x.subKind)).toEqual(["toll", "ferry"]);
    expect(s.groups.find((g) => g.kind === "pause")?.eur).toBe(20);
  });

  it("przelicza waluty po kursie z dnia zdarzenia", () => {
    // 400 PLN przy kursie 4 → 100 €.
    const s = summarizeOperatingCosts([e({ amount: 400, currency: "PLN" })], FX);
    expect(s.totalEur).toBe(100);
  });

  it("kara anulowana NIE jest kosztem", () => {
    // W bazie nadal ma kwotę — wliczenie jej to wydatek, którego nie było.
    const s = summarizeOperatingCosts(
      [e({ kind: "penalty", subKind: null, amount: 500, status: "cancelled" })],
      FX,
    );
    expect(s.totalEur).toBe(0);
    expect(s.cancelledCount).toBe(1);
  });

  it("kara kwestionowana liczona OSOBNO, poza sumą", () => {
    // Pieniądze mogą jeszcze wypłynąć, ale nie rozstrzygamy tego za użytkownika.
    const s = summarizeOperatingCosts(
      [e({ kind: "penalty", subKind: null, amount: 300, status: "appealed" })],
      FX,
    );
    expect(s.totalEur).toBe(0);
    expect(s.contestedEur).toBe(300);
    expect(s.contestedCount).toBe(1);
  });

  it("kara otwarta i zapłacona są kosztem", () => {
    const s = summarizeOperatingCosts(
      [
        e({ kind: "penalty", subKind: null, amount: 100, status: "open" }),
        e({ kind: "penalty", subKind: null, amount: 200, status: "paid" }),
      ],
      FX,
    );
    expect(s.totalEur).toBe(300);
    expect(s.contestedEur).toBe(0);
  });

  it("status dotyczy tylko kar — inne rodzaje go ignorują", () => {
    const s = summarizeOperatingCosts([e({ status: "cancelled" })], FX);
    expect(s.totalEur).toBe(100);
    expect(s.cancelledCount).toBe(0);
  });

  it("brak kwoty pomijany, brak kursu policzony osobno", () => {
    const s = summarizeOperatingCosts(
      [e({ amount: null }), e({ amount: 1000, currency: "HUF" }), e()],
      FX,
    );
    expect(s.totalEur).toBe(100);
    expect(s.missingRate).toBe(1);
  });

  it("koszt per pojazd — do rankingu i atrybucji", () => {
    const s = summarizeOperatingCosts(
      [e(), e({ vehicleId: "v2", amount: 30 }), e({ amount: 70 })],
      FX,
    );
    expect(s.byVehicle.get("v1")).toBe(170);
    expect(s.byVehicle.get("v2")).toBe(30);
  });

  it("pozycja bez pojazdu nie wywraca mapy", () => {
    const s = summarizeOperatingCosts([e({ vehicleId: null })], FX);
    expect(s.byVehicle.size).toBe(0);
    expect(s.totalEur).toBe(100);
  });

  it("grupy posortowane malejąco po kwocie", () => {
    const s = summarizeOperatingCosts(
      [
        e({ kind: "pause", subKind: null, amount: 10 }),
        e({ kind: "trip", subKind: "service", amount: 900 }),
        e({ amount: 100 }),
      ],
      FX,
    );
    expect(s.groups.map((g) => g.kind)).toEqual(["trip", "route", "pause"]);
  });
});
