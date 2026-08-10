/**
 * [#383] Parser tagu OSM `opening_hours` (godziny otwarcia stacji, warsztatów, parkingów).
 *
 * DLACZEGO ostrożnie: format `opening_hours` jest formalną gramatyką z miesiącami,
 * tygodniami roku, datami świąt, zachodem słońca, regułami awaryjnymi `||` i komentarzami.
 * Nie da się go objąć w całości i próba "prawie pełnego" parsera kończy się tym, że
 * kilka procent napisów zostaje zrozumianych ŹLE. A błąd tutaj nie jest kosmetyczny:
 * kierowca, któremu pokażemy "otwarte do 22:00", jedzie 40 km i staje pod zamkniętym
 * szlabanem z pustym bakiem.
 *
 * Dlatego obsługujemy wąski, ale realistyczny podzbiór (dni tygodnia + godziny + `off`),
 * a WSZYSTKO czego nie rozumiemy zwracamy jako stan `unknown` — nigdy jako `closed`.
 * "Zamknięte" to twierdzenie o świecie i wolno je wypowiedzieć tylko wtedy, gdy cały
 * napis został zrozumiany.
 *
 * Czas jest parametrem (`LocalMoment`), nie `Date.now()` w środku — inaczej testy są
 * niedeterministyczne, a wynik zależy od strefy maszyny, nie od strefy stacji.
 */

/** Dzień tygodnia w kolejności OSM: 0 = poniedziałek … 6 = niedziela. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Kody dni w notacji OSM — stabilne klucze do i18n po stronie UI. */
export const OPENING_HOURS_WEEKDAY_CODES = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

export type WeekdayCode = (typeof OPENING_HOURS_WEEKDAY_CODES)[number];

/**
 * Chwila w czasie **lokalnym obiektu** (nie UTC, nie czas telefonu).
 * Godziny w OSM są zawsze lokalne dla miejsca, więc konwersję strefy robi wołający —
 * tu wchodzi już gotowy dzień tygodnia i minuta doby.
 */
export interface LocalMoment {
  weekday: Weekday;
  /** Minuty od północy, 0..1439. */
  minutesOfDay: number;
}

/** Punkt w tygodniu do pokazania w UI: dzień + godzina "HH:MM". */
export interface OpeningHoursMoment {
  weekday: Weekday;
  time: string;
}

/**
 * `no-data` — brak tagu / pusty napis (mówimy „brak danych o godzinach").
 * `unsupported-format` — tag jest, ale zawiera konstrukcję poza naszym podzbiorem.
 * Oba dają stan `unknown`; rozróżnienie służy tylko doborowi komunikatu i diagnostyce.
 */
export type OpeningHoursUnknownReason = "no-data" | "unsupported-format";

export type OpeningHoursState = "open" | "closed" | "unknown";

export interface OpeningHoursStatus {
  state: OpeningHoursState;
  /** Do kiedy otwarte (tylko `open`). `null` gdy nigdy się nie zamyka (24/7). */
  closesAt: OpeningHoursMoment | null;
  /** Najbliższe otwarcie (tylko `closed`). `null` gdy z danych wynika, że nie otwiera się nigdy. */
  opensAt: OpeningHoursMoment | null;
  /**
   * W napisie jest reguła `PH`/`SH` (święta / ferie), której NIE umiemy ocenić —
   * kalendarza świąt nie mamy. Stan dotyczy wtedy zwykłego dnia tygodnia, a UI
   * musi dopisać zastrzeżenie „poza świętami" — inaczej tekst na ekranie
   * twierdziłby więcej, niż kod sprawdził.
   */
  holidaysUnknown: boolean;
  /** Powód niepewności (tylko `unknown`). */
  unknownReason: OpeningHoursUnknownReason | null;
}

/** Jeden dzień rozkładu; pusta lista `ranges` = zamknięte tego dnia. */
export interface OpeningHoursDay {
  weekday: Weekday;
  code: WeekdayCode;
  /** Napisy "HH:MM-HH:MM", posortowane; "22:00-06:00" oznacza przejście przez północ. */
  ranges: string[];
}

/** Sklejone kolejne dni o identycznych godzinach — forma do dymka na mapie. */
export interface OpeningHoursGroup {
  from: Weekday;
  to: Weekday;
  ranges: string[];
}

export interface OpeningHoursWeek {
  known: boolean;
  /** Zawsze 7 pozycji Mo..Su gdy `known`, pusto gdy nie. */
  days: OpeningHoursDay[];
  /** To samo co `days`, ale kolejne dni o tych samych godzinach sklejone w zakres. */
  groups: OpeningHoursGroup[];
  /** Otwarte całą dobę, 7 dni w tygodniu. */
  alwaysOpen: boolean;
  holidaysUnknown: boolean;
  unknownReason: OpeningHoursUnknownReason | null;
}

const MINUTES_IN_DAY = 1440;
const MINUTES_IN_WEEK = MINUTES_IN_DAY * 7;

const DAY_TOKENS: Record<string, Weekday> = {
  mo: 0,
  tu: 1,
  we: 2,
  th: 3,
  fr: 4,
  sa: 5,
  su: 6,
};

/** `PH` = public holidays, `SH` = school holidays. Obu nie umiemy policzyć bez kalendarza. */
const HOLIDAY_TOKENS = new Set(["ph", "sh"]);

interface TimeRange {
  /** Minuty od północy, 0..1439. */
  start: number;
  /** Minuty od północy, 1..1440 (1440 = "24:00"). Gdy `end <= start` — zakres przez północ. */
  end: number;
}

interface Interval {
  start: number;
  end: number;
}

/* ───────────────────────────── formatowanie ───────────────────────────── */

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatRange(range: TimeRange): string {
  return `${formatMinutes(range.start)}-${formatMinutes(range.end)}`;
}

/** Minuty liczone od poniedziałku 00:00 → punkt {dzień, "HH:MM"} do pokazania. */
function toMoment(absoluteMinutes: number): OpeningHoursMoment {
  const wrapped = ((absoluteMinutes % MINUTES_IN_WEEK) + MINUTES_IN_WEEK) % MINUTES_IN_WEEK;
  const weekday = Math.floor(wrapped / MINUTES_IN_DAY) as Weekday;
  return { weekday, time: formatMinutes(wrapped % MINUTES_IN_DAY) };
}

/* ───────────────────────────── parsowanie ───────────────────────────── */

/**
 * Rozdziela regułę na selektor dni i część godzinową.
 * Selektor to wyłącznie dwuliterowe tokeny (`Mo`, `PH`) w zakresach `-` i listach `,`.
 * Cokolwiek dłuższego (`Mon`, `Jan`, `week`, `sunrise`) rozjedzie się tutaj albo
 * poniżej i świadomie wywróci parsowanie do `unknown` zamiast być zgadywane.
 */
const RULE_RE =
  /^([A-Za-z]{2}(?:\s*-\s*[A-Za-z]{2})?(?:\s*,\s*[A-Za-z]{2}(?:\s*-\s*[A-Za-z]{2})?)*)?\s*(.*)$/;

const TIME_RANGE_RE = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;

/** "HH:MM" → minuty od północy, albo `null` gdy poza zakresem. */
function parseClock(hourText: string, minuteText: string): number | null {
  const h = Number(hourText);
  const m = Number(minuteText);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (m < 0 || m > 59) return null;
  // 24:00 to legalny koniec doby w OSM, ale 24:30 już nie.
  if (h === 24) return m === 0 ? MINUTES_IN_DAY : null;
  if (h < 0 || h > 23) return null;
  return h * 60 + m;
}

/** `null` = nie rozumiemy części godzinowej. Pusta lista = jawne `off`. */
function parseTimes(text: string): TimeRange[] | null {
  const value = text.trim();
  if (value === "") return null;
  const lower = value.toLowerCase();
  if (lower === "off" || lower === "closed") return [];
  if (lower === "24/7") return [{ start: 0, end: MINUTES_IN_DAY }];

  const parts = value.split(",");
  const ranges: TimeRange[] = [];
  for (const part of parts) {
    const m = TIME_RANGE_RE.exec(part.trim());
    if (!m) return null;
    const start = parseClock(m[1] ?? "", m[2] ?? "");
    const end = parseClock(m[3] ?? "", m[4] ?? "");
    if (start === null || end === null) return null;
    // Początek "24:00" nie znaczy nic sensownego.
    if (start >= MINUTES_IN_DAY) return null;
    // "08:00-08:00" bywa czytane jako pełna doba, a bywa jako pomyłka mapującego.
    // Nie zgadujemy — dwuznaczny napis idzie do `unknown`.
    if (start === end) return null;
    ranges.push({ start, end });
  }
  return ranges;
}

/** `Fr-Mo` przechodzi przez koniec tygodnia — rozwijamy z zawinięciem. */
function expandDayRange(from: Weekday, to: Weekday): Weekday[] {
  const days: Weekday[] = [];
  let d = from;
  for (;;) {
    days.push(d);
    if (d === to) break;
    d = ((d + 1) % 7) as Weekday;
  }
  return days;
}

interface SelectorResult {
  days: Weekday[];
  /** Selektor wymienia `PH`/`SH`. */
  holidays: boolean;
}

/** `null` = selektor zawiera token, którego nie znamy → cała reguła jest niezrozumiała. */
function parseSelector(text: string): SelectorResult | null {
  const days: Weekday[] = [];
  let holidays = false;
  for (const token of text.split(",")) {
    const item = token.trim().toLowerCase();
    if (item === "") return null;
    const dash = item.split("-");
    if (dash.length === 1) {
      const single = item;
      if (HOLIDAY_TOKENS.has(single)) {
        holidays = true;
        continue;
      }
      const day = DAY_TOKENS[single];
      if (day === undefined) return null;
      days.push(day);
      continue;
    }
    if (dash.length !== 2) return null;
    const fromText = (dash[0] ?? "").trim();
    const toText = (dash[1] ?? "").trim();
    const from = DAY_TOKENS[fromText];
    const to = DAY_TOKENS[toText];
    // `PH-Mo` i inne hybrydy nie mają sensu — odpuszczamy całość.
    if (from === undefined || to === undefined) return null;
    days.push(...expandDayRange(from, to));
  }
  return { days, holidays };
}

interface ParsedOk {
  ok: true;
  /** 7 pozycji Mo..Su; pusta lista = zamknięte cały dzień. */
  perDay: TimeRange[][];
  holidaysUnknown: boolean;
  /** Żadna reguła nie dotyczyła zwykłego dnia tygodnia (np. sam `PH off`). */
  weekdaysCovered: boolean;
}

interface ParsedFail {
  ok: false;
  reason: OpeningHoursUnknownReason;
}

type ParsedOpeningHours = ParsedOk | ParsedFail;

/**
 * Reguły rozdzielone `;` nadpisują się dla dni, które wymieniają — dokładnie tak
 * działa `Mo-Su 08:00-18:00; Sa off`. Dlatego przypisujemy (nie dokładamy) zakresy.
 */
function parseOpeningHours(expression: string | null | undefined): ParsedOpeningHours {
  if (expression === null || expression === undefined) return { ok: false, reason: "no-data" };
  const expr = expression.trim();
  if (expr === "") return { ok: false, reason: "no-data" };

  const perDay: TimeRange[][] = [[], [], [], [], [], [], []];
  let holidaysUnknown = false;
  let weekdaysCovered = false;
  let sawRule = false;

  for (const rawRule of expr.split(";")) {
    const rule = rawRule.trim();
    if (rule === "") continue; // dopuszczamy końcowy średnik
    sawRule = true;

    const m = RULE_RE.exec(rule);
    if (!m) return { ok: false, reason: "unsupported-format" };
    const selectorText = m[1];
    const timesText = m[2] ?? "";

    const times = parseTimes(timesText);
    if (times === null) return { ok: false, reason: "unsupported-format" };

    if (selectorText === undefined) {
      // Sama godzina bez dni (np. "08:00-16:00") = każdy dzień tygodnia.
      for (let d = 0; d < 7; d += 1) perDay[d] = times.map((r) => ({ ...r }));
      weekdaysCovered = true;
      continue;
    }

    const selector = parseSelector(selectorText);
    if (selector === null) return { ok: false, reason: "unsupported-format" };
    if (selector.holidays) holidaysUnknown = true;
    for (const day of selector.days) {
      perDay[day] = times.map((r) => ({ ...r }));
      weekdaysCovered = true;
    }
  }

  if (!sawRule) return { ok: false, reason: "no-data" };
  return { ok: true, perDay, holidaysUnknown, weekdaysCovered };
}

/* ───────────────────────────── model tygodnia ───────────────────────────── */

/**
 * Rozkłada zakresy dzienne na przedziały w skali tygodnia (minuty od pon. 00:00).
 * Zakres przez północ (`22:00-06:00`) przedłuża się na dzień następny, a z niedzieli
 * zawija na poniedziałek — bez tego stacja nocna byłaby „zamknięta" o 2 w nocy.
 */
function toWeekIntervals(perDay: TimeRange[][]): Interval[] {
  const raw: Interval[] = [];
  for (let day = 0; day < 7; day += 1) {
    for (const range of perDay[day] ?? []) {
      const start = day * MINUTES_IN_DAY + range.start;
      const end =
        range.end > range.start
          ? day * MINUTES_IN_DAY + range.end
          : day * MINUTES_IN_DAY + MINUTES_IN_DAY + range.end;
      if (end <= MINUTES_IN_WEEK) {
        raw.push({ start, end });
      } else {
        raw.push({ start, end: MINUTES_IN_WEEK });
        raw.push({ start: 0, end: end - MINUTES_IN_WEEK });
      }
    }
  }

  raw.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: Interval[] = [];
  for (const interval of raw) {
    const last = merged[merged.length - 1];
    // Sklejamy też przedziały stykające się (`<=`), żeby "08:00-12:00,12:00-17:00"
    // nie wyglądało jak zamknięcie na zero minut.
    if (last && interval.start <= last.end) {
      if (interval.end > last.end) last.end = interval.end;
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

function isAlwaysOpen(intervals: Interval[]): boolean {
  const only = intervals[0];
  return (
    intervals.length === 1 && only !== undefined && only.start === 0 && only.end === MINUTES_IN_WEEK
  );
}

/* ───────────────────────────── API ───────────────────────────── */

function unknownStatus(reason: OpeningHoursUnknownReason): OpeningHoursStatus {
  return {
    state: "unknown",
    closesAt: null,
    opensAt: null,
    holidaysUnknown: false,
    unknownReason: reason,
  };
}

/**
 * Czy otwarte w podanej chwili, do kiedy, a jeśli zamknięte — kiedy otwierają.
 *
 * @param expression surowa wartość tagu OSM `opening_hours` (może być pusta/`null`).
 * @param moment chwila w czasie lokalnym obiektu; `null` (np. nieznana strefa) → `unknown`,
 *   bo bez wiarygodnej godziny lokalnej każda odpowiedź byłaby zmyślona.
 */
export function getOpeningHoursStatus(
  expression: string | null | undefined,
  moment: LocalMoment | null,
): OpeningHoursStatus {
  const parsed = parseOpeningHours(expression);
  if (!parsed.ok) return unknownStatus(parsed.reason);
  // Sam `PH off` nie mówi nic o zwykłym wtorku — to nie jest „zamknięte na okrągło".
  if (!parsed.weekdaysCovered) return unknownStatus("unsupported-format");
  if (moment === null) return unknownStatus("no-data");
  if (
    !Number.isInteger(moment.minutesOfDay) ||
    moment.minutesOfDay < 0 ||
    moment.minutesOfDay >= MINUTES_IN_DAY
  ) {
    return unknownStatus("no-data");
  }

  const intervals = toWeekIntervals(parsed.perDay);
  const holidaysUnknown = parsed.holidaysUnknown;

  if (isAlwaysOpen(intervals)) {
    return { state: "open", closesAt: null, opensAt: null, holidaysUnknown, unknownReason: null };
  }

  const now = moment.weekday * MINUTES_IN_DAY + moment.minutesOfDay;
  const first = intervals[0];

  for (let i = 0; i < intervals.length; i += 1) {
    const interval = intervals[i];
    if (!interval) continue;
    if (now < interval.start || now >= interval.end) continue;
    let end = interval.end;
    // Przedział kończący się o niedzielnej północy ciągnie się dalej, jeśli tydzień
    // zaczyna się od otwartego poniedziałku (np. "Mo-Su 22:00-06:00").
    if (end === MINUTES_IN_WEEK && first && first.start === 0) {
      end = MINUTES_IN_WEEK + first.end;
    }
    return {
      state: "open",
      closesAt: toMoment(end),
      opensAt: null,
      holidaysUnknown,
      unknownReason: null,
    };
  }

  if (!first) {
    // Wszystkie reguły mówią `off` — zamknięte i nic nie zapowiada otwarcia.
    return { state: "closed", closesAt: null, opensAt: null, holidaysUnknown, unknownReason: null };
  }
  const next = intervals.find((i) => i.start > now);
  const opensAt = toMoment(next ? next.start : first.start + MINUTES_IN_WEEK);
  return { state: "closed", closesAt: null, opensAt, holidaysUnknown, unknownReason: null };
}

/**
 * Uporządkowany rozkład tygodnia (Mo..Su) do dymka na mapie.
 * Nie tłumaczy nazw dni — zwraca indeksy i kody OSM, żeby warstwa UI podstawiła
 * własne teksty w swoim języku.
 */
export function describeOpeningWeek(expression: string | null | undefined): OpeningHoursWeek {
  const parsed = parseOpeningHours(expression);
  if (!parsed.ok || !parsed.weekdaysCovered) {
    return {
      known: false,
      days: [],
      groups: [],
      alwaysOpen: false,
      holidaysUnknown: parsed.ok ? parsed.holidaysUnknown : false,
      unknownReason: parsed.ok ? "unsupported-format" : parsed.reason,
    };
  }

  const days: OpeningHoursDay[] = [];
  for (let d = 0; d < 7; d += 1) {
    const weekday = d as Weekday;
    const ranges = [...(parsed.perDay[d] ?? [])]
      .sort((a, b) => a.start - b.start || a.end - b.end)
      .map(formatRange);
    days.push({ weekday, code: OPENING_HOURS_WEEKDAY_CODES[weekday], ranges });
  }

  const groups: OpeningHoursGroup[] = [];
  for (const day of days) {
    const last = groups[groups.length - 1];
    if (
      last &&
      last.ranges.length === day.ranges.length &&
      last.ranges.every((r, i) => r === day.ranges[i])
    ) {
      last.to = day.weekday;
    } else {
      groups.push({ from: day.weekday, to: day.weekday, ranges: [...day.ranges] });
    }
  }

  return {
    known: true,
    days,
    groups,
    alwaysOpen: isAlwaysOpen(toWeekIntervals(parsed.perDay)),
    holidaysUnknown: parsed.holidaysUnknown,
    unknownReason: null,
  };
}

/**
 * `Date` → chwila lokalna w podanej strefie IANA (np. "Europe/Berlin").
 * Bez `timeZone` bierze strefę środowiska — na telefonie kierowcy zwykle poprawną,
 * ale dla stacji po drugiej stronie granicy już nie, więc wołający powinien podać strefę.
 * `null` przy niepoprawnej dacie lub nieznanej strefie — świadomie, bo lepszy stan
 * „nie wiemy" niż godziny przeliczone wg złej strefy.
 */
export function localMomentFromDate(date: Date, timeZone?: string): LocalMoment | null {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
  } catch {
    return null;
  }
  const get = (type: Intl.DateTimeFormatPartTypes): number | null => {
    const found = parts.find((p) => p.type === type);
    if (!found) return null;
    const n = Number(found.value);
    return Number.isFinite(n) ? n : null;
  };
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  if (year === null || month === null || day === null || hour === null || minute === null) {
    return null;
  }
  // Dzień tygodnia liczymy z dat kalendarzowych, a nie z nazwy `weekday` — nazwy
  // różnią się między wersjami ICU, liczby nie.
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const weekday = ((utcDay + 6) % 7) as Weekday; // niedziela=0 w JS → poniedziałek=0 w OSM
  return { weekday, minutesOfDay: (hour % 24) * 60 + minute };
}
