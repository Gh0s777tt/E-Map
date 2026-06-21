/**
 * Fabryki klientów Supabase (browser/server) — build-safe:
 * klient tworzony dopiero w wywołaniu, nigdy na poziomie modułu.
 */
import { createBrowserClient as ssrBrowser, createServerClient as ssrServer } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

function resolveConfig(cfg?: Partial<SupabaseConfig>): SupabaseConfig {
  const url =
    cfg?.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey =
    cfg?.anonKey ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Brak konfiguracji Supabase — ustaw NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return { url, anonKey };
}

/** Klient przeglądarkowy (komponenty klienta). */
export function createSupabaseBrowserClient(cfg?: Partial<SupabaseConfig>): SupabaseClient {
  const { url, anonKey } = resolveConfig(cfg);
  return ssrBrowser(url, anonKey);
}

/**
 * Klient service-role (TYLKO serwer — pełne uprawnienia, omija RLS).
 * Używany np. przy logowaniu passkey (weryfikacja + mintowanie sesji).
 * Nigdy nie używać w kodzie klienckim.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Brak konfiguracji service-role (SUPABASE_SERVICE_ROLE_KEY).");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Typ adaptera ciasteczek wymagany przez @supabase/ssr (dostarcza go framework). */
type ServerOptions = NonNullable<Parameters<typeof ssrServer>[2]>;
export type CookieAdapter = ServerOptions["cookies"];

/** Klient serwerowy (Server Components / middleware) — adapter ciasteczek od frameworka. */
export function createSupabaseServerClient(
  cookies: CookieAdapter,
  cfg?: Partial<SupabaseConfig>,
): SupabaseClient {
  const { url, anonKey } = resolveConfig(cfg);
  return ssrServer(url, anonKey, { cookies });
}
