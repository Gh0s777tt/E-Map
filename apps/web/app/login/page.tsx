"use client";

import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

const t = createTranslator("pl");

type Mode = "signin" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<{ error: { message: string } | null }>, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await fn();
      setMsg(error ? error.message : ok);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Błąd");
    } finally {
      setBusy(false);
    }
  }

  const signInPassword = () =>
    run(async () => {
      const { data, error } = await getBrowserSupabase().auth.signInWithPassword({
        email,
        password,
      });
      if (!error && data.session) window.location.href = "/dashboard";
      return { error };
    }, "Zalogowano.");

  const signUpPassword = () =>
    run(async () => {
      const emailRedirectTo = `${window.location.origin}/auth/callback`;
      const { data, error } = await getBrowserSupabase().auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      });
      // Bez potwierdzenia e-mail → od razu sesja → na pulpit. Z potwierdzeniem → komunikat.
      if (!error && data.session) window.location.href = "/dashboard";
      return { error };
    }, t("auth.checkEmail"));

  const magicLink = () =>
    run(() => getBrowserSupabase().auth.signInWithOtp({ email }), t("auth.magicLink"));

  const oauth = (provider: "google" | "apple") =>
    run(async () => {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await getBrowserSupabase().auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      return { error };
    }, "Przekierowanie…");

  const isSignup = mode === "signup";

  function toggleMode() {
    setMode(isSignup ? "signin" : "signup");
    setMsg(null);
  }

  return (
    <main style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>
          <span style={{ color: palette.red }}>E</span>-Logistic
        </h1>
        <p style={styles.sub}>{isSignup ? t("auth.signUpSub") : t("auth.signInSub")}</p>

        <label style={styles.field}>
          <span style={styles.label}>{t("auth.email")}</span>
          <input
            style={styles.input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kierowca@firma.pl"
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>{t("auth.password")}</span>
          <input
            style={styles.input}
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button
          type="button"
          style={styles.primary}
          onClick={isSignup ? signUpPassword : signInPassword}
          disabled={busy}
        >
          {isSignup ? t("auth.createAccount") : t("auth.signIn")}
        </button>

        <button type="button" style={styles.link} onClick={toggleMode} disabled={busy}>
          {isSignup ? t("auth.toSignIn") : t("auth.toSignUp")}
        </button>

        <div style={styles.divider} />

        <button type="button" style={styles.ghost} onClick={magicLink} disabled={busy}>
          {t("auth.magicLink")}
        </button>
        <button type="button" style={styles.oauth} onClick={() => oauth("google")} disabled={busy}>
          {t("auth.continueGoogle")}
        </button>
        <button type="button" style={styles.oauth} onClick={() => oauth("apple")} disabled={busy}>
          {t("auth.continueApple")}
        </button>

        {msg && <p style={styles.msg}>{msg}</p>}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 },
  card: {
    width: 360,
    maxWidth: "100%",
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 16,
    padding: 28,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  title: { fontSize: 32, fontWeight: 800, margin: 0 },
  sub: { color: palette.smoke, marginTop: 0, marginBottom: 12 },
  field: { display: "flex", flexDirection: "column", gap: 4, marginTop: 8 },
  label: { fontSize: 12, color: palette.smoke },
  input: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "10px 12px",
    color: palette.offWhite,
  },
  primary: {
    marginTop: 12,
    background: palette.red,
    color: palette.white,
    border: "none",
    borderRadius: 8,
    padding: "11px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  ghost: {
    background: "transparent",
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "10px 12px",
    cursor: "pointer",
  },
  link: {
    background: "transparent",
    color: palette.smoke,
    border: "none",
    padding: "6px 0 0",
    fontSize: 13,
    cursor: "pointer",
    textAlign: "center",
  },
  divider: { height: 1, background: palette.graphite, margin: "12px 0" },
  oauth: {
    background: palette.coal,
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "10px 12px",
    cursor: "pointer",
  },
  msg: { color: palette.smoke, fontSize: 13, marginTop: 10 },
};
