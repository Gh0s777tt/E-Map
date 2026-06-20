/**
 * Silnik rozliczeń E-Logistic — funkcje czyste, deterministyczne, testowane.
 * Liczy spalanie, koszt paliwa po rabacie karty oraz zysk z trasy.
 *
 * Wszystkie kwoty zaokrąglane przez {@link round2}.
 */
import { round2 } from "./money";

// ── Spalanie ────────────────────────────────────────────────────────

export interface FuelEntry {
  /** Stan licznika (km) w chwili tankowania. */
  odometerKm: number;
  /** Zatankowane litry (paliwo lub AdBlue — ten sam wzór). */
  liters: number;
}

export interface ConsumptionSegment {
  fromKm: number;
  toKm: number;
  distanceKm: number;
  liters: number;
  lPer100km: number;
}

/** Spalanie [L/100km] dla pojedynczego odcinka. */
export function consumptionLPer100km(distanceKm: number, liters: number): number {
  if (distanceKm <= 0) throw new RangeError("distanceKm musi być > 0");
  if (liters < 0) throw new RangeError("liters nie może być ujemne");
  return round2((liters / distanceKm) * 100);
}

/**
 * Spalanie metodą „tank-to-tank": dla każdego kolejnego tankowania litry
 * z bieżącego wpisu pokrywają dystans od poprzedniego stanu licznika.
 * Wpisy są sortowane rosnąco po `odometerKm`.
 */
export function fuelConsumptionSeries(entries: FuelEntry[]): ConsumptionSegment[] {
  const sorted = [...entries].sort((a, b) => a.odometerKm - b.odometerKm);
  const segments: ConsumptionSegment[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (!prev || !curr) continue;
    const distanceKm = curr.odometerKm - prev.odometerKm;
    if (distanceKm <= 0) continue;
    segments.push({
      fromKm: prev.odometerKm,
      toKm: curr.odometerKm,
      distanceKm,
      liters: curr.liters,
      lPer100km: consumptionLPer100km(distanceKm, curr.liters),
    });
  }
  return segments;
}

/**
 * Zagregowane spalanie [L/100km] dla serii tankowań.
 * Litry pierwszego wpisu są pomijane (to „pełny bak" startowy),
 * dystans liczony od pierwszego do ostatniego licznika.
 * Zwraca `null`, gdy danych jest za mało lub dystans = 0.
 */
export function aggregateConsumptionLPer100km(entries: FuelEntry[]): number | null {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.odometerKm - b.odometerKm);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) return null;
  const distance = last.odometerKm - first.odometerKm;
  if (distance <= 0) return null;
  const liters = sorted.slice(1).reduce((sum, e) => sum + e.liters, 0);
  return consumptionLPer100km(distance, liters);
}

// ── Koszt paliwa (z rabatem karty) ──────────────────────────────────

/** Cena za litr po uwzględnieniu rabatu karty paliwowej (0–100%). */
export function effectiveFuelPrice(pricePerLiter: number, discountPercent = 0): number {
  if (pricePerLiter < 0) throw new RangeError("pricePerLiter nie może być ujemne");
  if (discountPercent < 0 || discountPercent > 100)
    throw new RangeError("discountPercent musi być w zakresie 0–100");
  return round2(pricePerLiter * (1 - discountPercent / 100));
}

/** Koszt tankowania = litry × cena efektywna (po rabacie). */
export function fuelCost(liters: number, pricePerLiter: number, discountPercent = 0): number {
  if (liters < 0) throw new RangeError("liters nie może być ujemne");
  return round2(liters * effectiveFuelPrice(pricePerLiter, discountPercent));
}

// ── Ekonomia trasy ──────────────────────────────────────────────────

/** Dystans trasy z liczników (km). Rzuca, gdy koniec < start. */
export function tripDistanceKm(startKm: number, endKm: number): number {
  const distance = endKm - startKm;
  if (distance < 0) throw new RangeError("endKm nie może być mniejsze niż startKm");
  return distance;
}

/** Przychód z trasy = dystans × stawka za km. */
export function tripRevenue(distanceKm: number, ratePerKm: number): number {
  if (distanceKm < 0) throw new RangeError("distanceKm nie może być ujemne");
  if (ratePerKm < 0) throw new RangeError("ratePerKm nie może być ujemne");
  return round2(distanceKm * ratePerKm);
}

export interface TripCostBreakdown {
  fuel?: number;
  adblue?: number;
  service?: number;
  other?: number;
}

/** Łączny koszt trasy = paliwo + AdBlue + serwis + inne. */
export function tripCost(b: TripCostBreakdown): number {
  return round2((b.fuel ?? 0) + (b.adblue ?? 0) + (b.service ?? 0) + (b.other ?? 0));
}

export interface TripProfit {
  revenue: number;
  cost: number;
  profit: number;
  /** Marża w % (null, gdy przychód = 0). */
  marginPercent: number | null;
}

/** Zysk z trasy = przychód − koszt (+ marża). */
export function tripProfit(revenue: number, cost: number): TripProfit {
  const profit = round2(revenue - cost);
  const marginPercent = revenue > 0 ? round2((profit / revenue) * 100) : null;
  return { revenue: round2(revenue), cost: round2(cost), profit, marginPercent };
}

export interface TripSettlementInput {
  startKm: number;
  endKm: number;
  ratePerKm: number;
  costs: TripCostBreakdown;
}

export interface TripSettlement extends TripProfit {
  distanceKm: number;
}

/** Kompletne rozliczenie trasy: dystans → przychód → koszt → zysk. */
export function computeTripSettlement(input: TripSettlementInput): TripSettlement {
  const distanceKm = tripDistanceKm(input.startKm, input.endKm);
  const revenue = tripRevenue(distanceKm, input.ratePerKm);
  const cost = tripCost(input.costs);
  return { distanceKm, ...tripProfit(revenue, cost) };
}

// ── Podsumowanie paliwa (statystyki) ────────────────────────────────

export interface FuelStatsEntry {
  odometerKm: number;
  liters: number;
  priceTotal?: number;
}

export interface FuelStats {
  count: number;
  totalLiters: number;
  totalDistanceKm: number;
  avgConsumptionLPer100km: number | null;
  totalSpend: number;
}

/** Zbiorcze statystyki paliwa dla zestawu tankowań (np. jednego pojazdu). */
export function summarizeFuel(entries: FuelStatsEntry[]): FuelStats {
  const totalLiters = round2(entries.reduce((sum, e) => sum + e.liters, 0));
  const totalSpend = round2(entries.reduce((sum, e) => sum + (e.priceTotal ?? 0), 0));
  const avgConsumptionLPer100km = aggregateConsumptionLPer100km(entries);

  let totalDistanceKm = 0;
  if (entries.length >= 2) {
    const sorted = [...entries].sort((a, b) => a.odometerKm - b.odometerKm);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (first && last) totalDistanceKm = Math.max(0, last.odometerKm - first.odometerKm);
  }

  return {
    count: entries.length,
    totalLiters,
    totalDistanceKm,
    avgConsumptionLPer100km,
    totalSpend,
  };
}
