/**
 * #300: Katalog aplikacji kierowcy — PL/EN/DE/UK (osobny od webowego,
 * który zostaje przy PL/EN). Parytet kluczy pilnowany w mobileParity.test.ts.
 * Parametry w treści: `{n}` podmieniane przez `tMobile`.
 */

const pl = {
  "m.tab.home": "Pulpit",
  "m.tab.orders": "Zlecenia",
  "m.tab.map": "Mapa",
  "m.tab.more": "Więcej",

  "m.screen.login": "Logowanie",
  "m.screen.fuel": "Tankowanie",
  "m.screen.adblue": "AdBlue",
  "m.screen.trip": "Trasa",
  "m.screen.checklists": "Checklisty",
  "m.screen.documents": "Dokumenty",
  "m.screen.chat": "Czat",
  "m.screen.chatThread": "Rozmowa",
  "m.screen.expenses": "Rejestr wydatków",
  "m.screen.workTime": "Czas pracy",
  "m.screen.settlement": "Moje rozliczenie",
  "m.screen.vehicle": "Mój pojazd",
  "m.screen.defects": "Usterki i szkody",
  "m.screen.stats": "Statystyki",
  "m.screen.settings": "Ustawienia",

  "m.home.hello": "Witaj,",
  "m.home.driverFallback": "kierowco",
  "m.home.currentOrder": "BIEŻĄCE ZLECENIE",
  "m.home.navigate": "Nawiguj",
  "m.home.details": "Szczegóły",
  "m.home.orderDetailsIn": "Szczegóły w zakładce Zlecenia",
  "m.home.noOrder":
    "Brak aktywnego zlecenia. Gdy spedytor coś przydzieli, dostaniesz push — a karta pojawi się tutaj.",
  "m.home.startTrip": "Rozpocznij Trip",
  "m.home.fuelAction": "Tankuj",
  "m.home.checklistAction": "Checklist",
  "m.home.today": "Dzisiaj",
  "m.home.fuelToday": "Paliwo dziś",
  "m.home.checklists": "Checklisty",
  "m.home.sync": "Sync",
  "m.home.activities": "Ostatnie aktywności",
  "m.home.activitiesEmpty":
    "Jeszcze nic tu nie ma — pierwszy zapisany formularz pojawi się na tej liście.",

  "m.kind.fuel": "Tankowanie",
  "m.kind.adblue": "AdBlue",
  "m.kind.trip": "Trasa",
  "m.kind.checklist": "Checklista",
  "m.kind.expense": "Wydatek",
  "m.fab.defect": "Usterka",

  "m.offline.pending": "Do wysłania: {n} — dotknij, aby ponowić",
  "m.offline.sending": "Wysyłam…",

  "m.settings.language": "Język aplikacji",
  "m.settings.languageAuto": "Systemowy",
} as const;

export type MobileMessageKey = keyof typeof pl;

const en: Record<MobileMessageKey, string> = {
  "m.tab.home": "Home",
  "m.tab.orders": "Orders",
  "m.tab.map": "Map",
  "m.tab.more": "More",

  "m.screen.login": "Sign in",
  "m.screen.fuel": "Refueling",
  "m.screen.adblue": "AdBlue",
  "m.screen.trip": "Trip",
  "m.screen.checklists": "Checklists",
  "m.screen.documents": "Documents",
  "m.screen.chat": "Chat",
  "m.screen.chatThread": "Conversation",
  "m.screen.expenses": "Expense log",
  "m.screen.workTime": "Work time",
  "m.screen.settlement": "My settlement",
  "m.screen.vehicle": "My vehicle",
  "m.screen.defects": "Defects & damage",
  "m.screen.stats": "Statistics",
  "m.screen.settings": "Settings",

  "m.home.hello": "Hello,",
  "m.home.driverFallback": "driver",
  "m.home.currentOrder": "CURRENT ORDER",
  "m.home.navigate": "Navigate",
  "m.home.details": "Details",
  "m.home.orderDetailsIn": "Details in the Orders tab",
  "m.home.noOrder":
    "No active order. When a dispatcher assigns one, you'll get a push — and the card will appear here.",
  "m.home.startTrip": "Start trip",
  "m.home.fuelAction": "Refuel",
  "m.home.checklistAction": "Checklist",
  "m.home.today": "Today",
  "m.home.fuelToday": "Fuel today",
  "m.home.checklists": "Checklists",
  "m.home.sync": "Sync",
  "m.home.activities": "Recent activity",
  "m.home.activitiesEmpty": "Nothing here yet — your first saved form will show up on this list.",

  "m.kind.fuel": "Refueling",
  "m.kind.adblue": "AdBlue",
  "m.kind.trip": "Trip",
  "m.kind.checklist": "Checklist",
  "m.kind.expense": "Expense",
  "m.fab.defect": "Defect",

  "m.offline.pending": "Waiting to send: {n} — tap to retry",
  "m.offline.sending": "Sending…",

  "m.settings.language": "App language",
  "m.settings.languageAuto": "System",
};

const de: Record<MobileMessageKey, string> = {
  "m.tab.home": "Übersicht",
  "m.tab.orders": "Aufträge",
  "m.tab.map": "Karte",
  "m.tab.more": "Mehr",

  "m.screen.login": "Anmeldung",
  "m.screen.fuel": "Tanken",
  "m.screen.adblue": "AdBlue",
  "m.screen.trip": "Fahrt",
  "m.screen.checklists": "Checklisten",
  "m.screen.documents": "Dokumente",
  "m.screen.chat": "Chat",
  "m.screen.chatThread": "Unterhaltung",
  "m.screen.expenses": "Ausgaben",
  "m.screen.workTime": "Arbeitszeit",
  "m.screen.settlement": "Meine Abrechnung",
  "m.screen.vehicle": "Mein Fahrzeug",
  "m.screen.defects": "Mängel & Schäden",
  "m.screen.stats": "Statistiken",
  "m.screen.settings": "Einstellungen",

  "m.home.hello": "Hallo,",
  "m.home.driverFallback": "Fahrer",
  "m.home.currentOrder": "AKTUELLER AUFTRAG",
  "m.home.navigate": "Navigieren",
  "m.home.details": "Details",
  "m.home.orderDetailsIn": "Details im Tab »Aufträge«",
  "m.home.noOrder":
    "Kein aktiver Auftrag. Sobald der Disponent etwas zuweist, bekommst du eine Push-Nachricht — und die Karte erscheint hier.",
  "m.home.startTrip": "Fahrt starten",
  "m.home.fuelAction": "Tanken",
  "m.home.checklistAction": "Checkliste",
  "m.home.today": "Heute",
  "m.home.fuelToday": "Kraftstoff heute",
  "m.home.checklists": "Checklisten",
  "m.home.sync": "Sync",
  "m.home.activities": "Letzte Aktivitäten",
  "m.home.activitiesEmpty":
    "Hier ist noch nichts — dein erstes gespeichertes Formular erscheint in dieser Liste.",

  "m.kind.fuel": "Tanken",
  "m.kind.adblue": "AdBlue",
  "m.kind.trip": "Fahrt",
  "m.kind.checklist": "Checkliste",
  "m.kind.expense": "Ausgabe",
  "m.fab.defect": "Mangel",

  "m.offline.pending": "Zu senden: {n} — tippen zum Wiederholen",
  "m.offline.sending": "Sende…",

  "m.settings.language": "App-Sprache",
  "m.settings.languageAuto": "System",
};

const uk: Record<MobileMessageKey, string> = {
  "m.tab.home": "Панель",
  "m.tab.orders": "Замовлення",
  "m.tab.map": "Карта",
  "m.tab.more": "Більше",

  "m.screen.login": "Вхід",
  "m.screen.fuel": "Заправка",
  "m.screen.adblue": "AdBlue",
  "m.screen.trip": "Рейс",
  "m.screen.checklists": "Чек-листи",
  "m.screen.documents": "Документи",
  "m.screen.chat": "Чат",
  "m.screen.chatThread": "Розмова",
  "m.screen.expenses": "Журнал витрат",
  "m.screen.workTime": "Робочий час",
  "m.screen.settlement": "Мій розрахунок",
  "m.screen.vehicle": "Мій транспорт",
  "m.screen.defects": "Несправності та збитки",
  "m.screen.stats": "Статистика",
  "m.screen.settings": "Налаштування",

  "m.home.hello": "Вітаю,",
  "m.home.driverFallback": "водію",
  "m.home.currentOrder": "ПОТОЧНЕ ЗАМОВЛЕННЯ",
  "m.home.navigate": "Навігація",
  "m.home.details": "Деталі",
  "m.home.orderDetailsIn": "Деталі у вкладці «Замовлення»",
  "m.home.noOrder":
    "Немає активного замовлення. Коли диспетчер щось призначить, прийде push — і картка з'явиться тут.",
  "m.home.startTrip": "Почати рейс",
  "m.home.fuelAction": "Заправити",
  "m.home.checklistAction": "Чек-лист",
  "m.home.today": "Сьогодні",
  "m.home.fuelToday": "Пальне сьогодні",
  "m.home.checklists": "Чек-листи",
  "m.home.sync": "Синхр.",
  "m.home.activities": "Останні дії",
  "m.home.activitiesEmpty": "Тут поки порожньо — перша збережена форма з'явиться у цьому списку.",

  "m.kind.fuel": "Заправка",
  "m.kind.adblue": "AdBlue",
  "m.kind.trip": "Рейс",
  "m.kind.checklist": "Чек-лист",
  "m.kind.expense": "Витрата",
  "m.fab.defect": "Несправність",

  "m.offline.pending": "До надсилання: {n} — торкніться, щоб повторити",
  "m.offline.sending": "Надсилаю…",

  "m.settings.language": "Мова застосунку",
  "m.settings.languageAuto": "Системна",
};

export const MOBILE_LOCALES = ["pl", "en", "de", "uk"] as const;
export type MobileLocale = (typeof MOBILE_LOCALES)[number];
export const DEFAULT_MOBILE_LOCALE: MobileLocale = "pl";

export const mobileMessages: Record<MobileLocale, Record<MobileMessageKey, string>> = {
  pl,
  en,
  de,
  uk,
};

/** Tłumaczy klucz mobilny; `params` podmienia `{nazwa}` w treści. */
export function tMobile(
  locale: MobileLocale,
  key: MobileMessageKey,
  params?: Record<string, string | number>,
): string {
  let out = mobileMessages[locale]?.[key] ?? mobileMessages[DEFAULT_MOBILE_LOCALE][key];
  if (params) {
    for (const [k, v] of Object.entries(params)) out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}
