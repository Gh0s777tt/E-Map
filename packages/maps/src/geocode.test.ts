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

  it("wynik od PREFEROWANEGO dostawcy jest pamiętany (MapTiler)", async () => {
    const fetchFn = stubFetch({
      json: { features: [{ place_name: "Wien, AT", center: [16.37, 48.2] }] },
    });
    await geocode("Wien", { maptilerKey: "K" });
    await geocode("Wien", { maptilerKey: "K" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
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

// Klucz cache opisuje dostawcę PREFEROWANEGO (wybranego z kluczy API). Gdy ten padnie,
// a odpowie fallback, wyniku NIE wolno utrwalić pod tym kluczem — inaczej chwilowa
// usterka zamrażała gorsze podpowiedzi na pełne 10 minut TTL.
describe("geocode — fallback nie zatruwa pamięci podręcznej (#369)", () => {
  it("odpowiedź Nominatimu nie ląduje pod kluczem MapTilera, który padł", async () => {
    const fetchFn = stubFetch(
      { ok: false, status: 500 }, // MapTiler padł
      { json: [{ display_name: "Z fallbacku", lat: "52", lon: "13" }] }, // awaryjny Nominatim
      { json: { features: [{ place_name: "Berlin, DE", center: [13, 52] }] } }, // MapTiler wrócił
    );
    expect(await geocode("Berlin", { maptilerKey: "K" })).toEqual([
      { label: "Z fallbacku", lat: 52, lng: 13 },
    ]);
    // Druga próba pyta MapTilera od nowa (a nie oddaje zamrożonego fallbacku).
    expect(await geocode("Berlin", { maptilerKey: "K" })).toEqual([
      { label: "Berlin, DE", lat: 52, lng: 13 },
    ]);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  // Dłuższy limit czasu: ten przypadek jako jedyny dociąga LENIWY moduł TomToma
  // (`import("./tomtomSearch")`), a jego transformacja w vitest bywa wolna.
  it("pusta (ale poprawna) odpowiedź TomToma NIE blokuje zapamiętania wyniku", {
    timeout: 30_000,
  }, async () => {
    const fetchFn = stubFetch(
      { json: { results: [] } }, // TomTom zgodnie z prawdą: „nie znam tej frazy"
      { json: [{ display_name: "Z fallbacku", lat: "52", lon: "13" }] }, // dalej łańcuchem
    );
    const first = await geocode("Berlin", { tomtomKey: "T" });
    expect(first).toEqual([{ label: "Z fallbacku", lat: 52, lng: 13 }]);
    // #369: to NIE jest degradacja — TomTom odpowiedział poprawnie, tylko pusto.
    // Wynik musi trafić do pamięci, inaczej dla każdej frazy nieznanej TomTomowi
    // cache jest martwy i każde naciśnięcie klawisza kosztuje DWA zapytania.
    expect(await geocode("Berlin", { tomtomKey: "T" })).toEqual(first);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

// [#372] Kraj MUSI pochodzić z pól strukturalnych dostawcy, nie z tekstu etykiety.
// Przyczyna błędu: formularz odtwarzał kraj jako „ostatni człon po przecinku",
// a TomTom kraju we `freeformAddress` nie umieszcza — do pola „Kraj" wpadał
// kod pocztowy z miastem („31-042 Kraków").
describe("geocode — pola strukturalne adresu", () => {
  it("TomTom: countryCode/city/postcode trafiają do wyniku, choć etykieta ich nie zawiera", {
    timeout: 30_000,
  }, async () => {
    stubFetch({
      json: {
        results: [
          {
            position: { lat: 50.06, lon: 19.94 },
            address: {
              freeformAddress: "Rynek Główny 1, 31-042 Kraków",
              municipality: "Kraków",
              postalCode: "31-042",
              countryCode: "PL",
              country: "Polska",
            },
          },
        ],
      },
    });
    const [hit] = await geocode("Rynek Główny", { tomtomKey: "T" });
    // Etykieta faktycznie nie niesie kraju — stąd brał się błąd.
    expect(hit?.label).not.toContain("Polska");
    expect(hit).toMatchObject({
      countryCode: "PL",
      country: "Polska",
      city: "Kraków",
      postcode: "31-042",
    });
  });

  it("Nominatim: kod kraju jest normalizowany do wielkich liter", async () => {
    const fetchFn = stubFetch({
      json: [
        {
          display_name: "Berlin, Deutschland",
          lat: "52.52",
          lon: "13.405",
          address: {
            country: "Deutschland",
            country_code: "de",
            city: "Berlin",
            postcode: "10115",
          },
        },
      ],
    });
    const [hit] = await geocode("Berlin");
    // Bez `addressdetails=1` Nominatim w ogóle nie zwraca obiektu `address`.
    expect(String(fetchFn.mock.calls[0]?.[0])).toContain("addressdetails=1");
    expect(hit).toMatchObject({
      countryCode: "DE", // z "de" — formularz porównuje z listą zapisaną wielkimi
      country: "Deutschland",
      city: "Berlin",
      postcode: "10115",
    });
  });

  it("Nominatim: miasto bywa pod town/village — bierzemy pierwszy dostępny wariant", async () => {
    stubFetch({
      json: [
        {
          display_name: "Zakopane",
          lat: "49.3",
          lon: "19.95",
          address: { country_code: "pl", village: "Zakopane" },
        },
      ],
    });
    const [hit] = await geocode("Zakopane");
    expect(hit?.city).toBe("Zakopane");
  });

  it("brak danych adresowych nie psuje wyniku — pola zostają puste", async () => {
    stubFetch({ json: [{ display_name: "Gdzieś", lat: "1", lon: "2" }] });
    const [hit] = await geocode("gdzies");
    expect(hit).toMatchObject({ label: "Gdzieś", lat: 1, lng: 2 });
    expect(hit?.countryCode).toBeUndefined();
  });
});
