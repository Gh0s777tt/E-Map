// URL/stream polyfill wymagany przez @supabase/supabase-js w React Native.
import "react-native-url-polyfill/auto";
import { createSupabaseMobileClient, type TypedSupabaseClient } from "@e-logistic/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { createEncryptedSessionStorage } from "./secureSession";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Czy aplikacja ma komplet konfiguracji Supabase (URL + anon key z env). */
export const supabaseConfigured = Boolean(url && anonKey);

let client: TypedSupabaseClient | null = null;

/**
 * Leniwy, pojedynczy klient Supabase. Sesja szyfrowana AES-256: klucz w keychainie
 * (expo-secure-store), szyfrogram w AsyncStorage — patrz `secureSession.ts`.
 * Rzuca, gdy brak env.
 */
export function getSupabase(): TypedSupabaseClient {
  if (!client) {
    const storage = createEncryptedSessionStorage({
      vault: SecureStore,
      cache: AsyncStorage,
      randomBytes: (byteCount) => Crypto.getRandomBytesAsync(byteCount),
    });
    client = createSupabaseMobileClient(storage, { url, anonKey });
  }
  return client;
}
