import { describe, expect, it } from "vitest";
import type { AetrInput } from "./aetr";
import { inspectAetr } from "./inspector";

const base: AetrInput = {
  continuousDrivingMin: 0,
  breakTakenMin: 0,
  dailyDrivingMin: 0,
  weeklyDrivingMin: 0,
  prevWeekDrivingMin: 0,
  extendedDrivesUsed: 0,
  reducedRestsUsed: 0,
};
const mk = (p: Partial<AetrInput>): AetrInput => ({ ...base, ...p });

describe("inspectAetr — czysto", () => {
  it("pod limitami → brak naruszeń", () => {
    const r = inspectAetr(
      mk({ continuousDrivingMin: 200, dailyDrivingMin: 400, weeklyDrivingMin: 2000 }),
    );
    expect(r.clean).toBe(true);
    expect(r.infringements).toEqual([]);
    expect(r.worst).toBeNull();
  });
  it("ujemne wejścia → 0, brak naruszeń", () => {
    const r = inspectAetr(mk({ continuousDrivingMin: -100 }));
    expect(r.clean).toBe(true);
  });
});

describe("inspectAetr — jazda ciągła (4h30)", () => {
  it("4h45 → drobne", () => {
    expect(inspectAetr(mk({ continuousDrivingMin: 285 })).infringements[0]?.severity).toBe("minor");
  });
  it("5h30 → poważne", () => {
    expect(inspectAetr(mk({ continuousDrivingMin: 330 })).infringements[0]?.severity).toBe(
      "serious",
    );
  });
  it("6h30 → bardzo poważne (+ byMin)", () => {
    const i = inspectAetr(mk({ continuousDrivingMin: 390 })).infringements[0];
    expect(i?.severity).toBe("very_serious");
    expect(i?.byMin).toBe(120);
    expect(i?.limitMin).toBe(270);
  });
});

describe("inspectAetr — jazda dobowa (limit zależny od kredytu wydłużenia)", () => {
  it("11h bez wykorzystanych wydłużeń → limit 10h, poważne", () => {
    const i = inspectAetr(mk({ dailyDrivingMin: 660, extendedDrivesUsed: 0 })).infringements[0];
    expect(i?.limitMin).toBe(600);
    expect(i?.severity).toBe("serious");
  });
  it("9h30 przy 2 zużytych wydłużeniach → limit 9h, drobne", () => {
    const i = inspectAetr(mk({ dailyDrivingMin: 570, extendedDrivesUsed: 2 })).infringements[0];
    expect(i?.limitMin).toBe(540);
    expect(i?.severity).toBe("minor");
  });
  it("12h przy 2 zużytych → bardzo poważne", () => {
    expect(
      inspectAetr(mk({ dailyDrivingMin: 720, extendedDrivesUsed: 2 })).infringements[0]?.severity,
    ).toBe("very_serious");
  });
  it("10h przy dostępnym kredycie → brak naruszenia (dozwolone wydłużenie)", () => {
    expect(inspectAetr(mk({ dailyDrivingMin: 600, extendedDrivesUsed: 1 })).clean).toBe(true);
  });
});

describe("inspectAetr — tygodniowa (56h) i dwutygodniowa (90h)", () => {
  it("58h → drobne", () => {
    expect(inspectAetr(mk({ weeklyDrivingMin: 3480 })).infringements[0]?.severity).toBe("minor");
  });
  it("72h → bardzo poważne", () => {
    expect(inspectAetr(mk({ weeklyDrivingMin: 4320 })).infringements[0]?.severity).toBe(
      "very_serious",
    );
  });
  it("dwutygodniowa 105h (bez naruszenia tygodniowej) → poważne", () => {
    const r = inspectAetr(mk({ weeklyDrivingMin: 3300, prevWeekDrivingMin: 3000 }));
    const twoWeek = r.infringements.find((i) => i.kind === "two-week-driving");
    expect(r.infringements.some((i) => i.kind === "weekly-driving")).toBe(false);
    expect(twoWeek?.severity).toBe("serious");
  });
});

describe("inspectAetr — wiele naruszeń + worst/counts", () => {
  it("jazda ciągła b.poważna + tygodniowa drobna", () => {
    const r = inspectAetr(mk({ continuousDrivingMin: 390, weeklyDrivingMin: 3480 }));
    expect(r.clean).toBe(false);
    expect(r.counts.very_serious).toBe(1);
    expect(r.counts.minor).toBe(1);
    expect(r.worst).toBe("very_serious");
  });
});
