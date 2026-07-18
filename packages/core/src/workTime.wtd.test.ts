import { describe, expect, it } from "vitest";
import {
  isoWeekKey,
  WTD_LIMITS,
  type WtdWeek,
  weeklyWorkingFromEntries,
  wtdStatus,
} from "./workTime";

describe("isoWeekKey", () => {
  it("2026-01-01 (czwartek) należy do 2026-W01", () => {
    expect(isoWeekKey("2026-01-01")).toBe("2026-W01");
  });
  it("dni tego samego tygodnia pn–nd mają ten sam klucz", () => {
    // 2026-07-13 (pn) … 2026-07-19 (nd)
    expect(isoWeekKey("2026-07-13")).toBe(isoWeekKey("2026-07-19"));
    expect(isoWeekKey("2026-07-13")).toBe(isoWeekKey("2026-07-16"));
  });
  it("niedziela i następny poniedziałek mają różne klucze", () => {
    expect(isoWeekKey("2026-07-19")).not.toBe(isoWeekKey("2026-07-20"));
  });
});

describe("weeklyWorkingFromEntries", () => {
  it("grupuje po tygodniu ISO i sumuje jazdę + inną pracę (bez odpoczynku)", () => {
    const weeks = weeklyWorkingFromEntries([
      { date: "2026-07-13", driving: 8, otherWork: 2, rest: 11 },
      { date: "2026-07-14", driving: 9, otherWork: 1, rest: 11 },
      { date: "2026-07-20", driving: 5, otherWork: 0, rest: 11 },
    ]);
    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toEqual({ week: "2026-W29", workingH: 20 });
    expect(weeks[1]).toEqual({ week: "2026-W30", workingH: 5 });
  });
  it("ujemne wartości traktuje jak 0", () => {
    const weeks = weeklyWorkingFromEntries([
      { date: "2026-07-13", driving: -4, otherWork: 3, rest: 0 },
    ]);
    expect(weeks[0]?.workingH).toBe(3);
  });
});

describe("wtdStatus", () => {
  const mk = (n: number, h: number): WtdWeek[] =>
    Array.from({ length: n }, (_, i) => ({
      week: `2026-W${String(i + 1).padStart(2, "0")}`,
      workingH: h,
    }));

  it("pusta lista → średnia 0, w normie, pełny budżet", () => {
    const s = wtdStatus([]);
    expect(s.avgWeeklyH).toBe(0);
    expect(s.avgOk).toBe(true);
    expect(s.weeksCounted).toBe(0);
    expect(s.budgetToAvgH).toBe(WTD_LIMITS.weeklyAvg * WTD_LIMITS.referenceWeeks);
    expect(s.alerts).toEqual([]);
  });

  it("średnia poniżej 48 → w normie, brak alertów", () => {
    const s = wtdStatus(mk(10, 40));
    expect(s.avgWeeklyH).toBe(40);
    expect(s.avgOk).toBe(true);
    expect(s.maxWeeklyH).toBe(40);
    expect(s.alerts).toEqual([]);
    // 48*17 − 10*40 = 816 − 400 = 416
    expect(s.budgetToAvgH).toBe(416);
  });

  it("średnia powyżej 48 → alert + avgOk=false", () => {
    const s = wtdStatus(mk(4, 52));
    expect(s.avgWeeklyH).toBe(52);
    expect(s.avgOk).toBe(false);
    expect(s.alerts).toContain("wtd-avg-exceeded");
    expect(s.budgetToAvgH).toBe(WTD_LIMITS.weeklyAvg * WTD_LIMITS.referenceWeeks - 208);
  });

  it("tydzień > 60 h → naruszenie na liście weeksOver60", () => {
    const s = wtdStatus([
      { week: "2026-W10", workingH: 45 },
      { week: "2026-W11", workingH: 62 },
    ]);
    expect(s.weeksOver60).toEqual(["2026-W11"]);
    expect(s.alerts).toContain("wtd-week-over-60");
    expect(s.maxWeeklyH).toBe(62);
  });

  it("bierze tylko ostatnie referenceWeeks tygodni", () => {
    const s = wtdStatus(mk(20, 50), { referenceWeeks: 4 });
    expect(s.weeksCounted).toBe(4);
    expect(s.totalWorkingH).toBe(200);
    expect(s.avgWeeklyH).toBe(50);
  });

  it("konfigurowalny okres i limit średniej", () => {
    const s = wtdStatus(mk(26, 48), { referenceWeeks: 26, weeklyAvg: 48 });
    expect(s.avgOk).toBe(true);
    expect(s.budgetToAvgH).toBe(0);
  });
});
