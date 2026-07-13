/**
 * #340: blokada aplikacji odblokowywana biometrią (Face ID / Touch ID /
 * odcisk palca). Opcjonalna (domyślnie wyłączona). FAIL-SAFE: gdy urządzenie
 * nie ma biometrii lub moduł niedostępny — brak blokady (nie blokujemy dostępu).
 * Odblokowanie dopuszcza kod urządzenia jako fallback, więc nie da się zablokować.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "el-app-lock";

export async function isAppLockEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === "1";
  } catch {
    return false;
  }
}

export async function setAppLockEnabled(on: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY, on ? "1" : "0");
}

/** Sprawdza, czy urządzenie ma skonfigurowaną biometrię (do UI ustawień). */
export async function biometricAvailable(): Promise<boolean> {
  try {
    const LA = await import("expo-local-authentication");
    const hw = await LA.hasHardwareAsync();
    const enrolled = await LA.isEnrolledAsync();
    return hw && enrolled;
  } catch {
    return false;
  }
}

/**
 * Prosi o odblokowanie biometrią. Zwraca true, gdy odblokowano LUB gdy
 * biometrii brak (fail-safe — nie zostawiamy użytkownika za zamkniętymi drzwiami).
 * `disableDeviceFallback: false` → można odblokować kodem urządzenia.
 */
export async function authenticate(prompt: string): Promise<boolean> {
  try {
    const LA = await import("expo-local-authentication");
    const hw = await LA.hasHardwareAsync();
    const enrolled = await LA.isEnrolledAsync();
    if (!hw || !enrolled) return true; // brak biometrii → wpuszczamy
    const res = await LA.authenticateAsync({
      promptMessage: prompt,
      disableDeviceFallback: false,
      cancelLabel: undefined,
    });
    return res.success;
  } catch {
    return true; // moduł niedostępny (np. Expo Go) → nie blokujemy
  }
}
