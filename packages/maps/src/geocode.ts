/**
 * Geokoder: zamiana nazwy miejsca (miasto/adres/POI) na współrzędne.
 * Pierwszy wybór: MapTiler (gdy jest klucz). Fallback: Nominatim (OSM, bez klucza).
 * Działa po stronie klienta — klucz MapTiler jest publiczny (NEXT_PUBLIC).
 */

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
    out.push({ label: it.display_name ?? query, lat: Number(it.lat), lng: Number(it.lon) });
  }
  return out;
}

/** Wyszukuje miejsce. Gdy podany klucz MapTiler — używa go; inaczej Nominatim. */
export async function geocode(
  query: string,
  opts?: { maptilerKey?: string; limit?: number },
): Promise<GeoHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const limit = opts?.limit ?? 6;
  try {
    if (opts?.maptilerKey) return await geocodeMapTiler(q, opts.maptilerKey, limit);
    return await geocodeNominatim(q, limit);
  } catch {
    // Awaryjnie spróbuj drugiego źródła.
    try {
      return await geocodeNominatim(q, limit);
    } catch {
      return [];
    }
  }
}
