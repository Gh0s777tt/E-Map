import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { flushQueued } from "../lib/outbox";
import { registerForPush } from "../lib/push";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

interface AuthState {
  session: Session | null;
  /** #offline: marker zapisanej sesji (bez tokenów) — pozwala wejść offline, gdy
   *  `getSession()` zwraca null po wygaśnięciu JWT (~1 h), a refresh token żyje (~30 dni). */
  hasCachedSession: boolean;
  loading: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  hasCachedSession: false,
  loading: true,
  configured: supabaseConfigured,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Marker zawiera WYŁĄCZNIE identyfikację (bez access/refresh tokenów — te zostają
// w szyfrowanym `secureSession`). Kasowany tylko przy jawnym signOut / SIGNED_OUT.
const MARKER_KEY = "el-auth-marker";
type Marker = { userId: string; email: string | null };

async function saveMarker(s: Session | null) {
  if (!s?.user) return;
  const m: Marker = { userId: s.user.id, email: s.user.email ?? null };
  await AsyncStorage.setItem(MARKER_KEY, JSON.stringify(m)).catch(() => {});
}
async function readMarker(): Promise<Marker | null> {
  try {
    const raw = await AsyncStorage.getItem(MARKER_KEY);
    return raw ? (JSON.parse(raw) as Marker) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [hasCachedSession, setHasCachedSession] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    const sb = getSupabase();
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const { data } = await sb.auth.getSession();
        setSession(data.session);
        if (data.session?.user) {
          setHasCachedSession(true);
          void saveMarker(data.session);
          void registerForPush(data.session.user.id);
        } else {
          // #offline: brak żywej sesji (np. zimny start bez sieci po ~1 h) — jeśli istnieje
          // marker zapisanej sesji, wpuszczamy w trybie zdegradowanym (RLS i tak wymaga JWT
          // przy zapisie; rekordy czekają w outboxie do odzyskania sieci).
          setHasCachedSession((await readMarker()) != null);
        }
      } finally {
        setLoading(false);
      }
      unsub = sb.auth.onAuthStateChange((event, s) => {
        setSession(s);
        if (s?.user) {
          setHasCachedSession(true);
          void saveMarker(s);
        }
        // #audyt N9: push tylko przy realnym logowaniu (nie TOKEN_REFRESHED/USER_UPDATED).
        if (s?.user && event === "SIGNED_IN") void registerForPush(s.user.id);
        // #offline: gdy token znów ważny (login/refresh) — drenaż kolejki offline.
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") void flushQueued();
        // Realne wylogowanie/unieważnienie (NIE błąd sieci — ten nie kasuje sesji w auth-js).
        if (event === "SIGNED_OUT") {
          setHasCachedSession(false);
          void AsyncStorage.removeItem(MARKER_KEY).catch(() => {});
        }
      }).data.subscription.unsubscribe;
    })();
    // #offline: powrót aplikacji na pierwszy plan = dobry moment na drenaż kolejki
    // (sieć zwykle wróciła). Docelowo dołożyć nasłuch NetInfo (wymaga natywnego deps).
    const appStateSub = AppState.addEventListener("change", (st) => {
      if (st === "active") void flushQueued();
    });
    return () => {
      unsub?.();
      appStateSub.remove();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      hasCachedSession,
      loading,
      configured: supabaseConfigured,
      signOut: async () => {
        // Jawny signOut czyści marker (koniec trybu offline). Kolejka outbox zostaje
        // (dane kierowcy nie giną) — do domknięcia: tagowanie wpisów per-user, by na
        // współdzielonym telefonie sync nie poszedł pod innym kierowcą (patrz outbox.ts).
        await AsyncStorage.removeItem(MARKER_KEY).catch(() => {});
        setHasCachedSession(false);
        if (!supabaseConfigured) {
          setSession(null);
          return;
        }
        const sb = getSupabase();
        try {
          await sb.auth.signOut();
        } catch {
          await sb.auth.signOut({ scope: "local" }).catch(() => {});
        }
        setSession(null);
      },
    }),
    [session, hasCachedSession, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
