/**
 * Diety (per diem) z tytułu podróży służbowej kierowcy — krajowe i zagraniczne.
 * Silnik czysty: nie zawiera stawek urzędowych (te zmienia ustawodawca i ustawia
 * owner per kraj), liczy wyłącznie należną liczbę „dób" wg reguł czasowych:
 *
 *  • krajowa: podróż ≤ doby → <8h: 0 · 8–12h: 1/2 · >12h: 1/1.
 *             podróż > doby → każda pełna doba 1/1; niepełna: ≤8h: 1/2, >8h: 1/1.
 *  • zagraniczna: każda pełna doba 1/1; niepełna (lub <doby): ≤8h: 1/3,
 *             8–12h: 1/2, >12h: 1/1.
 *
 * Reguły wg Kodeksu pracy / rozp. MPiPS o podróżach służbowych (stan modelowy).
 */
import { round2 } from "./money";

export type DietMode = "domestic" | "foreign";

export interface DietTrip {
  id?: string;
  /** Cel / kraj podróży (opis). */
  destination: string;
  mode: DietMode;
  /** Łączny czas podróży w godzinach (≥ 0). */
  hours: number;
  /** Stawka diety za dobę (w walucie kraju). */
  dailyRate: number;
  /** Waluta stawki (np. PLN, EUR). */
  currency: string;
}

export interface DietResult {
  destination: string;
  mode: DietMode;
  /** Pełne doby podróży. */
  fullDays: number;
  /** Godziny niepełnej doby. */
  remainderHours: number;
  /** Ułamek doby za część niepełną (0, 1/3, 1/2, 1). */
  fraction: number;
  /** Należne doby łącznie (pełne + ułamek). */
  days: number;
  /** Kwota diety: doby × stawka. */
  amount: number;
  currency: string;
}

const HOURS_PER_DAY = 24;
const THIRD = 1 / 3;
const HALF = 1 / 2;

/** Ułamek doby za niepełną część — reguły zależne od trybu (krajowa/zagraniczna). */
function partialFraction(
  mode: DietMode,
  remainder: number,
  isSingleIncompleteDay: boolean,
): number {
  if (remainder <= 0) return 0;
  if (mode === "domestic") {
    if (isSingleIncompleteDay) {
      // Podróż nie dłuższa niż doba: <8h → 0, 8–12h → 1/2, >12h → 1/1.
      if (remainder < 8) return 0;
      if (remainder <= 12) return HALF;
      return 1;
    }
    // Niepełna doba przy podróży wielodobowej: ≤8h → 1/2, >8h → 1/1.
    return remainder <= 8 ? HALF : 1;
  }
  // Zagraniczna: ≤8h → 1/3, 8–12h → 1/2, >12h → 1/1.
  if (remainder <= 8) return THIRD;
  if (remainder <= 12) return HALF;
  return 1;
}

/** Liczy należną dietę za pojedynczą podróż. Ujemne godziny → zero. */
export function computePerDiem(trip: DietTrip): DietResult {
  const hours = Math.max(0, trip.hours);
  const fullDays = Math.floor(hours / HOURS_PER_DAY);
  const remainderHours = round2(hours - fullDays * HOURS_PER_DAY);
  const fraction = partialFraction(trip.mode, remainderHours, fullDays === 0);
  const days = fullDays + fraction;
  return {
    destination: trip.destination,
    mode: trip.mode,
    fullDays,
    remainderHours,
    fraction,
    days,
    amount: round2(days * Math.max(0, trip.dailyRate)),
    currency: trip.currency,
  };
}

export interface PerDiemTotal {
  currency: string;
  amount: number;
  /** Liczba podróży w tej walucie. */
  count: number;
  /** Suma należnych dób. */
  days: number;
}

/** Sumuje diety wielu podróży w rozbiciu na waluty (malejąco wg kwoty). */
export function sumPerDiem(results: DietResult[]): PerDiemTotal[] {
  const byCurrency = new Map<string, PerDiemTotal>();
  for (const r of results) {
    const cur = byCurrency.get(r.currency) ?? {
      currency: r.currency,
      amount: 0,
      count: 0,
      days: 0,
    };
    cur.amount = round2(cur.amount + r.amount);
    cur.count += 1;
    cur.days = round2(cur.days + r.days);
    byCurrency.set(r.currency, cur);
  }
  return [...byCurrency.values()].sort((a, b) => b.amount - a.amount);
}
