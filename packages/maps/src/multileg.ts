import { round2 } from "@e-logistic/core";
import type { LatLng, RouteRequest, RouteResult, RouteSegment, RoutingProvider } from "./types";

/**
 * Liczy trasę przez wiele punktów (start + przystanki + cel) jako sumę odcinków.
 * Każdy odcinek to osobne zapytanie do dostawcy — dzięki temu mamy myto i dystans
 * z podziałem na odcinki (wymóg ze specyfikacji), niezależnie od dostawcy.
 */
export async function routeMultiLeg(
  provider: RoutingProvider,
  req: RouteRequest,
): Promise<RouteResult> {
  const wps = req.waypoints;
  if (wps.length < 2) throw new RangeError("Trasa wymaga co najmniej 2 punktów.");

  const segments: RouteSegment[] = [];
  const geometry: LatLng[] = [];
  let distanceKm = 0;
  let durationMin = 0;
  let tollCost = 0;

  for (let i = 1; i < wps.length; i++) {
    const from = wps[i - 1];
    const to = wps[i];
    if (!from || !to) continue;

    const leg = await provider.route({ ...req, waypoints: [from, to] });
    segments.push({ from, to, distanceKm: leg.distanceKm, tollCost: leg.tollCost });
    for (const p of i === 1 ? leg.geometry : leg.geometry.slice(1)) geometry.push(p);
    distanceKm += leg.distanceKm;
    durationMin += leg.durationMin;
    tollCost += leg.tollCost;
  }

  return {
    distanceKm: round2(distanceKm),
    durationMin: round2(durationMin),
    tollCost: round2(tollCost),
    currency: req.currency ?? "EUR",
    segments,
    geometry,
    provider: provider.name,
  };
}
