/**
 * #312: Live Activity (iOS 16.2+) — aktywna trasa na ekranie blokady / Dynamic Island.
 * Fail-soft: na Androidzie, w Expo Go i na starszych iOS wszystko jest no-opem.
 * Mapa orderId → activityId trzymana w AsyncStorage, by dostawa po restarcie
 * aplikacji nadal domykała aktywność.
 */

import { palette } from "@e-logistic/ui";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const STORE_KEY = "el-live-activities";

type LiveActivityModule = typeof import("expo-live-activity");

function getModule(): LiveActivityModule | null {
  if (Platform.OS !== "ios") return null;
  try {
    return require("expo-live-activity") as LiveActivityModule;
  } catch {
    return null; // brak natywnego modułu (np. Expo Go)
  }
}

async function readMap(): Promise<Record<string, string>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(STORE_KEY)) ?? "{}");
  } catch {
    return {};
  }
}

async function writeMap(map: Record<string, string>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(map));
  } catch {
    // brak persystencji ≠ brak aktywności; najwyżej nie domkniemy po restarcie
  }
}

/** Start aktywności dla zlecenia; pasek odlicza do końca dnia rozładunku (jeśli znany). */
export async function startOrderActivity(
  orderId: string,
  title: string,
  subtitle: string,
  unloadDate?: string | null,
): Promise<void> {
  const la = getModule();
  if (!la) return;
  const map = await readMap();
  if (map[orderId]) return; // aktywność już trwa
  const end = unloadDate ? Date.parse(`${unloadDate}T23:59:59`) : Number.NaN;
  try {
    const id = la.startActivity(
      {
        title,
        subtitle,
        ...(Number.isFinite(end) && end > Date.now() ? { progressBar: { date: end } } : {}),
      },
      {
        backgroundColor: palette.black,
        titleColor: palette.offWhite,
        subtitleColor: palette.smoke,
        progressViewTint: palette.red,
        progressViewLabelColor: palette.offWhite,
        deepLinkUrl: "/orders",
        timerType: "digital",
      },
    );
    if (id) {
      map[orderId] = id;
      await writeMap(map);
    }
  } catch {
    // ActivityKit potrafi odmówić (wyłączone w Ustawieniach, limit aktywności)
  }
}

/** Domknięcie aktywności (dostarczono/anulowano); no-op gdy nie była wystartowana. */
export async function stopOrderActivity(
  orderId: string,
  title: string,
  subtitle: string,
): Promise<void> {
  const la = getModule();
  if (!la) return;
  const map = await readMap();
  const id = map[orderId];
  if (!id) return;
  try {
    la.stopActivity(id, { title, subtitle });
  } catch {
    // aktywność mogła już wygasnąć — sprzątamy mapę tak czy inaczej
  }
  delete map[orderId];
  await writeMap(map);
}
