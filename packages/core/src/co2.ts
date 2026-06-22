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

export interface Co2OrderEntry {
  shipper: string | null;
  vehicleId: string | null;
  price: number | null;
  currency: string;
  status: string;
}

export interface ClientCo2 {
  client: string;
  liters: number;
  co2Kg: number;
}

const CO2_REALIZED = new Set(["delivered", "invoiced"]);
const CO2_NO_CLIENT = "(bez nadawcy)";

/**
 * Emisje CO₂ przypisane do klientów (nadawców) — ten sam model atrybucji co
 * rentowność: litry paliwa pojazdu dzielone na jego zrealizowane zlecenia EUR
 * proporcjonalnie do przychodu, sumowane per nadawca → CO₂. Malejąco wg kg.
 */
export function co2ByClient(
  orders: Co2OrderEntry[],
  vehicleLiters: { vehicleId: string; liters: number }[],
): ClientCo2[] {
  const litersByVehicle = new Map<string, number>();
  for (const v of vehicleLiters) {
    litersByVehicle.set(v.vehicleId, (litersByVehicle.get(v.vehicleId) ?? 0) + v.liters);
  }
  const realized = orders.filter(
    (o) => CO2_REALIZED.has(o.status) && o.currency === "EUR" && o.price != null && o.price > 0,
  );
  const vehRevenue = new Map<string, number>();
  for (const o of realized) {
    if (o.vehicleId) {
      vehRevenue.set(o.vehicleId, (vehRevenue.get(o.vehicleId) ?? 0) + (o.price ?? 0));
    }
  }
  const litersByClient = new Map<string, number>();
  for (const o of realized) {
    const revenue = o.price ?? 0;
    const name = (o.shipper ?? "").trim() || CO2_NO_CLIENT;
    const vehRev = o.vehicleId ? (vehRevenue.get(o.vehicleId) ?? 0) : 0;
    const vehL = o.vehicleId ? (litersByVehicle.get(o.vehicleId) ?? 0) : 0;
    const attributed = vehRev > 0 ? (vehL * revenue) / vehRev : 0;
    litersByClient.set(name, (litersByClient.get(name) ?? 0) + attributed);
  }
  return [...litersByClient.entries()]
    .map(([client, liters]) => ({ client, liters: round2(liters), co2Kg: dieselCo2Kg(liters) }))
    .sort((a, b) => b.co2Kg - a.co2Kg);
}
