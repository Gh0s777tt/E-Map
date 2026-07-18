import { describe, expect, it } from "vitest";
import { restCompensationLedger, weeklyRestsFromBoundaries } from "./weeklyRest";

const H = 3_600_000;
const T = 1_700_000_000_000; // stały epoch ms (bez Date.now w teście)

describe("weeklyRestsFromBoundaries — parowanie start/koniec", () => {
  it("skrócony 24 h → jeden odpoczynek z długością 24", () => {
    const r = weeklyRestsFromBoundaries([
      { start: true, atMs: T },
      { start: false, atMs: T + 24 * H },
    ]);
    expect(r).toEqual([{ endMs: T + 24 * H, durationH: 24 }]);
  });

  it("dwa odpoczynki (24 h i 45 h)", () => {
    const r = weeklyRestsFromBoundaries([
      { start: true, atMs: T },
      { start: false, atMs: T + 24 * H },
      { start: true, atMs: T + 100 * H },
      { start: false, atMs: T + 145 * H },
    ]);
    expect(r.map((e) => e.durationH)).toEqual([24, 45]);
  });

  it("sortuje wejście nieuporządkowane", () => {
    const r = weeklyRestsFromBoundaries([
      { start: false, atMs: T + 45 * H },
      { start: true, atMs: T },
    ]);
    expect(r).toEqual([{ endMs: T + 45 * H, durationH: 45 }]);
  });

  it("niesparowane pomija: trwający start bez końca / koniec bez startu", () => {
    expect(weeklyRestsFromBoundaries([{ start: true, atMs: T }])).toEqual([]);
    expect(weeklyRestsFromBoundaries([{ start: false, atMs: T }])).toEqual([]);
  });

  it("nowy start przed końcem → liczy najnowszy start", () => {
    const r = weeklyRestsFromBoundaries([
      { start: true, atMs: T },
      { start: true, atMs: T + 10 * H },
      { start: false, atMs: T + 34 * H },
    ]);
    expect(r).toEqual([{ endMs: T + 34 * H, durationH: 24 }]);
  });
});

describe("integracja: boundaries → ledger", () => {
  it("skrócony 24 h daje dług kompensacji 21 h", () => {
    const events = weeklyRestsFromBoundaries([
      { start: true, atMs: T },
      { start: false, atMs: T + 24 * H },
    ]);
    const led = restCompensationLedger(events, T + 25 * H);
    expect(led.outstandingH).toBe(21);
    expect(led.debts).toHaveLength(1);
  });
  it("regularny 45 h → brak długu", () => {
    const events = weeklyRestsFromBoundaries([
      { start: true, atMs: T },
      { start: false, atMs: T + 45 * H },
    ]);
    expect(restCompensationLedger(events, T + 46 * H).outstandingH).toBe(0);
  });
});
