import { cssPalette as palette } from "@e-logistic/ui";
import type { Metadata } from "next";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Usunięcie konta — E-Logistic",
  description:
    "Jak poprosić o usunięcie konta E-Logistic i powiązanych danych — kroki, zakres usuwanych danych i okresy przechowywania.",
};

/**
 * #313: Publiczna strona usuwania konta — wymagana przez deklarację
 * „Bezpieczeństwo danych" w Google Play (URL widoczny na karcie sklepu).
 * Spójna z /privacy; po polsku + skrót EN.
 */
export default function AccountDeletionPage() {
  return (
    <main style={styles.wrap}>
      <article style={styles.card}>
        <h1 style={styles.title}>
          Usunięcie konta <span style={styles.accent}>E-Logistic</span>
        </h1>
        <p style={styles.meta}>Dotyczy aplikacji mobilnej E-Logistic i panelu web</p>

        <h2 style={styles.h2}>Jak poprosić o usunięcie konta</h2>
        <ol style={styles.ul}>
          <li>
            Wyślij e-mail na <strong>dzierzawskii98.dam@gmail.com</strong> z adresu, na który
            zarejestrowane jest konto, z tematem <em>„Usunięcie konta E-Logistic"</em>.
          </li>
          <li>Potwierdzimy przyjęcie zgłoszenia i usuniemy konto niezwłocznie, do 30 dni.</li>
        </ol>
        <p style={styles.p}>
          Możesz też poprosić o usunięcie <strong>części danych</strong> (np. zdjęć lub historii
          tankowań) bez usuwania konta — napisz, czego ma dotyczyć żądanie.
        </p>

        <h2 style={styles.h2}>Co zostanie usunięte</h2>
        <ul style={styles.ul}>
          <li>Konto logowania (e-mail, skrót hasła, passkeys) i profil.</li>
          <li>Dane kadrowe kierowcy, tokeny powiadomień push i wiadomości czatu.</li>
          <li>Zdjęcia dokumentacji ładunku dodane z Twojego konta.</li>
        </ul>

        <h2 style={styles.h2}>Co możemy zachować i jak długo</h2>
        <ul style={styles.ul}>
          <li>
            Dokumenty rozliczeniowe firmy (faktury, rozliczenia), których retencji wymagają przepisy
            podatkowe — przez okres wymagany prawem.
          </li>
          <li>
            Wpisy operacyjne firmy (zlecenia, tankowania) mogą pozostać w danych firmy w postaci
            odpiętej od Twojej osoby.
          </li>
        </ul>

        <hr style={styles.hr} />

        <h2 style={styles.h2}>Account deletion (English summary)</h2>
        <p style={styles.p}>
          To delete your E-Logistic account and associated data, e-mail{" "}
          <strong>dzierzawskii98.dam@gmail.com</strong> from the address your account is registered
          to, subject <em>"Delete my E-Logistic account"</em>. We delete the account, profile, HR
          data, push tokens, chat messages and photos you uploaded within 30 days. Invoicing records
          required by tax law are retained for the legally required period; a partial data deletion
          request (without closing the account) is also possible.
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
