import { ROLES } from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import Link from "next/link";

const t = createTranslator("pl");

const ROLE_KEYS = {
  developer: "role.developer",
  owner: "role.owner",
  dispatcher: "role.dispatcher",
  driver: "role.driver",
} as const;

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        padding: 24,
        textAlign: "center",
      }}
    >
      <div>
        <p style={{ letterSpacing: 4, color: palette.smoke, margin: 0, fontSize: 12 }}>
          GH0ST EMPIRE
        </p>
        <h1 style={{ fontSize: 56, margin: "8px 0 0", fontWeight: 800 }}>
          <span style={{ color: palette.red }}>E</span>-Logistic
        </h1>
        <p style={{ color: palette.smoke, marginTop: 8 }}>{t("app.tagline")}</p>
      </div>

      <Link
        href="/login"
        style={{
          background: palette.red,
          color: "#fff",
          padding: "14px 36px",
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 16,
          textDecoration: "none",
          boxShadow: `0 0 24px ${palette.red}55`,
        }}
      >
        Wejdź do aplikacji →
      </Link>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        {ROLES.map((role) => (
          <div
            key={role}
            style={{
              minWidth: 160,
              padding: "20px 24px",
              borderRadius: 12,
              background: palette.nearBlack,
              border: `1px solid ${palette.graphite}`,
            }}
          >
            <div style={{ color: palette.red, fontSize: 12, letterSpacing: 2 }}>PANEL</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>{t(ROLE_KEYS[role])}</div>
          </div>
        ))}
      </div>

      <p style={{ color: palette.smoke, fontSize: 13 }}>
        Kierowcy · Spedytorzy · Firmy transportowe — trasy TIR, paliwo, AdBlue, floty i karty.
      </p>
    </main>
  );
}
