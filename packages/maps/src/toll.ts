import { round2 } from "@e-logistic/core";

const BASE_TOLL_PER_KM = 0.18; // EUR/km (przybliżenie)

/** Mnożnik myta wg masy pojazdu (cięższy = droższe myto). Przybliżenie. */
export function tollWeightFactor(weightKg?: number): number {
  if (!weightKg) return 1;
  if (weightKg >= 12000) return 1.5;
  if (weightKg >= 7500) return 1.2;
  return 1;
}

/**
 * Szacunkowe myto [EUR] dla dystansu. Używane przez provider mock oraz do
 * uzupełnienia wyników dostawców, którzy nie zwracają myta (np. GraphHopper free).
 */
export function estimateTollEur(
  distanceKm: number,
  opts: { weightKg?: number; avoidTolls?: boolean } = {},
): number {
  if (opts.avoidTolls) return 0;
  return round2(distanceKm * BASE_TOLL_PER_KM * tollWeightFactor(opts.weightKg));
}
