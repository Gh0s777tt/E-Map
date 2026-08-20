/**
 * [#380] Koszty operacyjne trasy — parkingi, opłaty drogowe, kary i zdarzenia Trip.
 *
 * Formularze Fazy 6 zbierają te dane od [#375], a `trip_events.amount` istnieje
 * jeszcze dłużej — tyle że żaden ekran statystyk ich nie czytał. Skutek był
 * jednostronny i zawsze w tę samą stronę: koszt floty pokazywany był bez
 * parkingów, myta, promów i mandatów, więc **zysk wychodził systematycznie
 * zawyżony**, a im więcej firma jeździła po płatnych drogach, tym bardziej.
 *
 * Dwie rzeczy, na których łatwo się tu przejechać:
 *
 * 1. **Kara anulowana nadal ma kwotę w bazie.** Wliczenie jej do kosztu to
 *    wydatek, którego nie było. Kwestionowana to inna sprawa — pieniądze mogą
 *    jeszcze wypłynąć, więc pokazujemy ją OSOBNO zamiast rozstrzygać za
 *    użytkownika, czy ją zapłaci.
 * 2. **Waluta.** Bramka w Chorwacji płacona w kunach i winieta w Szwajcarii we
 *    frankach to nie są liczby, które wolno dodać do siebie bez kursu.
 */
import { type FxRate, toEur } from "./fx";
import { round2 } from "./money";

/** Rodzaj kosztu — grupowanie na ekranie i w rozliczeniu. */
export type OperatingCostKind = "pause" | "route" | "penalty" | "trip";

export interface OperatingCostEntry {
  kind: OperatingCostKind;
  /** Podrodzaj do rozbicia (np. `toll`, `ferry`, `hotel`, `service`). */
  subKind?: string | null;
  amount: number | null;
  currency: string | null;
  occurredAt: string;
  vehicleId?: string | null;
  /**
   * Status kary. Poza karami nieużywany.
   * `cancelled` → wypada z kosztu; `appealed` → liczone osobno.
   */
  status?: string | null;
}

export interface OperatingCostGroup {
  kind: OperatingCostKind;
  count: number;
  eur: number;
  /** Rozbicie na podrodzaje, malejąco po kwocie. */
  bySubKind: { subKind: string; count: number; eur: number }[];
}

export interface OperatingCostsSummary {
  groups: OperatingCostGroup[];
  totalEur: number;
  /** Koszt per pojazd — do rankingu i atrybucji rentowności. */
  byVehicle: Map<string, number>;
  /** Kary kwestionowane: kwota jeszcze nierozstrzygnięta, POZA sumą. */
  contestedEur: number;
  contestedCount: number;
  /** Kary anulowane — pominięte świadomie, pokazujemy ile ich było. */
  cancelledCount: number;
  /** Pozycje z kwotą, ale bez notowania waluty na dzień zdarzenia. */
  missingRate: number;
}

/** Czy kara w tym statusie jest kosztem, kwestionowana, czy odpada. */
function penaltyBucket(status: string | null | undefined): "cost" | "contested" | "skip" {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "cancelled") return "skip";
  if (s === "appealed") return "contested";
  return "cost";
}

/**
 * Sumuje koszty operacyjne, przeliczając każdą pozycję po kursie z dnia zdarzenia.
 *
 * Pozycja bez kwoty jest po prostu pomijana — brak kwoty to brak informacji,
 * a nie zero. Pozycja z kwotą, ale bez kursu, trafia do `missingRate`: to jedyny
 * sposób, żeby suma mogła uczciwie powiedzieć „niepełna" zamiast wyglądać
 * na kompletną.
 */
export function summarizeOperatingCosts(
  entries: readonly OperatingCostEntry[],
  rates: readonly FxRate[],
): OperatingCostsSummary {
  const groups = new Map<OperatingCostKind, Map<string, { count: number; eur: number }>>();
  const byVehicle = new Map<string, number>();
  let contestedEur = 0;
  let contestedCount = 0;
  let cancelledCount = 0;
  let missingRate = 0;

  for (const e of entries) {
    const bucket = e.kind === "penalty" ? penaltyBucket(e.status) : "cost";
    if (bucket === "skip") {
      cancelledCount++;
      continue;
    }
    if (e.amount == null) continue;

    const day = e.occurredAt.slice(0, 10);
    const eur = toEur(e.amount, e.currency ?? "EUR", rates, day);
    if (eur == null) {
      missingRate++;
      continue;
    }

    if (bucket === "contested") {
      contestedEur += eur;
      contestedCount++;
      continue;
    }

    const sub = (e.subKind ?? e.kind).trim() || e.kind;
    const g = groups.get(e.kind) ?? new Map<string, { count: number; eur: number }>();
    const cell = g.get(sub) ?? { count: 0, eur: 0 };
    cell.count += 1;
    cell.eur += eur;
    g.set(sub, cell);
    groups.set(e.kind, g);

    if (e.vehicleId) byVehicle.set(e.vehicleId, (byVehicle.get(e.vehicleId) ?? 0) + eur);
  }

  const out: OperatingCostGroup[] = [...groups]
    .map(([kind, subs]) => ({
      kind,
      count: [...subs.values()].reduce((s, c) => s + c.count, 0),
      eur: round2([...subs.values()].reduce((s, c) => s + c.eur, 0)),
      bySubKind: [...subs]
        .map(([subKind, c]) => ({ subKind, count: c.count, eur: round2(c.eur) }))
        .sort((a, b) => b.eur - a.eur),
    }))
    .sort((a, b) => b.eur - a.eur);

  return {
    groups: out,
    totalEur: round2(out.reduce((s, g) => s + g.eur, 0)),
    byVehicle: new Map([...byVehicle].map(([k, v]) => [k, round2(v)])),
    contestedEur: round2(contestedEur),
    contestedCount,
    cancelledCount,
    missingRate,
  };
}
