import { round2 } from "@e-logistic/core";
import type { LatLng, RouteRequest, RouteResult, RoutingProvider, VehicleKind } from "./types";

/** Mapuje typ pojazdu E-Logistic na profil GraphHopper. */
export function graphHopperProfile(kind?: VehicleKind): string {
  switch (kind) {
    case "van":
      return "small_truck";
    case "truck":
    case "tractor":
    case "trailer":
      return "truck";
    default:
      return "car";
  }
}

/** Buduje ciało żądania GraphHopper Routing API (czyste, testowalne). */
export function buildGraphHopperBody(req: RouteRequest): Record<string, unknown> {
  return {
    profile: graphHopperProfile(req.profile?.kind),
    points: req.waypoints.map((p) => [p.lng, p.lat]),
    points_encoded: false,
    locale: "pl",
    instructions: false,
    ...(req.options?.avoidFerries
      ? { custom_model: { priority: [{ if: "ferry", multiply_by: "0" }] } }
      : {}),
  };
}

interface GhPath {
  distance: number; // metry
  time: number; // ms
  points: { coordinates: [number, number][] };
}

/**
 * Adapter GraphHopper (hosted). Wymaga klucza API.
 * UWAGA: implementacja sieciowa nie jest testowana wobec żywego API —
 * domyślnym dostawcą pozostaje mock; tu jest gotowy szkielet do włączenia.
 */
export class GraphHopperRoutingProvider implements RoutingProvider {
  readonly name = "graphhopper";

  constructor(private readonly apiKey: string) {}

  async route(req: RouteRequest): Promise<RouteResult> {
    if (req.waypoints.length < 2) throw new RangeError("Trasa wymaga co najmniej 2 punktów.");

    const res = await fetch(`https://graphhopper.com/api/1/route?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildGraphHopperBody(req)),
    });
    if (!res.ok) throw new Error(`GraphHopper API: ${res.status}`);

    const data = (await res.json()) as { paths?: GhPath[] };
    const path = data.paths?.[0];
    if (!path) throw new Error("GraphHopper: brak trasy w odpowiedzi.");

    const distanceKm = round2(path.distance / 1000);
    const geometry: LatLng[] = path.points.coordinates.map(([lng, lat]) => ({ lat, lng }));

    return {
      distanceKm,
      durationMin: round2(path.time / 60000),
      tollCost: 0, // GraphHopper podstawowy nie zwraca myta — do uzupełnienia (custom_model/PTV)
      currency: req.currency ?? "EUR",
      segments: [],
      geometry,
      provider: this.name,
    };
  }
}
