import "server-only";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@e-logistic/i18n";
import { cookies } from "next/headers";

/** Nazwa ciasteczka z wybranym językiem. Współdzielona z LocaleSwitcher (klient). */
export const LOCALE_COOKIE = "locale";

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
