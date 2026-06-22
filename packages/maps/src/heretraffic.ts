/**
 * HERE Traffic API v7 (flow) — natężenie ruchu w prostokącie mapy.
 * Wymaga planu HERE z dodatkiem Traffic. Czyste budowanie URL + parsowanie
 * odpowiedzi; samo pobieranie po stronie serwera (klucz nigdy w bundlu).
 */
import type { LatLng } from "./types";

export interface BBoxLngLat {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Odcinek ruchu: kształt + jamFactor (0 = płynnie, 10 = zablokowane). */
export interface TrafficFlow {
  shape: LatLng[];
  jamFactor: number;
}

/** URL do HERE Traffic v7 flow dla prostokąta (bbox: west,south,east,north). */
export function buildHereTrafficUrl(bbox: BBoxLngLat, apiKey: string): string {
  const inParam = `bbox:${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
  const qs = new URLSearchParams({
    locationReferencing: "shape",
    in: inParam,
    apiKey,
  });
  return `https://data.traffic.hereapi.com/v7/flow?${qs.toString()}`;
}

/** Kategoria natężenia z jamFactor — do kolorowania warstwy. */
export function jamSeverity(jamFactor: number): "free" | "moderate" | "heavy" | "blocked" {
  if (jamFactor >= 8) return "blocked";
  if (jamFactor >= 4) return "heavy";
  if (jamFactor >= 1.5) return "moderate";
  return "free";
}

interface HerePoint {
  lat?: number;
  lng?: number;
}
interface HereFlowResult {
  location?: { shape?: { links?: { points?: HerePoint[] }[] } };
  currentFlow?: { jamFactor?: number };
}

/** Parsuje odpowiedź HERE Traffic v7 flow → lista odcinków z kształtem i jamFactor. */
export function parseHereTraffic(json: unknown): TrafficFlow[] {
  const results = (json as { results?: HereFlowResult[] })?.results;
  if (!Array.isArray(results)) return [];
  const flows: TrafficFlow[] = [];
  for (const r of results) {
    const jamFactor = r.currentFlow?.jamFactor;
    if (typeof jamFactor !== "number") continue;
    const links = r.location?.shape?.links ?? [];
    const shape: LatLng[] = [];
    for (const link of links) {
      for (const p of link.points ?? []) {
        if (typeof p.lat === "number" && typeof p.lng === "number") {
          shape.push({ lat: p.lat, lng: p.lng });
        }
      }
    }
    if (shape.length >= 2) flows.push({ shape, jamFactor });
  }
  return flows;
}
