import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { registerForPush } from "../lib/push";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

interface AuthState {
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  configured: supabaseConfigured,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
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
        if (data.session?.user) void registerForPush(data.session.user.id);
      } finally {
        setLoading(false);
      }
      unsub = sb.auth.onAuthStateChange((_event, s) => {
        setSession(s);
        if (s?.user) void registerForPush(s.user.id);
      }).data.subscription.unsubscribe;
    })();
    return () => unsub?.();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      loading,
      configured: supabaseConfigured,
      signOut: async () => {
        if (!supabaseConfigured) return;
        const sb = getSupabase();
        try {
          await sb.auth.signOut();
        } catch {
          // offline / unieważniony refresh token — i tak czyścimy sesję lokalnie
          await sb.auth.signOut({ scope: "local" }).catch(() => {});
        }
        setSession(null);
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
