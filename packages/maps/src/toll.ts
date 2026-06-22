import { round2 } from "@e-logistic/core";

const BASE_TOLL_PER_KM = 0.18; // EUR/km na odcinku płatnym (przybliżenie)
// Nie cała trasa jest płatna (miasta, drogi krajowe, kraje bez myta) — myto liczymy
// tylko od części dystansu. ~0.6 ≈ udział autostrad płatnych w trasie międzynarodowej.
const TOLLED_FRACTION = 0.6;
// Realna średnia prędkość TIR (limiter 90 km/h + postoje, ruch, miasta, granice).
const TRUCK_AVG_KMH = 68;

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
 * Świadome przybliżenie (nie cała trasa płatna) — UI oznacza wynik jako „szac.".
 */
export function estimateTollEur(
  distanceKm: number,
  opts: { weightKg?: number; avoidTolls?: boolean } = {},
): number {
  if (opts.avoidTolls) return 0;
  return round2(distanceKm * BASE_TOLL_PER_KM * TOLLED_FRACTION * tollWeightFactor(opts.weightKg));
}

/**
 * Szacunkowy czas jazdy TIR [min] z dystansu — realna średnia prędkość ciężarówki.
 * Używane gdy dostawca nie zwraca czasu TIR (mock, GraphHopper na profilu „car").
 */
export function estimateTruckDurationMin(distanceKm: number): number {
  return round2((distanceKm / TRUCK_AVG_KMH) * 60);
}
