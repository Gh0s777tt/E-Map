/**
 * #331: Planer odpoczynku tygodniowego (561/2006 art. 8) — czysty silnik:
 * • odpoczynek tygodniowy musi się ROZPOCZĄĆ najpóźniej po 6 dobach (144 h)
 *   od końca poprzedniego odpoczynku tygodniowego,
 * • regularny = 45 h, skrócony = min 24 h (rekompensata 21 h w jednym bloku,
 *   doczepiona do innego odpoczynku ≥9 h, do końca 3. tygodnia po skróconym),
 * • w dwóch kolejnych tygodniach co najmniej jeden regularny 45 h
 *   → po skróconym następny MUSI być regularny (uproszczenie bezpieczne).
 */

export interface WeeklyRestPlanInput {
  /** Koniec ostatniego odpoczynku tygodniowego (epoch ms). */
  lastWeeklyRestEndMs: number;
  lastType: "regular" | "reduced";
}

export interface WeeklyRestPlan {
  /** Najpóźniejszy start kolejnego odpoczynku tygodniowego (epoch ms). */
  latestStartMs: number;
  /** Ile godzin od `nowMs` do najpóźniejszego startu (ujemne = po terminie). */
  hoursUntilLatestStart: number;
  /** Poprzedni był skrócony → ten musi być regularny 45 h. */
  mustBeRegular: boolean;
  /** Koniec odpoczynku przy starcie w ostatniej chwili — wariant 45 h. */
  regularEndMs: number;
  /** Wariant 24 h (null, gdy musi być regularny). */
  reducedEndMs: number | null;
  /** Rekompensata za wariant skrócony [h] (45−24). */
  compensationH: number | null;
  /** Termin oddania rekompensaty (koniec 3. tygodnia po skróconym). */
  compensationDeadlineMs: number | null;
}

const H_MS = 3_600_000;
export const WEEKLY_REST_LIMITS = {
  maxGapH: 144, // 6 × 24 h
  regularH: 45,
  reducedH: 24,
  compensationWeeks: 3,
} as const;

/** Plan kolejnego odpoczynku tygodniowego względem `nowMs`. */
export function planWeeklyRest(input: WeeklyRestPlanInput, nowMs: number): WeeklyRestPlan {
  const latestStartMs = input.lastWeeklyRestEndMs + WEEKLY_REST_LIMITS.maxGapH * H_MS;
  const mustBeRegular = input.lastType === "reduced";
  // Warianty liczone dla startu w ostatniej dopuszczalnej chwili (najgorszy przypadek).
  const planStart = latestStartMs;
  return {
    latestStartMs,
    hoursUntilLatestStart: Math.round(((latestStartMs - nowMs) / H_MS) * 10) / 10,
    mustBeRegular,
    regularEndMs: planStart + WEEKLY_REST_LIMITS.regularH * H_MS,
    reducedEndMs: mustBeRegular ? null : planStart + WEEKLY_REST_LIMITS.reducedH * H_MS,
    compensationH: mustBeRegular ? null : WEEKLY_REST_LIMITS.regularH - WEEKLY_REST_LIMITS.reducedH,
    compensationDeadlineMs: mustBeRegular
      ? null
      : input.lastWeeklyRestEndMs + WEEKLY_REST_LIMITS.compensationWeeks * 7 * 24 * H_MS,
  };
}

/**
 * Rejestr długów kompensacji skróconych odpoczynków tygodniowych (561/2006 art. 8.6):
 * każdy odpoczynek < 45 h generuje dług = (45 − długość) h, do oddania EN BLOC przed
 * końcem 3. tygodnia po skróceniu (doczepiony do innego odpoczynku ≥ 9 h).
 * Spłatę modelujemy ZACHOWAWCZO: odpoczynek > 45 h daje „nadwyżkę" (długość − 45),
 * która spłaca NAJSTARSZY zaległy dług mieszczący się w nadwyżce i przed terminem
 * (jeden odpoczynek = jedna spłata en bloc). Błąd zaokrągla się w stronę OSTRZEŻENIA
 * (raczej pokaże dług otwarty, niż fałszywie „spłacony"). Pomoc orientacyjna.
 */
export interface WeeklyRestEvent {
  /** Koniec odpoczynku tygodniowego (epoch ms). */
  endMs: number;
  /** Faktyczna długość odpoczynku [h]. */
  durationH: number;
}

export interface RestCompensationDebt {
  /** Koniec skróconego odpoczynku, który wygenerował dług. */
  fromEndMs: number;
  /** Godziny do oddania en bloc (45 − długość). */
  owedH: number;
  /** Termin oddania (koniec 3. tygodnia po skróceniu). */
  deadlineMs: number;
  settled: boolean;
  /** Koniec odpoczynku, który spłacił dług (null gdy niespłacony). */
  settledByEndMs: number | null;
  /** Niespłacony i po terminie względem `nowMs`. */
  overdue: boolean;
}

export interface RestCompensationLedger {
  debts: RestCompensationDebt[];
  /** Suma niespłaconych godzin. */
  outstandingH: number;
  /** Liczba niespłaconych długów po terminie. */
  overdueCount: number;
  /** Najbliższy termin niespłaconego długu (epoch ms); null gdy brak długów. */
  nextDeadlineMs: number | null;
}

const COMPENSATION_MS = WEEKLY_REST_LIMITS.compensationWeeks * 7 * 24 * H_MS;

/** Rejestr kompensacji z historii odpoczynków tygodniowych względem `nowMs`. */
export function restCompensationLedger(
  events: WeeklyRestEvent[],
  nowMs: number,
): RestCompensationLedger {
  const sorted = [...events].sort((a, b) => a.endMs - b.endMs);
  const debts: RestCompensationDebt[] = [];
  // 1) Długi ze skróconych odpoczynków (< 45 h).
  for (const e of sorted) {
    if (e.durationH < WEEKLY_REST_LIMITS.regularH) {
      debts.push({
        fromEndMs: e.endMs,
        owedH: Math.round(WEEKLY_REST_LIMITS.regularH - e.durationH),
        deadlineMs: e.endMs + COMPENSATION_MS,
        settled: false,
        settledByEndMs: null,
        overdue: false,
      });
    }
  }
  // 2) Spłaty: nadwyżka (długość − 45) spłaca najstarszy zaległy dług en bloc, w terminie.
  for (const e of sorted) {
    const surplusH = e.durationH - WEEKLY_REST_LIMITS.regularH;
    if (surplusH <= 0) continue;
    const target = debts.find(
      (d) => !d.settled && d.fromEndMs < e.endMs && e.endMs <= d.deadlineMs && d.owedH <= surplusH,
    );
    if (target) {
      target.settled = true;
      target.settledByEndMs = e.endMs;
    }
  }
  // 3) Zaległości względem teraz.
  for (const d of debts) d.overdue = !d.settled && d.deadlineMs < nowMs;

  const unsettled = debts.filter((d) => !d.settled);
  return {
    debts,
    outstandingH: unsettled.reduce((s, d) => s + d.owedH, 0),
    overdueCount: unsettled.filter((d) => d.overdue).length,
    nextDeadlineMs: unsettled.length > 0 ? Math.min(...unsettled.map((d) => d.deadlineMs)) : null,
  };
}

/**
 * #330: Parser liczników z OCR zdjęcia wyświetlacza tacho — wyłuskuje
 * wartości „XXhYY" (np. 04h30, 129h1 → 129h10 traktujemy ostrożnie: tylko
 * pełne 2 cyfry minut). Zwraca minuty, bez duplikatów, w kolejności tekstu.
 */
export function parseTachoTimes(text: string): number[] {
  const out: number[] = [];
  const re = /(\d{1,3})\s*h\s*([0-5]\d)/gi;
  let m: RegExpExecArray | null = re.exec(text);
  while (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h <= 200) {
      const total = h * 60 + min;
      if (!out.includes(total)) out.push(total);
    }
    m = re.exec(text);
  }
  return out;
}
