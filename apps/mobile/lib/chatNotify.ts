/**
 * #291: fire-and-forget push do odbiorców wiadomości czatu — endpoint panelu
 * web wysyła Expo Push do członków kanału. Błędy ignorujemy (realtime i tak
 * dostarczy wiadomość aktywnym; push to bonus dla zablokowanych ekranów).
 */
import { getSupabase } from "./supabase";

const NOTIFY_URL = "https://e-logistic-one.vercel.app/api/chat/notify";

export function notifyChat(threadId: string | null, preview: string): void {
  (async () => {
    const { data } = await getSupabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch(NOTIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ threadId, preview: preview.slice(0, 140) }),
    });
  })().catch(() => {});
}

/** Otwiera natywną nawigację (Apple Maps / geo:) do podanego adresu. */
export function navigationUrl(destination: string, platform: "ios" | "other"): string {
  const q = encodeURIComponent(destination);
  return platform === "ios" ? `maps:?daddr=${q}` : `geo:0,0?q=${q}`;
}
