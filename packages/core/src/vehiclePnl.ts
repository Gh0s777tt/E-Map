/**
 * Mini rachunek zysków i strat (P&L) pojedynczego pojazdu: przychód ze zleceń
 * minus paliwo minus pozostałe koszty = zysk; plus marża. Wartości w EUR
 * (zlecenia/koszty liczone w EUR; inne waluty pomijane wcześniej). Czyste.
 */
import { round2 } from "./money";

export interface VehiclePnlInput {
  /** Przychód EUR (zlecenia dostarczone/zafakturowane). */
  revenueEur: number;
  /** Wydatek na paliwo (EUR). */
  fuelEur: number;
  /** Pozostałe koszty pojazdu EUR (naprawy, leasing, ubezpieczenie…). */
  costsEur: number;
}

export interface VehiclePnl {
  revenue: number;
  fuel: number;
  costs: number;
  /** Zysk = przychód − paliwo − koszty (może być ujemny). */
  net: number;
  /** Marża netto w % przychodu; null gdy brak przychodu. */
  marginPct: number | null;
}

/** Liczy P&L pojazdu. Ujemne wejścia traktowane jak zero. */
export function vehiclePnl(input: VehiclePnlInput): VehiclePnl {
  const revenue = round2(Math.max(0, input.revenueEur));
  const fuel = round2(Math.max(0, input.fuelEur));
  const costs = round2(Math.max(0, input.costsEur));
  const net = round2(revenue - fuel - costs);
  return {
    revenue,
    fuel,
    costs,
    net,
    marginPct: revenue > 0 ? round2((net / revenue) * 100) : null,
  };
}

export interface FleetPnlOrder {
  vehicleId: string | null;
  price: number | null;
  currency: string;
  status: string;
}

export interface VehicleAmountEur {
  vehicleId: string;
  eur: number;
}

export interface VehiclePnlRow extends VehiclePnl {
  vehicleId: string;
}

const PNL_REALIZED = new Set(["delivered", "invoiced"]);

/**
 * Ranking P&L per pojazd: przychód EUR (zlecenia zrealizowane) − paliwo −
 * pozostałe koszty, dla każdego pojazdu osobno. Malejąco wg zysku. Obejmuje
 * pojazdy mające jakikolwiek przychód, paliwo lub koszt.
 */
export function fleetPnlByVehicle(
  orders: FleetPnlOrder[],
  fuelByVehicle: VehicleAmountEur[],
  costsByVehicle: VehicleAmountEur[],
): VehiclePnlRow[] {
  const revenue = new Map<string, number>();
  for (const o of orders) {
    if (
      !o.vehicleId ||
      !PNL_REALIZED.has(o.status) ||
      o.currency !== "EUR" ||
      o.price == null ||
      o.price <= 0
    ) {
      continue;
    }
    revenue.set(o.vehicleId, (revenue.get(o.vehicleId) ?? 0) + o.price);
  }
  const fuel = new Map<string, number>();
  for (const f of fuelByVehicle) fuel.set(f.vehicleId, (fuel.get(f.vehicleId) ?? 0) + f.eur);
  const costs = new Map<string, number>();
  for (const c of costsByVehicle) costs.set(c.vehicleId, (costs.get(c.vehicleId) ?? 0) + c.eur);

  const ids = new Set<string>([...revenue.keys(), ...fuel.keys(), ...costs.keys()]);
  return [...ids]
    .map((vehicleId) => ({
      vehicleId,
      ...vehiclePnl({
        revenueEur: revenue.get(vehicleId) ?? 0,
        fuelEur: fuel.get(vehicleId) ?? 0,
        costsEur: costs.get(vehicleId) ?? 0,
      }),
    }))
    .sort((a, b) => b.net - a.net || b.revenue - a.revenue);
}
