import { describe, expect, it } from "vitest";
import { computeDriverGamification, type GamificationInput } from "./gamification";

const ZERO: GamificationInput = {
  deliveries: 0,
  onTimePct: null,
  checklists: 0,
  km: 0,
  avgConsumption: null,
  tenureMonths: 0,
  defectsReported: 0,
  activeStreakDays: 0,
};

describe("computeDriverGamification", () => {
  it("nowy kierowca: rookie, brak zdobytych odznak, wszystkie w toku", () => {
    const r = computeDriverGamification(ZERO);
    expect(r.rankKey).toBe("rookie");
    expect(r.level).toBe(1);
    expect(r.earnedCount).toBe(0);
    expect(r.points).toBe(0);
    // wszystkie odznaki widoczne jako progres do brązu
    expect(r.badges.length).toBe(8);
    expect(r.badges.every((b) => b.progress >= 0 && b.progress <= 1)).toBe(true);
  });

  it("złota odznaka dostaw przy 200+ dostawach", () => {
    const r = computeDriverGamification({ ...ZERO, deliveries: 250 });
    const del = r.badges.find((b) => b.key === "deliveries");
    expect(del?.tier).toBe("gold");
    expect(del?.progress).toBe(1);
    expect(del?.nextThreshold).toBeNull();
    // 400 (złoto) + 250*5 = 1650 pkt
    expect(r.points).toBe(400 + 250 * 5);
  });

  it("punktualność liczona z onTimePct", () => {
    const r = computeDriverGamification({ ...ZERO, onTimePct: 0.95 });
    const p = r.badges.find((b) => b.key === "punctual");
    expect(p?.tier).toBe("silver"); // 95% ≥ 90, < 98
    expect(p?.value).toBe(95);
  });

  it("eco: niższe spalanie daje odznakę", () => {
    const good = computeDriverGamification({ ...ZERO, avgConsumption: 26 }); // 32-26=6 → srebro
    const eco = good.badges.find((b) => b.key === "eco");
    expect(eco?.tier).toBe("silver");
    const bad = computeDriverGamification({ ...ZERO, avgConsumption: 34 }); // 0 → w toku
    expect(bad.badges.find((b) => b.key === "eco")?.nextThreshold).toBe(2);
  });

  it("progresja poziomów rośnie z punktami", () => {
    const r = computeDriverGamification({
      deliveries: 220,
      onTimePct: 0.99,
      checklists: 130,
      km: 120000,
      avgConsumption: 24,
      tenureMonths: 40,
      defectsReported: 25,
      activeStreakDays: 40,
    });
    // dużo złotych odznak + baza → wysoki rank
    expect(r.points).toBeGreaterThan(3000);
    expect(["master", "legend"]).toContain(r.rankKey);
    expect(r.earnedCount).toBe(8);
    expect(r.levelCeil).toBeGreaterThan(r.levelFloor);
  });

  it("punkty bazowe z km i dostaw bez odznak", () => {
    const r = computeDriverGamification({ ...ZERO, deliveries: 3, km: 250 });
    // brak odznak (3<10, 250<5000), baza: 3*5 + floor(250/100)=2 → 17
    expect(r.earnedCount).toBe(0);
    expect(r.points).toBe(17);
  });
});
