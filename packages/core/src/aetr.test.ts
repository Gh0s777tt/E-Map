import { describe, expect, it } from "vitest";
import { aetrStatus, formatTachoMin } from "./aetr";

const ZERO = {
  continuousDrivingMin: 0,
  breakTakenMin: 0,
  dailyDrivingMin: 0,
  weeklyDrivingMin: 0,
  prevWeekDrivingMin: 0,
  extendedDrivesUsed: 0,
  reducedRestsUsed: 0,
};

describe("aetrStatus", () => {
  it("świeży start: pełne limity", () => {
    const s = aetrStatus(ZERO);
    expect(s.toBreakMin).toBe(270);
    expect(s.requiredBreakMin).toBe(45);
    expect(s.dailyRemainingMin).toBe(540);
    expect(s.dailyRemainingExtendedMin).toBe(600);
    expect(s.extendedLeft).toBe(2);
    expect(s.weeklyRemainingMin).toBe(3360);
    expect(s.twoWeekRemainingMin).toBe(5400);
    expect(s.reducedRestsLeft).toBe(3);
    expect(s.alerts).toEqual([]);
  });

  it("po 3h05 jazdy ciągłej zostaje 1h25 do przerwy (jak na zdjęciu z trasy)", () => {
    const s = aetrStatus({ ...ZERO, continuousDrivingMin: 185 });
    expect(formatTachoMin(s.toBreakMin)).toBe("1h25");
  });

  it("po przerwie 15 min wymagana już tylko 30", () => {
    const s = aetrStatus({ ...ZERO, breakTakenMin: 15 });
    expect(s.requiredBreakMin).toBe(30);
  });

  it("przekroczenie 4h30 → alert i 0 do przerwy", () => {
    const s = aetrStatus({ ...ZERO, continuousDrivingMin: 280 });
    expect(s.toBreakMin).toBe(0);
    expect(s.alerts).toContain("continuous-driving-exceeded");
  });

  it("dzienny: po 8h zostaje 1h (9h) lub 2h przy kredycie 10h", () => {
    const s = aetrStatus({ ...ZERO, dailyDrivingMin: 480 });
    expect(s.dailyRemainingMin).toBe(60);
    expect(s.dailyRemainingExtendedMin).toBe(120);
  });

  it("wykorzystane 2×10h → brak wydłużenia i alert po 9h", () => {
    const s = aetrStatus({ ...ZERO, dailyDrivingMin: 550, extendedDrivesUsed: 2 });
    expect(s.dailyRemainingExtendedMin).toBeNull();
    expect(s.extendedLeft).toBe(0);
    expect(s.alerts).toContain("daily-driving-exceeded");
  });

  it("tygodniowy ogranicza też dwutygodniowy: 50h w zeszłym → w tym max 40h", () => {
    const s = aetrStatus({ ...ZERO, prevWeekDrivingMin: 50 * 60 });
    expect(s.weeklyRemainingMin).toBe(40 * 60);
    expect(s.twoWeekRemainingMin).toBe(40 * 60);
  });

  it("skrócone odpoczynki: 2 użyte → 1 pozostały", () => {
    const s = aetrStatus({ ...ZERO, reducedRestsUsed: 2 });
    expect(s.reducedRestsLeft).toBe(1);
  });

  it("formatTachoMin formatuje jak wyświetlacz", () => {
    expect(formatTachoMin(425)).toBe("7h05");
    expect(formatTachoMin(0)).toBe("0h00");
  });
});
