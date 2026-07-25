import { describe, expect, it } from "vitest";
import {
  idleStopWatch,
  noteForeground,
  noteMotion,
  STOP_HOLD_MS,
  STOP_RESUME_GRACE_MS,
  type StopWatchState,
  stopTick,
} from "./tachoStop";

const T0 = Date.parse("2026-07-25T08:00:00.000Z");
const MIN = 60_000;

/** Skrót: tyknięcie w jeździe, ekran na wierzchu. */
const tick = (
  state: StopWatchState,
  atMs: number,
  over: Partial<{ driving: boolean; foreground: boolean }> = {},
) =>
  stopTick({
    state,
    driving: over.driving ?? true,
    foreground: over.foreground ?? true,
    nowMs: atMs,
  });

describe("tachoStop — wykrywanie postoju w segmencie jazdy (#368)", () => {
  it("poza jazdą nigdy nie pyta i zeruje zegar postoju", () => {
    const moved = noteMotion(idleStopWatch(), { speedKmh: 0, movedKm: 0, nowMs: T0 });
    const r = tick(moved, T0 + 30 * MIN, { driving: false });
    expect(r.prompt).toBe(false);
    expect(r.state).toEqual(idleStopWatch());
    expect(r.sinceMs).toBeNull();
  });

  it("bez ani jednego odczytu GPS milczy — brak danych to nie postój", () => {
    const r = tick(idleStopWatch(), T0);
    expect(r.prompt).toBe(false);
    expect(r.sinceMs).toBeNull();
    // nawet po godzinach jazdy bez uprawnień do lokalizacji nikt nie jest pytany
    expect(tick(r.state, T0 + 5 * 60 * MIN).prompt).toBe(false);
  });

  it("pierwszy odczyt GPS (nawet na postoju) ustawia punkt odniesienia", () => {
    const s = noteMotion(idleStopWatch(), { speedKmh: 0, movedKm: 0, nowMs: T0 });
    expect(s.lastMoveMs).toBe(T0);
    expect(tick(s, T0 + MIN).prompt).toBe(false);
    expect(tick(s, T0 + STOP_HOLD_MS).prompt).toBe(true);
  });

  it("krótki postój milczy, dopiero po progu pyta — i podaje jego początek", () => {
    const s = noteMotion(idleStopWatch(), { speedKmh: 60, movedKm: 1.2, nowMs: T0 });
    expect(tick(s, T0 + 2 * MIN).prompt).toBe(false);
    const r = tick(s, T0 + STOP_HOLD_MS);
    expect(r.prompt).toBe(true);
    expect(r.stillMin).toBe(3);
    expect(r.sinceMs).toBe(T0); // segment datujemy wstecz na moment zatrzymania
  });

  it("monit tylko RAZ na postój — kolejne tyknięcia milczą", () => {
    const s = noteMotion(idleStopWatch(), { speedKmh: 60, movedKm: 1.2, nowMs: T0 });
    const first = tick(s, T0 + STOP_HOLD_MS);
    expect(first.prompt).toBe(true);
    expect(tick(first.state, T0 + 10 * MIN).prompt).toBe(false);
    expect(tick(first.state, T0 + 90 * MIN).prompt).toBe(false);
  });

  it("ruszenie przezbraja monit — kolejny postój znów pyta", () => {
    const s = noteMotion(idleStopWatch(), { speedKmh: 60, movedKm: 1.2, nowMs: T0 });
    const asked = tick(s, T0 + STOP_HOLD_MS).state;
    const rolling = noteMotion(asked, { speedKmh: 55, movedKm: 0.9, nowMs: T0 + 20 * MIN });
    expect(rolling.asked).toBe(false);
    expect(tick(rolling, T0 + 22 * MIN).prompt).toBe(false);
    expect(tick(rolling, T0 + 20 * MIN + STOP_HOLD_MS).prompt).toBe(true);
  });

  it("szum GPS (≤3 km/h, 10 m) to nadal postój, ale odczyt z filtra dystansu to ruch", () => {
    const parked = noteMotion(idleStopWatch(), { speedKmh: 2, movedKm: 0.01, nowMs: T0 });
    expect(tick(parked, T0 + STOP_HOLD_MS).prompt).toBe(true);
    // Bez odczytu prędkości (część urządzeń) decyduje sam dystans. Próg musi być NIŻSZY
    // niż `distanceInterval` watchera (30 m), bo tyle wynosi typowa delta między odczytami
    // — inaczej pełzanie w korku wyglądałoby jak postój.
    const drifting = noteMotion(parked, { speedKmh: null, movedKm: 0.03, nowMs: T0 + MIN });
    expect(drifting.lastMoveMs).toBe(T0 + MIN);
    expect(tick(drifting, T0 + MIN + 2 * MIN).prompt).toBe(false);
  });

  it("w tle nie pyta i nie zużywa monitu — pyta dopiero po powrocie na wierzch", () => {
    const s = noteMotion(idleStopWatch(), { speedKmh: 60, movedKm: 1.2, nowMs: T0 });
    const bg = tick(s, T0 + STOP_HOLD_MS, { foreground: false });
    expect(bg.prompt).toBe(false);
    expect(bg.state.asked).toBe(false);
    expect(tick(bg.state, T0 + STOP_HOLD_MS + MIN).prompt).toBe(true);
  });

  it("powrót z tła NIE zalicza czasu z tła jako postoju (ochrona zapisu)", () => {
    const s = noteMotion(idleStopWatch(), { speedKmh: 60, movedKm: 1.2, nowMs: T0 });
    // 40 min jazdy z telefonem w kieszeni: w tle brak odczytów GPS, więc apka nie wie nic.
    const back = noteForeground(s, T0 + 40 * MIN);
    expect(back.lastMoveMs).toBeNull();
    // Bez świeżego odczytu detektor MILCZY — inaczej monit zaproponowałby przerwę
    // datowaną 40 min wstecz i skasował z zapisu realną jazdę.
    expect(tick(back, T0 + 42 * MIN).prompt).toBe(false);
    expect(tick(back, T0 + 40 * MIN + STOP_RESUME_GRACE_MS / 2).prompt).toBe(false);
  });

  it("po powrocie z tła zegar postoju liczy od pierwszego świeżego odczytu", () => {
    const s = noteMotion(idleStopWatch(), { speedKmh: 60, movedKm: 1.2, nowMs: T0 });
    const back = noteForeground(s, T0 + 40 * MIN);
    const resumed = T0 + 40 * MIN + 5_000;

    // jechał dalej: pierwszy odczyt pokazuje ruch → żadnego monitu
    const rolling = noteMotion(back, { speedKmh: 70, movedKm: 30, nowMs: resumed });
    expect(rolling.quietUntilMs).toBeNull();
    expect(tick(rolling, T0 + 41 * MIN).prompt).toBe(false);

    // właśnie zaparkował: punkt odniesienia to moment odczytu, NIE sprzed tła
    const parked = noteMotion(back, { speedKmh: 0, movedKm: 0, nowMs: resumed });
    expect(parked.lastMoveMs).toBe(resumed);
    // zaraz po powrocie jeszcze nie pytamy — postój trwa dopiero kilka sekund
    expect(tick(parked, resumed + 10_000).prompt).toBe(false);
    // dopiero realnie zaobserwowany postój (próg) uruchamia monit i podaje jego długość
    const late = tick(parked, resumed + STOP_HOLD_MS);
    expect(late.prompt).toBe(true);
    expect(late.stillMin).toBe(3);
    expect(late.sinceMs).toBe(resumed);
  });
});
