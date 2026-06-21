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

export interface ServiceStatus {
  /** Ile km do serwisu (ujemne = po przebiegu). null gdy brak danych. */
  kmLeft: number | null;
  /** Docelowy przebieg serwisu. null gdy brak danych. */
  dueKm: number | null;
  level: ExpiryLevel;
}

/**
 * Status serwisu wg przebiegu: cel = ostatni serwis + interwał.
 * `level`: expired (po przebiegu), soon (≤ warnKm), ok. Brak danych → ok/null.
 */
export function serviceStatus(
  currentKm: number | null,
  lastDoneKm: number | null,
  intervalKm: number | null,
  warnKm = 2000,
): ServiceStatus {
  if (lastDoneKm == null || intervalKm == null || intervalKm <= 0 || currentKm == null) {
    return {
      kmLeft: null,
      dueKm: lastDoneKm != null && intervalKm ? lastDoneKm + intervalKm : null,
      level: "ok",
    };
  }
  const dueKm = lastDoneKm + intervalKm;
  const kmLeft = dueKm - currentKm;
  const level: ExpiryLevel = kmLeft < 0 ? "expired" : kmLeft <= warnKm ? "soon" : "ok";
  return { kmLeft, dueKm, level };
}
