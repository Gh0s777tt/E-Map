import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Prosty, typowany cache słowników na AsyncStorage (JSON) — żeby ekrany miały
 * czym wypełnić pickery/listy, gdy sieć jest niedostępna (offline-first). To NIE
 * jest źródło prawdy — tylko ostatni znany stan do wyświetlenia. Klucze
 * prefiksujemy, by nie kolidowały z outboxem (`el-outbox`) ani sesją.
 */
const PREFIX = "el-cache-";

/** Odczyt z cache; `null` gdy brak wpisu lub uszkodzony JSON (bez rzucania). */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Zapis do cache (best-effort; awaria storage nie może wywalić zapisu formularza). */
export async function setCache<T>(key: string, val: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(val));
  } catch {
    // brak miejsca / awaria storage — cache jest tylko wygodą, więc ignorujemy.
  }
}
