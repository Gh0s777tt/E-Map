/**
 * #324: Udostępnianie pozycji firmie (telematyka, fala 1) — DOBROWOLNE,
 * przełącznik w Ustawieniach. Gdy włączone i aplikacja aktywna, co 2 min
 * wysyła aktualną pozycję (upsert własnego wiersza `driver_positions`);
 * wyłączenie kasuje wiersz. Tylko foreground — bez śledzenia w tle.
 */
import { getActiveMembership, upsertMyPosition } from "@e-logistic/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useEffect } from "react";
import { AppState } from "react-native";
import { getSupabase, supabaseConfigured } from "./supabase";

const KEY = "el-share-position";
const INTERVAL_MS = 120_000;

export async function getSharePosition(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === "1";
  } catch {
    return false;
  }
}

export async function setSharePosition(on: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY, on ? "1" : "0");
}

/** Jednorazowy odczyt i wysyłka pozycji (no-op bez zgody/uprawnień/sesji). */
export async function reportPositionOnce(): Promise<void> {
  if (!supabaseConfigured || !(await getSharePosition())) return;
  const perm = await Location.getForegroundPermissionsAsync();
  if (!perm.granted) return;
  const sb = getSupabase();
  const m = await getActiveMembership(sb);
  if (!m) return;
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const speed = pos.coords.speed;
  await upsertMyPosition(sb, {
    companyId: m.companyId,
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    speedKmh: speed != null && speed >= 0 ? Math.round(speed * 3.6) : null,
    heading: pos.coords.heading != null && pos.coords.heading >= 0 ? pos.coords.heading : null,
  });
}

/** Montowany raz w layoucie: cykliczny raport + odświeżenie po powrocie do apki. */
export function usePositionReporter(): void {
  useEffect(() => {
    const tick = () => reportPositionOnce().catch(() => {});
    tick();
    const timer = setInterval(tick, INTERVAL_MS);
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") tick();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
}
