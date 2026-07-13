/**
 * #337: Eco-routing — szacunek zużycia paliwa, kosztu i emisji CO₂ dla trasy
 * oraz wybór wariantu najtańszego (paliwo + myto), nie tylko najszybszego.
 * Czysty silnik: heurystyka na bazie dystansu, spalania i ceny — bez API.
 */

import { DIESEL_CO2_KG_PER_L, dieselCo2Kg } from "./co2";

export interface RouteFuelInput {
  distanceKm: number;
  /** Średnie spalanie l/100 km (domyślnie 30 dla zestawu TIR). */
  avgConsumptionL100?: number;
  fuelPricePerL: number;
  /** Koszt myta na trasie (waluta) — domyślnie 0. */
  tollCost?: number;
}

export interface RouteFuelEstimate {
  distanceKm: number;
  fuelLiters: number;
  fuelCost: number;
  tollCost: number;
  totalCost: number;
  co2Kg: number;
}

const DEFAULT_CONSUMPTION = 30;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Szacuje paliwo, koszt i CO₂ dla jednej trasy. */
export function estimateRouteFuel(input: RouteFuelInput): RouteFuelEstimate {
  const distanceKm = Math.max(0, input.distanceKm);
  const consumption =
    input.avgConsumptionL100 && input.avgConsumptionL100 > 0
      ? input.avgConsumptionL100
      : DEFAULT_CONSUMPTION;
  const fuelLiters = round2((distanceKm * consumption) / 100);
  const fuelCost = round2(fuelLiters * Math.max(0, input.fuelPricePerL));
  const tollCost = round2(Math.max(0, input.tollCost ?? 0));
  return {
    distanceKm: round2(distanceKm),
    fuelLiters,
    fuelCost,
    tollCost,
    totalCost: round2(fuelCost + tollCost),
    co2Kg: dieselCo2Kg(fuelLiters),
  };
}

export interface RouteCandidate {
  /** Etykieta wariantu (np. „najszybsza", „bez autostrad"). */
  label: string;
  distanceKm: number;
  /** Czas przejazdu [min] — do informacji o kompromisie eco↔czas. */
  durationMin?: number;
  tollCost?: number;
}

export interface EcoPick {
  label: string;
  estimate: RouteFuelEstimate;
  durationMin: number | null;
  /** Oszczędność kosztu vs. wariant najszybszy [waluta] (0 gdy sam jest najszybszy). */
  savingsVsFastest: number;
  /** Dłużej niż najszybszy o tyle minut (0/ujemne = nie wolniej). */
  extraMinutes: number;
}

/**
 * Wybiera wariant najtańszy (paliwo + myto). Zwraca też porównanie z trasą
 * najszybszą (najkrótszy czas), by pokazać kompromis „taniej, ale wolniej".
 */
export function pickEcoRoute(
  candidates: RouteCandidate[],
  fuel: { avgConsumptionL100?: number; fuelPricePerL: number },
): EcoPick | null {
  if (candidates.length === 0) return null;
  const scored = candidates.map((c) => ({
    c,
    est: estimateRouteFuel({
      distanceKm: c.distanceKm,
      avgConsumptionL100: fuel.avgConsumptionL100,
      fuelPricePerL: fuel.fuelPricePerL,
      tollCost: c.tollCost,
    }),
  }));
  const cheapest = scored.reduce((a, b) => (b.est.totalCost < a.est.totalCost ? b : a));
  const withTime = scored.filter((s) => typeof s.c.durationMin === "number");
  const fastest = withTime.length
    ? withTime.reduce((a, b) => ((b.c.durationMin ?? 0) < (a.c.durationMin ?? 0) ? b : a))
    : null;
  return {
    label: cheapest.c.label,
    estimate: cheapest.est,
    durationMin: cheapest.c.durationMin ?? null,
    savingsVsFastest: fastest ? round2(fastest.est.totalCost - cheapest.est.totalCost) : 0,
    extraMinutes:
      fastest && typeof cheapest.c.durationMin === "number"
        ? Math.round(cheapest.c.durationMin - (fastest.c.durationMin ?? 0))
        : 0,
  };
}
