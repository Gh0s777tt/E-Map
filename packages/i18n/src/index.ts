/**
 * @e-logistic/i18n — komunikaty wielojęzyczne.
 * Start: PL (źródło kluczy) + EN. Kolejne języki dokładane z zachowaniem parytetu.
 */
import { en } from "./locales/en";
import { type MessageKey, pl } from "./locales/pl";

export type { MessageKey } from "./locales/pl";

export const LOCALES = ["pl", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "pl";

export const messages: Record<Locale, Record<MessageKey, string>> = { pl, en };

/** Tłumaczy klucz na dany język (fallback: język domyślny). */
export function t(locale: Locale, key: MessageKey): string {
  return messages[locale]?.[key] ?? messages[DEFAULT_LOCALE][key];
}

/** Zwraca funkcję tłumaczącą związaną z językiem. */
export function createTranslator(locale: Locale): (key: MessageKey) => string {
  return (key) => t(locale, key);
}
