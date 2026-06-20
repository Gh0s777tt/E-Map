import { describe, expect, it } from "vitest";
import { createRoutingProvider } from "./factory";
import { haversineKm } from "./geo";
import { buildGraphHopperBody, graphHopperProfile } from "./graphhopper";
import { MockRoutingProvider } from "./mock";
import type { LatLng } from "./types";

const BERLIN: LatLng = { lat: 52.52, lng: 13.405 };
const WARSAW: LatLng = { lat: 52.2297, lng: 21.0122 };

describe("haversineKm", () => {
  it("liczy realistyczny dystans Berlin–Warszawa (~520 km)", () => {
    const d = haversineKm(BERLIN, WARSAW);
    expect(d).toBeGreaterThan(500);
    expect(d).toBeLessThan(540);
  });

  it("dystans do samego siebie = 0", () => {
    expect(haversineKm(BERLIN, BERLIN)).toBe(0);
  });
});

describe("MockRoutingProvider", () => {
  const provider = new MockRoutingProvider();

  it("wyznacza trasę z dystansem, mytem i geometrią", async () => {
    const r = await provider.route({ waypoints: [BERLIN, WARSAW] });
    expect(r.distanceKm).toBeGreaterThan(500);
    expect(r.tollCost).toBeGreaterThan(0);
    expect(r.durationMin).toBeGreaterThan(0);
    expect(r.segments).toHaveLength(1);
    expect(r.geometry).toHaveLength(2);
    expect(r.provider).toBe("mock");
  });

  it("omijanie myta zeruje koszt", async () => {
    const r = await provider.route({ waypoints: [BERLIN, WARSAW], options: { avoidTolls: true } });
    expect(r.tollCost).toBe(0);
  });

  it("cięższy pojazd ma wyższe myto", async () => {
    const light = await provider.route({ waypoints: [BERLIN, WARSAW] });
    const heavy = await provider.route({
      waypoints: [BERLIN, WARSAW],
      profile: { kind: "truck", weightKg: 24000 },
    });
    expect(heavy.tollCost).toBeGreaterThan(light.tollCost);
  });

  it("rzuca przy mniej niż 2 punktach", async () => {
    await expect(provider.route({ waypoints: [BERLIN] })).rejects.toThrow(RangeError);
  });
});

describe("GraphHopper builder", () => {
  it("mapuje typ pojazdu na profil", () => {
    expect(graphHopperProfile("truck")).toBe("truck");
    expect(graphHopperProfile("van")).toBe("small_truck");
    expect(graphHopperProfile(undefined)).toBe("car");
  });

  it("buduje punkty w kolejności [lng, lat]", () => {
    const body = buildGraphHopperBody({ waypoints: [BERLIN, WARSAW] }) as {
      points: [number, number][];
      profile: string;
    };
    expect(body.points[0]).toEqual([13.405, 52.52]);
    expect(body.profile).toBe("car");
  });
});

describe("createRoutingProvider", () => {
  it("domyślnie zwraca mock", () => {
    expect(createRoutingProvider().name).toBe("mock");
  });

  it("wymaga klucza dla graphhopper", () => {
    expect(() => createRoutingProvider({ provider: "graphhopper" })).toThrow();
  });
});
