import { round2 } from "@e-logistic/core";
import { haversineKm } from "./geo";
import type { RouteRequest, RouteResult, RouteSegment, RoutingProvider } from "./types";

const BASE_TOLL_PER_KM = 0.18; // EUR/km (przybliżenie)
const AVG_SPEED_KMH = 70;

/** Mnożnik myta wg masy pojazdu (cięższy = droższe myto). Przybliżenie. */
function weightFactor(weightKg?: number): number {
  if (!weightKg) return 1;
  if (weightKg >= 12000) return 1.5;
  if (weightKg >= 7500) return 1.2;
  return 1;
}

/**
 * Provider mock — bez sieci i kluczy. Liczy trasę jako odcinki proste
 * (haversine) z przybliżonym mytem. Domyślny dostawca na etapie Fazy 2;
 * realne myto/omijania dostarczą adaptery HERE/GraphHopper.
 */
export class MockRoutingProvider implements RoutingProvider {
  readonly name = "mock";

  async route(req: RouteRequest): Promise<RouteResult> {
    if (req.waypoints.length < 2) {
      throw new RangeError("Trasa wymaga co najmniej 2 punktów.");
    }

    const avoidTolls = req.options?.avoidTolls ?? false;
    const factor = weightFactor(req.profile?.weightKg);

    const first = req.waypoints[0];
    if (!first) throw new RangeError("Trasa wymaga co najmniej 2 punktów.");

    const segments: RouteSegment[] = [];
    const geometry = [first];
    let distanceKm = 0;
    let tollCost = 0;

    for (let i = 1; i < req.waypoints.length; i++) {
      const from = req.waypoints[i - 1];
      const to = req.waypoints[i];
      if (!from || !to) continue;
      const segDistance = round2(haversineKm(from, to));
      const segToll = avoidTolls ? 0 : round2(segDistance * BASE_TOLL_PER_KM * factor);
      segments.push({ from, to, distanceKm: segDistance, tollCost: segToll });
      geometry.push(to);
      distanceKm += segDistance;
      tollCost += segToll;
    }

    return {
      distanceKm: round2(distanceKm),
      durationMin: round2((distanceKm / AVG_SPEED_KMH) * 60),
      tollCost: round2(tollCost),
      currency: req.currency ?? "EUR",
      segments,
      geometry,
      provider: this.name,
    };
  }
}
