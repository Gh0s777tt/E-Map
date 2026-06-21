/** Status ważności dokumentów pojazdu (przegląd/OC/leasing). Funkcje czyste. */

export type ExpiryLevel = "expired" | "soon" | "ok";

export interface ExpiryStatus {
  daysLeft: number;
  level: ExpiryLevel;
}

/**
 * Liczy status ważności na podstawie daty (YYYY-MM-DD) względem „dziś".
 * `level`: expired (po terminie), soon (≤ warnDays), ok.
 */
export function expiryStatus(dateISO: string, todayISO: string, warnDays = 30): ExpiryStatus {
  const target = Date.parse(dateISO);
  const today = Date.parse(todayISO);
  const daysLeft = Math.round((target - today) / 86_400_000);
  const level: ExpiryLevel = daysLeft < 0 ? "expired" : daysLeft <= warnDays ? "soon" : "ok";
  return { daysLeft, level };
}
