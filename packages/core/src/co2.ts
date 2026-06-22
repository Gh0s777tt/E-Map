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

export interface VehicleFuelInput {
  id: string;
  registration: string;
  /** Litry oleju napędowego w okresie. */
  liters: number;
  /** Średnie spalanie L/100km (opcjonalnie, do intensywności). */
  consumption?: number | null;
}

export interface VehicleCo2Row {
  id: string;
  registration: string;
  liters: number;
  co2Kg: number;
  co2Per100Km: number | null;
}

/** Emisje CO₂ per pojazd (malejąco wg kg). Pusta lista → pusto. */
export function co2ByVehicle(vehicles: VehicleFuelInput[]): VehicleCo2Row[] {
  return vehicles
    .map((v) => ({
      id: v.id,
      registration: v.registration,
      liters: round2(Math.max(0, v.liters)),
      co2Kg: dieselCo2Kg(v.liters),
      co2Per100Km: v.consumption != null ? co2PerHundredKm(v.consumption) : null,
    }))
    .sort((a, b) => b.co2Kg - a.co2Kg);
}
