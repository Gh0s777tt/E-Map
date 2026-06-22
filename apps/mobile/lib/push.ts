import { getActiveMembership, saveExpoPushToken } from "@e-logistic/api";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getSupabase, supabaseConfigured } from "./supabase";

/**
 * Rejestruje urządzenie do powiadomień push Expo i zapisuje token w bazie
 * (`expo_push_tokens`). Best-effort: brak zgody / brak `projectId` w dev →
 * po prostu push nieaktywny (bez crasha). Idempotentne (upsert po tokenie).
 */
export async function registerForPush(userId: string): Promise<void> {
  if (!supabaseConfigured) return;
  try {
    let granted = (await Notifications.getPermissionsAsync()).granted;
    if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return;

    const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
    const projectId = extra?.eas?.projectId;
    const resp = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

    const sb = getSupabase();
    const m = await getActiveMembership(sb).catch(() => null);
    await saveExpoPushToken(sb, userId, {
      token: resp.data,
      platform: Platform.OS,
      companyId: m?.companyId ?? null,
    });
  } catch {
    // brak uprawnień / brak projectId / offline → push nieaktywny
  }
}
