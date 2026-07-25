import { describe, expect, it, vi } from "vitest";
import {
  cachedCall,
  normalizeGeoQuery,
  routeCacheKey,
  snapBboxOut,
  TtlLruCache,
  trafficCacheKey,
} from "./cache";
import type { RouteRequest } from "./types";

/** Sterowalny zegar — TTL testujemy bez czekania. */
function fakeClock(start = 1_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe("TtlLruCache — TTL", () => {
  it("zwraca wartość przed upływem TTL, undefined po", () => {
    const clock = fakeClock();
    const c = new TtlLruCache<number>({ ttlMs: 1000, maxEntries: 10, now: clock.now });
    c.set("a", 1);
    clock.advance(999);
    expect(c.get("a")).toBe(1);
    clock.advance(2);
    expect(c.get("a")).toBeUndefined();
    expect(c.size).toBe(0); // wygasły wpis jest sprzątany przy odczycie
  });

  it("ponowny set odświeża czas życia", () => {
    const clock = fakeClock();
    const c = new TtlLruCache<number>({ ttlMs: 1000, maxEntries: 10, now: clock.now });
    c.set("a", 1);
    clock.advance(900);
    c.set("a", 2);
    clock.advance(900);
    expect(c.get("a")).toBe(2);
  });
});

describe("TtlLruCache — limit wpisów (LRU)", () => {
  it("po przekroczeniu limitu wypada najdawniej używany", () => {
    const c = new TtlLruCache<number>({ ttlMs: 10_000, maxEntries: 2 });
    c.set("a", 1);
    c.set("b", 2);
    c.set("c", 3);
    expect(c.size).toBe(2);
    expect(c.get("a")).toBeUndefined();
    expect(c.get("b")).toBe(2);
    expect(c.get("c")).toBe(3);
  });

  it("odczyt odmładza wpis — wypada ten nietykany", () => {
    const c = new TtlLruCache<number>({ ttlMs: 10_000, maxEntries: 2 });
    c.set("a", 1);
    c.set("b", 2);
    c.get("a"); // „a" wraca na koniec kolejki
    c.set("c", 3);
    expect(c.get("a")).toBe(1);
    expect(c.get("b")).toBeUndefined();
  });

  it("delete z `expected` nie kasuje nowszej wartości pod tym samym kluczem", () => {
    const c = new TtlLruCache<number>({ ttlMs: 10_000, maxEntries: 5 });
    c.set("a", 1);
    c.set("a", 2);
    c.delete("a", 1);
    expect(c.get("a")).toBe(2);
    c.delete("a", 2);
    expect(c.get("a")).toBeUndefined();
  });
});

describe("cachedCall — jedno wywołanie płatnego API na klucz", () => {
  it("drugie zapytanie o ten sam klucz nie woła produce", async () => {
    const c = new TtlLruCache<Promise<string>>({ ttlMs: 10_000, maxEntries: 5 });
    const produce = vi.fn(async () => "wynik");
    expect(await cachedCall(c, "k", produce)).toBe("wynik");
    expect(await cachedCall(c, "k", produce)).toBe("wynik");
    expect(produce).toHaveBeenCalledTimes(1);
  });

  it("równoległe zapytania dzielą JEDNO wywołanie (auto-reroute #309)", async () => {
    const c = new TtlLruCache<Promise<number>>({ ttlMs: 10_000, maxEntries: 5 });
    const produce = vi.fn(async () => {
      await Promise.resolve();
      return 42;
    });
    const [a, b] = await Promise.all([cachedCall(c, "k", produce), cachedCall(c, "k", produce)]);
    expect([a, b]).toEqual([42, 42]);
    expect(produce).toHaveBeenCalledTimes(1);
  });

  it("błąd nie zostaje w pamięci — kolejne zapytanie próbuje ponownie", async () => {
    const c = new TtlLruCache<Promise<string>>({ ttlMs: 10_000, maxEntries: 5 });
    const produce = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("API padło"))
      .mockResolvedValueOnce("ok");
    await expect(cachedCall(c, "k", produce)).rejects.toThrow("API padło");
    expect(c.size).toBe(0);
    expect(await cachedCall(c, "k", produce)).toBe("ok");
    expect(produce).toHaveBeenCalledTimes(2);
  });

  it("`keep` odsiewa odpowiedzi, których nie chcemy zamrażać (np. pusty wynik)", async () => {
    const c = new TtlLruCache<Promise<string[]>>({ ttlMs: 10_000, maxEntries: 5 });
    const produce = vi
      .fn<() => Promise<string[]>>()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(["Berlin"]);
    const keep = (v: string[]) => v.length > 0;
    expect(await cachedCall(c, "k", produce, keep)).toEqual([]);
    expect(c.size).toBe(0);
    expect(await cachedCall(c, "k", produce, keep)).toEqual(["Berlin"]);
    expect(c.size).toBe(1);
  });
});

describe("normalizeGeoQuery", () => {
  it("skleja spacje, ucina brzegi i sprowadza do małych liter", () => {
    expect(normalizeGeoQuery("  Berlin   Mitte ")).toBe("berlin mitte");
    expect(normalizeGeoQuery("BERLIN")).toBe(normalizeGeoQuery("berlin"));
  });
});

describe("routeCacheKey — komplet parametrów wpływających na trasę", () => {
  const base: RouteRequest = {
    waypoints: [
      { lat: 52.2297, lng: 21.0122 },
      { lat: 50.0647, lng: 19.945 },
    ],
  };

  it("ten sam wjazd = ten sam klucz", () => {
    expect(routeCacheKey(base, "here")).toBe(routeCacheKey({ ...base }, "here"));
  });

  it("inny dostawca = inny klucz", () => {
    expect(routeCacheKey(base, "here")).not.toBe(routeCacheKey(base, "tomtom"));
  });

  it("odwrócona kolejność punktów = inny klucz", () => {
    const reversed: RouteRequest = { waypoints: [...base.waypoints].reverse() };
    expect(routeCacheKey(reversed, "here")).not.toBe(routeCacheKey(base, "here"));
  });

  it("profil pojazdu wchodzi do klucza (waga, wysokość, osie)", () => {
    const light = routeCacheKey({ ...base, profile: { kind: "truck", weightKg: 12_000 } }, "here");
    const heavy = routeCacheKey({ ...base, profile: { kind: "truck", weightKg: 40_000 } }, "here");
    const tall = routeCacheKey(
      { ...base, profile: { kind: "truck", weightKg: 12_000, heightCm: 400 } },
      "here",
    );
    expect(new Set([light, heavy, tall]).size).toBe(3);
  });

  it("każda flaga avoid* zmienia klucz osobno", () => {
    const keys = [
      routeCacheKey({ ...base, options: {} }, "here"),
      routeCacheKey({ ...base, options: { avoidTolls: true } }, "here"),
      routeCacheKey({ ...base, options: { avoidFerries: true } }, "here"),
      routeCacheKey({ ...base, options: { avoidCarTrains: true } }, "here"),
      routeCacheKey({ ...base, options: { avoidDirtRoads: true } }, "here"),
    ];
    expect(new Set(keys).size).toBe(5);
  });

  it("lista krajów: kolejność i wielkość liter nieistotne, zawartość — owszem", () => {
    const a = routeCacheKey({ ...base, options: { avoidCountries: ["CH", "AT"] } }, "here");
    const b = routeCacheKey({ ...base, options: { avoidCountries: ["at", " ch "] } }, "here");
    const c = routeCacheKey({ ...base, options: { avoidCountries: ["CH"] } }, "here");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("waluta wchodzi do klucza (jest w odpowiedzi)", () => {
    expect(routeCacheKey({ ...base, currency: "PLN" }, "here")).not.toBe(
      routeCacheKey({ ...base, currency: "EUR" }, "here"),
    );
  });

  it("brak opcji i pusta lista krajów dają ten sam klucz co domyślne EUR", () => {
    expect(routeCacheKey({ ...base, options: { avoidCountries: [] } }, "here")).toBe(
      routeCacheKey({ ...base, currency: "EUR" }, "here"),
    );
  });
});

describe("snapBboxOut + trafficCacheKey", () => {
  it("przyciągnięty prostokąt ZAWIERA oryginał", () => {
    const raw = { west: 13.372, south: 52.481, east: 13.428, north: 52.533 };
    const snapped = snapBboxOut(raw);
    expect(snapped.west).toBeLessThanOrEqual(raw.west);
    expect(snapped.south).toBeLessThanOrEqual(raw.south);
    expect(snapped.east).toBeGreaterThanOrEqual(raw.east);
    expect(snapped.north).toBeGreaterThanOrEqual(raw.north);
  });

  it("drobne przesunięcie mapy trafia w ten sam klucz", () => {
    const a = snapBboxOut({ west: 13.372, south: 52.481, east: 13.428, north: 52.533 });
    const b = snapBboxOut({ west: 13.374, south: 52.483, east: 13.429, north: 52.534 });
    expect(trafficCacheKey(a, "here")).toBe(trafficCacheKey(b, "here"));
  });

  it("przesunięcie o pełną komórkę daje inny klucz", () => {
    const a = snapBboxOut({ west: 13.372, south: 52.481, east: 13.428, north: 52.533 });
    const b = snapBboxOut({ west: 13.472, south: 52.581, east: 13.528, north: 52.633 });
    expect(trafficCacheKey(a, "here")).not.toBe(trafficCacheKey(b, "here"));
  });

  it("działa dla ujemnych współrzędnych i okolic zera (bez szumu float)", () => {
    const s = snapBboxOut({ west: -0.21, south: -0.01, east: 0.01, north: 0.21 });
    expect(s).toEqual({ west: -0.25, south: -0.05, east: 0.05, north: 0.25 });
    expect(trafficCacheKey(s, "tomtom")).toBe("tomtom|-0.25,-0.05,0.05,0.25");
  });

  it("dostawca wchodzi do klucza (HERE zwraca flows, TomTom incidents)", () => {
    const b = snapBboxOut({ west: 1, south: 1, east: 1.5, north: 1.5 });
    expect(trafficCacheKey(b, "here")).not.toBe(trafficCacheKey(b, "tomtom"));
  });
});
