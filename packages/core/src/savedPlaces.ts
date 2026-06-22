/**
 * Zapisane miejsca (ulubione POI floty) + porównanie tras (delta).
 * Funkcje czyste, bez zależności od UI.
 */
import { round2 } from "./money";

export const SAVED_PLACE_CATEGORIES = [
  "fuel_station",
  "port",
  "customs",
  "company",
  "parking",
  "other",
] as const;
export type SavedPlaceCategory = (typeof SAVED_PLACE_CATEGORIES)[number];

export const SAVED_PLACE_CATEGORY_LABELS: Record<SavedPlaceCategory, string> = {
  fuel_station: "Stacja paliw",
  port: "Port",
  customs: "Odprawa celna",
  company: "Firma / kontrahent",
  parking: "Parking",
  other: "Inne",
};

/** Suma trasy do porównania (przychodzi z wyniku routingu). */
export interface RouteTotals {
  distanceKm: number;
  durationMin: number;
  tollEur: number;
}

export interface RouteDelta {
  distanceKm: number;
  durationMin: number;
  tollEur: number;
  /** true = trasa po zmianie jest dłuższa (dystans). */
  longer: boolean;
  /** true = bez realnej różnicy (wszystkie delty ≈ 0). */
  negligible: boolean;
}

/** Różnica „po − przed" dla trasy: dystans (km), czas (min), myto (€). */
export function routeDelta(before: RouteTotals, after: RouteTotals): RouteDelta {
  const distanceKm = round2(after.distanceKm - before.distanceKm);
  const durationMin = Math.round(after.durationMin - before.durationMin);
  const tollEur = round2(after.tollEur - before.tollEur);
  return {
    distanceKm,
    durationMin,
    tollEur,
    longer: distanceKm > 0,
    negligible: Math.abs(distanceKm) < 0.1 && durationMin === 0 && Math.abs(tollEur) < 0.01,
  };
}
