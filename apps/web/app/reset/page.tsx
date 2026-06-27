"use client";

import { createTranslator } from "@e-logistic/i18n";
import { cssPalette as palette } from "@e-logistic/ui";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

const t = createTranslator("pl");

export default function ResetPage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    if (password.length < 6) {
      setMsg("Hasło musi mieć co najmniej 6 znaków.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await getBrowserSupabase().auth.updateUser({ password });
      if (error) {
        setMsg(error.message);
        return;
      }
      setMsg(t("auth.passwordChanged"));
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1200);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>
          <span style={{ color: palette.red }}>E</span>-Logistic
        </h1>
        <p style={styles.sub}>{t("auth.setNewPassword")}</p>
        <label style={styles.field}>
          <span style={styles.label}>{t("auth.newPassword")}</span>
          <input
            style={styles.input}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="button" style={styles.primary} onClick={submit} disabled={busy}>
          {t("auth.setNewPassword")}
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
  msg: { color: palette.smoke, fontSize: 13, marginTop: 10 },
};
