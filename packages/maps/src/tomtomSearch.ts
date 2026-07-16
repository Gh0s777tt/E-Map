/**
 * TomTom Search API (#356) — geokodowanie (fuzzy), reverse-geocode, POI w pobliżu
 * oraz wyszukiwanie WZDŁUŻ TRASY (paliwo/parking po drodze). Wszystko po stronie
 * klienta z kluczem TomTom (klient-side, restrykcjonowany). Timeout wspólny z routingiem.
 */
import type { GeoHit } from "./geocode";
import { TOMTOM_BASE, tomtomFetch } from "./tomtom";
import type { LatLng } from "./types";

/** Kategorie POI TomTom istotne dla TIR-ów. */
export const TOMTOM_CATEGORY = {
  fuel: 7311, // stacja paliw
  parking: 7369, // parking otwarty
  restArea: 7395, // miejsce obsługi podróżnych (MOP)
  truckStop: 9663, // truck stop
} as const;

interface TTSearchResult {
  poi?: { name?: string; categories?: string[] };
  address?: {
    freeformAddress?: string;
    municipality?: string;
    localName?: string;
    postalCode?: string;
    countryCode?: string;
    country?: string;
  };
  position?: { lat?: number; lon?: number };
  id?: string;
  dist?: number;
}
interface TTSearchResponse {
  results?: TTSearchResult[];
}

/** Geokoder TomTom (fuzzy search: adres/miasto/POI/marka). Zwraca `GeoHit[]`. */
export async function tomtomGeocode(
  query: string,
  apiKey: string,
  opts?: { limit?: number; language?: string; countrySet?: string; near?: LatLng },
): Promise<GeoHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const p: string[] = [
    `key=${apiKey}`,
    `limit=${opts?.limit ?? 6}`,
    `language=${opts?.language ?? "pl-PL"}`,
  ];
  if (opts?.countrySet) p.push(`countrySet=${opts.countrySet}`);
  if (opts?.near) p.push(`lat=${opts.near.lat}`, `lon=${opts.near.lng}`);
  const url = `${TOMTOM_BASE}/search/2/search/${encodeURIComponent(q)}.json?${p.join("&")}`;
  const res = await tomtomFetch(url);
  if (!res.ok) throw new Error(`TomTom Search: ${res.status}`);
  const data = (await res.json()) as TTSearchResponse;
  const out: GeoHit[] = [];
  for (const r of data.results ?? []) {
    const pos = r.position;
    if (typeof pos?.lat !== "number" || typeof pos?.lon !== "number") continue;
    const name = r.poi?.name;
    const addr = r.address?.freeformAddress;
    const label = name ? (addr ? `${name}, ${addr}` : name) : (addr ?? q);
    out.push({ label, lat: pos.lat, lng: pos.lon });
  }
  return out;
}

export interface ReverseHit {
  country: string;
  city: string;
  postcode: string;
  label: string;
}

interface TTReverseResponse {
  addresses?: {
    address?: {
      freeformAddress?: string;
      municipality?: string;
      localName?: string;
      postalCode?: string;
      countryCode?: string;
    };
  }[];
}

/** Reverse-geocode TomTom (GPS → kraj/miasto/kod pocztowy) — do autouzupełniania formularzy. */
export async function tomtomReverseGeocode(
  lat: number,
  lng: number,
  apiKey: string,
  opts?: { language?: string },
): Promise<ReverseHit | null> {
  const url = `${TOMTOM_BASE}/search/2/reverseGeocode/${lat},${lng}.json?key=${apiKey}&language=${opts?.language ?? "pl-PL"}`;
  const res = await tomtomFetch(url);
  if (!res.ok) throw new Error(`TomTom Reverse: ${res.status}`);
  const data = (await res.json()) as TTReverseResponse;
  const a = data.addresses?.[0]?.address;
  if (!a) return null;
  return {
    country: (a.countryCode ?? "").toUpperCase(),
    city: a.municipality ?? a.localName ?? "",
    postcode: a.postalCode ?? "",
    label: a.freeformAddress ?? "",
  };
}

export interface TomTomPoi {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  distanceM?: number;
}

function mapPois(results: TTSearchResult[] | undefined): TomTomPoi[] {
  const out: TomTomPoi[] = [];
  for (const r of results ?? []) {
    const pos = r.position;
    if (typeof pos?.lat !== "number" || typeof pos?.lon !== "number") continue;
    out.push({
      id: r.id ?? `${pos.lat},${pos.lon}`,
      name: r.poi?.name ?? r.address?.freeformAddress ?? "POI",
      lat: pos.lat,
      lng: pos.lon,
      address: r.address?.freeformAddress ?? "",
      distanceM: typeof r.dist === "number" ? Math.round(r.dist) : undefined,
    });
  }
  return out;
}

/** POI w pobliżu (domyślnie stacje paliw + parkingi + truck stopy). */
export async function tomtomNearby(
  lat: number,
  lng: number,
  apiKey: string,
  opts?: { radiusM?: number; limit?: number; categorySet?: string; language?: string },
): Promise<TomTomPoi[]> {
  const cats =
    opts?.categorySet ??
    [TOMTOM_CATEGORY.fuel, TOMTOM_CATEGORY.parking, TOMTOM_CATEGORY.truckStop].join(",");
  const p: string[] = [
    `key=${apiKey}`,
    `lat=${lat}`,
    `lon=${lng}`,
    `radius=${opts?.radiusM ?? 25000}`,
    `limit=${opts?.limit ?? 20}`,
    `categorySet=${cats}`,
    `language=${opts?.language ?? "pl-PL"}`,
  ];
  const url = `${TOMTOM_BASE}/search/2/nearbySearch/.json?${p.join("&")}`;
  const res = await tomtomFetch(url);
  if (!res.ok) throw new Error(`TomTom Nearby: ${res.status}`);
  const data = (await res.json()) as TTSearchResponse;
  return mapPois(data.results);
}

/**
 * Szukanie WZDŁUŻ TRASY — POI (paliwo/parking/…) blisko wytyczonej trasy, w
 * granicy dodatkowego objazdu `maxDetourSec`. Kluczowe dla TIR: „gdzie zatankować po drodze".
 */
export async function tomtomSearchAlongRoute(
  routePoints: LatLng[],
  query: string,
  apiKey: string,
  opts?: { maxDetourSec?: number; limit?: number; categorySet?: string },
): Promise<TomTomPoi[]> {
  if (routePoints.length < 2) return [];
  const p: string[] = [
    `key=${apiKey}`,
    `maxDetourTime=${opts?.maxDetourSec ?? 600}`,
    `limit=${opts?.limit ?? 20}`,
  ];
  if (opts?.categorySet) p.push(`categorySet=${opts.categorySet}`);
  const url = `${TOMTOM_BASE}/search/2/searchAlongRoute/${encodeURIComponent(query)}.json?${p.join("&")}`;
  const body = JSON.stringify({
    route: { points: routePoints.map((pt) => ({ lat: pt.lat, lon: pt.lng })) },
  });
  const res = await tomtomFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!res.ok) throw new Error(`TomTom AlongRoute: ${res.status}`);
  const data = (await res.json()) as TTSearchResponse;
  return mapPois(data.results);
}
