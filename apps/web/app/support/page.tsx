import { cssPalette as palette } from "@e-logistic/ui";
import type { Metadata } from "next";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Wsparcie — E-Logistic",
  description:
    "Wsparcie i kontakt dla aplikacji E-Logistic (web i mobile): jak uzyskać pomoc, najczęstsze pytania, usuwanie konta.",
};

/**
 * Publiczna strona wsparcia — wymagany „Support URL" w App Store Connect / Google Play.
 * Statyczna, po polsku + skrót EN; publiczne trasy pozostają PL (poza LocaleProvider).
 */
export default function SupportPage() {
  return (
    <main style={styles.wrap}>
      <article style={styles.card}>
        <h1 style={styles.title}>
          Wsparcie <span style={styles.accent}>E-Logistic</span>
        </h1>
        <p style={styles.meta}>
          Pomoc dla aplikacji mobilnej i panelu web · odpowiadamy zwykle w 1–2 dni robocze
        </p>

        <h2 style={styles.h2}>Kontakt</h2>
        <p style={styles.p}>
          W każdej sprawie napisz na:{" "}
          <a href="mailto:dzierzawskii98.dam@gmail.com" style={styles.link}>
            dzierzawskii98.dam@gmail.com
          </a>
          . W zgłoszeniu podaj nazwę firmy, model urządzenia i wersję aplikacji (ekran Ustawienia) —
          przyspieszy to pomoc.
        </p>

        <h2 style={styles.h2}>Jak działa dostęp</h2>
        <p style={styles.p}>
          E-Logistic to aplikacja dla firm transportowych. Konto kierowcy zakłada{" "}
          <strong>Twoja firma</strong> — dostajesz zaproszenie linkiem lub kodem QR. Jeśli nie masz
          jeszcze dostępu, poproś właściciela lub spedytora swojej firmy o zaproszenie.
        </p>

        <h2 style={styles.h2}>Najczęstsze pytania</h2>
        <ul style={styles.ul}>
          <li>
            <strong>Nie mogę się zalogować</strong> — sprawdź adres e-mail zaproszenia i połączenie
            z siecią. Hasło zresetujesz linkiem „Nie pamiętam hasła" na ekranie logowania.
          </li>
          <li>
            <strong>Aplikacja nie widzi sieci</strong> — formularze Paliwo / AdBlue / Trasa działają
            offline i zsynchronizują się automatycznie po powrocie zasięgu.
          </li>
          <li>
            <strong>Mapa nie pokazuje mojej pozycji</strong> — włącz zgodę na lokalizację „podczas
            używania" w ustawieniach systemu. Bez zgody mapa pokazuje Europę.
          </li>
          <li>
            <strong>Nie dostaję powiadomień</strong> — sprawdź zgodę na powiadomienia w ustawieniach
            systemu i czy jesteś zalogowany.
          </li>
        </ul>

        <h2 style={styles.h2}>Prywatność i usunięcie konta</h2>
        <p style={styles.p}>
          Zasady przetwarzania danych opisuje{" "}
          <a href="/privacy" style={styles.link}>
            polityka prywatności
          </a>
          . Aby usunąć konto i dane, napisz na adres powyżej — usuniemy je niezwłocznie, z
          zastrzeżeniem danych, których retencji wymagają przepisy.
        </p>

        <hr style={styles.hr} />

        <h2 style={styles.h2}>Support (English summary)</h2>
        <p style={styles.p}>
          E-Logistic is a B2B app for transport companies — your company creates your driver account
          and invites you by link or QR code. For any help, account deletion, or questions, contact{" "}
          <a href="mailto:dzierzawskii98.dam@gmail.com" style={styles.link}>
            dzierzawskii98.dam@gmail.com
          </a>
          . See our{" "}
          <a href="/privacy" style={styles.link}>
            privacy policy
          </a>{" "}
          for how we handle data.
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
  link: { color: palette.red, textDecoration: "underline" },
  hr: { border: "none", borderTop: `1px solid ${palette.graphite}`, margin: "32px 0" },
};
