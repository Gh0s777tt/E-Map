import { describe, expect, it } from "vitest";
import { summarizeWorkTime, type WorkTimeEntry } from "./workTime";

const data: WorkTimeEntry[] = [
  { date: "2026-06-02", driving: 9, otherWork: 2, rest: 11 },
  { date: "2026-06-01", driving: 11, otherWork: 1, rest: 9 },
  { date: "2026-06-03", driving: 4, otherWork: 3, rest: 12 },
];

describe("summarizeWorkTime", () => {
  it("sortuje wg daty i liczy pracę łączną + flagę przekroczenia", () => {
    const { rows } = summarizeWorkTime(data);
    expect(rows.map((r) => r.date)).toEqual(["2026-06-01", "2026-06-02", "2026-06-03"]);
    expect(rows[0]).toMatchObject({ workTotal: 12, overDriving: true }); // 11h jazdy > 10
    expect(rows[1]).toMatchObject({ workTotal: 11, overDriving: false }); // 9h
  });

  it("podsumowuje sumy, średnią i liczbę dni z przekroczeniem", () => {
    const { summary } = summarizeWorkTime(data);
    expect(summary).toMatchObject({
      days: 3,
      driving: 24,
      otherWork: 6,
      rest: 32,
      workTotal: 30,
      overDrivingDays: 1,
    });
    expect(summary.avgDrivingPerDay).toBe(8); // 24/3
  });

  it("konfigurowalny limit jazdy", () => {
    const { summary } = summarizeWorkTime(data, { dailyDrivingLimit: 8 });
    expect(summary.overDrivingDays).toBe(2); // 9 i 11 > 8
  });

  it("ujemne wartości traktowane jak zero", () => {
    const { rows } = summarizeWorkTime([{ date: "x", driving: -3, otherWork: -1, rest: -2 }]);
    expect(rows[0]).toMatchObject({ driving: 0, otherWork: 0, rest: 0, workTotal: 0 });
  });

  it("pusto → zero/avg null", () => {
    const { summary } = summarizeWorkTime([]);
    expect(summary).toMatchObject({
      days: 0,
      driving: 0,
      avgDrivingPerDay: null,
      overDrivingDays: 0,
    });
  });

  // Granica limitu: dokładnie na limicie NIE jest przekroczeniem (`>` strict).
  // Flip na `>=` po cichu fałszywie flagowałby zgodne z prawem dni.
  it("jazda dokładnie na limicie (10h) → brak przekroczenia", () => {
    const { rows, summary } = summarizeWorkTime([
      { date: "2026-06-01", driving: 10, otherWork: 0, rest: 0 },
    ]);
    expect(rows[0]?.overDriving).toBe(false);
    expect(summary.overDrivingDays).toBe(0);
  });
  it("jazda tuż powyżej limitu (10.01h) → przekroczenie", () => {
    const { rows } = summarizeWorkTime([
      { date: "2026-06-01", driving: 10.01, otherWork: 0, rest: 0 },
    ]);
    expect(rows[0]?.overDriving).toBe(true);
  });
  it("granica przy własnym limicie: 8h przy limicie 8 → brak; 8.01 → przekroczenie", () => {
    const r = summarizeWorkTime(
      [
        { date: "2026-06-01", driving: 8, otherWork: 0, rest: 0 },
        { date: "2026-06-02", driving: 8.01, otherWork: 0, rest: 0 },
      ],
      { dailyDrivingLimit: 8 },
    );
    expect(r.summary.overDrivingDays).toBe(1);
  });
});
