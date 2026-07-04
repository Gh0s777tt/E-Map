import { describe, expect, it } from "vitest";
import {
  computeDriverSettlement,
  DEFAULT_SETTLEMENT_SETTINGS,
  type DriverSettlementInput,
} from "./driverSettlement";

/** Wartości z wzorcowego arkusza właściciela (Jan Kowalski, 28 dni). */
const BASE: DriverSettlementInput = {
  days: 28,
  weeks: [
    { days: 3, km: 2110 },
    { days: 7, km: 4350 },
    { days: 7, km: 4980 },
    { days: 7, km: 5220 },
    { days: 4, km: 2780 },
  ],
  settings: DEFAULT_SETTLEMENT_SETTINGS,
  normBonus: 109.73,
};

describe("computeDriverSettlement", () => {
  it("odtwarza wzorcowy arkusz co do grosza", () => {
    const r = computeDriverSettlement(BASE);
    expect(r.base).toBe(7000);
    expect(r.docBonus).toBe(1400);
    expect(r.weekBonuses).toEqual([199.58, 207.68, 491.18, 599.18, 251.1]);
    expect(r.insurance).toBe(2100);
    expect(r.bonusTotal).toBe(5358.45);
    expect(r.phone).toBe(186.67);
    expect(r.total).toBe(12545.12);
    expect(r.balance).toBe(12545.12);
    expect(r.kmTotal).toBe(19440);
  });

  it("tydzień poniżej normy km → premia 0 (nie ujemna)", () => {
    const r = computeDriverSettlement({
      ...BASE,
      weeks: [{ days: 7, km: 1000 }],
    });
    expect(r.weekBonuses).toEqual([0]);
  });

  it("własne stawki firmy zmieniają wszystkie składniki", () => {
    const r = computeDriverSettlement({
      days: 30,
      weeks: [{ days: 30, km: 15000 }],
      settings: {
        dailyRate: 300,
        kmNormPerDay: 400,
        kmRate: 0.5,
        insurancePerDay: 50,
        phoneMonthly: 300,
        docBonusMonthly: 900,
      },
    });
    expect(r.base).toBe(9000);
    expect(r.docBonus).toBe(900);
    expect(r.weekBonuses).toEqual([1500]); // (15000 − 12000) × 0,5
    expect(r.insurance).toBe(1500);
    expect(r.phone).toBe(300);
  });

  it("korekta premii dokumentacyjnej, hotele i potrącenia wpływają na BALANS", () => {
    const r = computeDriverSettlement({
      ...BASE,
      docBonusOverride: 0,
      hotels: 350,
      deductions: 1000,
    });
    expect(r.docBonus).toBe(0);
    expect(r.hotels).toBe(350);
    expect(r.balance).toBe(r.total - 1000);
  });
});
