"use client";

import { createTranslator, DEFAULT_LOCALE, type Locale, type MessageKey } from "@e-logistic/i18n";
import { createContext, useContext, useMemo } from "react";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/**
 * Dostarcza język (czytany serwerowo z ciasteczka) do komponentów klienckich.
 * Montowany w layoucie aplikacji — dzięki temu dowolny komponent kliencki woła
 * `useT()` bez własnego wrappera serwerowego. Zmiana języka (LocaleSwitcher →
 * router.refresh) przeładowuje layout serwerowy z nowym `locale`, a kontekst
 * propaguje go do konsumentów.
 */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Aktualny język po stronie klienta. */
export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Funkcja tłumacząca związana z aktualnym językiem (memoizowana per język). */
export function useT(): (key: MessageKey) => string {
  const locale = useContext(LocaleContext);
  return useMemo(() => createTranslator(locale), [locale]);
}
