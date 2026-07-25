/**
 * Geokoder: zamiana nazwy miejsca (miasto/adres/POI) na współrzędne.
 * Pierwszy wybór: MapTiler (gdy jest klucz). Fallback: Nominatim (OSM, bez klucza).
 * Działa po stronie klienta — klucz MapTiler jest publiczny (NEXT_PUBLIC).
 */
import { cachedCall, normalizeGeoQuery, TtlLruCache } from "./cache";

export interface GeoHit {
  label: string;
  lat: number;
  lng: number;
}

interface MapTilerFeature {
  place_name?: string;
  text?: string;
  center?: [number, number];
}
interface MapTilerResponse {
  features?: MapTilerFeature[];
}

interface NominatimItem {
  display_name?: string;
  lat?: string;
  lon?: string;
}

async function geocodeMapTiler(query: string, key: string, limit: number): Promise<GeoHit[]> {
  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${key}&language=pl&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MapTiler geocode ${res.status}`);
  const data = (await res.json()) as MapTilerResponse;
  const out: GeoHit[] = [];
  for (const f of data.features ?? []) {
    if (!f.center) continue;
    out.push({ label: f.place_name ?? f.text ?? query, lng: f.center[0], lat: f.center[1] });
  }
  return out;
}

async function geocodeNominatim(query: string, limit: number): Promise<GeoHit[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=${limit}&accept-language=pl`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = (await res.json()) as NominatimItem[];
  const out: GeoHit[] = [];
  for (const it of data) {
    if (!it.lat || !it.lon) continue;
    const lat = Number(it.lat);
    const lng = Number(it.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue; // odsiej śmieci (NaN)
    out.push({ label: it.display_name ?? query, lat, lng });
  }
  return out;
}

/** Faktyczne odpytanie dostawców (bez pamięci podręcznej). */
async function geocodeFresh(
  q: string,
  limit: number,
  opts?: { tomtomKey?: string; maptilerKey?: string },
): Promise<GeoHit[]> {
  try {
    if (opts?.tomtomKey) {
      // Import leniwy — pakiet maps nie musi ładować TomTom, gdy klucza brak.
      const { tomtomGeocode } = await import("./tomtomSearch");
      const hits = await tomtomGeocode(q, opts.tomtomKey, { limit });
      if (hits.length > 0) return hits;
    }
    if (opts?.maptilerKey) return await geocodeMapTiler(q, opts.maptilerKey, limit);
    return await geocodeNominatim(q, limit);
  } catch {
    // Awaryjnie spróbuj Nominatim (bez klucza).
    try {
      return await geocodeNominatim(q, limit);
    } catch {
      return [];
    }
  }
}

/**
 * #368: TTL 10 min — nazwy miejsc nie zmieniają się w tym tempie, a użytkownik
 * poprawiający literówkę wraca do tej samej frazy w ciągu sekund.
 */
const GEOCODE_TTL_MS = 10 * 60 * 1000;
/** Limit wpisów — geokoder leci na każde naciśnięcie klawisza, więc cache MUSI mieć sufit. */
const GEOCODE_MAX_ENTRIES = 200;

const geocodeCache = new TtlLruCache<Promise<GeoHit[]>>({
  ttlMs: GEOCODE_TTL_MS,
  maxEntries: GEOCODE_MAX_ENTRIES,
});

/** Czyści pamięć podręczną geokodera (testy, wylogowanie, podmiana klucza API). */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
}

/**
 * Wyszukuje miejsce. Priorytet: TomTom (najlepsza jakość, #356) → MapTiler →
 * Nominatim (OSM, bez klucza). Każde źródło z fallbackiem na Nominatim.
 *
 * #368: wynik jest pamiętany po ZNORMALIZOWANEJ frazie (TTL 10 min, LRU 200 wpisów),
 * a równoległe zapytania o tę samą frazę dzielą jedno wywołanie API.
 */
export async function geocode(
  query: string,
  opts?: { tomtomKey?: string; maptilerKey?: string; limit?: number },
): Promise<GeoHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const limit = opts?.limit ?? 6;
  // Do klucza wchodzi ŹRÓDŁO (różne API dają różne etykiety i kolejność) oraz `limit`.
  // Samych kluczy API nie wkładamy do klucza cache — pochodzą z env i są stałe
  // w obrębie instancji aplikacji, a `clearGeocodeCache()` obsługuje ich podmianę.
  // Język jest dziś zaszyty na sztywno w URL-ach (`pl` / `pl-PL`); gdyby stał się
  // parametrem, MUSI dołączyć do klucza — inaczej PL i DE dzieliłyby jeden wpis.
  const source = opts?.tomtomKey ? "tt" : opts?.maptilerKey ? "mt" : "nom";
  const key = `${source}|${limit}|${normalizeGeoQuery(q)}`;
  // Pusty wynik NIE trafia do pamięci: `geocodeFresh` zwraca [] zarówno przy
  // „brak trafień", jak i przy awarii obu dostawców — zamrożenie tego na 10 minut
  // zamieniłoby chwilową usterkę w martwą wyszukiwarkę.
  return cachedCall(
    geocodeCache,
    key,
    () => geocodeFresh(q, limit, opts),
    (hits) => hits.length > 0,
  );
}
