/**
 * #324: Udostępnianie pozycji firmie (telematyka, fala 1) — DOBROWOLNE,
 * wybór trybu w Ustawieniach. Tryby:
 *   - "off"        — nie udostępniam.
 *   - "foreground" — tylko gdy aplikacja jest otwarta/aktywna (co 2 min upsert
 *                    własnego wiersza `driver_positions`).
 *   - "always"     — także w tle; DOSTĘPNE TYLKO w buildzie v2
 *                    (`EXPO_PUBLIC_BG_LOCATION="1"`, TestFlight po zatwierdzeniu
 *                    Apple 5.6/2.5.4). W buildzie v1 tryb ukryty/nieaktywny.
 * Wyłączenie ("off") kasuje wiersz. Kompatybilność wstecz: stary boolean "1"
 * odczytujemy jako "foreground".
 */
import { getActiveMembership, upsertMyPosition } from "@e-logistic/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useEffect } from "react";
import { AppState } from "react-native";
import { getSupabase, supabaseConfigured } from "./supabase";

export type PositionShareMode = "off" | "foreground" | "always";

const KEY = "el-share-position";
const INTERVAL_MS = 120_000;

/**
 * #351: flaga buildu (PUBLIC, runtime) — czy build ma włączoną lokalizację w tle.
 * v1 (do recenzji Apple): nieustawiona → tryb "always" niedostępny, tło nietykane.
 * v2 (TestFlight po zatwierdzeniu): "1" → "always" dostępne, task tła aktywny.
 */
export const bgLocationEnabled = process.env.EXPO_PUBLIC_BG_LOCATION === "1";

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

/** Mapuje zapisaną wartość na tryb (kompatybilność wstecz: stary boolean "1"). */
function parseMode(raw: string | null): PositionShareMode {
  if (raw === "always") return "always";
  if (raw === "foreground" || raw === "1") return "foreground";
  return "off";
}

export async function getSharePositionMode(): Promise<PositionShareMode> {
  try {
    return parseMode(await AsyncStorage.getItem(KEY));
  } catch {
    return "off";
  }
}

export async function setSharePositionMode(mode: PositionShareMode): Promise<void> {
  await AsyncStorage.setItem(KEY, mode);
  membershipCache = null; // zmiana ustawienia → wymuś świeży odczyt firmy przy tick-u
  await syncBackgroundShare(mode); // start/stop taska tła (no-op w v1)
}

/** Czy w ogóle udostępniamy pozycję (foreground lub always). */
export async function isSharingEnabled(): Promise<boolean> {
  return (await getSharePositionMode()) !== "off";
}

/**
 * Uzgadnia stan taska tła z trybem. W buildzie v1 (`bgLocationEnabled === false`)
 * NIGDY nie importuje `./backgroundLocation` — expo-task-manager pozostaje nietknięty.
 */
async function syncBackgroundShare(mode: PositionShareMode): Promise<void> {
  if (!bgLocationEnabled) return;
  try {
    const bg = await import("./backgroundLocation");
    if (mode === "always") await bg.startBackgroundLocation();
    else await bg.stopBackgroundLocation();
  } catch {
    // tło nigdy nie może wywrócić aplikacji
  }
}

/** Jednorazowy odczyt i wysyłka pozycji (no-op bez zgody/uprawnień/sesji). */
export async function reportPositionOnce(): Promise<void> {
  if (!supabaseConfigured || (await getSharePositionMode()) === "off") return;
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
    // wznów task tła, jeśli zapisany tryb to "always" (no-op w v1)
    getSharePositionMode()
      .then((m) => syncBackgroundShare(m))
      .catch(() => {});
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
