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
    desc: "Karta kierowcy: staż, km z trasy, litry ON+AdBlue i średnie spalanie. Szybki start trasy, tankowania i checklisty, „na dziś” i ostatnie aktywności — wszystko działa też offline.",
  },
  {
    glyph: "📊",
    title: "Panel właściciela i spedytora",
    desc: "Pulpit floty z KPI: pojazdy w trasie / przerwie / serwisie, spalanie, przychody i scoring kierowców. Status floty, harmonogram terminów, wykresy i szybkie akcje zarządcze.",
  },
  {
    glyph: "🕓",
    title: "Tacho PRO — czas pracy 561/AETR",
    desc: "Licznik 561 jak w VDO (jazda ciągła z przerwą 15+30, doba 9/10 h, tydzień 56 h) z alertami i lokalnymi powiadomieniami o przerwie, planer odpoczynku tygodniowego, import karty kierowcy .ddd i pełne rozporządzenie 561/2006 pod ręką.",
  },
  {
    glyph: "📡",
    title: "Telematyka live i śledzenie dla klienta",
    desc: "Pozycje aut na żywo na mapie firmy (kolor = świeżość) oraz publiczny link śledzenia z ETA dla klienta końcowego — bez logowania, auto-odświeżanie. Kierowca dobrowolnie włącza udostępnianie pozycji.",
  },
  {
    glyph: "⛽",
    title: "Tankowanie: Diesel + AdBlue",
    desc: "Diesel/AdBlue, litry (skan paragonu OCR uzupełnia je automatycznie), licznik, kraj i miejscowość, „do pełna” do dokładnego spalania oraz wybór karty flotowej przypisanej do auta.",
  },
  {
    glyph: "🚚",
    title: "Zlecenia, trasa i POD z QR",
    desc: "Zdarzenia trasy (załadunek, rozładunek, przeładunek, serwis) z miejscem, wagą i licznikiem. Zlecenia ze statusami, CMR i Proof of Delivery: zdjęcie + podpis + kod QR z publicznym śledzeniem.",
  },
  {
    glyph: "🧾",
    title: "Faktury, KSeF i rozliczenia",
    desc: "Faktury VAT z eksportem do Fakturowni i generatorem e-faktury XML FA(3) w strukturze KSeF 2.0. Diety (per diem), wypłaty i salda kierowców liczone jednym silnikiem na webie i w aplikacji.",
  },
  {
    glyph: "💬",
    title: "Czat z dyspozytorem",
    desc: "Realtime, nazwane kanały prywatne, powiadomienia push o nowej wiadomości i zdjęcia z trasy — szybka komunikacja kierowca ↔ biuro bez telefonów.",
  },
  {
    glyph: "💸",
    title: "Rejestr wydatków",
    desc: "Opłaty drogowe, parkingi i naprawy ze zdjęciami paragonów (OCR kwoty), praca offline, akcje zbiorcze zatwierdź/odrzuć — automatyczne rozliczenie z firmą.",
  },
  {
    glyph: "🗺️",
    title: "Mapa TIR i trasy",
    desc: "Routing dla ciężarówek wg wymiarów i wagi, myto na odcinki, auto-objazd przy nowym utrudnieniu, parkingi z ocenami społeczności i stacje z cenami. Spedytor wysyła gotową trasę na telefon.",
  },
  {
    glyph: "🔧",
    title: "Flota i harmonogram terminów",
    desc: "Pojazdy ze statusami, przeglądy, OC, leasing i licencja transportowa, badania i dokumenty kierowców (paszport, dowód, UDT), karty paliwowe, usterki i szkody. Alerty scalone per auto — czytelne przy 30–50 pojazdach.",
  },
  {
    glyph: "✅",
    title: "Checklisty kierowcy",
    desc: "Listy kontrolne z paskiem postępu — np. „Wjazd do UK” (Border Force) i „Tachograf”. Wyniki trafiają do raportów właściciela, a dni służby do ewidencji czasu pracy.",
  },
  {
    glyph: "🌍",
    title: "Cztery języki: PL · EN · DE · UK",
    desc: "Cała aplikacja — pulpit, zlecenia, formularze, wydatki, ustawienia, logowanie i czat — po polsku, angielsku, niemiecku i ukraińsku. Automatyczne wykrywanie języka telefonu i ręczny wybór.",
  },
  {
    glyph: "🏆",
    title: "Gamifikacja i analityka floty",
    desc: "Kierowcy zdobywają poziomy, punkty i odznaki (dostawy, punktualność, km, eko-jazda). Właściciel dostaje insighty: trend i prognozę kosztu paliwa, pojazdy odstające spalaniem i szacunek oszczędności — z realnych danych.",
  },
  {
    glyph: "🖥️",
    title: "Telefon, macOS, iPad i Windows",
    desc: "Aplikacja iOS/Android z pracą offline, ta sama apka na Makach z Apple Silicon i iPadzie (layout na duże ekrany), a panel właściciela jako PWA na macOS/Windows — gotowy do Microsoft Store.",
  },
];

const DRIVER_ROADMAP: { title: string; desc: string }[] = [
  {
    title: "Głosowe wypełnianie formularzy",
    desc: "dyktowanie tripów i tankowań — bezpieczeństwo podczas jazdy",
  },
  {
    title: "Eco-routing",
    desc: "najbardziej ekonomiczna trasa pod kątem spalania (dziś: routing TIR + auto-objazd)",
  },
  {
    title: "Asystent pasa i widok skrzyżowań",
    desc: "premium nawigacja (Navigation SDK) — reroute z ruchem live i widok 3D już działają",
  },
];

const OWNER_ROADMAP: { title: string; desc: string }[] = [
  {
    title: "Asystent AI spedytora",
    desc: "sugestie tras i decyzji — nadbudowa nad działającą już analityką (trend, prognoza, oszczędności)",
  },
  {
    title: "KSeF — wysyłka online",
    desc: "sesja z API KSeF 2.0 i numer KSeF/UPO przy fakturze (dziś: eksport XML FA(3))",
  },
  {
    title: "Kolejne integracje księgowe",
    desc: "obok eksportu do Fakturowni — Comarch, Symfonia, enova i inne",
  },
  {
    title: "Pełny portal dla klientów",
    desc: "konta i historia przesyłek (dziś: publiczny link śledzenia z ETA)",
  },
];

const INTEGRATIONS =
  "Karty paliwowe (DKV, Orlen, Shell, BP…) · Telematyka GPS wbudowana · e-Faktura KSeF FA(3) + eksport do Fakturowni · Biometria, PIN i passkey · Wielojęzyczność PL · EN · DE · UK · Automatyczne raporty PDF na e-mail · Praca offline (outbox + PowerSync)";

export default function Home() {
  return (
    <main style={s.main}>
      {/* HERO */}
      <section style={s.hero}>
        <h1 style={s.h1}>
          <span style={{ color: palette.red }}>E</span>-Logistic
        </h1>
        <p style={s.tagline}>{t("app.tagline")}</p>
        <p style={s.heroSub}>
          Aplikacja kierowcy (iOS · Android · macOS · iPad · offline) + panel właściciela i
          spedytora jako PWA na macOS/Windows. Trasy TIR, paliwo, checklisty, zlecenia z CMR/POD,
          czas pracy 561/AETR i rozliczenia — po polsku, angielsku, niemiecku i ukraińsku, bez
          kartek i Excela.
        </p>
        <div style={s.ctaRow}>
          <Link href="/login" style={s.ctaPrimary}>
            Wejdź do aplikacji →
          </Link>
        </div>
        <p style={s.platforms}>
          📱 iOS · 🤖 Android (Google Play) · 🖥️ macOS / iPad · 🪟 panel PWA na Windows
        </p>
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
  platforms: { color: palette.smoke, fontSize: 13, marginTop: 18, lineHeight: 1.7 },
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
