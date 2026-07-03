/**
 * Wyjazdy (trasy) kierowcy — segmentacja zdarzeń trasy na „wyjazdy" bramkowane
 * zdarzeniami `start` … `end` (per pojazd) i rollup statystyk w oknie wyjazdu:
 * dystans (z liczników start/end), tankowania, spalanie, załadunki/rozładunki,
 * koszt, przychód (stawka €/km) i zysk. Funkcje czyste, deterministyczne, testowane.
 */
import { consumptionFullToFull } from "./billing";
import { round2 } from "./money";

export interface JourneyTripEvent {
  action: string; // start | end | load | unload | service | other
  driverId: string | null;
  vehicleId: string | null;
  odometerKm: number | null;
  weightKg: number | null;
  /** Kwota kosztu (service/other). */
  amount: number | null;
  /** Znacznik czasu ISO (sortowanie i okno wyjazdu). */
  createdAt: string;
}

export interface JourneyFuelEntry {
  vehicleId: string | null;
  createdAt: string;
  odometerKm: number;
  liters: number;
  priceTotal?: number | null;
  isFull?: boolean;
}

export interface Journey {
  vehicleId: string;
  driverId: string | null;
  /** Numer wyjazdu per pojazd (1 = najstarszy). */
  index: number;
  startAt: string;
  endAt: string | null;
  startKm: number | null;
  endKm: number | null;
  distanceKm: number | null;
  durationDays: number | null;
  loads: number;
  unloads: number;
  totalLoadKg: number;
  fuelings: number;
  fuelLiters: number;
  fuelCost: number;
  adblueLiters: number;
  adblueCost: number;
  serviceCost: number;
  otherCost: number;
  avgConsumptionLPer100km: number | null;
  cost: number;
  revenue: number | null;
  profit: number | null;
  marginPercent: number | null;
  /** Wyjazd bez zakończenia (kierowca jeszcze nie dał „zakończenie"). */
  open: boolean;
}

export interface BuildJourneysInput {
  trips: JourneyTripEvent[];
  fuel: JourneyFuelEntry[];
  adblue: JourneyFuelEntry[];
  /** Stawka €/km per pojazd (do przychodu/zysku). */
  ratePerKmByVehicle?: Record<string, number>;
}

interface OpenJourney {
  startAt: string;
  startKm: number | null;
  driverId: string | null;
  inner: JourneyTripEvent[];
}

function daysBetween(a: string, b: string): number | null {
  const t1 = Date.parse(a);
  const t2 = Date.parse(b);
  if (Number.isNaN(t1) || Number.isNaN(t2)) return null;
  return Math.max(0, Math.round((t2 - t1) / 86_400_000));
}

const FAR_FUTURE = "9999-12-31T23:59:59.999Z";

function makeJourney(
  vehicleId: string,
  index: number,
  cur: OpenJourney,
  endAt: string | null,
  endKm: number | null,
  open: boolean,
  input: BuildJourneysInput,
): Journey {
  const upper = endAt ?? FAR_FUTURE;
  const inWindow = (e: JourneyFuelEntry) =>
    e.vehicleId === vehicleId && e.createdAt >= cur.startAt && e.createdAt <= upper;
  const fuelIn = input.fuel.filter(inWindow);
  const adblueIn = input.adblue.filter(inWindow);

  const loadEvents = cur.inner.filter((e) => e.action === "load");
  const loads = loadEvents.length;
  const unloads = cur.inner.filter((e) => e.action === "unload").length;
  const totalLoadKg = round2(loadEvents.reduce((s, e) => s + (e.weightKg ?? 0), 0));
  const serviceCost = round2(
    cur.inner.filter((e) => e.action === "service").reduce((s, e) => s + (e.amount ?? 0), 0),
  );
  const otherCost = round2(
    cur.inner.filter((e) => e.action === "other").reduce((s, e) => s + (e.amount ?? 0), 0),
  );

  const fuelLiters = round2(fuelIn.reduce((s, e) => s + e.liters, 0));
  const fuelCost = round2(fuelIn.reduce((s, e) => s + (e.priceTotal ?? 0), 0));
  const adblueLiters = round2(adblueIn.reduce((s, e) => s + e.liters, 0));
  const adblueCost = round2(adblueIn.reduce((s, e) => s + (e.priceTotal ?? 0), 0));

  const startKm = cur.startKm;
  const distanceKm = startKm != null && endKm != null && endKm >= startKm ? endKm - startKm : null;

  const avgConsumptionLPer100km =
    distanceKm != null && distanceKm > 0 && fuelLiters > 0
      ? round2((fuelLiters / distanceKm) * 100)
      : consumptionFullToFull(
          fuelIn.map((e) => ({ odometerKm: e.odometerKm, liters: e.liters, isFull: e.isFull })),
        );

  const cost = round2(fuelCost + adblueCost + serviceCost + otherCost);
  const rate = input.ratePerKmByVehicle?.[vehicleId];
  const revenue = distanceKm != null && rate != null ? round2(distanceKm * rate) : null;
  const profit = revenue != null ? round2(revenue - cost) : null;
  const marginPercent =
    revenue != null && revenue > 0 ? round2(((revenue - cost) / revenue) * 100) : null;

  return {
    vehicleId,
    driverId: cur.driverId,
    index,
    startAt: cur.startAt,
    endAt,
    startKm,
    endKm,
    distanceKm,
    durationDays: endAt ? daysBetween(cur.startAt, endAt) : null,
    loads,
    unloads,
    totalLoadKg,
    fuelings: fuelIn.length,
    fuelLiters,
    fuelCost,
    adblueLiters,
    adblueCost,
    serviceCost,
    otherCost,
    avgConsumptionLPer100km,
    cost,
    revenue,
    profit,
    marginPercent,
    open,
  };
}

/**
 * Buduje listę wyjazdów ze zdarzeń trasy: dla każdego pojazdu segmentuje po
 * `start`…`end`. Zdarzenia między granicami (load/unload/service/other) oraz tankowania
 * w oknie czasowym wliczane są do wyjazdu. Wyjazd bez „end" jest `open`. Zdarzenia przed
 * pierwszym „start" są pomijane. Zwraca posortowane od najnowszego startu.
 */
export function buildJourneys(input: BuildJourneysInput): Journey[] {
  const byVehicle = new Map<string, JourneyTripEvent[]>();
  for (const t of input.trips) {
    if (!t.vehicleId) continue;
    const arr = byVehicle.get(t.vehicleId) ?? [];
    arr.push(t);
    byVehicle.set(t.vehicleId, arr);
  }

  const journeys: Journey[] = [];
  for (const [vehicleId, events] of byVehicle) {
    const sorted = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    let idx = 0;
    let cur: OpenJourney | null = null;
    for (const e of sorted) {
      if (e.action === "start") {
        if (cur) {
          idx++;
          journeys.push(makeJourney(vehicleId, idx, cur, null, null, true, input));
        }
        cur = { startAt: e.createdAt, startKm: e.odometerKm, driverId: e.driverId, inner: [] };
      } else if (e.action === "end") {
        if (cur) {
          idx++;
          journeys.push(makeJourney(vehicleId, idx, cur, e.createdAt, e.odometerKm, false, input));
          cur = null;
        }
      } else if (cur) {
        cur.inner.push(e);
      }
    }
    if (cur) {
      idx++;
      journeys.push(makeJourney(vehicleId, idx, cur, null, null, true, input));
    }
  }

  journeys.sort((a, b) => b.startAt.localeCompare(a.startAt));
  return journeys;
}
