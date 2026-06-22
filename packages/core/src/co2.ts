/**
 * Ślad węglowy floty z paliwa — raportowanie ESG/UE (CSRD) w TSL.
 * Współczynnik „tank-to-wheel" spalania oleju napędowego: ≈ 2,64 kg CO₂ / litr.
 * Funkcje czyste, bez zależności od UI.
 */
import { round2 } from "./money";

/** Emisja CO₂ ze spalania litra oleju napędowego (tank-to-wheel), kg/L. */
export const DIESEL_CO2_KG_PER_L = 2.64;

/** CO₂ (kg) z podanej liczby litrów oleju napędowego. */
export function dieselCo2Kg(liters: number): number {
  return round2(Math.max(0, liters) * DIESEL_CO2_KG_PER_L);
}

/** Intensywność emisji: kg CO₂ na 100 km przy danym spalaniu (L/100km). */
export function co2PerHundredKm(litersPer100km: number): number {
  return round2(Math.max(0, litersPer100km) * DIESEL_CO2_KG_PER_L);
}

/** Czytelny zapis emisji: kg poniżej tony, powyżej w tonach. */
export function formatCo2(kg: number): string {
  const v = Math.max(0, kg);
  return v >= 1000 ? `${round2(v / 1000)} t` : `${round2(v)} kg`;
}
