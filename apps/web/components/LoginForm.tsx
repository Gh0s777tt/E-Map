"use client";

import { createTranslator, type Locale } from "@e-logistic/i18n";
import { cssPalette as palette } from "@e-logistic/ui";
import { startAuthentication } from "@simplewebauthn/browser";
import { useEffect, useState } from "react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function LoginForm({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Krok 2FA (po poprawnym haśle, gdy konto ma włączone TOTP).
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  // Wznowienie kroku 2FA po przekierowaniu z aplikacji (sesja aal1 wymagająca aal2 —
  // np. po magic-link / OAuth / passkey, które nie przechodzą przez krok hasła).
  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const {
          data: { user },
        } = await sb.auth.getUser();
        if (!user) return;
        const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel === "aal1" && aal.nextLevel === "aal2") {
          const { data: factors } = await sb.auth.mfa.listFactors();
          const totp = factors?.totp?.find((f) => f.status === "verified") ?? factors?.totp?.[0];
          if (totp) setMfaFactorId(totp.id);
        }
      } catch {
        // brak sesji / błąd — pokaż normalny formularz logowania
      }
    })();
  }, []);

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

  async function signInPassword() {
    setBusy(true);
    setMsg(null);
    try {
      const sb = getBrowserSupabase();
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        setMsg(error.message);
        return;
      }
      const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.currentLevel === "aal1" && aal.nextLevel === "aal2") {
        const { data: factors } = await sb.auth.mfa.listFactors();
        const totp = factors?.totp?.[0];
        if (totp) {
          setMfaFactorId(totp.id);
          setMsg(null);
          return;
        }
      }
      if (data.session) window.location.href = "/dashboard";
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Błąd");
    } finally {
      setBusy(false);
    }
  }

  async function verifyMfa() {
    if (!mfaFactorId) return;
    setBusy(true);
    setMsg(null);
    try {
      const sb = getBrowserSupabase();
      const { data: ch, error: chErr } = await sb.auth.mfa.challenge({ factorId: mfaFactorId });
      if (chErr || !ch) {
        setMsg(chErr?.message ?? "Błąd weryfikacji.");
        return;
      }
      const { error } = await sb.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: ch.id,
        code: mfaCode.trim(),
      });
      if (error) {
        setMsg(error.message);
        return;
      }
      window.location.href = "/dashboard";
    } finally {
      setBusy(false);
    }
  }

  const signUpPassword = () =>
    run(async () => {
      const emailRedirectTo = `${window.location.origin}/auth/callback`;
      const { data, error } = await getBrowserSupabase().auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      });
      if (!error && data.session) window.location.href = "/dashboard";
      return { error };
    }, t("auth.checkEmail"));

  const magicLink = () =>
    run(() => getBrowserSupabase().auth.signInWithOtp({ email }), t("auth.magicLink"));

  const forgotPassword = () =>
    run(async () => {
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset`;
      const { error } = await getBrowserSupabase().auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      return { error };
    }, t("auth.resetSent"));

  const oauth = (provider: "google" | "apple") =>
    run(async () => {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await getBrowserSupabase().auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      return { error };
    }, "Przekierowanie…");

  async function loginPasskey() {
    setBusy(true);
    setMsg(null);
    try {
      const optRes = await fetch("/api/passkey/auth/options", { method: "POST" });
      const options = await optRes.json();
      const assertion = await startAuthentication({ optionsJSON: options });
      const verRes = await fetch("/api/passkey/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: assertion }),
      });
      const data = (await verRes.json()) as {
        verified?: boolean;
        tokenHash?: string;
        error?: string;
      };
      if (!data.verified || !data.tokenHash) {
        setMsg(data.error ?? "Logowanie kluczem nie powiodło się.");
        return;
      }
      const { error } = await getBrowserSupabase().auth.verifyOtp({
        type: "magiclink",
        token_hash: data.tokenHash,
      });
      if (error) {
        setMsg(error.message);
        return;
      }
      window.location.href = "/dashboard";
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Błąd passkey");
    } finally {
      setBusy(false);
    }
  }

  const isSignup = mode === "signup";

  function toggleMode() {
    setMode(isSignup ? "signin" : "signup");
    setMsg(null);
  }

  // ── Krok 2FA ──
  if (mfaFactorId) {
    return (
      <main style={styles.wrap}>
        <div style={styles.card}>
          <h1 style={styles.title}>
            <span style={{ color: palette.red }}>E</span>-Logistic
          </h1>
          <p style={styles.sub}>{t("auth.twoFactor")}</p>
          <label style={styles.field}>
            <span style={styles.label}>{t("auth.twoFactorCode")}</span>
            <input
              style={styles.input}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              inputMode="numeric"
              placeholder="123456"
              autoComplete="one-time-code"
            />
          </label>
          <button type="button" style={styles.primary} onClick={verifyMfa} disabled={busy}>
            {t("auth.twoFactorVerify")}
          </button>
          {msg && <p style={styles.msg}>{msg}</p>}
        </div>
      </main>
    );
  }

  return (
    <main style={styles.wrap}>
      <div style={styles.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h1 style={styles.title}>
            <span style={{ color: palette.red }}>E</span>-Logistic
          </h1>
          <span style={{ flex: 1 }} />
          <div style={{ width: 96 }}>
            <LocaleSwitcher />
          </div>
        </div>
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

        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <button type="button" style={styles.link} onClick={toggleMode} disabled={busy}>
            {isSignup ? t("auth.toSignIn") : t("auth.toSignUp")}
          </button>
          {!isSignup && (
            <button type="button" style={styles.link} onClick={forgotPassword} disabled={busy}>
              {t("auth.forgotPassword")}
            </button>
          )}
        </div>

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
        <button type="button" style={styles.passkey} onClick={loginPasskey} disabled={busy}>
          🔑 {t("auth.passkeyLogin")}
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
  passkey: {
    background: "transparent",
    color: palette.offWhite,
    border: `1px solid ${palette.red}`,
    borderRadius: 8,
    padding: "10px 12px",
    cursor: "pointer",
  },
  msg: { color: palette.smoke, fontSize: 13, marginTop: 10 },
};
