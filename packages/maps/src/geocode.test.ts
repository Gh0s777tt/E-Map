import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearGeocodeCache, geocode } from "./geocode";

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

// #368: geokoder ma pamięć podręczną modułową — bez czyszczenia wynik z jednego
// testu wyciekałby do następnego (te same frazy).
beforeEach(() => clearGeocodeCache());
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

  it("pomija pozycje z nieliczbowym lat/lon (śmieci → NaN)", async () => {
    stubFetch({
      json: [
        { display_name: "Zła", lat: "abc", lon: "13" },
        { display_name: "Dobra", lat: "52", lon: "13" },
      ],
    });
    expect(await geocode("Berlin")).toEqual([{ label: "Dobra", lat: 52, lng: 13 }]);
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

describe("geocode — pamięć podręczna (#368)", () => {
  it("powtórzone zapytanie nie woła API drugi raz", async () => {
    const fetchFn = stubFetch({ json: [{ display_name: "Berlin, DE", lat: "52", lon: "13" }] });
    const first = await geocode("Berlin");
    const second = await geocode("Berlin");
    expect(second).toEqual(first);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("normalizuje frazę: wielkość liter i nadmiarowe spacje trafiają w ten sam wpis", async () => {
    const fetchFn = stubFetch({ json: [{ display_name: "Berlin, DE", lat: "52", lon: "13" }] });
    await geocode("Berlin Mitte");
    await geocode("  berlin   MITTE ");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("równoległe zapytania (seria naciśnięć klawisza) dzielą jedno wywołanie", async () => {
    const fetchFn = stubFetch({ json: [{ display_name: "Berlin, DE", lat: "52", lon: "13" }] });
    const [a, b] = await Promise.all([geocode("Berlin"), geocode("Berlin")]);
    expect(a).toEqual(b);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("inny limit = osobny wpis (inna liczba wyników)", async () => {
    const hit = { json: [{ display_name: "Berlin, DE", lat: "52", lon: "13" }] };
    const fetchFn = stubFetch(hit, hit);
    await geocode("Berlin", { limit: 3 });
    await geocode("Berlin", { limit: 6 });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("inne źródło (MapTiler vs Nominatim) = osobny wpis", async () => {
    const fetchFn = stubFetch(
      { json: { features: [{ place_name: "Wien, AT", center: [16.37, 48.2] }] } },
      { json: [{ display_name: "Wien, AT", lat: "48.2", lon: "16.37" }] },
    );
    await geocode("Wien", { maptilerKey: "K" });
    await geocode("Wien");
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(String(fetchFn.mock.calls[1]?.[0])).toContain("nominatim");
  });

  it("pusty wynik NIE jest pamiętany — awaria dostawcy nie blokuje wyszukiwarki", async () => {
    const fetchFn = stubFetch(
      { ok: false, status: 500 }, // MapTiler padł
      { ok: false, status: 503 }, // awaryjny Nominatim też → []
      { json: { features: [{ place_name: "Berlin, DE", center: [13, 52] }] } },
    );
    expect(await geocode("Berlin", { maptilerKey: "K" })).toEqual([]);
    expect(await geocode("Berlin", { maptilerKey: "K" })).toEqual([
      { label: "Berlin, DE", lat: 52, lng: 13 },
    ]);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });
});
