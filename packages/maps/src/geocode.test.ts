import { afterEach, describe, expect, it, vi } from "vitest";
import { geocode } from "./geocode";

/** Mockuje globalny fetch sekwencją odpowiedzi (po jednej na kolejne wywołanie). */
function stubFetch(...responses: Array<{ ok?: boolean; status?: number; json?: unknown }>) {
  const fn = vi.fn();
  for (const r of responses) {
    fn.mockResolvedValueOnce({
      ok: r.ok ?? true,
      status: r.status ?? 200,
      json: async () => r.json,
    });
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("geocode — Nominatim (bez klucza)", () => {
  it("parsuje wyniki i pomija pozycje bez współrzędnych", async () => {
    const fetchFn = stubFetch({
      json: [
        { display_name: "Berlin, DE", lat: "52.52", lon: "13.405" },
        { display_name: "Bez współrzędnych" }, // pominięte (brak lat/lon)
      ],
    });
    const hits = await geocode("Berlin");
    expect(hits).toEqual([{ label: "Berlin, DE", lat: 52.52, lng: 13.405 }]);
    expect(String(fetchFn.mock.calls[0]?.[0])).toContain("nominatim.openstreetmap.org");
  });

  it("etykieta zastępcza = zapytanie, gdy brak display_name", async () => {
    stubFetch({ json: [{ lat: "50.0", lon: "8.0" }] });
    const hits = await geocode("Frankfurt");
    expect(hits[0]).toMatchObject({ label: "Frankfurt", lat: 50, lng: 8 });
  });

  it("zachowuje równik: lat='0' nie jest odsiewane jak puste", async () => {
    stubFetch({ json: [{ display_name: "Null Island", lat: "0", lon: "0" }] });
    const hits = await geocode("null island");
    expect(hits).toEqual([{ label: "Null Island", lat: 0, lng: 0 }]);
  });
});

describe("geocode — MapTiler (z kluczem)", () => {
  it("używa MapTiler, parsuje center [lng,lat], pomija feature bez center", async () => {
    const fetchFn = stubFetch({
      json: {
        features: [
          { place_name: "Wien, AT", center: [16.3738, 48.2082] },
          { text: "bez center" }, // pominięte
        ],
      },
    });
    const hits = await geocode("Wien", { maptilerKey: "K" });
    expect(hits).toEqual([{ label: "Wien, AT", lat: 48.2082, lng: 16.3738 }]);
    expect(String(fetchFn.mock.calls[0]?.[0])).toContain("api.maptiler.com");
  });

  it("etykieta: place_name → text → query", async () => {
    stubFetch({ json: { features: [{ text: "Tylko text", center: [1, 2] }] } });
    const hits = await geocode("wi", { maptilerKey: "K" });
    expect(hits[0]?.label).toBe("Tylko text");
  });
});

describe("geocode — sterowanie i fallback", () => {
  it("zwraca [] dla frazy < 2 znaków bez wywołania fetch", async () => {
    const fetchFn = stubFetch();
    expect(await geocode("a")).toEqual([]);
    expect(await geocode("  ")).toEqual([]); // sam whitespace po trim
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("gdy MapTiler padnie (HTTP 500) → fallback na Nominatim", async () => {
    const fetchFn = stubFetch(
      { ok: false, status: 500 }, // MapTiler błąd
      { json: [{ display_name: "Z fallbacku", lat: "52", lon: "13" }] }, // Nominatim
    );
    const hits = await geocode("Berlin", { maptilerKey: "K" });
    expect(hits).toEqual([{ label: "Z fallbacku", lat: 52, lng: 13 }]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(String(fetchFn.mock.calls[1]?.[0])).toContain("nominatim");
  });

  it("gdy oba źródła padną → []", async () => {
    stubFetch({ ok: false, status: 500 }, { ok: false, status: 503 });
    expect(await geocode("Berlin", { maptilerKey: "K" })).toEqual([]);
  });

  it("respektuje limit w URL", async () => {
    const fetchFn = stubFetch({ json: [] });
    await geocode("Berlin", { limit: 3 });
    expect(String(fetchFn.mock.calls[0]?.[0])).toContain("limit=3");
  });
});
