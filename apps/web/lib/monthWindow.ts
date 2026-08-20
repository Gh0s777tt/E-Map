/**
 * Okno danych dla ekranów miesięcznych — JEDNA definicja dla pulpitu i /monthly.
 *
 * Powód jest konkretny: oba ekrany pokazują wynik TEGO SAMEGO miesiąca, a przynależność
 * zlecenia do miesiąca rozstrzyga się dopiero w przeglądarce, po dacie ZAŁADUNKU
 * (`load_date ?? created_at`). Zapytanie umie filtrować tylko po `created_at`, więc
 * zlecenie wprowadzone w styczniu, a wiezione w marcu, wpada do marcowego wyniku tylko
 * wtedy, gdy w ogóle zostało pobrane. Dwa ekrany z dwoma różnymi oknami pobierania
 * dawały dla jednego miesiąca dwie różne kwoty — bez śladu, która z nich jest prawdziwa.
 *
 * Stąd wspólne okno: sześć miesięcy kończących się na wybranym. Jest szersze, niż wynika
 * z samego wyniku miesiąca, bo /monthly rysuje z niego jeszcze trend i różnicę m/m —
 * a jego szerokość jest tu drugorzędna: liczy się to, że dla obu ekranów jest IDENTYCZNA.
 */
import { monthsEndingAt } from "@e-logistic/core";

/**
 * Szerokość okna danych — jedna liczba dla pobierania, trendu i liczników.
 *
 * [#378] Rozjazd tych trzech miejsc był źródłem usterki: ostrzeżenie o brakujących
 * kursach liczyło pozycje w jednym miesiącu, a wykres i Δ m/m brały dane z sześciu.
 */
export const TREND_MONTHS = 6;

export interface MonthWindow {
  /** Pierwszy dzień najstarszego miesiąca okna (granica DOLNA, włącznie). */
  from: string;
  /** Pierwszy dzień miesiąca PO wybranym (granica GÓRNA, wyłączna). */
  to: string;
  /** Miesiące okna `YYYY-MM`, od najstarszego — oś wykresu trendu. */
  months: string[];
}

/** Okno `count` miesięcy kończące się na `month` (`YYYY-MM`). */
export function monthWindow(month: string, count: number = TREND_MONTHS): MonthWindow {
  const months = monthsEndingAt(month, count);
  // `months[0]` jest zdefiniowane dla każdego `count >= 1`, ale typ tego nie wie —
  // zamiast wymuszać, bierzemy sam `month`: okno jednomiesięczne to poprawne
  // zawężenie, a nie awaria.
  const from = `${months[0] ?? month}-01`;
  const toDate = new Date(`${month}-01T00:00:00Z`);
  toDate.setUTCMonth(toDate.getUTCMonth() + 1);
  return { from, to: toDate.toISOString().slice(0, 10), months };
}
