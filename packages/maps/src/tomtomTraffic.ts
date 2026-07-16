/**
 * TomTom Traffic Incidents API v5 (#356) — wypadki, roboty drogowe, zamknięcia,
 * korki w danym prostokącie (bbox). Do narysowania warstwy zdarzeń na mapie TIR.
 */
import { TOMTOM_BASE, tomtomFetch } from "./tomtom";
import type { LatLng } from "./types";

export type TrafficSeverity = "unknown" | "minor" | "moderate" | "major" | "closure";

export interface TrafficIncident {
  id: string;
  severity: TrafficSeverity;
  /** Kod ikony TomTom (1..14): 1 accident, 6 jam, 7 roadworks, 8 closure… */
  iconCategory: number;
  description: string;
  /** Punkt reprezentatywny zdarzenia. */
  point: LatLng;
}

const SEVERITY_BY_DELAY: TrafficSeverity[] = ["unknown", "minor", "moderate", "major"];

interface TTIncident {
  properties?: {
    id?: string;
    iconCategory?: number;
    magnitudeOfDelay?: number;
    events?: { description?: string }[];
  };
  geometry?: { type?: string; coordinates?: unknown };
}
interface TTTrafficResponse {
  incidents?: TTIncident[];
}

/** Pierwszy punkt geometrii (Point → [lon,lat]; LineString → [[lon,lat],…]). */
function firstPoint(coordinates: unknown): LatLng | null {
  if (!Array.isArray(coordinates)) return null;
  const c = coordinates as unknown[];
  if (typeof c[0] === "number" && typeof c[1] === "number") {
    return { lng: c[0] as number, lat: c[1] as number };
  }
  const inner = c[0];
  if (Array.isArray(inner) && typeof inner[0] === "number" && typeof inner[1] === "number") {
    return { lng: inner[0] as number, lat: inner[1] as number };
  }
  return null;
}

/**
 * Incydenty ruchu w prostokącie. `bbox`: `minLng,minLat,maxLng,maxLat`.
 * `iconCategory` 8 = zamknięcie → severity "closure".
 */
export async function tomtomTrafficIncidents(
  bbox: string,
  apiKey: string,
  opts?: { language?: string },
): Promise<TrafficIncident[]> {
  const fields =
    "{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description}}}}";
  const p: string[] = [
    `key=${apiKey}`,
    `bbox=${bbox}`,
    `fields=${encodeURIComponent(fields)}`,
    `language=${opts?.language ?? "pl-PL"}`,
    "timeValidityFilter=present",
  ];
  const url = `${TOMTOM_BASE}/traffic/services/5/incidentDetails?${p.join("&")}`;
  const res = await tomtomFetch(url);
  if (!res.ok) throw new Error(`TomTom Traffic: ${res.status}`);
  const data = (await res.json()) as TTTrafficResponse;

  const out: TrafficIncident[] = [];
  for (const inc of data.incidents ?? []) {
    const point = firstPoint(inc.geometry?.coordinates);
    if (!point) continue;
    const icon = inc.properties?.iconCategory ?? 0;
    const delay = inc.properties?.magnitudeOfDelay ?? 0;
    const severity: TrafficSeverity =
      icon === 8 ? "closure" : (SEVERITY_BY_DELAY[delay] ?? "unknown");
    out.push({
      id: inc.properties?.id ?? `${point.lat},${point.lng}`,
      severity,
      iconCategory: icon,
      description: inc.properties?.events?.[0]?.description ?? "",
      point,
    });
  }
  return out;
}
