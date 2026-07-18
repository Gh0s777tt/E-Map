import { describe, expect, it } from "vitest";
import { restCompensationLedger, type WeeklyRestEvent } from "./weeklyRest";

const H = 3_600_000;
const WEEK = 7 * 24 * H;
const T0 = 1_700_000_000_000; // stały punkt odniesienia

describe("restCompensationLedger", () => {
  it("brak zdarzeń → pusty rejestr", () => {
    const l = restCompensationLedger([], T0);
    expect(l.debts).toEqual([]);
    expect(l.outstandingH).toBe(0);
    expect(l.overdueCount).toBe(0);
    expect(l.nextDeadlineMs).toBeNull();
  });

  it("skrócony 24 h → dług 21 h z terminem 3 tyg. po skróceniu", () => {
    const l = restCompensationLedger([{ endMs: T0, durationH: 24 }], T0 + H);
    expect(l.debts).toHaveLength(1);
    expect(l.debts[0]?.owedH).toBe(21);
    expect(l.debts[0]?.deadlineMs).toBe(T0 + 3 * WEEK);
    expect(l.debts[0]?.settled).toBe(false);
    expect(l.outstandingH).toBe(21);
    expect(l.nextDeadlineMs).toBe(T0 + 3 * WEEK);
  });

  it("regularny 45 h → brak długu", () => {
    const l = restCompensationLedger([{ endMs: T0, durationH: 45 }], T0 + H);
    expect(l.debts).toEqual([]);
    expect(l.outstandingH).toBe(0);
  });

  it("skrócony, potem 66 h w terminie → spłacony en bloc", () => {
    const ev: WeeklyRestEvent[] = [
      { endMs: T0, durationH: 24 }, // dług 21
      { endMs: T0 + WEEK, durationH: 66 }, // nadwyżka 21 → spłata
    ];
    const l = restCompensationLedger(ev, T0 + 2 * WEEK);
    expect(l.debts[0]?.settled).toBe(true);
    expect(l.debts[0]?.settledByEndMs).toBe(T0 + WEEK);
    expect(l.outstandingH).toBe(0);
    expect(l.nextDeadlineMs).toBeNull();
  });

  it("spłata PO terminie → nie liczy się, dług przeterminowany", () => {
    const ev: WeeklyRestEvent[] = [
      { endMs: T0, durationH: 24 }, // deadline T0+3W
      { endMs: T0 + 4 * WEEK, durationH: 66 }, // za późno
    ];
    const l = restCompensationLedger(ev, T0 + 5 * WEEK);
    expect(l.debts[0]?.settled).toBe(false);
    expect(l.debts[0]?.overdue).toBe(true);
    expect(l.overdueCount).toBe(1);
    expect(l.outstandingH).toBe(21);
  });

  it("nadwyżka za mała (45 h, surplus 0) → nie spłaca", () => {
    const ev: WeeklyRestEvent[] = [
      { endMs: T0, durationH: 30 }, // dług 15
      { endMs: T0 + WEEK, durationH: 45 }, // surplus 0
    ];
    const l = restCompensationLedger(ev, T0 + 2 * WEEK);
    expect(l.debts[0]?.settled).toBe(false);
    expect(l.outstandingH).toBe(15);
  });

  it("dwa skrócone, jedna nadwyżka → spłaca najstarszy, drugi zostaje", () => {
    const ev: WeeklyRestEvent[] = [
      { endMs: T0, durationH: 24 }, // dług 21 (najstarszy)
      { endMs: T0 + WEEK, durationH: 24 }, // dług 21
      { endMs: T0 + 2 * WEEK, durationH: 66 }, // nadwyżka 21
    ];
    const l = restCompensationLedger(ev, T0 + 2 * WEEK + H);
    expect(l.debts[0]?.settled).toBe(true);
    expect(l.debts[1]?.settled).toBe(false);
    expect(l.outstandingH).toBe(21);
    expect(l.nextDeadlineMs).toBe(T0 + WEEK + 3 * WEEK);
  });

  it("kolejność wejścia dowolna — sortuje po czasie", () => {
    const ev: WeeklyRestEvent[] = [
      { endMs: T0 + 2 * WEEK, durationH: 66 },
      { endMs: T0, durationH: 24 },
    ];
    const l = restCompensationLedger(ev, T0 + 3 * WEEK);
    expect(l.debts.find((d) => d.fromEndMs === T0)?.settled).toBe(true);
  });
});
