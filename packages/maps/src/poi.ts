/** POI z OpenStreetMap (Overpass API) — bez klucza. Parkingi TIR i stacje paliw. */

export type OsmPoiType = "parking" | "fuel_station";

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface Poi {
  id: string;
  type: OsmPoiType;
  name?: string;
  lat: number;
  lng: number;
  tags: Record<string, string>;
}

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

/** Buduje zapytanie Overpass QL dla wskazanego obszaru i typów POI. */
export function buildOverpassQuery(bbox: BBox, types: OsmPoiType[]): string {
  const b = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  const parts: string[] = [];
  if (types.includes("parking")) {
    parts.push(`node["amenity"="parking"]["hgv"="yes"](${b});`);
    parts.push(`way["amenity"="parking"]["hgv"="yes"](${b});`);
  }
  if (types.includes("fuel_station")) {
    parts.push(`node["amenity"="fuel"](${b});`);
    parts.push(`way["amenity"="fuel"](${b});`);
  }
  return `[out:json][timeout:25];(${parts.join("")});out center 120;`;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  elements?: OverpassElement[];
}

/** Mapuje odpowiedź Overpass na listę POI (pomija elementy bez współrzędnych). */
export function parseOverpass(data: OverpassResponse): Poi[] {
  const out: Poi[] = [];
  for (const el of data.elements ?? []) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const amenity = el.tags?.amenity;
    const type: OsmPoiType | null =
      amenity === "fuel" ? "fuel_station" : amenity === "parking" ? "parking" : null;
    if (!type) continue;

    out.push({
      id: `${el.type}/${el.id}`,
      type,
      name: el.tags?.name,
      lat,
      lng: lon,
      tags: el.tags ?? {},
    });
  }
  return out;
}

/** Pobiera POI z Overpass dla danego obszaru (bez klucza; CORS dozwolony). */
export async function fetchPois(
  bbox: BBox,
  types: OsmPoiType[] = ["parking", "fuel_station"],
  url: string = OVERPASS_URL,
): Promise<Poi[]> {
  // #354: twardy timeout — Overpass bywa wolny/niedostępny, a bez tego przycisk
  // „Wczytaj POI" zostawał w stanie busy (promise nie rozstrzygał się).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: buildOverpassQuery(bbox, types),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Overpass API: ${res.status}`);
    return parseOverpass((await res.json()) as OverpassResponse);
  } finally {
    clearTimeout(timer);
  }
}
