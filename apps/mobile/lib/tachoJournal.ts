/**
 * #345: dziennik Tacho — logowanie zdarzeń (dzień pracy start/koniec,
 * odpoczynek tygodniowy start/koniec z typem) do DB (profil kierowcy) oraz
 * lokalne powiadomienia o terminie kolejnego odpoczynku tygodniowego (144 h
 * od końca poprzedniego). Fail-safe: brak sieci → błąd zwracany do UI.
 */
import {
  getActiveMembership,
  insertTachoEvent,
  type TachoEventKind,
  type TachoRestType,
} from "@e-logistic/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { getSupabase, supabaseConfigured } from "./supabase";

const NOTIF_KEY = "el-weekly-rest-notifs";
/** 6 dób od końca poprzedniego odpoczynku tygodniowego = 144 h. */
const WEEKLY_GAP_H = 144;
const WARN_BEFORE_H = 6;

export async function logTachoEvent(kind: TachoEventKind, restType?: TachoRestType): Promise<void> {
  if (!supabaseConfigured) throw new Error("Brak konfiguracji.");
  const sb = getSupabase();
  const m = await getActiveMembership(sb);
  if (!m) throw new Error("Brak aktywnej firmy.");
  await insertTachoEvent(sb, { companyId: m.companyId, kind, restType });
  // Po zakończeniu odpoczynku tygodniowego — zaplanuj przypomnienie o kolejnym.
  if (kind === "weekly_rest_end") await scheduleWeeklyRestDeadline(Date.now());
}

async function cancelWeeklyRestNotifs(): Promise<void> {
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
 * Planuje 2 powiadomienia: 6 h przed terminem i w terminie (144 h od końca
 * poprzedniego odpoczynku tygodniowego). Zastępuje wcześniejsze.
 */
export async function scheduleWeeklyRestDeadline(restEndMs: number): Promise<void> {
  await cancelWeeklyRestNotifs();
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      const req = await Notifications.requestPermissionsAsync();
      if (!req.granted) return;
    }
    const deadlineMs = restEndMs + WEEKLY_GAP_H * 3_600_000;
    const now = Date.now();
    const ids: string[] = [];
    const mk = (fireMs: number, title: string, body: string) =>
      Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(5, Math.round((fireMs - now) / 1000)),
        },
      });
    const warnMs = deadlineMs - WARN_BEFORE_H * 3_600_000;
    if (warnMs > now) {
      ids.push(
        await mk(
          warnMs,
          "Tacho — odpoczynek tygodniowy",
          `Za ${WARN_BEFORE_H} h musisz rozpocząć odpoczynek tygodniowy.`,
        ),
      );
    }
    if (deadlineMs > now) {
      ids.push(
        await mk(
          deadlineMs,
          "Tacho — termin odpoczynku",
          "Termin: rozpocznij teraz odpoczynek tygodniowy (minęło 144 h).",
        ),
      );
    }
    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(ids));
  } catch {
    // powiadomienia niedostępne — dziennik i tak działa
  }
}

export { WEEKLY_GAP_H };
