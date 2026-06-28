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

// Granice dób — dokładne progi 8h/12h. Flip `<`/`<=` po cichu psuje wypłaty,
// a istniejące testy (6/10/18/20h) nie trafiają w same granice.
describe("computePerDiem — granice progów (regresja off-by-one)", () => {
  const d = (mode: "domestic" | "foreign", hours: number, dailyRate: number) =>
    computePerDiem({ destination: "X", mode, hours, dailyRate, currency: "EUR" });

  it("krajowa dokładnie 8h → 1/2 (8h NIE jest <8)", () => {
    expect(d("domestic", 8, 45)).toMatchObject({ fraction: 0.5, days: 0.5, amount: 22.5 });
  });
  it("krajowa tuż poniżej 8h (7.99h) → 0", () => {
    expect(d("domestic", 7.99, 45)).toMatchObject({ fraction: 0, days: 0, amount: 0 });
  });
  it("krajowa dokładnie 12h → 1/2 (12h NIE jest >12)", () => {
    expect(d("domestic", 12, 45)).toMatchObject({ fraction: 0.5, amount: 22.5 });
  });
  it("krajowa tuż powyżej 12h (12.01h) → 1/1", () => {
    expect(d("domestic", 12.01, 45)).toMatchObject({ fraction: 1, days: 1, amount: 45 });
  });

  it("zagraniczna dokładnie 8h → 1/3 (8h jest ≤8)", () => {
    const r = d("foreign", 8, 49);
    expect(r.fraction).toBeCloseTo(1 / 3, 5);
    expect(r.amount).toBe(16.33);
  });
  it("zagraniczna tuż powyżej 8h (8.01h) → 1/2", () => {
    expect(d("foreign", 8.01, 49)).toMatchObject({ fraction: 0.5, amount: 24.5 });
  });
  it("zagraniczna dokładnie 12h → 1/2 (12h NIE jest >12)", () => {
    expect(d("foreign", 12, 49)).toMatchObject({ fraction: 0.5, amount: 24.5 });
  });
  it("zagraniczna tuż powyżej 12h (12.01h) → 1/1", () => {
    expect(d("foreign", 12.01, 49)).toMatchObject({ fraction: 1, days: 1, amount: 49 });
  });

  it("krajowa wielodobowa: reszta dokładnie 8h (32h) → pełna + 1/2", () => {
    expect(d("domestic", 32, 45)).toMatchObject({
      fullDays: 1,
      remainderHours: 8,
      fraction: 0.5,
      days: 1.5,
      amount: 67.5,
    });
  });
  it("krajowa wielodobowa: reszta tuż powyżej 8h (32.5h) → pełna + 1/1", () => {
    expect(d("domestic", 32.5, 45)).toMatchObject({ fullDays: 1, fraction: 1, days: 2, amount: 90 });
  });
});
