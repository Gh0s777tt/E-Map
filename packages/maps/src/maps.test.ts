import { describe, expect, it } from "vitest";
import { createRoutingProvider } from "./factory";
import { haversineKm } from "./geo";
import { buildGraphHopperBody, graphHopperProfile } from "./graphhopper";
import { buildHereUrl, decodeFlexiblePolyline } from "./here";
import { MockRoutingProvider } from "./mock";
import { routeMultiLeg } from "./multileg";
import { type BBox, buildOverpassQuery, parseOverpass } from "./poi";
import { estimateTollEur, estimateTruckDurationMin } from "./toll";
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

  it("buduje punkty w kolejności [lng, lat], domyślnie profil car (free tier)", () => {
    const body = buildGraphHopperBody({
      waypoints: [BERLIN, WARSAW],
      profile: { kind: "truck" },
    }) as { points: [number, number][]; profile: string };
    expect(body.points[0]).toEqual([13.405, 52.52]);
    expect(body.profile).toBe("car");
  });

  it("włącza profil truck gdy truckProfile=true", () => {
    const body = buildGraphHopperBody(
      { waypoints: [BERLIN, WARSAW], profile: { kind: "truck" } },
      { truckProfile: true },
    ) as { profile: string };
    expect(body.profile).toBe("truck");
  });
});

describe("routeMultiLeg", () => {
  const WIEN: LatLng = { lat: 48.2082, lng: 16.3738 };
  const provider = new MockRoutingProvider();

  it("liczy trasę przez przystanek jako sumę odcinków", async () => {
    const r = await routeMultiLeg(provider, { waypoints: [BERLIN, WIEN, WARSAW] });
    expect(r.segments).toHaveLength(2);
    expect(r.geometry).toHaveLength(3);
    const sum = (r.segments[0]?.distanceKm ?? 0) + (r.segments[1]?.distanceKm ?? 0);
    expect(sum).toBeGreaterThan(0);
    expect(r.distanceKm).toBeCloseTo(sum, 1);
    expect(r.tollCost).toBeGreaterThan(0);
  });

  it("rzuca przy mniej niż 2 punktach", async () => {
    await expect(routeMultiLeg(provider, { waypoints: [BERLIN] })).rejects.toThrow(RangeError);
  });
});

describe("estimateTollEur", () => {
  it("liczy myto proporcjonalnie do dystansu i masy (udział płatnych odcinków 0.6)", () => {
    expect(estimateTollEur(100)).toBe(10.8); // 100 * 0.18 * 0.6
    expect(estimateTollEur(100, { weightKg: 24000 })).toBe(16.2); // * 1.5
  });

  it("zeruje myto przy omijaniu płatnych dróg", () => {
    expect(estimateTollEur(100, { avoidTolls: true })).toBe(0);
  });
});

describe("estimateTruckDurationMin", () => {
  it("czas jazdy z dystansu wg średniej TIR (68 km/h)", () => {
    expect(estimateTruckDurationMin(680)).toBe(600); // 680/68*60 = 10 h
    expect(estimateTruckDurationMin(0)).toBe(0);
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

describe("HERE adapter", () => {
  it("dekoduje flexible polyline (wektor referencyjny HERE)", () => {
    const pts = decodeFlexiblePolyline("BFoz5xJ67i1B1B7PzIhaxL7Y");
    expect(pts.length).toBe(4);
    expect(pts[0]?.lat).toBeCloseTo(50.10228, 4);
    expect(pts[0]?.lng).toBeCloseTo(8.69821, 4);
  });

  it("buduje URL TIR z wymiarami i omijaniem", () => {
    const url = buildHereUrl(
      {
        waypoints: [BERLIN, WARSAW],
        profile: { kind: "truck", weightKg: 40000, heightCm: 400 },
        options: { avoidTolls: true, avoidCountries: ["CH"] },
      },
      "KEY",
    );
    expect(url).toContain("transportMode=truck");
    expect(url).toContain("truck[grossWeight]=40000");
    expect(url).toContain("truck[height]=400");
    expect(url).toContain("avoid[features]=tollRoad");
    expect(url).toContain("exclude[countries]=CHE");
  });

  it("dla vana używa trybu car", () => {
    const url = buildHereUrl({ waypoints: [BERLIN, WARSAW], profile: { kind: "van" } }, "KEY");
    expect(url).toContain("transportMode=car");
  });
});
