/**
 * Nazwa ciasteczka z wybranym językiem (web). Moduł neutralny — BEZ `server-only`,
 * dzięki czemu importują go zarówno serwerowe `lib/locale.ts` (odczyt), jak i kliencki
 * `LocaleSwitcher` (zapis/odczyt). Jedno źródło prawdy zamiast potrójnej duplikacji „locale".
 */
export const LOCALE_COOKIE = "locale";
