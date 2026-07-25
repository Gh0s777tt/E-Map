/**
 * #368: Wykrywanie postoju z GPS dla licznika LIVE (Tacho) — CZYSTA logika
 * decyzyjna, bez zależności natywnych (testowalna w vitest: `tachoStop.test.ts`).
 *
 * Problem, który to naprawia: automatyka przełączała segment TYLKO w jazdę
 * (>15 km/h) i NIGDY w postój. Kierowca, który zaparkował i zapomniał tapnąć
 * „przerwa", naliczał fałszywą jazdę ciągłą i dobową oraz dostawał błędne alerty.
 *
 * Zasada: ten moduł nigdy nie przełącza segmentu — mówi tylko, KIEDY zapytać
 * kierowcę. To dane compliance, więc fałszywy zapis jest gorszy niż brak zapisu.
 *
 * Sygnał postoju = BRAK potwierdzonego ruchu (a nie ciąg odczytów „0 km/h").
 * Watcher GPS chodzi z `distanceInterval` 30 m, więc na postoju aktualizacje
 * po prostu nie przychodzą — cisza jest tu informacją. Dzięki temu działa też
 * na urządzeniach, które nie podają `coords.speed`. Gdy nie ma ŻADNEGO odczytu
 * (odmowa uprawnień, brak GPS), detektor milczy — brak danych nie jest postojem.
 */

/** Powyżej tej prędkości odczyt uznajemy za ruch (niżej — szum GPS na postoju). */
export const STOP_MOVE_KMH = 3;
/**
 * Albo przesunięcie między odczytami. MUSI być mniejsze niż `distanceInterval` watchera
 * (30 m w `tacho.tsx`) — przy progu 50 m delta między kolejnymi odczytami (~30 m) nigdy go
 * nie przekraczała i dystansowy dowód ruchu był martwy. Skutkiem był fałszywy postój przy
 * pełzaniu w korku (prędkość ≤ 3 km/h, choć pojazd jedzie) oraz przy braku `coords.speed`.
 * 20 m = każdy odczyt wypchnięty przez filtr dystansu liczy się jako ruch. Szum GPS może
 * przez to czasem „ukryć" realny postój — to świadomie wybrany kierunek błędu: brak
 * przypomnienia jest nieporównanie mniej szkodliwy niż wstecz-datowana przerwa w zapisie.
 */
export const STOP_MOVE_KM = 0.02;
/** Ile musi trwać cisza w segmencie „jazda", zanim zapytamy kierowcę [ms]. */
export const STOP_HOLD_MS = 3 * 60_000;
/** Po powrocie z tła czekamy na świeży odczyt GPS, zanim zapytamy [ms]. */
export const STOP_RESUME_GRACE_MS = 60_000;
/** Co ile ekran sprawdza stan (postój poznajemy po BRAKU odczytów, więc zegar musi tykać). */
export const STOP_TICK_MS = 30_000;

export interface StopWatchState {
  /** Ostatni moment potwierdzonego ruchu (epoch ms); null = brak punktu odniesienia. */
  lastMoveMs: number | null;
  /** Monit dla BIEŻĄCEGO postoju już pokazany — nie pytamy w pętli. */
  asked: boolean;
  /** Do tego czasu nie pytamy (karencja po powrocie z tła); null = brak karencji. */
  quietUntilMs: number | null;
}

/** Stan zerowy: zegar postoju nie działa (brak jazdy albo świeży start ekranu). */
export function idleStopWatch(): StopWatchState {
  return { lastMoveMs: null, asked: false, quietUntilMs: null };
}

/**
 * Nowy odczyt GPS. Ruch zeruje postój i „przezbraja" monit (kolejny postój
 * zostanie zgłoszony); odczyt bez ruchu tylko kończy karencję po tle —
 * NIE przesuwa początku postoju, bo od niego liczymy próg.
 */
export function noteMotion(
  state: StopWatchState,
  fix: { speedKmh: number | null; movedKm: number; nowMs: number },
): StopWatchState {
  const moving =
    (fix.speedKmh != null && fix.speedKmh > STOP_MOVE_KMH) || fix.movedKm >= STOP_MOVE_KM;
  if (moving) return { lastMoveMs: fix.nowMs, asked: false, quietUntilMs: null };
  return { lastMoveMs: state.lastMoveMs ?? fix.nowMs, asked: state.asked, quietUntilMs: null };
}

/**
 * Powrót ekranu z tła. Watcher GPS ma uprawnienie tylko na pierwszym planie, więc
 * w tle NIE MA odczytów — a to znaczy, że o minionym czasie nie wiemy nic.
 *
 * KRYTYCZNE: `lastMoveMs` musi zostać wyzerowany, a nie zachowany. Inaczej telefon
 * leżący w kieszeni podczas 40 min jazdy wygląda po powrocie jak 40 min postoju:
 * kierowca dostałby monit „stoisz od 40 minut", a potwierdzenie zadatowałoby przerwę
 * wstecz i skasowało z zapisu 40 minut faktycznej jazdy. Dokładnie ten fałszywy zapis
 * compliance, przed którym ten moduł ma chronić.
 *
 * Po wyzerowaniu zegar postoju rusza dopiero od pierwszego ŚWIEŻEGO odczytu GPS,
 * więc monit poda realnie zaobserwowany czas. Karencja zostaje — daje GPS-owi
 * chwilę na pierwszy fix. `asked` również zerujemy, bo to już nowa obserwacja.
 */
export function noteForeground(
  _state: StopWatchState,
  nowMs: number,
  graceMs: number = STOP_RESUME_GRACE_MS,
): StopWatchState {
  return { lastMoveMs: null, asked: false, quietUntilMs: nowMs + graceMs };
}

export interface StopTickInput {
  state: StopWatchState;
  /** Czy licznik LIVE stoi na segmencie „jazda" — tylko wtedy postój fałszuje zapis. */
  driving: boolean;
  /** Ekran aktywny; w tle nie pytamy, bo monit zginąłby bez uwagi kierowcy. */
  foreground: boolean;
  nowMs: number;
  /** Próg postoju [ms] — domyślnie `STOP_HOLD_MS`. */
  holdMs?: number;
}

export interface StopTickResult {
  state: StopWatchState;
  /** true DOKŁADNIE raz na wykryty postój — pokaż monit kierowcy. */
  prompt: boolean;
  /** Ile pełnych minut trwa postój — do treści monitu. */
  stillMin: number;
  /** Początek postoju (epoch ms) — moment, na który datujemy wstecz segment. */
  sinceMs: number | null;
}

/**
 * Okresowa ocena stanu (wołana z interwału ekranu). Zwraca nowy stan i decyzję,
 * czy pokazać monit — bez żadnych efektów ubocznych.
 */
export function stopTick(input: StopTickInput): StopTickResult {
  const { state, driving, foreground, nowMs } = input;
  const holdMs = input.holdMs ?? STOP_HOLD_MS;
  // Poza jazdą nie ma czego pilnować — zegar postoju startuje od zera.
  if (!driving) return { state: idleStopWatch(), prompt: false, stillMin: 0, sinceMs: null };
  // Bez ani jednego odczytu GPS (odmowa uprawnień, brak modułu) nie mamy punktu
  // odniesienia — milczymy. Brak danych nie może udawać wykrytego postoju.
  const lastMoveMs = state.lastMoveMs;
  if (lastMoveMs == null) return { state, prompt: false, stillMin: 0, sinceMs: null };
  const stillMs = Math.max(0, nowMs - lastMoveMs);
  const quiet = state.quietUntilMs != null && nowMs < state.quietUntilMs;
  const prompt = foreground && !quiet && !state.asked && stillMs >= holdMs;
  return {
    state: { lastMoveMs, asked: state.asked || prompt, quietUntilMs: state.quietUntilMs },
    prompt,
    stillMin: Math.floor(stillMs / 60_000),
    sinceMs: lastMoveMs,
  };
}
