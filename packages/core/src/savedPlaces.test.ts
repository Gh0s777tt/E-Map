import { describe, expect, it } from "vitest";
import { routeDelta, SAVED_PLACE_CATEGORY_LABELS } from "./savedPlaces";

describe("routeDelta", () => {
  it("trasa dłuższa/droższa po dodaniu przystanku", () => {
    const d = routeDelta(
      { distanceKm: 1000, durationMin: 600, tollEur: 200 },
      { distanceKm: 1045, durationMin: 638, tollEur: 212 },
    );
    expect(d).toMatchObject({ distanceKm: 45, durationMin: 38, tollEur: 12, longer: true });
    expect(d.negligible).toBe(false);
  });

  it("trasa krótsza/tańsza", () => {
    const d = routeDelta(
      { distanceKm: 1000, durationMin: 600, tollEur: 200 },
      { distanceKm: 950, durationMin: 560, tollEur: 188 },
    );
    expect(d.distanceKm).toBe(-50);
    expect(d.durationMin).toBe(-40);
    expect(d.tollEur).toBe(-12);
    expect(d.longer).toBe(false);
  });

  it("brak realnej różnicy → negligible", () => {
    const d = routeDelta(
      { distanceKm: 1000, durationMin: 600, tollEur: 200 },
      { distanceKm: 1000.05, durationMin: 600, tollEur: 200 },
    );
    expect(d.negligible).toBe(true);
  });

  it("zaokrągla dystans i myto do 2 miejsc, czas do minuty", () => {
    const d = routeDelta(
      { distanceKm: 0, durationMin: 0, tollEur: 0 },
      { distanceKm: 12.345, durationMin: 7.6, tollEur: 3.456 },
    );
    expect(d.distanceKm).toBe(12.35);
    expect(d.durationMin).toBe(8);
    expect(d.tollEur).toBe(3.46);
  });
});

describe("SAVED_PLACE_CATEGORY_LABELS", () => {
  it("ma etykiety dla wszystkich kategorii", () => {
    expect(SAVED_PLACE_CATEGORY_LABELS.customs).toBe("Odprawa celna");
    expect(SAVED_PLACE_CATEGORY_LABELS.fuel_station).toBe("Stacja paliw");
  });
});
