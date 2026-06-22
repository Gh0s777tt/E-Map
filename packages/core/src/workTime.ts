/**
 * Ewidencja czasu pracy kierowcy — godziny jazdy, innej pracy i odpoczynku.
 * Silnik czysty: liczy sumy/średnie i oznacza dni z przekroczeniem dziennego
 * limitu jazdy. NIE jest interpretacją prawną (Pakiet Mobilności / 561/2006) —
 * limit jest konfigurowalny; domyślnie 10 h (bezwzględne maksimum dzienne UE).
 */
import { round2 } from "./money";

/** Domyślny dzienny limit jazdy do oznaczania przekroczeń (UE: maks. 10 h). */
export const DEFAULT_DAILY_DRIVING_LIMIT = 10;

export interface WorkTimeEntry {
  /** Data dnia (YYYY-MM-DD). */
  date: string;
  /** Godziny jazdy. */
  driving: number;
  /** Inna praca (załadunek/rozładunek, formalności). */
  otherWork: number;
  /** Odpoczynek / dyspozycyjność (informacyjnie). */
  rest: number;
}

export interface WorkTimeDay extends WorkTimeEntry {
  /** Praca łącznie = jazda + inna praca. */
  workTotal: number;
  /** Czy przekroczono dzienny limit jazdy. */
  overDriving: boolean;
}

export interface WorkTimeSummary {
  days: number;
  driving: number;
  otherWork: number;
  rest: number;
  workTotal: number;
  /** Średnia jazda na dzień; null gdy brak dni. */
  avgDrivingPerDay: number | null;
  /** Liczba dni z przekroczeniem limitu jazdy. */
  overDrivingDays: number;
}

export interface WorkTimeReport {
  rows: WorkTimeDay[];
  summary: WorkTimeSummary;
}

function clamp(n: number): number {
  return Math.max(0, n);
}

/**
 * Liczy ewidencję czasu pracy: wiersze dzienne (praca łącznie + flaga
 * przekroczenia jazdy) i podsumowanie okresu. Wiersze posortowane wg daty.
 */
export function summarizeWorkTime(
  entries: WorkTimeEntry[],
  opts: { dailyDrivingLimit?: number } = {},
): WorkTimeReport {
  const limit = opts.dailyDrivingLimit ?? DEFAULT_DAILY_DRIVING_LIMIT;
  const rows: WorkTimeDay[] = entries
    .map((e) => {
      const driving = clamp(e.driving);
      const otherWork = clamp(e.otherWork);
      const rest = clamp(e.rest);
      return {
        date: e.date,
        driving,
        otherWork,
        rest,
        workTotal: round2(driving + otherWork),
        overDriving: driving > limit,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const driving = round2(rows.reduce((s, r) => s + r.driving, 0));
  const otherWork = round2(rows.reduce((s, r) => s + r.otherWork, 0));
  const rest = round2(rows.reduce((s, r) => s + r.rest, 0));
  return {
    rows,
    summary: {
      days: rows.length,
      driving,
      otherWork,
      rest,
      workTotal: round2(driving + otherWork),
      avgDrivingPerDay: rows.length > 0 ? round2(driving / rows.length) : null,
      overDrivingDays: rows.filter((r) => r.overDriving).length,
    },
  };
}
