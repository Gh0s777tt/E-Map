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

/** Porządek pilności do sortowania i porównań. Wyżej = pilniej. */
export const LEVEL_RANK: Record<ExpiryLevel, number> = { expired: 2, soon: 1, ok: 0 };

/** Zadanie planu serwisowego w zakresie potrzebnym do policzenia pilności. */
export interface ServicePlanItem {
  interval_km: number | null;
  last_done_km: number | null;
  interval_months: number | null;
  last_done_date: string | null;
}

/**
 * Termin następnego serwisu z interwału MIESIĘCZNEGO (`YYYY-MM-DD`) albo `null`.
 *
 * Data lokalna, nie UTC: „przegląd co 12 miesięcy" jest terminem w kalendarzu warsztatu,
 * a nie znacznikiem czasu — przeliczenie przez strefę przesuwałoby go o dzień dla połowy
 * Europy i pozycja raz na dobę zmieniałaby status bez żadnego zdarzenia w danych.
 */
export function serviceDueDate(
  lastDoneDate: string | null,
  intervalMonths: number | null,
): string | null {
  if (!lastDoneDate || intervalMonths == null || intervalMonths <= 0) return null;
  const d = new Date(lastDoneDate);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + intervalMonths);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Pilność zadania serwisowego: GORSZY z dwóch niezależnych wymiarów — przebiegu i kalendarza.
 *
 * Plan zna oba interwały naraz („olej co 30 000 km ALBO co 12 miesięcy") i wystarczy, że
 * minie jeden z nich. Liczenie samego przebiegu ukrywa pozycję czysto kalendarzową (tacho,
 * gaśnica, przegląd), a liczenie samej daty — auto, które przejechało interwał w pół roku.
 *
 * Funkcja jest tu, a nie w ekranie, bo używają jej trzy różne listy (web `/service`, mobile
 * „Zarządzaj serwisem" i sortowanie okna renderowania na obu). Trzy kopie tego samego
 * porównania rozjeżdżały się dokładnie w tym miejscu, w którym rozjazd nie daje żadnego
 * objawu: zadanie po terminie w jednym miejscu było, a w drugim nie.
 */
export function serviceUrgency(
  task: ServicePlanItem,
  currentKm: number | null,
  todayISO: string,
): ExpiryLevel {
  const km = serviceStatus(currentKm, task.last_done_km, task.interval_km).level;
  const due = serviceDueDate(task.last_done_date, task.interval_months);
  const kalendarz = due ? expiryStatus(due, todayISO).level : "ok";
  return LEVEL_RANK[kalendarz] > LEVEL_RANK[km] ? kalendarz : km;
}
