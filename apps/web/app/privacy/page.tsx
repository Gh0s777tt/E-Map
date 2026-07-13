import { cssPalette as palette } from "@e-logistic/ui";
import type { Metadata } from "next";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Polityka prywatności — E-Logistic",
  description:
    "Polityka prywatności aplikacji E-Logistic (web i mobile): jakie dane przetwarzamy, po co i jakie masz prawa.",
};

/**
 * Publiczna polityka prywatności — wymagana przez Google Play / App Store
 * (URL w karcie sklepu) i spójna z deklaracją „Data safety". Strona statyczna,
 * po polsku + skrót EN; publiczne trasy pozostają PL (poza LocaleProvider).
 */
export default function PrivacyPage() {
  return (
    <main style={styles.wrap}>
      <article style={styles.card}>
        <h1 style={styles.title}>
          Polityka prywatności <span style={styles.accent}>E-Logistic</span>
        </h1>
        <p style={styles.meta}>
          Obowiązuje od: 4 lipca 2026 · dotyczy aplikacji mobilnej i panelu web
        </p>

        <h2 style={styles.h2}>1. Administrator danych</h2>
        <p style={styles.p}>
          Administratorem danych jest operator platformy E-Logistic. Kontakt we wszystkich sprawach
          dotyczących danych: <strong>dzierzawskii98.dam@gmail.com</strong>.
        </p>

        <h2 style={styles.h2}>2. Jakie dane przetwarzamy i po co</h2>
        <ul style={styles.ul}>
          <li>
            <strong>Dane konta</strong> (adres e-mail, hasło w postaci skrótu, opcjonalnie passkey)
            — logowanie i bezpieczeństwo konta.
          </li>
          <li>
            <strong>Dane kadrowe kierowcy</strong> (imię i nazwisko, dokumenty, terminy badań) —
            wprowadzane przez firmę transportową w celu zarządzania flotą; dane wrażliwe
            przechowywane w postaci zaszyfrowanej.
          </li>
          <li>
            <strong>Lokalizacja (dokładna, tylko podczas używania aplikacji)</strong> — wyłącznie do
            pokazania Twojej pozycji na mapie TIR i POI w okolicy. Nie śledzimy lokalizacji w tle i
            nie budujemy historii przemieszczania.
          </li>
          <li>
            <strong>Zdjęcia</strong> (aparat/galeria) — dokumentacja ładunku, CMR i potwierdzenia
            dostawy (POD). Zdjęcia trafiają wyłącznie do zleceń Twojej firmy.
          </li>
          <li>
            <strong>Identyfikatory urządzenia do powiadomień</strong> (token push) — dostarczanie
            powiadomień o zleceniach i terminach.
          </li>
          <li>
            <strong>Dane operacyjne</strong> (tankowania, trasy, zlecenia, faktury) — funkcje
            biznesowe platformy dla Twojej firmy.
          </li>
        </ul>

        <h2 style={styles.h2}>3. Gdzie dane są przechowywane</h2>
        <p style={styles.p}>
          Dane są przechowywane w infrastrukturze <strong>Supabase</strong> (PostgreSQL, region Unii
          Europejskiej) oraz serwowane przez <strong>Vercel</strong>. Powiadomienia push dostarczają
          usługi <strong>Expo</strong> / Google / Apple. Transmisja zawsze po HTTPS (szyfrowanie w
          tranzycie); dostęp do danych ogranicza izolacja per-firma (Row Level Security).
        </p>

        <h2 style={styles.h2}>4. Komu udostępniamy dane</h2>
        <p style={styles.p}>
          Nie sprzedajemy danych i nie udostępniamy ich do celów reklamowych. Dane widzi wyłącznie
          Twoja firma (właściciel/spedytor w zakresie wynikającym z roli) oraz podmioty
          przetwarzające wymienione w pkt. 3 — wyłącznie w celu świadczenia usługi.
        </p>

        <h2 style={styles.h2}>5. Jak długo przechowujemy dane</h2>
        <p style={styles.p}>
          Przez czas istnienia konta/firmy na platformie. Dane rozliczeniowe (faktury) — przez okres
          wymagany przepisami podatkowymi.
        </p>

        <h2 style={styles.h2}>6. Twoje prawa</h2>
        <p style={styles.p}>
          Masz prawo dostępu do danych, ich sprostowania, przeniesienia oraz{" "}
          <strong>żądania usunięcia</strong>. Napisz na adres z pkt. 1 — konto i dane usuniemy
          niezwłocznie, z zastrzeżeniem danych, których retencji wymagają przepisy. Przysługuje Ci
          też skarga do Prezesa UODO.
        </p>

        <h2 style={styles.h2}>7. Uprawnienia aplikacji mobilnej</h2>
        <ul style={styles.ul}>
          <li>
            Lokalizacja „podczas używania" — mapa TIR (opcjonalna; bez zgody mapa pokazuje Europę).
          </li>
          <li>Aparat i zdjęcia — dokumentacja ładunku (opcjonalne).</li>
          <li>Powiadomienia — alerty o zleceniach (opcjonalne).</li>
        </ul>

        <hr style={styles.hr} />

        <h2 style={styles.h2}>Privacy policy (English summary)</h2>
        <p style={styles.p}>
          E-Logistic processes: account data (e-mail), driver HR data entered by your transport
          company (encrypted at rest), precise location <em>only while using the app</em> (TIR map;
          no background tracking), photos you take for cargo/POD documentation, push tokens and
          operational fleet data. Data is stored with Supabase (EU region), transmitted over HTTPS
          and isolated per company (RLS). We do not sell data or use it for advertising. To access
          or delete your data, contact <strong>dzierzawskii98.dam@gmail.com</strong>.
        </p>
      </article>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    background: palette.black,
    display: "flex",
    justifyContent: "center",
    padding: "48px 16px",
  },
  card: {
    maxWidth: 760,
    width: "100%",
    color: palette.offWhite,
    lineHeight: 1.65,
    fontSize: 15,
  },
  title: { fontSize: 32, fontWeight: 800, marginBottom: 4, color: palette.white },
  accent: { color: palette.red },
  meta: { color: palette.smoke, fontSize: 13, marginBottom: 28 },
  h2: { fontSize: 19, fontWeight: 700, marginTop: 28, marginBottom: 8, color: palette.white },
  p: { margin: "8px 0", color: palette.offWhite },
  ul: { margin: "8px 0 8px 20px", display: "grid", gap: 6 },
  hr: { border: "none", borderTop: `1px solid ${palette.graphite}`, margin: "32px 0" },
};
