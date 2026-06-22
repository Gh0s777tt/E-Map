import { describe, expect, it } from "vitest";
import { computePerDiem, type DietResult, sumPerDiem } from "./perDiem";

describe("computePerDiem — krajowa", () => {
  it("podróż ≤ doby: <8h → 0", () => {
    const r = computePerDiem({
      destination: "PL",
      mode: "domestic",
      hours: 6,
      dailyRate: 45,
      currency: "PLN",
    });
    expect(r).toMatchObject({ fullDays: 0, fraction: 0, days: 0, amount: 0 });
  });
  it("podróż ≤ doby: 8–12h → 1/2", () => {
    const r = computePerDiem({
      destination: "PL",
      mode: "domestic",
      hours: 10,
      dailyRate: 45,
      currency: "PLN",
    });
    expect(r.fraction).toBe(0.5);
    expect(r.amount).toBe(22.5);
  });
  it("podróż ≤ doby: >12h → 1/1", () => {
    const r = computePerDiem({
      destination: "PL",
      mode: "domestic",
      hours: 20,
      dailyRate: 45,
      currency: "PLN",
    });
    expect(r.days).toBe(1);
    expect(r.amount).toBe(45);
  });
  it("wielodobowa: pełna doba + niepełna ≤8h → 1/2", () => {
    const r = computePerDiem({
      destination: "PL",
      mode: "domestic",
      hours: 30,
      dailyRate: 45,
      currency: "PLN",
    });
    expect(r).toMatchObject({ fullDays: 1, remainderHours: 6, fraction: 0.5, days: 1.5 });
    expect(r.amount).toBe(67.5);
  });
  it("wielodobowa: niepełna >8h → 1/1", () => {
    const r = computePerDiem({
      destination: "PL",
      mode: "domestic",
      hours: 34,
      dailyRate: 45,
      currency: "PLN",
    });
    expect(r).toMatchObject({ fullDays: 1, remainderHours: 10, fraction: 1, days: 2, amount: 90 });
  });
});

describe("computePerDiem — zagraniczna", () => {
  it("≤8h → 1/3", () => {
    const r = computePerDiem({
      destination: "DE",
      mode: "foreign",
      hours: 6,
      dailyRate: 49,
      currency: "EUR",
    });
    expect(r.fraction).toBeCloseTo(1 / 3, 5);
    expect(r.amount).toBe(16.33);
  });
  it("8–12h → 1/2", () => {
    const r = computePerDiem({
      destination: "DE",
      mode: "foreign",
      hours: 10,
      dailyRate: 49,
      currency: "EUR",
    });
    expect(r.fraction).toBe(0.5);
    expect(r.amount).toBe(24.5);
  });
  it(">12h (≤ doby) → 1/1", () => {
    const r = computePerDiem({
      destination: "DE",
      mode: "foreign",
      hours: 18,
      dailyRate: 49,
      currency: "EUR",
    });
    expect(r.days).toBe(1);
    expect(r.amount).toBe(49);
  });
  it("wielodobowa: pełna doba + 1/3", () => {
    const r = computePerDiem({
      destination: "DE",
      mode: "foreign",
      hours: 30,
      dailyRate: 49,
      currency: "EUR",
    });
    expect(r.fullDays).toBe(1);
    expect(r.days).toBeCloseTo(1 + 1 / 3, 5);
    expect(r.amount).toBe(65.33); // round2(1.3333.. * 49)
  });
  it("dokładnie pełna doba → 1/1 (brak ułamka)", () => {
    const r = computePerDiem({
      destination: "DE",
      mode: "foreign",
      hours: 24,
      dailyRate: 49,
      currency: "EUR",
    });
    expect(r).toMatchObject({ fullDays: 1, remainderHours: 0, fraction: 0, days: 1, amount: 49 });
  });
  it("ujemne godziny / stawka → zero", () => {
    const r = computePerDiem({
      destination: "DE",
      mode: "foreign",
      hours: -5,
      dailyRate: 49,
      currency: "EUR",
    });
    expect(r.amount).toBe(0);
  });
});

describe("sumPerDiem", () => {
  it("grupuje wg waluty, malejąco wg kwoty", () => {
    const results: DietResult[] = [
      computePerDiem({
        destination: "PL",
        mode: "domestic",
        hours: 20,
        dailyRate: 45,
        currency: "PLN",
      }),
      computePerDiem({
        destination: "DE",
        mode: "foreign",
        hours: 24,
        dailyRate: 49,
        currency: "EUR",
      }),
      computePerDiem({
        destination: "PL",
        mode: "domestic",
        hours: 30,
        dailyRate: 45,
        currency: "PLN",
      }),
    ];
    const totals = sumPerDiem(results);
    expect(totals[0]).toMatchObject({ currency: "PLN", amount: 112.5, count: 2, days: 2.5 });
    expect(totals[1]).toMatchObject({ currency: "EUR", amount: 49, count: 1, days: 1 });
  });
  it("pusta lista → pusto", () => {
    expect(sumPerDiem([])).toEqual([]);
  });
});
