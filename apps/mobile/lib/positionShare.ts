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

// #audyt N16: companyId nie zmienia się w trakcie sesji — cache'ujemy je, żeby
// tick (co 2 min) nie robił pełnego round-tripu `getActiveMembership` do Supabase
// tylko po jedną liczbę. Krótkie TTL łapie ewentualną zmianę firmy bez ciągłego
// odpytywania; przełączenie udostępniania wymusza świeży odczyt.
const MEMBERSHIP_TTL_MS = 600_000; // 10 min
let membershipCache: { at: number; companyId: string } | null = null;

async function getCachedCompanyId(sb: ReturnType<typeof getSupabase>): Promise<string | null> {
  const now = Date.now();
  if (membershipCache && now - membershipCache.at < MEMBERSHIP_TTL_MS) {
    return membershipCache.companyId;
  }
  const m = await getActiveMembership(sb);
  if (!m) return null;
  membershipCache = { at: now, companyId: m.companyId };
  return m.companyId;
}

export async function getSharePosition(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === "1";
  } catch {
    return false;
  }
}

export async function setSharePosition(on: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY, on ? "1" : "0");
  membershipCache = null; // zmiana ustawienia → wymuś świeży odczyt firmy przy tick-u
}

/** Jednorazowy odczyt i wysyłka pozycji (no-op bez zgody/uprawnień/sesji). */
export async function reportPositionOnce(): Promise<void> {
  if (!supabaseConfigured || !(await getSharePosition())) return;
  const perm = await Location.getForegroundPermissionsAsync();
  if (!perm.granted) return;
  const sb = getSupabase();
  const companyId = await getCachedCompanyId(sb);
  if (!companyId) return;
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const speed = pos.coords.speed;
  await upsertMyPosition(sb, {
    companyId,
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
