import { describe, expect, it } from "vitest";
import { buildTankerkonigUrl, parseTankerkonig } from "./fuelprice";

describe("buildTankerkonigUrl", () => {
  it("zawiera współrzędne, klucz i ogranicza promień do 25 km", () => {
    const url = buildTankerkonigUrl({ lat: 52.5, lng: 13.4, radiusKm: 99 }, "KEY");
    expect(url).toContain("lat=52.5");
    expect(url).toContain("lng=13.4");
    expect(url).toContain("rad=25");
    expect(url).toContain("apikey=KEY");
  });
});

describe("parseTankerkonig", () => {
  it("normalizuje stacje i odrzuca ceny <= 0", () => {
    const out = parseTankerkonig({
      ok: true,
      stations: [
        {
          id: "a",
          name: "Aral",
          brand: "ARAL",
          lat: 1,
          lng: 2,
          diesel: 1.7,
          e5: 0,
          isOpen: true,
          dist: 0.5,
        },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.diesel).toBe(1.7);
    expect(out[0]?.e5).toBeNull();
    expect(out[0]?.distKm).toBe(0.5);
  });
  it("pusta lista gdy ok=false", () => {
    expect(parseTankerkonig({ ok: false })).toEqual([]);
  });
});
