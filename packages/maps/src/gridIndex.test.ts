import { describe, expect, it } from "vitest";
import { haversineKm } from "./geo";
import { anyWithinKm, buildGridIndex } from "./gridIndex";
import type { LatLng } from "./types";

/** Deterministyczna „trasa" Berlin → okolice Hanoweru (co ~0,02°). */
function route(): LatLng[] {
  const pts: LatLng[] = [];
  for (let i = 0; i <= 200; i++) pts.push({ lat: 52.52 - i * 0.005, lng: 13.4 - i * 0.02 });
  return pts;
}

describe("gridIndex", () => {
  it("punkt tuż przy trasie → true, daleko → false", () => {
    const idx = buildGridIndex(route(), 6);
    expect(anyWithinKm(idx, { lat: 52.5, lng: 13.32 }, 6)).toBe(true); // ~5 km od punktu trasy
    expect(anyWithinKm(idx, { lat: 50.0, lng: 20.0 }, 6)).toBe(false); // setki km
  });

  it("wynik identyczny z naiwnym O(n·m) dla siatki punktów testowych", () => {
    const pts = route();
    const idx = buildGridIndex(pts, 6);
    for (let lat = 51.3; lat <= 52.7; lat += 0.11) {
      for (let lng = 9.0; lng <= 13.9; lng += 0.23) {
        const p = { lat, lng };
        const naive = pts.some((q) => haversineKm(p, q) <= 6);
        expect(anyWithinKm(idx, p, 6)).toBe(naive);
      }
    }
  });

  it("wysokie szerokości: poszerzone sąsiedztwo łapie sąsiadów mimo wąskich komórek", () => {
    const north: LatLng[] = [{ lat: 69.65, lng: 18.95 }]; // Tromsø
    const idx = buildGridIndex(north, 6);
    // ~5,5 km na wschód (na tej szerokości to aż ~0,14°)
    expect(anyWithinKm(idx, { lat: 69.65, lng: 19.09 }, 6)).toBe(true);
  });

  it("pusty indeks → zawsze false", () => {
    const idx = buildGridIndex([], 6);
    expect(anyWithinKm(idx, { lat: 52, lng: 13 }, 6)).toBe(false);
  });
});
