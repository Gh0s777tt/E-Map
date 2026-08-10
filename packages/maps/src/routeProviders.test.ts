import { afterEach, describe, expect, it, vi } from "vitest";
import { GraphHopperRoutingProvider } from "./graphhopper";
import { HereRoutingProvider } from "./here";
import type { LatLng } from "./types";

/**
 * Testy ścieżki sieciowej adapterów routingu (fetch + parsowanie odpowiedzi).
 * Mockujemy globalny fetch — bez wyjścia do sieci, deterministycznie.
 */
const BERLIN: LatLng = { lat: 52.52, lng: 13.405 };
const WARSAW: LatLng = { lat: 52.2297, lng: 21.0122 };

function stubFetch(r: { ok?: boolean; status?: number; json?: unknown }) {
  const fn = vi.fn(async () => ({
    ok: r.ok ?? true,
    status: r.status ?? 200,
    json: async () => r.json,
  }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("HereRoutingProvider.route", () => {
  const provider = new HereRoutingProvider("KEY");

  it("sumuje dystans/czas z wielu sekcji i konwertuje myto lokalne (PLN) na EUR", async () => {
    stubFetch({
      json: {
        routes: [
          {
            sections: [
              {
                summary: { length: 100000, duration: 3600 },
                tolls: [{ fares: [{ price: { value: 100, currency: "PLN" } }] }],
              },
              {
                summary: { length: 50000, duration: 1800 },
                tolls: [{ fares: [{ price: { value: 10, currency: "EUR" } }] }],
              },
            ],
          },
        ],
      },
    });
    const r = await provider.route({ waypoints: [BERLIN, WARSAW] });
    expect(r.distanceKm).toBe(150); // (100000+50000)/1000
    expect(r.durationMin).toBe(90); // (3600+1800)/60
    expect(r.tollCost).toBe(33); // 100*0.23 (PLN) + 10*1 (EUR)
    expect(r.currency).toBe("EUR");
    expect(r.provider).toBe("here");
  });

  it("pomija pozycje myta bez wartości liczbowej", async () => {
    stubFetch({
      json: {
        routes: [
          {
            sections: [
              {
                summary: { length: 1000, duration: 60 },
                tolls: [{ fares: [{ price: { currency: "EUR" } }] }],
              },
            ],
          },
        ],
      },
    });
    expect((await provider.route({ waypoints: [BERLIN, WARSAW] })).tollCost).toBe(0);
  });

  it("[#390] nieznana waluta myta → pozycja pominięta i zgłoszona, NIE liczona 1:1", async () => {
    /*
     * Wcześniej kwota w nieznanej walucie szła do sumy przemnożona przez 1,
     * czyli traktowana jak euro. Dla waluty słabszej od euro (a takie są
     * wszystkie lokalne waluty na trasach tej floty) zawyżało to myto
     * wielokrotnie — i wyglądało dokładnie tak samo jak kwota prawdziwa.
     *
     * Poprzednia wersja tego testu przybijała tamto zachowanie bez słowa
     * uzasadnienia, czyli utrwalała przypadek zamiast decyzji. Reguła jest
     * teraz odwrotna i daje się obronić: myto NIEPEŁNE, o którym wiadomo,
     * jest uczciwsze niż myto ZAWYŻONE, o którym nie wiadomo.
     */
    stubFetch({
      json: {
        routes: [
          {
            sections: [
              {
                summary: { length: 1000, duration: 60 },
                tolls: [
                  { fares: [{ price: { value: 50, currency: "XYZ" } }] },
                  { fares: [{ price: { value: 10, currency: "EUR" } }] },
                ],
              },
            ],
          },
        ],
      },
    });
    const res = await provider.route({ waypoints: [BERLIN, WARSAW] });
    // Do sumy wchodzi wyłącznie bramka, którą umiemy przeliczyć.
    expect(res.tollCost).toBe(10);
    // …i użytkownik dowiaduje się, że suma jest niepełna.
    expect(res.notices.some((n) => n.code === "toll.currencyUnknown")).toBe(true);
  });

  it("[#390] wszystkie waluty znane → brak uwagi o niepełnym mycie", async () => {
    stubFetch({
      json: {
        routes: [
          {
            sections: [
              {
                summary: { length: 1000, duration: 60 },
                tolls: [{ fares: [{ price: { value: 100, currency: "PLN" } }] }],
              },
            ],
          },
        ],
      },
    });
    const res = await provider.route({ waypoints: [BERLIN, WARSAW] });
    expect(res.tollCost).toBe(23); // 100 PLN × 0,23
    expect(res.notices.some((n) => n.code === "toll.currencyUnknown")).toBe(false);
  });

  it("rzuca przy odpowiedzi !ok", async () => {
    stubFetch({ ok: false, status: 401 });
    await expect(provider.route({ waypoints: [BERLIN, WARSAW] })).rejects.toThrow("HERE API: 401");
  });

  it("rzuca, gdy brak sekcji/trasy w odpowiedzi", async () => {
    stubFetch({ json: { routes: [] } });
    await expect(provider.route({ waypoints: [BERLIN, WARSAW] })).rejects.toThrow("brak trasy");
  });

  it("rzuca przy < 2 punktach i nie woła fetch", async () => {
    const fetchFn = stubFetch({ json: {} });
    await expect(provider.route({ waypoints: [BERLIN] })).rejects.toThrow(RangeError);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("GraphHopperRoutingProvider.route", () => {
  const provider = new GraphHopperRoutingProvider("KEY");

  it("parsuje dystans (m→km), czas (ms→min), geometrię [lng,lat]→{lat,lng}; myto 0", async () => {
    stubFetch({
      json: {
        paths: [
          {
            distance: 120000,
            time: 5_400_000,
            points: {
              coordinates: [
                [13.405, 52.52],
                [21.0122, 52.2297],
              ],
            },
          },
        ],
      },
    });
    const r = await provider.route({ waypoints: [BERLIN, WARSAW] });
    expect(r.distanceKm).toBe(120);
    expect(r.durationMin).toBe(90); // 5_400_000 / 60000
    expect(r.geometry).toEqual([
      { lat: 52.52, lng: 13.405 },
      { lat: 52.2297, lng: 21.0122 },
    ]);
    expect(r.tollCost).toBe(0);
    expect(r.provider).toBe("graphhopper");
  });

  it("rzuca przy odpowiedzi !ok", async () => {
    stubFetch({ ok: false, status: 500 });
    await expect(provider.route({ waypoints: [BERLIN, WARSAW] })).rejects.toThrow(
      "GraphHopper API: 500",
    );
  });

  it("rzuca, gdy brak paths w odpowiedzi", async () => {
    stubFetch({ json: { paths: [] } });
    await expect(provider.route({ waypoints: [BERLIN, WARSAW] })).rejects.toThrow("brak trasy");
  });

  it("respektuje walutę z żądania", async () => {
    stubFetch({ json: { paths: [{ distance: 1000, time: 60000, points: { coordinates: [] } }] } });
    const r = await provider.route({ waypoints: [BERLIN, WARSAW], currency: "PLN" });
    expect(r.currency).toBe("PLN");
  });

  it("brak geometrii (points) → geometria pusta, dystans/czas wciąż liczone", async () => {
    stubFetch({ json: { paths: [{ distance: 1000, time: 60000 }] } }); // bez points
    const r = await provider.route({ waypoints: [BERLIN, WARSAW] });
    expect(r.geometry).toEqual([]);
    expect(r.distanceKm).toBe(1);
    expect(r.durationMin).toBe(1);
  });
});
