import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
      } finally {
        setLoading(false);
      }
      unsub = sb.auth.onAuthStateChange((_event, s) => setSession(s)).data.subscription.unsubscribe;
    })();
    return () => unsub?.();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      loading,
      configured: supabaseConfigured,
      signOut: async () => {
        if (supabaseConfigured) await getSupabase().auth.signOut();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
