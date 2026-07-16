import "server-only";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@e-logistic/i18n";
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "./localeCookie";

// Nazwa ciasteczka języka mieszka w neutralnym `localeCookie` (współdzielona z klienckim
// LocaleSwitcher, którego server-only tu nie wpuści). Reeksport zachowuje publiczne API.
export { LOCALE_COOKIE };

/**
 * Język bieżącego żądania (z ciasteczka, fallback do domyślnego). Czytane serwerowo
 * w komponentach RSC — dlatego nawigacja i strony serwerowe renderują się od razu
 * w wybranym języku (bez migotania). Klient zmienia język przez LocaleSwitcher.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value ?? "";
  return (LOCALES as readonly string[]).includes(value) ? (value as Locale) : DEFAULT_LOCALE;
}
