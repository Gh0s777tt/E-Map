"use client";

import { acceptInvite } from "@e-logistic/api";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { clearMembershipCache } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

type State =
  | { kind: "loading" }
  | { kind: "noToken" }
  | { kind: "needLogin" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

export default function JoinPage() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    (async () => {
      const token = new URLSearchParams(window.location.search).get("token");
      if (!token) {
        setState({ kind: "noToken" });
        return;
      }
      try {
        const sb = getBrowserSupabase();
        const {
          data: { user },
        } = await sb.auth.getUser();
        if (!user) {
          setState({ kind: "needLogin" });
          return;
        }
        await acceptInvite(sb, token);
        clearMembershipCache(); // dołączono do firmy → odśwież cache członkostwa
        setState({ kind: "ok" });
      } catch (e) {
        setState({ kind: "error", message: e instanceof Error ? e.message : "Błąd" });
      }
    })();
  }, []);

  return (
    <main style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>
          <span style={{ color: palette.red }}>E</span>-Logistic
        </h1>
        <p style={styles.sub}>Dołączanie do firmy</p>

        {state.kind === "loading" && <p style={styles.msg}>Przetwarzanie zaproszenia…</p>}
        {state.kind === "noToken" && <p style={styles.msg}>Brak tokenu zaproszenia w linku.</p>}
        {state.kind === "needLogin" && (
          <p style={styles.msg}>
            Najpierw się zaloguj, a następnie otwórz ten link ponownie.{" "}
            <Link href="/login" style={{ color: palette.red }}>
              Przejdź do logowania →
            </Link>
          </p>
        )}
        {state.kind === "error" && (
          <p style={{ ...styles.msg, color: palette.red }}>{state.message}</p>
        )}
        {state.kind === "ok" && (
          <p style={styles.msg}>
            ✅ Dołączono do firmy.{" "}
            <Link href="/dashboard" style={{ color: palette.red }}>
              Przejdź do pulpitu →
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 },
  card: {
    width: 380,
    maxWidth: "100%",
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 16,
    padding: 28,
  },
  title: { fontSize: 32, fontWeight: 800, margin: 0 },
  sub: { color: palette.smoke, marginTop: 0, marginBottom: 12 },
  msg: { color: palette.offWhite, fontSize: 15, lineHeight: 1.5 },
};
