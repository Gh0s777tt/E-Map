/**
 * Fabryki klientów Supabase (browser/server) — build-safe:
 * klient tworzony dopiero w wywołaniu, nigdy na poziomie modułu.
 */
import { createBrowserClient as ssrBrowser, createServerClient as ssrServer } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type { Database, Json } from "./database.types";

/** Klient Supabase otypowany schematem bazy (generowany z żywej bazy). */
export type TypedSupabaseClient = SupabaseClient<Database>;

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
export function createSupabaseBrowserClient(cfg?: Partial<SupabaseConfig>): TypedSupabaseClient {
  const { url, anonKey } = resolveConfig(cfg);
  return ssrBrowser<Database>(url, anonKey);
}

/** Adapter pamięci dla sesji mobilnej (np. AsyncStorage z React Native). */
export interface MobileAuthStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

/**
 * Klient mobilny (React Native / Expo). Sesja trzymana w przekazanej pamięci
 * (AsyncStorage), bez detekcji sesji w URL. Warstwa danych (`packages/api`)
 * jest niezależna od platformy — przyjmuje ten klient tak samo jak webowy.
 */
/**
 * #354: fetch z twardym timeoutem. Bez tego pojedyncze zapytanie (auth.getUser,
 * select/insert, rpc) na wolnej/zerwanej sieci mogło wisieć w nieskończoność, a
 * wywołujący przycisk zostawał w stanie `busy`/`loading` — user widział „nic się
 * nie dzieje". Timeout gwarantuje, że każde żądanie ZAWSZE się rozstrzygnie
 * (reject po `ms`), więc `finally` zresetuje stan i pokaże błąd. 30 s = zapas na
 * wolne uploady zdjęć, a i tak ratuje z zawieszenia.
 */
function timeoutFetch(ms: number): typeof fetch {
  return (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    const external = init?.signal;
    if (external) {
      if (external.aborted) controller.abort();
      else external.addEventListener("abort", () => controller.abort(), { once: true });
    }
    return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
  };
}

export function createSupabaseMobileClient(
  storage: MobileAuthStorage,
  cfg?: Partial<SupabaseConfig>,
): TypedSupabaseClient {
  const { url, anonKey } = resolveConfig(cfg);
  return createClient<Database>(url, anonKey, {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      // #287: OAuth (Google/Microsoft) natywnie — kod wraca deep linkiem,
      // wymieniany na sesje przez exchangeCodeForSession (PKCE).
      flowType: "pkce",
    },
    // #354: bez timeoutu wiszące żądanie zawieszało przyciski (busy na zawsze).
    global: { fetch: timeoutFetch(30_000) },
  });
}

// Klient service-role (omija RLS) wydzielony do `./admin` z `import "server-only"`
// (audyt #215). Import: `@e-logistic/api/admin` — nigdy z głównego eksportu.

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
