/**
 * #301: Wysyłka e-maili przez Resend (czysty fetch, bez SDK).
 * Klucz w env `RESEND_API_KEY`; nadawca w `EMAIL_FROM` (domyślnie adres
 * onboardingowy Resend — do produkcyjnej wysyłki na dowolne adresy trzeba
 * zweryfikować własną domenę w panelu Resend i podmienić EMAIL_FROM).
 */

export interface EmailAttachment {
  filename: string;
  /** Zawartość zakodowana base64. */
  content: string;
}

export const emailConfigured = (): boolean => Boolean(process.env.RESEND_API_KEY);

export async function sendEmail(opts: {
  to: string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY nie jest ustawiony" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "E-Logistic <onboarding@resend.dev>",
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        attachments: opts.attachments,
      }),
    });
    if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${await res.text()}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Błąd wysyłki e-mail" };
  }
}
