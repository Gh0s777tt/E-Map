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

/**
 * Dyrektywa 2002/15/WE (czas pracy w transporcie drogowym) — REŻIM ODRĘBNY od
 * 561/2006: dotyczy „czasu pracy" (jazda + inna praca), nie samej jazdy. Silnik
 * czysty. Limity [h]:
 *  • średnia tygodniowa ≤ 48 h w okresie rozliczeniowym (domyślnie 4 mies. ≈ 17 tyg.),
 *  • bezwzględne maksimum w POJEDYNCZYM tygodniu 60 h (dozwolone tylko przy zachowaniu średniej 48),
 *  • przy pracy nocnej dobowy czas pracy ≤ 10 h.
 * To POMOC ORIENTACYJNA — nie interpretacja prawna.
 */
export const WTD_LIMITS = {
  weeklyAvg: 48,
  weeklyMax: 60,
  referenceWeeks: 17,
  nightDailyMax: 10,
} as const;

export interface WtdWeek {
  /** Identyfikator tygodnia ISO, np. "2026-W29". */
  week: string;
  /** Czas pracy w tygodniu [h] = jazda + inna praca. */
  workingH: number;
}

export interface WtdStatus {
  /** Okres rozliczeniowy [tyg.]. */
  referenceWeeks: number;
  /** Ile tygodni faktycznie policzono (≤ referenceWeeks). */
  weeksCounted: number;
  /** Suma czasu pracy w okresie [h]. */
  totalWorkingH: number;
  /** Średnia tygodniowa w okresie [h]. */
  avgWeeklyH: number;
  /** Średnia w normie (≤ 48). */
  avgOk: boolean;
  /** Najwyższy tydzień w okresie [h]. */
  maxWeeklyH: number;
  /** Tygodnie z przekroczeniem 60 h (naruszenie). */
  weeksOver60: string[];
  /** Ile jeszcze godzin można przepracować w OKRESIE, by utrzymać średnią ≤ 48 (może być ujemne). */
  budgetToAvgH: number;
  /** Naruszenia / ostrzeżenia (puste = OK). */
  alerts: string[];
}

const clampH = (n: number): number => Math.max(0, n);

/** ISO 8601 numer tygodnia „RRRR-Www" dla daty YYYY-MM-DD (czwartek wyznacza rok). */
export function isoWeekKey(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // pn=0 … nd=6
  d.setUTCDate(d.getUTCDate() - day + 3); // czwartek tego tygodnia
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const fday = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fday + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Grupuje dzienne wpisy ewidencji w tygodnie ISO z sumą czasu pracy (jazda + inna praca). */
export function weeklyWorkingFromEntries(entries: WorkTimeEntry[]): WtdWeek[] {
  const byWeek = new Map<string, number>();
  for (const e of entries) {
    const key = isoWeekKey(e.date);
    byWeek.set(key, (byWeek.get(key) ?? 0) + clampH(e.driving) + clampH(e.otherWork));
  }
  return [...byWeek.entries()]
    .map(([week, workingH]) => ({ week, workingH: round2(workingH) }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

/**
 * Stan wg Dyrektywy 2002/15/WE dla listy tygodni (bierze `referenceWeeks`
 * ostatnich). Kolejność wejścia dowolna — sortuje po kluczu tygodnia.
 */
export function wtdStatus(
  weeks: WtdWeek[],
  opts: { referenceWeeks?: number; weeklyAvg?: number } = {},
): WtdStatus {
  const refWeeks = opts.referenceWeeks ?? WTD_LIMITS.referenceWeeks;
  const avgLimit = opts.weeklyAvg ?? WTD_LIMITS.weeklyAvg;
  const recent = [...weeks]
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-refWeeks)
    .map((w) => ({ week: w.week, workingH: clampH(w.workingH) }));
  const n = recent.length;
  const total = round2(recent.reduce((s, w) => s + w.workingH, 0));
  const avg = n > 0 ? round2(total / n) : 0;
  const maxWeekly = n > 0 ? round2(Math.max(...recent.map((w) => w.workingH))) : 0;
  const weeksOver60 = recent.filter((w) => w.workingH > WTD_LIMITS.weeklyMax).map((w) => w.week);
  const alerts: string[] = [];
  if (avg > avgLimit) alerts.push("wtd-avg-exceeded");
  if (weeksOver60.length > 0) alerts.push("wtd-week-over-60");
  return {
    referenceWeeks: refWeeks,
    weeksCounted: n,
    totalWorkingH: total,
    avgWeeklyH: avg,
    avgOk: avg <= avgLimit,
    maxWeeklyH: maxWeekly,
    weeksOver60,
    // Budżet liczony względem PEŁNEGO okresu (avgLimit × refWeeks), nie liczby przepracowanych tygodni.
    budgetToAvgH: round2(avgLimit * refWeeks - total),
    alerts,
  };
}
