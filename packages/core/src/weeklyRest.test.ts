import { describe, expect, it } from "vitest";
import { parseTachoTimes, planWeeklyRest } from "./weeklyRest";

const H = 3_600_000;
const END = Date.parse("2026-07-06T06:00:00Z"); // pn 06:00 — koniec odpoczynku tyg.

describe("planWeeklyRest", () => {
  it("start najpóźniej po 144 h; liczy godziny od teraz", () => {
    const plan = planWeeklyRest({ lastWeeklyRestEndMs: END, lastType: "regular" }, END + 100 * H);
    expect(plan.latestStartMs).toBe(END + 144 * H);
    expect(plan.hoursUntilLatestStart).toBe(44);
    expect(plan.mustBeRegular).toBe(false);
  });

  it("wariant 45 h i 24 h + rekompensata 21 h do końca 3. tygodnia", () => {
    const plan = planWeeklyRest({ lastWeeklyRestEndMs: END, lastType: "regular" }, END);
    expect(plan.regularEndMs).toBe(END + (144 + 45) * H);
    expect(plan.reducedEndMs).toBe(END + (144 + 24) * H);
    expect(plan.compensationH).toBe(21);
    expect(plan.compensationDeadlineMs).toBe(END + 3 * 7 * 24 * H);
  });

  it("po skróconym następny musi być regularny — brak wariantu 24 h", () => {
    const plan = planWeeklyRest({ lastWeeklyRestEndMs: END, lastType: "reduced" }, END);
    expect(plan.mustBeRegular).toBe(true);
    expect(plan.reducedEndMs).toBeNull();
    expect(plan.compensationH).toBeNull();
  });

  it("po terminie: ujemne godziny do startu", () => {
    const plan = planWeeklyRest({ lastWeeklyRestEndMs: END, lastType: "regular" }, END + 150 * H);
    expect(plan.hoursUntilLatestStart).toBe(-6);
  });
});

describe("parseTachoTimes", () => {
  it("wyłuskuje wartości XXhYY z tekstu OCR", () => {
    expect(parseTachoTimes("VDO o 01h25\nh 00h30")).toEqual([85, 30]);
    expect(parseTachoTimes("1o03h05 II00h15 2o01h12")).toEqual([185, 15, 72]);
  });
  it("ignoruje śmieci, deduplikuje, wymaga 2 cyfr minut", () => {
    expect(parseTachoTimes("46h08 46h08 129h1 xyz 9h")).toEqual([46 * 60 + 8]);
  });
});
