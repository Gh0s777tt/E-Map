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

export interface FuelAnomaly {
  fromKm: number;
  toKm: number;
  lPer100km: number;
  medianLPer100km: number;
  /** O ile % powyżej mediany pojazdu. */
  deltaPct: number;
}

/**
 * Wykrywa odcinki o spalaniu istotnie wyższym od mediany pojazdu — możliwy
 * wyciek/kradzież paliwa lub usterka. Mediana jest odporna na pojedyncze outliery.
 * Wymaga ≥ `minSegments` odcinków; `thresholdPct` = ile % ponad medianę (domyślnie 20).
 */
export function detectFuelAnomalies(
  segments: ConsumptionSegment[],
  opts?: { thresholdPct?: number; minSegments?: number },
): FuelAnomaly[] {
  const threshold = opts?.thresholdPct ?? 20;
  const minSegments = opts?.minSegments ?? 3;
  if (segments.length < minSegments) return [];
  const values = segments.map((s) => s.lPer100km).sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  const median =
    values.length % 2 === 0
      ? ((values[mid - 1] ?? 0) + (values[mid] ?? 0)) / 2
      : (values[mid] ?? 0);
  if (median <= 0) return [];
  const out: FuelAnomaly[] = [];
  for (const s of segments) {
    const deltaPct = round2(((s.lPer100km - median) / median) * 100);
    if (deltaPct >= threshold) {
      out.push({
        fromKm: s.fromKm,
        toKm: s.toKm,
        lPer100km: s.lPer100km,
        medianLPer100km: round2(median),
        deltaPct,
      });
    }
  }
  return out;
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

export interface FuelEntryFull extends FuelEntry {
  /** Czy „do pełna" (domyślnie true). Tylko pełne baki są granicami okna spalania. */
  isFull?: boolean;
}

/**
 * Spalanie metodą full-to-full: dystans liczony między pierwszym a ostatnim
 * pełnym bakiem, litry = suma wszystkich tankowań PO pierwszym pełnym do ostatniego
 * pełnego włącznie (uwzględnia tankowania częściowe pomiędzy). Najdokładniejsza metoda.
 * Zwraca `null`, gdy mniej niż 2 pełne baki lub dystans = 0.
 */
export function consumptionFullToFull(entries: FuelEntryFull[]): number | null {
  const sorted = [...entries].sort((a, b) => a.odometerKm - b.odometerKm);
  const fullPositions = sorted
    .map((e, i) => ({ i, full: e.isFull !== false }))
    .filter((x) => x.full)
    .map((x) => x.i);
  if (fullPositions.length < 2) return null;
  const firstIdx = fullPositions[0];
  const lastIdx = fullPositions[fullPositions.length - 1];
  if (firstIdx === undefined || lastIdx === undefined) return null;
  const first = sorted[firstIdx];
  const last = sorted[lastIdx];
  if (!first || !last) return null;
  const distance = last.odometerKm - first.odometerKm;
  if (distance <= 0) return null;
  let liters = 0;
  for (let i = firstIdx + 1; i <= lastIdx; i++) liters += sorted[i]?.liters ?? 0;
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

// ── Rozliczenie okresowe (paliwo + AdBlue + trasy → koszt/zysk) ─────

export interface SettlementFuelEntry extends FuelEntryFull {
  priceTotal?: number;
}

export interface SettlementInput {
  /** Tankowania paliwa w okresie (do dystansu, litrów, kosztu, spalania). */
  fuel: SettlementFuelEntry[];
  /** Tankowania AdBlue (litry + koszt). */
  adblue: { liters: number; priceTotal?: number }[];
  /** Zdarzenia trasy — koszty serwisu/innych z pola `amount`. */
  trips: { action: string; amount?: number | null }[];
  /** Stawka frachtu za km (opcjonalnie — do przychodu/zysku). */
  ratePerKm?: number;
  /** Myto za okres (opcjonalnie — wliczane do kosztów). */
  tollCost?: number;
}

export interface Settlement {
  distanceKm: number;
  fuelLiters: number;
  fuelCost: number;
  avgConsumptionLPer100km: number | null;
  adblueLiters: number;
  adblueCost: number;
  serviceCost: number;
  otherCost: number;
  tollCost: number;
  totalCost: number;
  revenue: number;
  profit: number;
  marginPercent: number | null;
}

/**
 * Buduje rozliczenie okresu dla pojazdu: dystans z liczników tankowań,
 * koszt paliwa/AdBlue (sumy `priceTotal`), koszty serwis/inne ze zdarzeń trasy,
 * opcjonalne myto i przychód wg stawki za km → koszt całkowity i zysk.
 */
export function buildSettlement(input: SettlementInput): Settlement {
  const fuelStats = summarizeFuel(
    input.fuel.map((e) => ({
      odometerKm: e.odometerKm,
      liters: e.liters,
      priceTotal: e.priceTotal,
    })),
  );
  const adblueLiters = round2(input.adblue.reduce((s, e) => s + e.liters, 0));
  const adblueCost = round2(input.adblue.reduce((s, e) => s + (e.priceTotal ?? 0), 0));
  const serviceCost = round2(
    input.trips.filter((t) => t.action === "service").reduce((s, t) => s + (t.amount ?? 0), 0),
  );
  const otherCost = round2(
    input.trips.filter((t) => t.action === "other").reduce((s, t) => s + (t.amount ?? 0), 0),
  );
  const tollCost = round2(input.tollCost ?? 0);
  const distanceKm = fuelStats.totalDistanceKm;

  const totalCost = round2(fuelStats.totalSpend + adblueCost + serviceCost + otherCost + tollCost);
  const revenue = round2(distanceKm * (input.ratePerKm ?? 0));
  const { profit, marginPercent } = tripProfit(revenue, totalCost);

  return {
    distanceKm,
    fuelLiters: fuelStats.totalLiters,
    fuelCost: fuelStats.totalSpend,
    avgConsumptionLPer100km: consumptionFullToFull(input.fuel),
    adblueLiters,
    adblueCost,
    serviceCost,
    otherCost,
    tollCost,
    totalCost,
    revenue,
    profit,
    marginPercent,
  };
}

/**
 * Ostatnia cena jednostkowa [waluta/L] z historii tankowań (do podpowiedzi w formularzu).
 * Wpisy zakładane jako od najnowszego; bierze pierwszy z dodatnią kwotą i litrami.
 * Zwraca `null`, gdy brak danych do wyliczenia.
 */
export function latestUnitPrice(
  entries: { liters: number; priceTotal?: number | null }[],
): number | null {
  for (const e of entries) {
    if (e.priceTotal != null && e.priceTotal > 0 && e.liters > 0) {
      return round2(e.priceTotal / e.liters);
    }
  }
  return null;
}

// ── Zestawienie miesięczne floty (przychód ze zleceń vs koszty) ─────

export interface MonthlyOrderEntry {
  vehicleId: string | null;
  price: number | null;
  currency: string;
  status: string;
  /** Data atrybucji (YYYY-MM-DD) — np. data załadunku lub utworzenia zlecenia. */
  date: string;
}

export interface MonthlyCostEntry {
  vehicleId: string | null;
  priceTotal: number | null;
  /** Data zdarzenia (YYYY-MM-DD). */
  date: string;
}

export interface MonthlyVehicleRow {
  vehicleId: string | null;
  revenueEur: number;
  fuelCost: number;
  adblueCost: number;
  /** Przychód − koszty (paliwo + AdBlue). */
  net: number;
}

export interface MonthlyFleetSummary {
  month: string;
  rows: MonthlyVehicleRow[];
  totals: { revenueEur: number; fuelCost: number; adblueCost: number; net: number };
}

/**
 * Miesięczne zestawienie floty: przychód ze zleceń (status `delivered`/`invoiced`,
 * waluta EUR) zestawiony z kosztami paliwa i AdBlue — per pojazd. Atrybucja po
 * miesiącu `YYYY-MM` (prefiks daty). Pozycje bez pojazdu trafiają do wiersza `null`.
 * Inne waluty zleceń są świadomie pomijane w sumie EUR (bez kursów). Funkcja czysta.
 */
export function monthlyFleetSummary(input: {
  month: string;
  orders: MonthlyOrderEntry[];
  fuel: MonthlyCostEntry[];
  adblue: MonthlyCostEntry[];
}): MonthlyFleetSummary {
  const rev = new Map<string | null, number>();
  const fc = new Map<string | null, number>();
  const ac = new Map<string | null, number>();
  const add = (m: Map<string | null, number>, k: string | null, v: number) =>
    m.set(k, (m.get(k) ?? 0) + v);
  const inMonth = (d: string) => d.slice(0, 7) === input.month;

  for (const o of input.orders) {
    if (!inMonth(o.date) || o.currency !== "EUR") continue;
    if (o.status !== "delivered" && o.status !== "invoiced") continue;
    add(rev, o.vehicleId, o.price ?? 0);
  }
  for (const f of input.fuel) {
    if (inMonth(f.date)) add(fc, f.vehicleId, f.priceTotal ?? 0);
  }
  for (const a of input.adblue) {
    if (inMonth(a.date)) add(ac, a.vehicleId, a.priceTotal ?? 0);
  }

  const keys = new Set<string | null>([...rev.keys(), ...fc.keys(), ...ac.keys()]);
  const rows: MonthlyVehicleRow[] = [];
  for (const k of keys) {
    const revenueEur = round2(rev.get(k) ?? 0);
    const fuelCostV = round2(fc.get(k) ?? 0);
    const adblueCostV = round2(ac.get(k) ?? 0);
    rows.push({
      vehicleId: k,
      revenueEur,
      fuelCost: fuelCostV,
      adblueCost: adblueCostV,
      net: round2(revenueEur - fuelCostV - adblueCostV),
    });
  }
  rows.sort((a, b) => b.net - a.net);

  return {
    month: input.month,
    rows,
    totals: {
      revenueEur: round2(rows.reduce((s, r) => s + r.revenueEur, 0)),
      fuelCost: round2(rows.reduce((s, r) => s + r.fuelCost, 0)),
      adblueCost: round2(rows.reduce((s, r) => s + r.adblueCost, 0)),
      net: round2(rows.reduce((s, r) => s + r.net, 0)),
    },
  };
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
