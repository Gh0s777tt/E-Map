/**
 * #351: Lokalizacja w tle (tryb "always") — WYŁĄCZNIE build v2
 * (`EXPO_PUBLIC_BG_LOCATION="1"` / `EAS_BG_LOCATION="1"`, TestFlight po
 * zatwierdzeniu Apple 5.6/2.5.4). Moduł jest importowany LENIWIE i tylko gdy
 * flaga jest ustawiona (patrz `positionShare.ts#syncBackgroundShare`) — w
 * buildzie v1 nigdy się nie ładuje, więc expo-task-manager pozostaje nietknięty.
 *
 * Task rejestruje `startLocationUpdatesAsync` i przy każdej aktualizacji raportuje
 * pozycję tym samym API co foreground (`upsertMyPosition`). Wszystkie wywołania
 * natywne są w try/catch — tło nigdy nie wywraca aplikacji.
 */
import { getActiveMembership, upsertMyPosition } from "@e-logistic/api";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { getSupabase, supabaseConfigured } from "./supabase";

export const BG_TASK = "el-bg-location";

type LocationTaskData = { locations?: Location.LocationObject[] } | undefined;

// Rejestracja taska w zakresie modułu — wykonuje się przy pierwszym leniwym
// imporcie (tylko w v2). defineTask musi istnieć zanim OS dostarczy aktualizacje.
try {
  if (!TaskManager.isTaskDefined(BG_TASK)) {
    TaskManager.defineTask(BG_TASK, async ({ data, error }) => {
      if (error) return;
      try {
        const locations = (data as LocationTaskData)?.locations;
        const pos = locations?.[locations.length - 1];
        if (!pos || !supabaseConfigured) return;
        const sb = getSupabase();
        const m = await getActiveMembership(sb);
        if (!m) return;
        const speed = pos.coords.speed;
        await upsertMyPosition(sb, {
          companyId: m.companyId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speedKmh: speed != null && speed >= 0 ? Math.round(speed * 3.6) : null,
          heading:
            pos.coords.heading != null && pos.coords.heading >= 0 ? pos.coords.heading : null,
        });
      } catch {
        // nigdy nie wywracamy apki z taska tła
      }
    });
  }
} catch {
  // defineTask może rzucić, gdy natywny moduł niedostępny — ignorujemy (v1 tu nie wchodzi)
}

/** Start śledzenia w tle (idempotentny). Całość w try/catch. */
export async function startBackgroundLocation(): Promise<void> {
  try {
    const started = await Location.hasStartedLocationUpdatesAsync(BG_TASK).catch(() => false);
    if (started) return;
    await Location.startLocationUpdatesAsync(BG_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 120_000,
      distanceInterval: 100,
      pausesUpdatesAutomatically: true,
      showsBackgroundLocationIndicator: false,
      activityType: Location.ActivityType.AutomotiveNavigation,
      foregroundService: {
        notificationTitle: "E-Logistic",
        notificationBody: "Udostępnianie pozycji firmie jest aktywne.",
      },
    });
  } catch {
    // brak uprawnień/natywnego modułu nie może wywrócić apki
  }
}

/** Stop śledzenia w tle (idempotentny). */
export async function stopBackgroundLocation(): Promise<void> {
  try {
    const started = await Location.hasStartedLocationUpdatesAsync(BG_TASK).catch(() => false);
    if (started) await Location.stopLocationUpdatesAsync(BG_TASK);
  } catch {
    // ignorujemy
  }
}
