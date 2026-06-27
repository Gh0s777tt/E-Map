/**
 * Czyste decyzje nawigacyjne (bez expo-router) — łatwo testowalne.
 * Hooki w `app/_layout.tsx` tylko wykonują wynik (`router.replace`/`push`).
 */

/**
 * Bramka tras: dokąd przekierować przy danym stanie sesji. `null` = zostań.
 * Bez sesji poza ekranem logowania → `/login`; z sesją na `/login` → pulpit.
 * Dopóki trwa ładowanie lub brak konfiguracji Supabase — nie przekierowujemy.
 */
export function guardRedirect(s: {
  session: unknown;
  loading: boolean;
  configured: boolean;
  segments: readonly string[];
}): "/login" | "/" | null {
  if (s.loading || !s.configured) return null;
  const onLogin = s.segments[0] === "login";
  if (!s.session && !onLogin) return "/login";
  if (s.session && onLogin) return "/";
  return null;
}

/**
 * Cel nawigacji po tapnięciu powiadomienia push: ścieżka **względna** z `data.url`
 * (musi zaczynać się od „/"), inaczej bezpieczny domyślny `/my-orders`.
 */
export function notificationTarget(url: unknown): string {
  return typeof url === "string" && url.startsWith("/") ? url : "/my-orders";
}
