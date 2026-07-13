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
