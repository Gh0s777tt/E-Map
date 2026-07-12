/**
 * #300: Język aplikacji kierowcy — PL/EN/DE/UK.
 * Domyślnie „systemowy": język telefonu, jeśli go wspieramy, inaczej EN
 * (a dla telefonów po polsku — PL). Ręczny wybór w Ustawieniach nadpisuje
 * system i jest pamiętany w AsyncStorage.
 */
import {
  DEFAULT_MOBILE_LOCALE,
  MOBILE_LOCALES,
  type MobileLocale,
  type MobileMessageKey,
  tMobile,
} from "@e-logistic/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

const STORE_KEY = "el-locale"; // MobileLocale | "auto"
export type LocalePref = MobileLocale | "auto";

function deviceLocale(): MobileLocale {
  try {
    const code = getLocales()[0]?.languageCode ?? "";
    if ((MOBILE_LOCALES as readonly string[]).includes(code)) return code as MobileLocale;
    return code ? "en" : DEFAULT_MOBILE_LOCALE;
  } catch {
    return DEFAULT_MOBILE_LOCALE;
  }
}

function resolve(pref: LocalePref): MobileLocale {
  return pref === "auto" ? deviceLocale() : pref;
}

interface LocaleCtx {
  locale: MobileLocale;
  pref: LocalePref;
  setPref: (p: LocalePref) => void;
  t: (key: MobileMessageKey, params?: Record<string, string | number>) => string;
}

const Ctx = createContext<LocaleCtx>({
  locale: DEFAULT_MOBILE_LOCALE,
  pref: "auto",
  setPref: () => {},
  t: (key, params) => tMobile(DEFAULT_MOBILE_LOCALE, key, params),
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<LocalePref>("auto");

  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY)
      .then((v) => {
        if (v === "auto" || (MOBILE_LOCALES as readonly string[]).includes(v ?? "")) {
          setPrefState(v as LocalePref);
        }
      })
      .catch(() => {});
  }, []);

  function setPref(p: LocalePref) {
    setPrefState(p);
    AsyncStorage.setItem(STORE_KEY, p).catch(() => {});
  }

  const locale = resolve(pref);
  return (
    <Ctx.Provider
      value={{ locale, pref, setPref, t: (key, params) => tMobile(locale, key, params) }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useLocale = () => useContext(Ctx);
export const useT = () => useContext(Ctx).t;
