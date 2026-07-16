/**
 * #audyt Ś7: baza URL panelu web dla klienta mobilnego. Domyślnie produkcja,
 * nadpisywalna przez `EXPO_PUBLIC_WEB_BASE_URL` (staging / self-host). To mobilny
 * odpowiednik webowego `NEXT_PUBLIC_SITE_URL` — zamiast twardo wpisanego URL-a
 * w wielu miejscach (chat-notify, routing, ceny paliw, materiały tacho, linki).
 */
export const WEB_BASE_URL = (
  process.env.EXPO_PUBLIC_WEB_BASE_URL ?? "https://e-logistic-one.vercel.app"
).replace(/\/+$/, "");
