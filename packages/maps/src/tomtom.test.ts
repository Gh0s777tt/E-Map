import { afterEach, describe, expect, it, vi } from "vitest";
import { geocode } from "./geocode";
import {
  buildTomTomRouteUrl,
  parseTomTomRoute,
  TomTomRoutingProvider,
  tomtomVignetteCodes,
} from "./tomtom";
import {
  TOMTOM_CATEGORY,
  tomtomGeocode,
  tomtomReverseGeocode,
  tomtomSearchAlongRoute,
} from "./tomtomSearch";
import { tomtomTrafficIncidents } from "./tomtomTraffic";
import type { LatLng } from "./types";

const BERLIN: LatLng = { lat: 52.52, lng: 13.405 };
const WARSAW: LatLng = { lat: 52.2297, lng: 21.0122 };

function stubFetch(r: { ok?: boolean; status?: number; json?: unknown }) {
  const fn = vi.fn(async (_url?: string, _init?: RequestInit) => ({
    ok: r.ok ?? true,
    status: r.status ?? 200,
    json: async () => r.json,
  }));
  vi.stubGlobal("fetch", fn);
  return fn;
}
afterEach(() => vi.unstubAllGlobals());

describe("buildTomTomRouteUrl", () => {
  it("truck: wymiary w metrach, tonaż, osie, tryb ciężarowy", () => {
    const url = buildTomTomRouteUrl(
      {
        waypoints: [BERLIN, WARSAW],
        profile: {
          kind: "truck",
          heightCm: 400,
          widthCm: 255,
          lengthCm: 1650,
          weightKg: 40000,
          axleCount: 5,
        },
        options: { avoidTolls: true, avoidFerries: true },
      },
      "KEY",
    );
    expect(url).toContain("/routing/1/calculateRoute/52.52,13.405:52.2297,21.0122/json");
    expect(url).toContain("travelMode=truck");
    expect(url).toContain("vehicleCommercial=true");
    expect(url).toContain("vehicleWeight=40000");
    expect(url).toContain("vehicleHeight=4.00");
    expect(url).toContain("vehicleWidth=2.55");
    expect(url).toContain("vehicleLength=16.50");
    expect(url).toContain("vehicleNumberOfAxles=5");
    expect(url).toContain("avoid=tollRoads");
    expect(url).toContain("avoid=ferries");
    expect(url).toContain("key=KEY");
  });

  it("nie-truck → travelMode=car, bez parametrów pojazdu", () => {
    const url = buildTomTomRouteUrl(
      { waypoints: [BERLIN, WARSAW], profile: { kind: "van" } },
      "KEY",
    );
    expect(url).toContain("travelMode=car");
    expect(url).not.toContain("vehicleWeight");
  });

  it("rzuca przy <2 punktach", () => {
    expect(() => buildTomTomRouteUrl({ waypoints: [BERLIN] }, "KEY")).toThrow();
  });

  // #367: TomTom nie ma wykluczania krajów — mapujemy avoidCountries na avoidVignette.
  it("avoidCountries → avoidVignette dla krajów winietowych (kraje bez winiety pomijane)", () => {
    const url = buildTomTomRouteUrl(
      { waypoints: [BERLIN, WARSAW], options: { avoidCountries: ["ch", "AT", "DE"] } },
      "KEY",
    );
    expect(url).toContain("avoidVignette=CHE,AUT");
  });

  it("avoidCountries bez krajów winietowych → brak avoidVignette", () => {
    const url = buildTomTomRouteUrl(
      { waypoints: [BERLIN, WARSAW], options: { avoidCountries: ["DE", "PL"] } },
      "KEY",
    );
    expect(url).not.toContain("avoidVignette");
  });
});

describe("tomtomVignetteCodes", () => {
  it("normalizuje ISO2 → ISO3, odduplikowuje i pomija nieznane", () => {
    expect(tomtomVignetteCodes([" ch ", "CH", "at", "XX"])).toEqual(["CHE", "AUT"]);
  });

  it("brak listy → pusto", () => {
    expect(tomtomVignetteCodes()).toEqual([]);
    expect(tomtomVignetteCodes([])).toEqual([]);
  });
});

describe("parseTomTomRoute", () => {
  it("liczy km/min z summary i skleja geometrię z legów", () => {
    const r = parseTomTomRoute(
      {
        routes: [
          {
            summary: { lengthInMeters: 575000, travelTimeInSeconds: 21600 },
            legs: [
              {
                points: [
                  { latitude: 52.52, longitude: 13.405 },
                  { latitude: 52.4, longitude: 14.0 },
                ],
              },
              { points: [{ latitude: 52.3, longitude: 20.0 }] },
            ],
          },
        ],
      },
      "tomtom",
      "EUR",
    );
    expect(r.distanceKm).toBe(575);
    expect(r.durationMin).toBe(360);
    expect(r.geometry).toHaveLength(3);
    expect(r.tollCost).toBe(0);
    expect(r.provider).toBe("tomtom");
  });

  it("rzuca gdy brak trasy", () => {
    expect(() => parseTomTomRoute({ routes: [] }, "tomtom", "EUR")).toThrow();
  });
});

/**
 * #383: `sectionType=tollRoad` leci w każdym zapytaniu (płacimy za to), więc odpowiedź
 * MUSI wrócić aż do `RouteResult`. Kształt danych jak w realnej odpowiedzi TomTom
 * Routing v1: dwa legi ze zdublowanym punktem styku, zawsze obecna sekcja `TRAVEL_MODE`
 * obok `TOLL_ROAD`, indeksy liczone wobec spłaszczonej listy punktów CAŁEJ trasy.
 */
describe("parseTomTomRoute — odcinki płatne (#383)", () => {
  type TTSectionLike = {
    startPointIndex?: number;
    endPointIndex?: number;
    sectionType?: string;
    travelMode?: string;
  };

  /** 4 + 3 punkty = 7 pozycji w spłaszczonej liście (punkt styku legów zdublowany). */
  const twoLegRoute = (sections: TTSectionLike[]) => ({
    routes: [
      {
        summary: { lengthInMeters: 120000, travelTimeInSeconds: 5400 },
        legs: [
          {
            points: [
              { latitude: 52.52, longitude: 13.405 },
              { latitude: 52.5, longitude: 13.6 },
              { latitude: 52.48, longitude: 14.0 },
              { latitude: 52.45, longitude: 14.5 },
            ],
          },
          {
            points: [
              { latitude: 52.45, longitude: 14.5 },
              { latitude: 52.4, longitude: 15.2 },
              { latitude: 52.35, longitude: 16.0 },
            ],
          },
        ],
        sections,
      },
    ],
  });

  it("zwraca zakres TOLL_ROAD jako indeksy w geometry i pomija TRAVEL_MODE", () => {
    const r = parseTomTomRoute(
      twoLegRoute([
        { startPointIndex: 0, endPointIndex: 6, sectionType: "TRAVEL_MODE", travelMode: "truck" },
        { startPointIndex: 2, endPointIndex: 5, sectionType: "TOLL_ROAD" },
      ]),
      "tomtom",
      "EUR",
    );
    expect(r.geometry).toHaveLength(7);
    expect(r.tollSections.known).toBe(true);
    expect(r.tollSections.sections).toEqual([{ startIndex: 2, endIndex: 5 }]);
    // Zakres domknięty: slice(start, end+1) to punkty odcinka płatnego.
    const pts = r.geometry.slice(2, 6);
    expect(pts).toHaveLength(4);
    expect(pts[0]).toEqual({ lat: 52.48, lng: 14.0 });
    expect(pts[3]).toEqual({ lat: 52.4, lng: 15.2 });
  });

  it("kilka odcinków płatnych zachowuje kolejność", () => {
    const r = parseTomTomRoute(
      twoLegRoute([
        { startPointIndex: 0, endPointIndex: 6, sectionType: "TRAVEL_MODE" },
        { startPointIndex: 0, endPointIndex: 2, sectionType: "TOLL_ROAD" },
        { startPointIndex: 4, endPointIndex: 6, sectionType: "TOLL_ROAD" },
      ]),
      "tomtom",
      "EUR",
    );
    expect(r.tollSections.sections).toEqual([
      { startIndex: 0, endIndex: 2 },
      { startIndex: 4, endIndex: 6 },
    ]);
  });

  it("odpowiedź bez `sections` = brak danych (known:false), nie „brak dróg płatnych”", () => {
    const r = parseTomTomRoute(
      {
        routes: [
          {
            summary: { lengthInMeters: 1000, travelTimeInSeconds: 60 },
            legs: [{ points: [{ latitude: 1, longitude: 2 }] }],
          },
        ],
      },
      "tomtom",
      "EUR",
    );
    expect(r.tollSections).toEqual({ known: false, sections: [] });
  });

  it("sekcje bez TOLL_ROAD = trasa bez dróg płatnych (known:true, pusto)", () => {
    const r = parseTomTomRoute(
      twoLegRoute([{ startPointIndex: 0, endPointIndex: 6, sectionType: "TRAVEL_MODE" }]),
      "tomtom",
      "EUR",
    );
    expect(r.tollSections).toEqual({ known: true, sections: [] });
  });

  it("akceptuje camelCase `tollRoad` (konwencja z zapytania)", () => {
    const r = parseTomTomRoute(
      twoLegRoute([{ startPointIndex: 1, endPointIndex: 3, sectionType: "tollRoad" }]),
      "tomtom",
      "EUR",
    );
    expect(r.tollSections.sections).toEqual([{ startIndex: 1, endIndex: 3 }]);
  });

  it("punkt bez współrzędnych nie przesuwa odcinka płatnego", () => {
    // Drugi punkt jest ułomny → wypada z `geometry`, ale TomTom nadal liczy go w indeksach.
    const r = parseTomTomRoute(
      {
        routes: [
          {
            summary: { lengthInMeters: 1000, travelTimeInSeconds: 60 },
            legs: [
              {
                points: [
                  { latitude: 1, longitude: 1 },
                  { latitude: 2 },
                  { latitude: 3, longitude: 3 },
                  { latitude: 4, longitude: 4 },
                ],
              },
            ],
            sections: [{ startPointIndex: 2, endPointIndex: 3, sectionType: "TOLL_ROAD" }],
          },
        ],
      },
      "tomtom",
      "EUR",
    );
    expect(r.geometry).toEqual([
      { lat: 1, lng: 1 },
      { lat: 3, lng: 3 },
      { lat: 4, lng: 4 },
    ]);
    // Surowe 2..3 to w `geometry` 1..2 — bez mapy indeksów wskazywałoby poza tablicę.
    expect(r.tollSections.sections).toEqual([{ startIndex: 1, endIndex: 2 }]);
  });

  it("odrzuca sekcje niekompletne, jednopunktowe i wystające poza trasę", () => {
    const r = parseTomTomRoute(
      twoLegRoute([
        { sectionType: "TOLL_ROAD" }, // brak indeksów
        { startPointIndex: 3, endPointIndex: 3, sectionType: "TOLL_ROAD" }, // 1 punkt = nie linia
        { startPointIndex: 5, endPointIndex: 99, sectionType: "TOLL_ROAD" }, // przycięte do końca
      ]),
      "tomtom",
      "EUR",
    );
    expect(r.tollSections.sections).toEqual([{ startIndex: 5, endIndex: 6 }]);
  });
});

describe("TomTomRoutingProvider.route", () => {
  it("woła fetch i parsuje odpowiedź", async () => {
    stubFetch({
      json: {
        routes: [
          {
            summary: { lengthInMeters: 100000, travelTimeInSeconds: 3600 },
            legs: [{ points: [{ latitude: 1, longitude: 2 }] }],
          },
        ],
      },
    });
    const r = await new TomTomRoutingProvider("KEY").route({ waypoints: [BERLIN, WARSAW] });
    expect(r.distanceKm).toBe(100);
    expect(r.durationMin).toBe(60);
  });

  it("rzuca na błąd HTTP", async () => {
    stubFetch({ ok: false, status: 403 });
    await expect(
      new TomTomRoutingProvider("KEY").route({ waypoints: [BERLIN, WARSAW] }),
    ).rejects.toThrow(/403/);
  });
});

describe("tomtomGeocode", () => {
  it("mapuje results → GeoHit (POI + adres)", async () => {
    stubFetch({
      json: {
        results: [
          {
            poi: { name: "Orlen" },
            address: { freeformAddress: "Warszawa, PL" },
            position: { lat: 52.2, lon: 21.0 },
          },
          { address: { freeformAddress: "Berlin, DE" }, position: { lat: 52.5, lon: 13.4 } },
          { address: { freeformAddress: "brak pozycji" } },
        ],
      },
    });
    const hits = await tomtomGeocode("orlen", "KEY");
    expect(hits).toHaveLength(2);
    expect(hits[0]).toEqual({ label: "Orlen, Warszawa, PL", lat: 52.2, lng: 21.0 });
    expect(hits[1]?.label).toBe("Berlin, DE");
  });

  it("zwraca [] dla zapytania < 2 znaki", async () => {
    expect(await tomtomGeocode("a", "KEY")).toEqual([]);
  });
});

describe("tomtomReverseGeocode", () => {
  it("mapuje adres → kraj/miasto/kod", async () => {
    stubFetch({
      json: {
        addresses: [
          {
            address: {
              countryCode: "pl",
              municipality: "Kraków",
              postalCode: "30-001",
              freeformAddress: "Rynek, Kraków",
            },
          },
        ],
      },
    });
    const r = await tomtomReverseGeocode(50.06, 19.94, "KEY");
    expect(r).toEqual({
      country: "PL",
      city: "Kraków",
      postcode: "30-001",
      label: "Rynek, Kraków",
    });
  });
});

describe("tomtomSearchAlongRoute", () => {
  it("zwraca [] dla < 2 punktów trasy", async () => {
    expect(await tomtomSearchAlongRoute([BERLIN], "paliwo", "KEY")).toEqual([]);
  });

  it("POST-uje trasę, buduje URL i mapuje POI (pomija wynik bez pozycji)", async () => {
    const fn = stubFetch({
      json: {
        results: [
          {
            id: "s1",
            poi: { name: "Shell A2" },
            address: { freeformAddress: "A2, PL" },
            position: { lat: 52.3, lon: 17.0 },
            dist: 1234.6,
          },
          { address: { freeformAddress: "brak pozycji" } },
        ],
      },
    });
    const pois = await tomtomSearchAlongRoute([BERLIN, WARSAW], "stacja paliw", "KEY", {
      maxDetourSec: 900,
      limit: 10,
      categorySet: String(TOMTOM_CATEGORY.fuel),
    });

    const url = String(fn.mock.calls[0]?.[0]);
    expect(url).toContain("/search/2/searchAlongRoute/stacja%20paliw.json");
    expect(url).toContain("maxDetourTime=900");
    expect(url).toContain("limit=10");
    expect(url).toContain(`categorySet=${TOMTOM_CATEGORY.fuel}`);
    expect(url).toContain("key=KEY");

    const init = fn.mock.calls[0]?.[1];
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      route: {
        points: [
          { lat: 52.52, lon: 13.405 },
          { lat: 52.2297, lon: 21.0122 },
        ],
      },
    });

    expect(pois).toHaveLength(1);
    expect(pois[0]).toEqual({
      id: "s1",
      name: "Shell A2",
      lat: 52.3,
      lng: 17.0,
      address: "A2, PL",
      distanceM: 1235,
    });
  });

  it("domyślne parametry: maxDetourTime=600, limit=20, bez categorySet", async () => {
    const fn = stubFetch({ json: { results: [] } });
    await tomtomSearchAlongRoute([BERLIN, WARSAW], "parking", "KEY");
    const url = String(fn.mock.calls[0]?.[0]);
    expect(url).toContain("maxDetourTime=600");
    expect(url).toContain("limit=20");
    expect(url).not.toContain("categorySet");
  });

  it("rzuca na błąd HTTP", async () => {
    stubFetch({ ok: false, status: 429 });
    const p = tomtomSearchAlongRoute([BERLIN, WARSAW], "paliwo", "KEY");
    await expect(p).rejects.toThrow(/429/);
  });
});

describe("tomtomTrafficIncidents", () => {
  it("mapuje incydenty; iconCategory 8 = zamknięcie", async () => {
    stubFetch({
      json: {
        incidents: [
          {
            properties: {
              id: "a",
              iconCategory: 8,
              magnitudeOfDelay: 2,
              events: [{ description: "Zamknięcie" }],
            },
            geometry: { type: "Point", coordinates: [13.4, 52.5] },
          },
          {
            properties: { id: "b", iconCategory: 6, magnitudeOfDelay: 3 },
            geometry: {
              type: "LineString",
              coordinates: [
                [21.0, 52.2],
                [21.1, 52.3],
              ],
            },
          },
        ],
      },
    });
    const inc = await tomtomTrafficIncidents("13,52,22,53", "KEY");
    expect(inc).toHaveLength(2);
    expect(inc[0]).toMatchObject({ id: "a", severity: "closure", point: { lat: 52.5, lng: 13.4 } });
    expect(inc[1]).toMatchObject({ id: "b", severity: "major", point: { lat: 52.2, lng: 21.0 } });
  });
});

describe("geocode() z kluczem TomTom", () => {
  it("używa TomTom, gdy podano tomtomKey", async () => {
    const fn = stubFetch({
      json: { results: [{ address: { freeformAddress: "TT" }, position: { lat: 1, lon: 2 } }] },
    });
    const hits = await geocode("test", { tomtomKey: "KEY" });
    expect(hits[0]?.label).toBe("TT");
    expect(String(fn.mock.calls[0]?.[0])).toContain("api.tomtom.com/search");
  });
});
