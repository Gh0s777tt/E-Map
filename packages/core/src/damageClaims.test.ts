import { describe, expect, it } from "vitest";
import { type DamageClaimEntry, summarizeDamageClaims } from "./damageClaims";

const data: DamageClaimEntry[] = [
  { status: "reported", cost: 1200, currency: "PLN" },
  { status: "in_progress", cost: 800, currency: "PLN" },
  { status: "repaired", cost: 500, currency: "EUR" },
  { status: "closed", cost: null, currency: "PLN" },
  { status: "rejected", cost: 0, currency: "PLN" },
];

describe("summarizeDamageClaims", () => {
  it("liczy total, otwarte i koszt per waluta", () => {
    const s = summarizeDamageClaims(data);
    expect(s.total).toBe(5);
    expect(s.open).toBe(2); // reported + in_progress
    expect(s.costByCurrency).toEqual([
      { currency: "PLN", amount: 2000 },
      { currency: "EUR", amount: 500 },
    ]);
  });

  it("pomija koszty null/zero", () => {
    const s = summarizeDamageClaims([
      { status: "closed", cost: null, currency: "PLN" },
      { status: "rejected", cost: 0, currency: "EUR" },
    ]);
    expect(s.costByCurrency).toEqual([]);
    expect(s.open).toBe(0);
  });

  it("pusto → zera", () => {
    expect(summarizeDamageClaims([])).toEqual({ total: 0, open: 0, costByCurrency: [] });
  });
});
