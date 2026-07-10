/**
 * #277: automatyczny czas pracy z checklisty „Tachograf" — kierowca odhacza
 * tryby (Rozpoczęcie/Zakończenie dnia, Łóżko, Prom, Młotki) z godziną, a silnik
 * wylicza dni pracy, odpoczynki dobowe i tygodniowe wg progów 561/2006:
 * odpoczynek dobowy ≥11 h (normalny) / 9–11 h (skrócony) / <9 h (naruszenie);
 * tygodniowy ≥45 h (normalny) / 24–45 h (skrócony). To POMOC ewidencyjna,
 * nie zamiennik karty kierowcy.
 */

export interface TachoEntry {
  /** Data zgłoszenia (YYYY-MM-DD, z created_at). */
  date: string;
  /** Godzina z checklisty (HH:MM) — edytowana przez kierowcę. */
  time: string;
  /** Zaznaczone tryby (np. ["Rozpoczęcie dnia"], ["Prom","Łóżko"]). */
  modes: string[];
}

export type RestType = "daily-regular" | "daily-reduced" | "weekly-regular" | "weekly-reduced";

export interface TachoDay {
  date: string;
  startTime: string | null;
  endTime: string | null;
  /** Czas służby start→koniec [min]; null gdy niekompletny dzień. */
  workMinutes: number | null;
  /** Odpoczynek od końca poprzedniego dnia do startu [min]. */
  restBeforeMinutes: number | null;
  restType: RestType | null;
  alerts: string[];
}

export interface TachoSummary {
  days: TachoDay[];
  totalWorkMinutes: number;
  alerts: string[];
}

const MIN_H = 60;

function toMinutes(hhmm: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!m) return null;
  return Number(m[1]) * MIN_H + Number(m[2]);
}

function epochMinutes(date: string, hhmm: string): number | null {
  const t = toMinutes(hhmm);
  if (t == null) return null;
  const d = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(d)) return null;
  return d / 60000 + t;
}

const START = "Rozpoczęcie dnia";
const END = "Zakończenie dnia";

/** Buduje dni pracy i odpoczynki z wpisów checklisty Tachograf (dowolna kolejność). */
export function computeTachoDays(entries: TachoEntry[]): TachoSummary {
  const sorted = entries
    .map((e) => ({ ...e, at: epochMinutes(e.date, e.time) }))
    .filter((e): e is TachoEntry & { at: number } => e.at != null)
    .sort((a, b) => a.at - b.at);

  // Paruj chronologicznie: start otwiera dzień, najbliższe zakończenie go domyka
  // (nocna zmiana kończy się po północy — parujemy po czasie, nie po dacie).
  const days: TachoDay[] = [];
  let open: (TachoEntry & { at: number }) | null = null;
  let prevEndAt: number | null = null;

  const closeDay = (
    start: TachoEntry & { at: number },
    end: (TachoEntry & { at: number }) | null,
  ) => {
    const alerts: string[] = [];
    let workMinutes: number | null = null;
    if (end) {
      workMinutes = end.at - start.at;
      if (workMinutes <= 0 || workMinutes > 24 * MIN_H) {
        alerts.push("Podejrzany czas służby — sprawdź godziny.");
        workMinutes = null;
      } else if (workMinutes > 15 * MIN_H) {
        alerts.push("Służba > 15 h — przekroczony dzienny limit.");
      } else if (workMinutes > 13 * MIN_H) {
        alerts.push("Służba > 13 h — możliwe tylko przy odpoczynku skróconym.");
      }
    } else {
      alerts.push("Brak zakończenia dnia — dzień niedomknięty.");
    }

    let restBeforeMinutes: number | null = null;
    let restType: RestType | null = null;
    if (prevEndAt != null) {
      restBeforeMinutes = start.at - prevEndAt;
      if (restBeforeMinutes >= 45 * MIN_H) restType = "weekly-regular";
      else if (restBeforeMinutes >= 24 * MIN_H) restType = "weekly-reduced";
      else if (restBeforeMinutes >= 11 * MIN_H) restType = "daily-regular";
      else if (restBeforeMinutes >= 9 * MIN_H) restType = "daily-reduced";
      else if (restBeforeMinutes >= 0) {
        alerts.push(`Odpoczynek ${(restBeforeMinutes / MIN_H).toFixed(1)} h < 9 h — naruszenie.`);
      }
    }

    days.push({
      date: start.date,
      startTime: start.time,
      endTime: end?.time ?? null,
      workMinutes,
      restBeforeMinutes,
      restType,
      alerts,
    });
    if (end) prevEndAt = end.at;
  };

  for (const e of sorted) {
    const isStart = e.modes.includes(START);
    const isEnd = e.modes.includes(END);
    if (isStart) {
      if (open) closeDay(open, null); // poprzedni dzień bez zakończenia
      open = e;
    } else if (isEnd && open) {
      closeDay(open, e);
      open = null;
    }
    // Łóżko/Prom/Młotki w trakcie dnia — dziś informacyjne (nie tną służby).
  }
  if (open) closeDay(open, null);

  const totalWorkMinutes = days.reduce((a, d) => a + (d.workMinutes ?? 0), 0);
  const alerts = days.flatMap((d) => d.alerts.map((a) => `${d.date}: ${a}`));
  // Kontrola tygodniowa: w każdym oknie 6 kolejnych dni pracy powinien
  // wystąpić odpoczynek tygodniowy (≥24 h) — sygnalizuj brak.
  let sinceWeekly = 0;
  for (const d of days) {
    if (d.restType === "weekly-regular" || d.restType === "weekly-reduced") sinceWeekly = 0;
    else sinceWeekly += 1;
    if (sinceWeekly > 6) {
      alerts.push(`${d.date}: ponad 6 dni od odpoczynku tygodniowego.`);
      sinceWeekly = 0; // jeden alert na serię
    }
  }
  return { days, totalWorkMinutes, alerts };
}

/** „8 h 30 min" z minut. */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / MIN_H);
  const m = Math.round(min % MIN_H);
  return m ? `${h} h ${m} min` : `${h} h`;
}
