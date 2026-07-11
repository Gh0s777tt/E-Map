import { createTranslator } from "@e-logistic/i18n";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import type { CSSProperties } from "react";

const t = createTranslator("pl");

/**
 * Landing 2.0 (#286, styl LogiFlow): hero + funkcje platformy (opisy właściciela)
 * + roadmapa rozszerzeń dla kierowcy i firmy + integracje. Server component.
 */

const CORE_FEATURES: { glyph: string; title: string; desc: string }[] = [
  {
    glyph: "🚛",
    title: "Pulpit kierowcy",
    desc: "Widok ograniczony do danych własnego pojazdu. Szybki start trasy, tankowania i checklisty, KPI dnia i ostatnie aktywności — wszystko działa też offline.",
  },
  {
    glyph: "📊",
    title: "Panel właściciela i spedytora",
    desc: "Pełny przegląd floty z KPI: aktywne pojazdy, spalanie, rentowność tras i klientów. Wykresy, statystyki i szybkie akcje zarządcze.",
  },
  {
    glyph: "🚚",
    title: "Formularz trasy (Trip)",
    desc: "Zdarzenia trasy: załadunek, rozładunek, serwis. Miejsce, czas i waga towaru — dane spinają się z rozliczeniem zlecenia.",
  },
  {
    glyph: "⛽",
    title: "Tankowanie: Diesel + AdBlue",
    desc: "Przełącznik Diesel/AdBlue, litry, stan licznika, kraj stacji i opcja „Zatankowano do pełna” (dokładne liczenie spalania). Historia ostatnich tankowań pod ręką.",
  },
  {
    glyph: "✅",
    title: "Checklisty kierowcy",
    desc: "Listy kontrolne z paskiem postępu — np. „Wjazd do UK” (Border Force) i „Tachograf”. Wyniki trafiają do raportów właściciela, a dni służby do ewidencji czasu pracy.",
  },
  {
    glyph: "🗺️",
    title: "Mapa TIR i trasy",
    desc: "Routing dla ciężarówek wg wymiarów i wagi, myto liczone na odcinki, parkingi i stacje z cenami. Spedytor wysyła gotową trasę na telefon kierowcy.",
  },
  {
    glyph: "📈",
    title: "Raporty i statystyki",
    desc: "Wykresy spalania, kosztów i wydajności z filtrami po dacie, pojeździe i kierowcy. Pełny dostęp dla właściciela, ograniczony dla kierowcy.",
  },
  {
    glyph: "🔧",
    title: "Zarządzanie flotą",
    desc: "Pojazdy ze statusami i terminami (przegląd, OC, leasing), przypisywanie kierowców, karty paliwowe z rabatami, usterki i szkody z obiegiem naprawy.",
  },
];

const DRIVER_ROADMAP: { title: string; desc: string }[] = [
  {
    title: "Proof of Delivery (POD)",
    desc: "zdjęcie + podpis odbiorcy na ekranie — już działa przy zleceniach; dojdzie kod QR",
  },
  {
    title: "Rejestr wydatków",
    desc: "opłaty drogowe, parkingi i naprawy ze zdjęciami paragonów, automatyczne rozliczenie z firmą",
  },
  {
    title: "Czas pracy i przerwy (AETR)",
    desc: "alerty o zbliżającym się przekroczeniu limitu jazdy",
  },
  { title: "Czat z dyspozytorem", desc: "szybka komunikacja tekstowa + zdjęcia z trasy" },
  { title: "Nawigacja z optymalizacją", desc: "najbardziej ekonomiczna trasa pod kątem spalania" },
  {
    title: "Głosowe wypełnianie formularzy",
    desc: "dyktowanie tripów i tankowań — bezpieczeństwo podczas jazdy",
  },
];

const OWNER_ROADMAP: { title: string; desc: string }[] = [
  {
    title: "Analityka + AI",
    desc: "prognoza kosztów paliwa, wykrywanie nieefektywności, sugestie tras",
  },
  {
    title: "Harmonogram serwisów",
    desc: "przypomnienia o przeglądach, ubezpieczeniach i tachografach — już działa dla przeglądów/OC",
  },
  { title: "Scoring kierowców", desc: "punkty za spalanie, terminowość i bezpieczeństwo" },
  {
    title: "Faktury i rozliczenia",
    desc: "faktury VAT z eksportem do Fakturowni — już działa; dojdą kolejne integracje księgowe",
  },
  {
    title: "Alerty w czasie rzeczywistym",
    desc: "opóźnienia, niskie paliwo, przekroczony czas jazdy, zbliżający się serwis",
  },
  {
    title: "Portal dla klientów",
    desc: "link do śledzenia przesyłki na żywo dla klienta końcowego",
  },
];

const INTEGRATIONS =
  "Karty paliwowe (Orlen, Shell, BP…) · Telematyka (WebEye, GPS Guardian…) · Księgowość (Comarch, Symfonia, enova) · Biometria i PIN · Wielojęzyczność (PL · EN · DE · UA) · Gamifikacja dla kierowców · Automatyczne raporty PDF na e-mail";

export default function Home() {
  return (
    <main style={s.main}>
      {/* HERO */}
      <section style={s.hero}>
        <p style={s.brand}>GH0ST EMPIRE</p>
        <h1 style={s.h1}>
          <span style={{ color: palette.red }}>E</span>-Logistic
        </h1>
        <p style={s.tagline}>{t("app.tagline")}</p>
        <p style={s.heroSub}>
          Aplikacja kierowcy (iOS · Android · offline) + panel właściciela i spedytora w jednym.
          Trasy TIR, paliwo, checklisty, zlecenia z CMR/POD i rozliczenia — bez kartek i Excela.
        </p>
        <div style={s.ctaRow}>
          <Link href="/login" style={s.ctaPrimary}>
            Wejdź do aplikacji →
          </Link>
          <a href="https://appstoreconnect.apple.com" style={s.ctaGhost} aria-disabled>
            📱 iOS — TestFlight / App Store
          </a>
        </div>
      </section>

      {/* FUNKCJE */}
      <section style={s.section}>
        <h2 style={s.h2}>Co potrafi platforma</h2>
        <div style={s.grid}>
          {CORE_FEATURES.map((f) => (
            <div key={f.title} style={s.card}>
              <div style={s.cardGlyph}>{f.glyph}</div>
              <div style={s.cardTitle}>{f.title}</div>
              <div style={s.cardDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ROADMAPA */}
      <section style={s.section}>
        <h2 style={s.h2}>W przygotowaniu</h2>
        <div style={s.roadmapCols}>
          <div style={s.roadmapCol}>
            <h3 style={s.h3}>🚛 Dla kierowcy</h3>
            {DRIVER_ROADMAP.map((r) => (
              <div key={r.title} style={s.roadRow}>
                <span style={s.roadTitle}>{r.title}</span>
                <span style={s.roadDesc}> — {r.desc}</span>
              </div>
            ))}
          </div>
          <div style={s.roadmapCol}>
            <h3 style={s.h3}>🏢 Dla właściciela</h3>
            {OWNER_ROADMAP.map((r) => (
              <div key={r.title} style={s.roadRow}>
                <span style={s.roadTitle}>{r.title}</span>
                <span style={s.roadDesc}> — {r.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <p style={s.integrations}>{INTEGRATIONS}</p>
      </section>

      <footer style={s.footer}>
        <Link href="/login" style={s.ctaPrimary}>
          Załóż firmę i przetestuj →
        </Link>
        <p style={s.footNote}>
          Kierowcy · Spedytorzy · Firmy transportowe — dane odizolowane per firma (RLS), PII
          szyfrowane, 2FA i passkey.{" "}
          <Link href="/privacy" style={s.footLink}>
            Prywatność
          </Link>{" "}
          ·{" "}
          <Link href="/support" style={s.footLink}>
            Wsparcie
          </Link>
        </p>
      </footer>
    </main>
  );
}

const s: Record<string, CSSProperties> = {
  main: { minHeight: "100vh", padding: "56px 20px 40px", maxWidth: 1080, margin: "0 auto" },
  hero: { textAlign: "center", marginBottom: 56 },
  brand: { letterSpacing: 4, color: palette.smoke, margin: 0, fontSize: 12 },
  h1: { fontSize: 60, margin: "8px 0 0", fontWeight: 800 },
  tagline: { color: palette.smoke, marginTop: 8, fontSize: 18 },
  heroSub: {
    color: palette.smoke,
    maxWidth: 640,
    margin: "16px auto 0",
    lineHeight: 1.6,
    fontSize: 15,
  },
  ctaRow: {
    display: "flex",
    gap: 14,
    justifyContent: "center",
    marginTop: 28,
    flexWrap: "wrap",
  },
  ctaPrimary: {
    background: palette.red,
    color: "#fff",
    padding: "14px 36px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 16,
    textDecoration: "none",
    boxShadow: "0 0 24px rgba(229, 9, 20, 0.33)",
    display: "inline-block",
  },
  ctaGhost: {
    border: `1px solid ${palette.graphite}`,
    color: palette.offWhite,
    padding: "14px 28px",
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 15,
    textDecoration: "none",
    display: "inline-block",
  },
  section: { marginBottom: 56 },
  h2: { fontSize: 28, fontWeight: 800, textAlign: "center", marginBottom: 28 },
  h3: { fontSize: 18, fontWeight: 700, marginBottom: 12 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
  },
  card: {
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 18,
    padding: "22px 20px",
  },
  cardGlyph: { fontSize: 30, marginBottom: 10 },
  cardTitle: { fontSize: 17, fontWeight: 700, marginBottom: 8 },
  cardDesc: { color: palette.smoke, fontSize: 13.5, lineHeight: 1.55 },
  roadmapCols: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 28,
  },
  roadmapCol: {
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 18,
    padding: "22px 24px",
  },
  roadRow: { padding: "7px 0", fontSize: 13.5, lineHeight: 1.5 },
  roadTitle: { color: palette.offWhite, fontWeight: 700 },
  roadDesc: { color: palette.smoke },
  integrations: {
    color: palette.smoke,
    textAlign: "center",
    fontSize: 12.5,
    marginTop: 24,
    lineHeight: 1.8,
  },
  footer: { textAlign: "center" },
  footNote: { color: palette.smoke, fontSize: 12.5, marginTop: 18, lineHeight: 1.7 },
  footLink: { color: palette.red, textDecoration: "underline" },
};
