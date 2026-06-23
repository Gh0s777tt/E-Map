/**
 * Miesięczna agregacja paliwa (litry + wydatek) dla zadanych miesięcy.
 * Czyste — wejście to tankowania z datą; wyjście to punkty per miesiąc
 * (w kolejności `months`, z zerami dla miesięcy bez tankowań).
 */
import { round2 } from "./money";

export interface FuelMonthInput {
  /** Data tankowania (YYYY-MM-DD lub dłuższa — liczy się prefiks YYYY-MM). */
  date: string;
  liters: number;
  spend: number;
}

export interface FuelMonthPoint {
  month: string;
  liters: number;
  spend: number;
}

/** Sumuje litry i wydatek per miesiąc dla podanej listy miesięcy (`YYYY-MM`). */
export function fuelByMonth(entries: FuelMonthInput[], months: string[]): FuelMonthPoint[] {
  const liters = new Map<string, number>();
  const spend = new Map<string, number>();
  for (const e of entries) {
    const mk = (e.date ?? "").slice(0, 7);
    liters.set(mk, (liters.get(mk) ?? 0) + Math.max(0, e.liters));
    spend.set(mk, (spend.get(mk) ?? 0) + Math.max(0, e.spend));
  }
  return months.map((month) => ({
    month,
    liters: round2(liters.get(month) ?? 0),
    spend: round2(spend.get(month) ?? 0),
  }));
}
