import { palette } from "@e-logistic/ui";
import Link from "next/link";
import { CompanyBanner } from "@/components/CompanyBanner";

const CARDS = [
  {
    href: "/forms/fuel",
    tag: "FORMULARZ",
    title: "Paliwo ⛽",
    desc: "Dodaj tankowanie (offline-first)",
  },
  {
    href: "/forms/adblue",
    tag: "FORMULARZ",
    title: "AdBlue 💧",
    desc: "Dodaj uzupełnienie AdBlue",
  },
  {
    href: "/forms/trip",
    tag: "FORMULARZ",
    title: "Trip 🚚",
    desc: "Załadunek / rozładunek / serwis…",
  },
  { href: "/map", tag: "MAPA", title: "Mapa 🗺️", desc: "Routing TIR + myto (mock)" },
  { href: "/stats", tag: "RAPORT", title: "Statystyki 📊", desc: "Spalanie i koszty per pojazd" },
];

export default function DashboardPage() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Pulpit</h1>
      <p style={{ color: palette.smoke }}>
        E-Logistic · formularze, mapa i statystyki — offline-first + Supabase.
      </p>

      <CompanyBanner />

      <div style={{ display: "flex", gap: 16, marginTop: 24, flexWrap: "wrap" }}>
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
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
            <div style={{ color: palette.red, fontSize: 12, letterSpacing: 2 }}>{c.tag}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{c.title}</div>
            <div style={{ color: palette.smoke, fontSize: 13, marginTop: 4 }}>{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
