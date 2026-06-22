/**
 * Koszty pojazdu inne niż paliwo (naprawy, leasing, ubezpieczenie, podatki…).
 * Razem z kosztem paliwa pozwalają policzyć **dokładny zysk** floty.
 * Funkcje czyste, bez zależności od UI.
 */
import { round2 } from "./money";

export const VEHICLE_COST_CATEGORIES = [
  "repair",
  "leasing",
  "insurance",
  "tax",
  "fine",
  "parking",
  "tires",
  "other",
] as const;
export type VehicleCostCategory = (typeof VEHICLE_COST_CATEGORIES)[number];

export const VEHICLE_COST_CATEGORY_LABELS: Record<VehicleCostCategory, string> = {
  repair: "Naprawa / serwis",
  leasing: "Leasing / rata",
  insurance: "Ubezpieczenie",
  tax: "Podatek / opłaty",
  fine: "Mandat / kara",
  parking: "Parking / postój",
  tires: "Opony",
  other: "Inne",
};

export interface VehicleCostRecord {
  vehicleId: string;
  category: string;
  /** Kwota w EUR (waluty inne niż EUR pomijamy w sumach P&L). */
  amountEur: number;
}

export interface CostCategoryTotal {
  category: VehicleCostCategory;
  label: string;
  amountEur: number;
}

/** Suma kosztów wg kategorii (malejąco). Nieznane kategorie → „other". */
export function sumCostsByCategory(costs: VehicleCostRecord[]): CostCategoryTotal[] {
  const acc = new Map<VehicleCostCategory, number>();
  for (const c of costs) {
    const cat = (VEHICLE_COST_CATEGORIES as readonly string[]).includes(c.category)
      ? (c.category as VehicleCostCategory)
      : "other";
    acc.set(cat, (acc.get(cat) ?? 0) + c.amountEur);
  }
  return [...acc.entries()]
    .map(([category, amountEur]) => ({
      category,
      label: VEHICLE_COST_CATEGORY_LABELS[category],
      amountEur: round2(amountEur),
    }))
    .sort((a, b) => b.amountEur - a.amountEur);
}

/** Suma kosztów (EUR) per pojazd — wejście do atrybucji rentowności. */
export function sumCostsByVehicle(
  costs: VehicleCostRecord[],
): { vehicleId: string; cost: number }[] {
  const acc = new Map<string, number>();
  for (const c of costs) acc.set(c.vehicleId, (acc.get(c.vehicleId) ?? 0) + c.amountEur);
  return [...acc.entries()].map(([vehicleId, cost]) => ({ vehicleId, cost: round2(cost) }));
}

export interface FleetPnl {
  revenueEur: number;
  fuelEur: number;
  otherCostEur: number;
  totalCostEur: number;
  profitEur: number;
  marginPct: number | null;
}

/** Rachunek zysków i strat floty: przychód − paliwo − pozostałe koszty. */
export function fleetPnl(revenueEur: number, fuelEur: number, otherCostEur: number): FleetPnl {
  const rev = round2(revenueEur);
  const fuel = round2(fuelEur);
  const other = round2(otherCostEur);
  const totalCost = round2(fuel + other);
  const profit = round2(rev - totalCost);
  return {
    revenueEur: rev,
    fuelEur: fuel,
    otherCostEur: other,
    totalCostEur: totalCost,
    profitEur: profit,
    marginPct: rev > 0 ? round2((profit / rev) * 100) : null,
  };
}
