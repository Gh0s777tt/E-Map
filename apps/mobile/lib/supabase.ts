// URL/stream polyfill wymagany przez @supabase/supabase-js w React Native.
import "react-native-url-polyfill/auto";
import { createSupabaseMobileClient, type TypedSupabaseClient } from "@e-logistic/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Czy aplikacja ma komplet konfiguracji Supabase (URL + anon key z env). */
export const supabaseConfigured = Boolean(url && anonKey);

let client: TypedSupabaseClient | null = null;

/** Leniwy, pojedynczy klient Supabase (sesja w AsyncStorage). Rzuca, gdy brak env. */
export function getSupabase(): TypedSupabaseClient {
  if (!client) {
    client = createSupabaseMobileClient(AsyncStorage, { url, anonKey });
  }
  return client;
}
