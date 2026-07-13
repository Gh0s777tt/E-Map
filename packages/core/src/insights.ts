/**
 * #335: Analityka floty — insighty liczone z realnych danych (bez zewnętrznego
 * AI): trend i prognoza kosztu paliwa (regresja liniowa), wykrywanie pojazdów
 * odstających spalaniem (mediana floty) i szacunek możliwych oszczędności.
 * Czysty silnik — tylko przeliczenie zagregowanych danych.
 */

export interface MonthlyPoint {
  /** Miesiąc „YYYY-MM". */
  month: string;
  /** Wartość (np. koszt paliwa w miesiącu). */
  value: number;
}

export interface VehicleConsumption {
  registration: string;
  /** Średnie spalanie l/100 km (null gdy brak danych — pomijany). */
  avgConsumption: number | null;
  /** Przebieg w okresie [km] (waży koszt odstępstwa). */
  km: number;
}

export interface TrendResult {
  direction: "up" | "down" | "flat";
  /** Zmiana ostatniego miesiąca vs. pierwszego w oknie [%]. */
  changePct: number;
  /** Prognoza wartości na kolejny miesiąc (regresja liniowa). */
  forecastNext: number;
  /** Nachylenie regresji (wartość/miesiąc). */
  slope: number;
}

export interface ConsumptionOutlier {
  registration: string;
  avgConsumption: number;
  /** Mediana spalania floty. */
  fleetMedian: number;
  /** O ile % powyżej mediany. */
  overMedianPct: number;
  /** Szacowany dodatkowy koszt paliwa w okresie [waluta]. */
  extraCost: number;
}

export interface FleetInsights {
  fuelTrend: TrendResult | null;
  outliers: ConsumptionOutlier[];
  /** Suma szacowanych oszczędności, gdyby odstający zeszli do mediany. */
  potentialSavings: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
}

/** Regresja liniowa metodą najmniejszych kwadratów; x = indeks miesiąca (0..n-1). */
export function linearTrend(series: MonthlyPoint[]): TrendResult | null {
  const pts = series.filter((p) => Number.isFinite(p.value));
  const n = pts.length;
  if (n < 2) return null;
  const xs = pts.map((_, i) => i);
  const ys = pts.map((p) => p.value);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - meanX) * (ys[i]! - meanY);
    den += (xs[i]! - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  const forecastNext = Math.max(0, round2(intercept + slope * n));
  const first = ys[0]!;
  const last = ys[n - 1]!;
  const changePct = first === 0 ? 0 : round2(((last - first) / first) * 100);
  const direction: TrendResult["direction"] =
    Math.abs(changePct) < 3 ? "flat" : changePct > 0 ? "up" : "down";
  return { direction, changePct, forecastNext, slope: round2(slope) };
}

/**
 * Pojazdy odstające spalaniem (> `thresholdPct`% powyżej mediany floty) wraz
 * z szacowanym dodatkowym kosztem: (spalanie − mediana)/100 × km × cena.
 */
export function consumptionOutliers(
  vehicles: VehicleConsumption[],
  fuelPricePerL: number,
  thresholdPct = 10,
): { median: number; outliers: ConsumptionOutlier[] } {
  const valid = vehicles.filter(
    (v): v is VehicleConsumption & { avgConsumption: number } =>
      typeof v.avgConsumption === "number" && v.avgConsumption > 0,
  );
  if (valid.length < 2) return { median: 0, outliers: [] };
  const med = median(valid.map((v) => v.avgConsumption));
  const outliers: ConsumptionOutlier[] = [];
  for (const v of valid) {
    const overPct = med === 0 ? 0 : round2(((v.avgConsumption - med) / med) * 100);
    if (overPct >= thresholdPct) {
      const extraLiters = ((v.avgConsumption - med) / 100) * Math.max(0, v.km);
      outliers.push({
        registration: v.registration,
        avgConsumption: v.avgConsumption,
        fleetMedian: round2(med),
        overMedianPct: overPct,
        extraCost: round2(extraLiters * fuelPricePerL),
      });
    }
  }
  outliers.sort((a, b) => b.extraCost - a.extraCost);
  return { median: round2(med), outliers };
}

/** Pełny zestaw insightów floty. */
export function buildFleetInsights(input: {
  monthlyFuelCost: MonthlyPoint[];
  vehicles: VehicleConsumption[];
  fuelPricePerL: number;
}): FleetInsights {
  const fuelTrend = linearTrend(input.monthlyFuelCost);
  const { outliers } = consumptionOutliers(input.vehicles, input.fuelPricePerL);
  const potentialSavings = round2(outliers.reduce((a, o) => a + o.extraCost, 0));
  return { fuelTrend, outliers, potentialSavings };
}
