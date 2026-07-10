import { describe, expect, it } from "vitest";
import { computeTachoDays, formatMinutes, type TachoEntry } from "./tachoTime";

const e = (date: string, time: string, ...modes: string[]): TachoEntry => ({ date, time, modes });

describe("computeTachoDays", () => {
  it("dzień pracy: start→koniec, czas służby policzony", () => {
    const r = computeTachoDays([
      e("2026-07-07", "06:00", "Rozpoczęcie dnia"),
      e("2026-07-07", "18:30", "Zakończenie dnia"),
    ]);
    expect(r.days).toHaveLength(1);
    expect(r.days[0]?.workMinutes).toBe(12.5 * 60);
    expect(r.days[0]?.alerts).toEqual([]);
    expect(r.totalWorkMinutes).toBe(750);
  });

  it("nocna zmiana kończy się po północy — parowanie po czasie, nie dacie", () => {
    const r = computeTachoDays([
      e("2026-07-07", "20:00", "Rozpoczęcie dnia"),
      e("2026-07-08", "06:00", "Zakończenie dnia"),
    ]);
    expect(r.days[0]?.workMinutes).toBe(10 * 60);
  });

  it("odpoczynek dobowy: 11h+ normalny, 9-11h skrócony, <9h naruszenie", () => {
    const r = computeTachoDays([
      e("2026-07-07", "06:00", "Rozpoczęcie dnia"),
      e("2026-07-07", "18:00", "Zakończenie dnia"),
      // 12 h przerwy → normalny
      e("2026-07-08", "06:00", "Rozpoczęcie dnia"),
      e("2026-07-08", "20:00", "Zakończenie dnia"),
      // 10 h przerwy → skrócony
      e("2026-07-09", "06:00", "Rozpoczęcie dnia"),
      e("2026-07-09", "22:00", "Zakończenie dnia"),
      // 7 h przerwy → naruszenie
      e("2026-07-10", "05:00", "Rozpoczęcie dnia"),
      e("2026-07-10", "15:00", "Zakończenie dnia"),
    ]);
    expect(r.days[1]?.restType).toBe("daily-regular");
    expect(r.days[2]?.restType).toBe("daily-reduced");
    expect(r.days[3]?.restType).toBeNull();
    expect(r.days[3]?.alerts.join(" ")).toMatch(/naruszenie/);
  });

  it("odpoczynek tygodniowy: 45h+ normalny, 24-45h skrócony", () => {
    const r = computeTachoDays([
      e("2026-07-04", "06:00", "Rozpoczęcie dnia"),
      e("2026-07-04", "16:00", "Zakończenie dnia"),
      // sobota 16:00 → poniedziałek 14:00 = 46 h
      e("2026-07-06", "14:00", "Rozpoczęcie dnia"),
      e("2026-07-06", "22:00", "Zakończenie dnia"),
      // 22:00 → następnego dnia 23:00 = 25 h
      e("2026-07-07", "23:00", "Rozpoczęcie dnia"),
      e("2026-07-08", "09:00", "Zakończenie dnia"),
    ]);
    expect(r.days[1]?.restType).toBe("weekly-regular");
    expect(r.days[2]?.restType).toBe("weekly-reduced");
  });

  it("służba >13h i >15h daje alerty; dzień bez zakończenia — alert", () => {
    const r = computeTachoDays([
      e("2026-07-07", "05:00", "Rozpoczęcie dnia"),
      e("2026-07-07", "19:00", "Zakończenie dnia"), // 14 h
      e("2026-07-08", "05:00", "Rozpoczęcie dnia"),
      e("2026-07-08", "21:00", "Zakończenie dnia"), // 16 h
      e("2026-07-09", "05:00", "Rozpoczęcie dnia"), // bez końca
    ]);
    expect(r.days[0]?.alerts.join(" ")).toMatch(/> 13 h/);
    expect(r.days[1]?.alerts.join(" ")).toMatch(/> 15 h/);
    expect(r.days[2]?.alerts.join(" ")).toMatch(/niedomknięty/);
  });

  it("ponad 6 dni bez odpoczynku tygodniowego → alert zbiorczy", () => {
    const entries: TachoEntry[] = [];
    for (let i = 1; i <= 8; i++) {
      const d = `2026-07-0${i}`;
      entries.push(e(d, "06:00", "Rozpoczęcie dnia"), e(d, "16:00", "Zakończenie dnia"));
    }
    const r = computeTachoDays(entries);
    expect(r.alerts.join(" ")).toMatch(/6 dni od odpoczynku tygodniowego/);
  });

  it("formatMinutes", () => {
    expect(formatMinutes(750)).toBe("12 h 30 min");
    expect(formatMinutes(600)).toBe("10 h");
  });
});
