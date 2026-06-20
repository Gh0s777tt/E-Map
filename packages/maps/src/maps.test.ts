import { describe, expect, it } from "vitest";
import { createRoutingProvider } from "./factory";
import { haversineKm } from "./geo";
import { buildGraphHopperBody, graphHopperProfile } from "./graphhopper";
import { MockRoutingProvider } from "./mock";
import { type BBox, buildOverpassQuery, parseOverpass } from "./poi";
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

describe("POI (Overpass)", () => {
  const bbox: BBox = { south: 52, west: 13, north: 53, east: 14 };

  it("buduje zapytanie z bbox i klauzulami amenity", () => {
    const q = buildOverpassQuery(bbox, ["parking", "fuel_station"]);
    expect(q).toContain("52,13,53,14");
    expect(q).toContain('["amenity"="parking"]["hgv"="yes"]');
    expect(q).toContain('["amenity"="fuel"]');
    expect(q).toContain("out center");
  });

  it("pomija typy spoza wyboru", () => {
    const q = buildOverpassQuery(bbox, ["fuel_station"]);
    expect(q).not.toContain('"amenity"="parking"');
  });

  it("parsuje node i way(center), pomija elementy bez współrzędnych i nie-POI", () => {
    const pois = parseOverpass({
      elements: [
        { type: "node", id: 1, lat: 52.5, lon: 13.4, tags: { amenity: "fuel", name: "Shell" } },
        {
          type: "way",
          id: 2,
          center: { lat: 52.6, lon: 13.5 },
          tags: { amenity: "parking", hgv: "yes" },
        },
        { type: "node", id: 3, tags: { amenity: "fuel" } }, // brak współrzędnych
        { type: "node", id: 4, lat: 52.7, lon: 13.6, tags: { amenity: "cafe" } }, // nie-POI
      ],
    });
    expect(pois).toHaveLength(2);
    expect(pois[0]).toMatchObject({ type: "fuel_station", name: "Shell", lat: 52.5, lng: 13.4 });
    expect(pois[1]).toMatchObject({ type: "parking", lat: 52.6, lng: 13.5 });
  });
});
