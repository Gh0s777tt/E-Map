import { palette } from "@e-logistic/ui";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Pulpit</h1>
      <p style={{ color: palette.smoke }}>Faza 1 · v0.3.0 — pierwsze funkcje operacyjne.</p>

      <div style={{ display: "flex", gap: 16, marginTop: 24, flexWrap: "wrap" }}>
        <Link
          href="/forms/fuel"
          style={{
            display: "block",
            minWidth: 220,
            padding: 20,
            borderRadius: 12,
            background: palette.nearBlack,
            border: `1px solid ${palette.graphite}`,
            color: palette.offWhite,
            textDecoration: "none",
          }}
        >
          <div style={{ color: palette.red, fontSize: 12, letterSpacing: 2 }}>FORMULARZ</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>Paliwo ⛽</div>
          <div style={{ color: palette.smoke, fontSize: 13, marginTop: 4 }}>
            Dodaj tankowanie (offline-first)
          </div>
        </Link>
      </div>
    </div>
  );
}
