/**
 * [#382] Przypisanie kosztów operacyjnych do wyjazdu.
 *
 * `buildJourneys` liczy koszt wyjazdu z paliwa, AdBlue i kwot przy zdarzeniach
 * trasy — bo tylko te dane zna. Parkingi, myto, promy i mandaty siedzą
 * w osobnych tabelach Fazy 6 i do żadnego wyjazdu nie trafiały, więc rachunek
 * pojedynczej trasy był zaniżony dokładnie o to, co kierowca płaci po drodze.
 *
 * Przypisujemy po pojeździe i po OKNIE CZASOWYM wyjazdu, bo to jedyne wiązanie,
 * jakie w danych istnieje: postój ani bramka nie niosą numeru wyjazdu.
 * Wyjazd otwarty (bez „zakończenia") łapie wszystko od swojego startu — i tak
 * ma być, bo trwa.
 */
import type { Journey } from "./journeys";
import { round2 } from "./money";
import type { OperatingCostKind } from "./operatingCosts";

/** Koszt operacyjny gotowy do przypisania — kwota JUŻ w euro. */
export interface JourneyOperatingCost {
  vehicleId: string | null;
  /** Znacznik czasu zdarzenia (ISO). */
  occurredAt: string;
  kind: OperatingCostKind;
  eur: number;
}

/** Klucz wyjazdu: pojazd + numer. Ten sam, którego używa ekran do oznaczania kart. */
export function journeyKey(j: Pick<Journey, "vehicleId" | "index">): string {
  return `${j.vehicleId}-${j.index}`;
}

export interface JourneyExtra {
  /** Suma kosztów operacyjnych przypisanych do wyjazdu (euro). */
  eur: number;
  /** Rozbicie na rodzaje — do pokazania na karcie. */
  byKind: { kind: OperatingCostKind; eur: number }[];
  count: number;
}

/**
 * Rozdziela koszty operacyjne pomiędzy wyjazdy.
 *
 * Pozycja, która nie mieści się w oknie żadnego wyjazdu tego pojazdu, NIE jest
 * doklejana do najbliższego: trafia do `unassigned`. Doklejenie „na oko"
 * wyglądałoby jak precyzja, a byłoby zgadywaniem — a to rachunek konkretnej
 * trasy, nie szacunek.
 */
export function attachOperatingCosts(
  journeys: readonly Journey[],
  costs: readonly JourneyOperatingCost[],
): { byJourney: Map<string, JourneyExtra>; unassignedEur: number; unassignedCount: number } {
  const byJourney = new Map<string, JourneyExtra>();
  let unassignedEur = 0;
  let unassignedCount = 0;

  // Wyjazdy pogrupowane po pojeździe — pozycja może należeć tylko do wyjazdu
  // tego samego auta.
  const byVehicle = new Map<string, Journey[]>();
  for (const j of journeys) {
    const list = byVehicle.get(j.vehicleId) ?? [];
    list.push(j);
    byVehicle.set(j.vehicleId, list);
  }

  for (const c of costs) {
    if (!c.vehicleId || !Number.isFinite(c.eur)) {
      unassignedEur += Number.isFinite(c.eur) ? c.eur : 0;
      unassignedCount += 1;
      continue;
    }
    const candidates = byVehicle.get(c.vehicleId) ?? [];
    const hit = candidates.find(
      (j) => c.occurredAt >= j.startAt && (j.endAt === null || c.occurredAt <= j.endAt),
    );
    if (!hit) {
      unassignedEur += c.eur;
      unassignedCount += 1;
      continue;
    }
    const key = journeyKey(hit);
    const cur = byJourney.get(key) ?? { eur: 0, byKind: [], count: 0 };
    cur.eur += c.eur;
    cur.count += 1;
    const slot = cur.byKind.find((b) => b.kind === c.kind);
    if (slot) slot.eur += c.eur;
    else cur.byKind.push({ kind: c.kind, eur: c.eur });
    byJourney.set(key, cur);
  }

  for (const v of byJourney.values()) {
    v.eur = round2(v.eur);
    v.byKind = v.byKind.map((b) => ({ ...b, eur: round2(b.eur) })).sort((a, b) => b.eur - a.eur);
  }

  return {
    byJourney,
    unassignedEur: round2(unassignedEur),
    unassignedCount,
  };
}

/** Skrót całej listy wyjazdów — do kafelków na ekranie statystyk. */
export interface JourneysDigest {
  count: number;
  open: number;
  distanceKm: number;
  /** Średnie spalanie ważone dystansem, nie średnia ze średnich. */
  avgConsumption: number | null;
  costEur: number;
  revenueEur: number | null;
  profitEur: number | null;
  marginPercent: number | null;
  /** Najgorszy wyjazd wg marży — to on wymaga uwagi, a nie średnia. */
  worst: { vehicleId: string; index: number; marginPercent: number } | null;
}

export function summarizeJourneys(journeys: readonly Journey[]): JourneysDigest {
  if (journeys.length === 0) {
    return {
      count: 0,
      open: 0,
      distanceKm: 0,
      avgConsumption: null,
      costEur: 0,
      revenueEur: null,
      profitEur: null,
      marginPercent: null,
      worst: null,
    };
  }

  const distanceKm = journeys.reduce((s, j) => s + (j.distanceKm ?? 0), 0);
  const costEur = journeys.reduce((s, j) => s + j.cost, 0);

  // Przychód sumujemy tylko z wyjazdów, które go mają. `null` w całości oznacza
  // „nie umiemy wycenić żadnego" i wtedy zysk także zostaje pusty — zamiast
  // pokazywać stratę równą kosztom.
  const priced = journeys.filter((j) => j.revenue != null);
  const revenueEur = priced.length
    ? round2(priced.reduce((s, j) => s + (j.revenue ?? 0), 0))
    : null;
  const profitEur = revenueEur == null ? null : round2(revenueEur - costEur);

  const withCons = journeys.filter(
    (j) => j.avgConsumptionLPer100km != null && (j.distanceKm ?? 0) > 0,
  );
  const consKm = withCons.reduce((s, j) => s + (j.distanceKm ?? 0), 0);
  const avgConsumption = consKm
    ? round2(
        withCons.reduce(
          (s, j) => s + (j.avgConsumptionLPer100km as number) * (j.distanceKm as number),
          0,
        ) / consKm,
      )
    : null;

  const withMargin = journeys.filter((j) => j.marginPercent != null);
  const worstJourney = withMargin.length
    ? withMargin.reduce((a, b) =>
        (a.marginPercent as number) <= (b.marginPercent as number) ? a : b,
      )
    : null;

  return {
    count: journeys.length,
    open: journeys.filter((j) => j.open).length,
    distanceKm: Math.round(distanceKm),
    avgConsumption,
    costEur: round2(costEur),
    revenueEur,
    profitEur,
    marginPercent:
      revenueEur != null && revenueEur > 0 && profitEur != null
        ? round2((profitEur / revenueEur) * 100)
        : null,
    worst: worstJourney
      ? {
          vehicleId: worstJourney.vehicleId,
          index: worstJourney.index,
          marginPercent: worstJourney.marginPercent as number,
        }
      : null,
  };
}
