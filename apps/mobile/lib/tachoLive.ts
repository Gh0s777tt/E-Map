/**
 * #329: Licznik 561 LIVE — kierowca przełącza czynność (jazda/przerwa/
 * inna praca/odpoczynek) jak w tachografie, a aplikacja liczy na żywo
 * jazdę ciągłą, dobową i tygodniową (silnik `aetrStatus` z core) oraz
 * planuje LOKALNE powiadomienia: „za 30 min przerwa" i „przerwa TERAZ".
 * Segmenty w AsyncStorage — działa offline, bez serwera.
 */
import { AETR_LIMITS, type AetrInput, aetrStatus } from "@e-logistic/core";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

export type LiveActivity = "driving" | "break" | "work" | "rest";

export interface LiveSegment {
  activity: LiveActivity;
  /** Początek segmentu (epoch ms). Koniec = start następnego lub `now`. */
  start: number;
}

const KEY = "el-tacho-live";
const NOTIF_KEY = "el-tacho-live-notifs";

export async function loadLiveSegments(): Promise<LiveSegment[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as LiveSegment[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setLiveActivity(activity: LiveActivity): Promise<LiveSegment[]> {
  const segments = await loadLiveSegments();
  const last = segments[segments.length - 1];
  if (last?.activity !== activity) {
    segments.push({ activity, start: Date.now() });
    await AsyncStorage.setItem(KEY, JSON.stringify(segments.slice(-500)));
  }
  return segments;
}

export async function resetLive(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
  await cancelBreakAlerts();
}

/** Zamienia segmenty na wejście licznika 561 (jazda ciągła/dobowa/tygodniowa). */
export function liveToAetrInput(segments: LiveSegment[], now: number): AetrInput {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(dayStart);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // poniedziałek

  let daily = 0;
  let weekly = 0;
  let continuous = 0;
  let breakTaken = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg) continue;
    const end = segments[i + 1]?.start ?? now;
    const durMin = Math.max(0, (end - seg.start) / 60_000);
    if (seg.activity === "driving") {
      continuous += durMin;
      const dayOverlap = Math.max(
        0,
        (Math.min(end, now) - Math.max(seg.start, dayStart.getTime())) / 60_000,
      );
      daily += Math.max(0, Math.min(durMin, dayOverlap));
      const weekOverlap = Math.max(
        0,
        (Math.min(end, now) - Math.max(seg.start, weekStart.getTime())) / 60_000,
      );
      weekly += Math.max(0, Math.min(durMin, weekOverlap));
    } else if (seg.activity === "break" || seg.activity === "rest") {
      // przerwa kwalifikowana: 45 min, albo 30 po wcześniejszej ≥15
      if (
        durMin >= AETR_LIMITS.fullBreak ||
        (breakTaken >= AETR_LIMITS.firstSplitBreak && durMin >= AETR_LIMITS.secondSplitBreak)
      ) {
        continuous = 0;
        breakTaken = 0;
      } else if (durMin >= AETR_LIMITS.firstSplitBreak) {
        breakTaken = Math.round(durMin);
      }
    }
    // "work" nie zeruje jazdy ciągłej ani przerwy
  }

  return {
    continuousDrivingMin: Math.round(continuous),
    breakTakenMin: Math.round(breakTaken),
    dailyDrivingMin: Math.round(daily),
    weeklyDrivingMin: Math.round(weekly),
    prevWeekDrivingMin: 0,
    extendedDrivesUsed: 0,
    reducedRestsUsed: 0,
  };
}

/** Status licznika z segmentów LIVE. */
export function liveStatus(segments: LiveSegment[], now: number) {
  return aetrStatus(liveToAetrInput(segments, now));
}

export async function cancelBreakAlerts(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_KEY);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    for (const id of ids) await Notifications.cancelScheduledNotificationAsync(id);
    await AsyncStorage.removeItem(NOTIF_KEY);
  } catch {
    // brak zaplanowanych
  }
}

/**
 * Planuje lokalne alerty przerwy dla bieżącej jazdy: T−30 min i T0.
 * Wywoływać przy przejściu w tryb „jazda"; przy innej czynności — cancel.
 */
export async function scheduleBreakAlerts(
  toBreakMin: number,
  texts: { warn: string; now: string },
): Promise<void> {
  await cancelBreakAlerts();
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      const req = await Notifications.requestPermissionsAsync();
      if (!req.granted) return;
    }
    const ids: string[] = [];
    const mk = (minFromNow: number, body: string) =>
      Notifications.scheduleNotificationAsync({
        content: { title: "Tacho — 561", body, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(5, Math.round(minFromNow * 60)),
        },
      });
    if (toBreakMin > 30) ids.push(await mk(toBreakMin - 30, texts.warn));
    if (toBreakMin > 0) ids.push(await mk(toBreakMin, texts.now));
    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(ids));
  } catch {
    // powiadomienia niedostępne (np. web/symulator) — licznik dalej działa
  }
}
