/**
 * #327: Licznik 561/2006 (jak licznik VDO w tachografie) — czysty silnik:
 * z bieżących wartości jazdy wylicza, ile zostało do przerwy, ile jazdy
 * w dobie/tygodniu/dwutygodniu oraz ile kredytów (2× jazda 10 h,
 * 3× odpoczynek skrócony 9 h) pozostało. Reguły: rozporządzenie (WE)
 * nr 561/2006 (tekst skonsolidowany w aplikacji: /tacho).
 * To POMOC ORIENTACYJNA — wiążący jest zapis tachografu.
 */

const MIN = 1;
const H = 60 * MIN;

/** Limity 561/2006 (minuty). */
export const AETR_LIMITS = {
  continuousDriving: 4.5 * H, // 4 h 30 jazdy ciągłej
  fullBreak: 45 * MIN, // przerwa 45 min (lub 15+30)
  firstSplitBreak: 15 * MIN,
  secondSplitBreak: 30 * MIN,
  dailyDriving: 9 * H, // dzienny czas jazdy
  dailyDrivingExtended: 10 * H, // 2× w tygodniu
  extendedPerWeek: 2,
  weeklyDriving: 56 * H,
  twoWeekDriving: 90 * H,
  reducedDailyRests: 3, // między odpoczynkami tygodniowymi
  dailyRest: 11 * H,
  dailyRestReduced: 9 * H,
  weeklyRest: 45 * H,
  weeklyRestReduced: 24 * H,
} as const;

export interface AetrInput {
  /** Jazda ciągła od ostatniej kwalifikowanej przerwy [min]. */
  continuousDrivingMin: number;
  /** Część przerwy już wykorzystana w tym cyklu (0 lub ≥15) [min]. */
  breakTakenMin: number;
  /** Jazda w bieżącej dobie [min]. */
  dailyDrivingMin: number;
  /** Jazda w bieżącym tygodniu (pn 00:00 – nd 24:00) [min]. */
  weeklyDrivingMin: number;
  /** Jazda w poprzednim tygodniu [min]. */
  prevWeekDrivingMin: number;
  /** Wykorzystane wydłużenia do 10 h w tym tygodniu (0–2). */
  extendedDrivesUsed: number;
  /** Wykorzystane skrócone odpoczynki dobowe 9 h od ost. tygodniowego (0–3). */
  reducedRestsUsed: number;
}

export interface AetrStatus {
  /** Ile jazdy zostało do wymaganej przerwy [min] (0 = przerwa TERAZ). */
  toBreakMin: number;
  /** Wymagana najbliższa przerwa [min]: 45, albo 30 po wykorzystanej 15. */
  requiredBreakMin: number;
  /** Pozostała jazda w dobie przy limicie 9 h [min]. */
  dailyRemainingMin: number;
  /** Pozostała jazda w dobie przy wydłużeniu do 10 h (null gdy brak kredytu). */
  dailyRemainingExtendedMin: number | null;
  /** Pozostałe wydłużenia do 10 h w tym tygodniu (0–2). */
  extendedLeft: number;
  /** Pozostała jazda w tym tygodniu [min] (uwzględnia też limit 90 h/2 tyg.). */
  weeklyRemainingMin: number;
  /** Pozostała jazda w dwutygodniu [min]. */
  twoWeekRemainingMin: number;
  /** Pozostałe skrócone odpoczynki dobowe 9 h (0–3). */
  reducedRestsLeft: number;
  /** Naruszenia / ostrzeżenia (puste = OK). */
  alerts: string[];
}

const clamp0 = (n: number) => Math.max(0, Math.round(n));

/** Wylicza stan licznika 561 (wartości w minutach). Ujemne wejścia → 0. */
export function aetrStatus(raw: AetrInput): AetrStatus {
  const input: AetrInput = {
    continuousDrivingMin: clamp0(raw.continuousDrivingMin),
    breakTakenMin: clamp0(raw.breakTakenMin),
    dailyDrivingMin: clamp0(raw.dailyDrivingMin),
    weeklyDrivingMin: clamp0(raw.weeklyDrivingMin),
    prevWeekDrivingMin: clamp0(raw.prevWeekDrivingMin),
    extendedDrivesUsed: Math.min(AETR_LIMITS.extendedPerWeek, clamp0(raw.extendedDrivesUsed)),
    reducedRestsUsed: Math.min(AETR_LIMITS.reducedDailyRests, clamp0(raw.reducedRestsUsed)),
  };
  const alerts: string[] = [];

  const toBreakMin = clamp0(AETR_LIMITS.continuousDriving - input.continuousDrivingMin);
  if (input.continuousDrivingMin > AETR_LIMITS.continuousDriving) {
    alerts.push("continuous-driving-exceeded");
  }
  const requiredBreakMin =
    input.breakTakenMin >= AETR_LIMITS.firstSplitBreak
      ? AETR_LIMITS.secondSplitBreak
      : AETR_LIMITS.fullBreak;

  const extendedLeft = AETR_LIMITS.extendedPerWeek - input.extendedDrivesUsed;
  const dailyRemainingMin = clamp0(AETR_LIMITS.dailyDriving - input.dailyDrivingMin);
  const dailyRemainingExtendedMin =
    extendedLeft > 0 ? clamp0(AETR_LIMITS.dailyDrivingExtended - input.dailyDrivingMin) : null;
  if (
    input.dailyDrivingMin >
    (extendedLeft > 0 ? AETR_LIMITS.dailyDrivingExtended : AETR_LIMITS.dailyDriving)
  ) {
    alerts.push("daily-driving-exceeded");
  }

  const twoWeekRemainingMin = clamp0(
    AETR_LIMITS.twoWeekDriving - input.weeklyDrivingMin - input.prevWeekDrivingMin,
  );
  const weeklyRemainingMin = Math.min(
    clamp0(AETR_LIMITS.weeklyDriving - input.weeklyDrivingMin),
    twoWeekRemainingMin,
  );
  if (input.weeklyDrivingMin > AETR_LIMITS.weeklyDriving) alerts.push("weekly-driving-exceeded");
  if (input.weeklyDrivingMin + input.prevWeekDrivingMin > AETR_LIMITS.twoWeekDriving) {
    alerts.push("two-week-driving-exceeded");
  }

  return {
    toBreakMin,
    requiredBreakMin,
    dailyRemainingMin,
    dailyRemainingExtendedMin,
    extendedLeft,
    weeklyRemainingMin,
    twoWeekRemainingMin,
    reducedRestsLeft: AETR_LIMITS.reducedDailyRests - input.reducedRestsUsed,
    alerts,
  };
}

/** „7h05" — format liczników jak na wyświetlaczu tacho. */
export function formatTachoMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h${m.toString().padStart(2, "0")}`;
}
