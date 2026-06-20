import { round2 } from "@e-logistic/core";
import { haversineKm } from "./geo";
import { estimateTollEur } from "./toll";
import type { RouteRequest, RouteResult, RouteSegment, RoutingProvider } from "./types";

const AVG_SPEED_KMH = 70;

/**
 * Provider mock — bez sieci i kluczy. Liczy trasę jako odcinki proste
 * (haversine) z przybliżonym mytem. Domyślny dostawca na etapie Fazy 2;
 * realne trasy/myto dostarczą adaptery HERE/GraphHopper.
 */
export class MockRoutingProvider implements RoutingProvider {
  readonly name = "mock";

  async route(req: RouteRequest): Promise<RouteResult> {
    if (req.waypoints.length < 2) {
      throw new RangeError("Trasa wymaga co najmniej 2 punktów.");
    }

    const avoidTolls = req.options?.avoidTolls ?? false;
    const weightKg = req.profile?.weightKg;

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
      const segToll = estimateTollEur(segDistance, { weightKg, avoidTolls });
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
