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
