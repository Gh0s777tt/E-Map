/**
 * Katalogi do list rozwijanych (UI). Marki pojazdów wg segmentów rynku PL
 * oraz wykaz ubezpieczycieli komunikacyjnych. Wartości to zwykłe stringi —
 * pole `make`/`insurer` nie jest sztywnym enumem (dopuszczamy „Inna/Inny").
 */

export const VEHICLE_MAKE_GROUPS = [
  {
    group: "Dostawcze / Furgonetki (do 3,5 t)",
    makes: [
      "Renault",
      "Ford",
      "Fiat Professional",
      "Mercedes-Benz",
      "Volkswagen",
      "Iveco",
      "Toyota",
      "Peugeot",
      "Citroën",
      "Opel",
      "Maxus",
      "Isuzu",
      "Nissan",
      "Kia",
      "Hyundai",
    ],
  },
  {
    group: "Ciężarowe (powyżej 3,5 t)",
    makes: [
      "Scania",
      "DAF",
      "MAN",
      "Volvo",
      "Mercedes-Benz",
      "Iveco",
      "Renault Trucks",
      "Ford Trucks",
    ],
  },
  {
    group: "Pickupy",
    makes: ["Toyota", "Ford", "Volkswagen", "Isuzu", "Mitsubishi", "SsangYong"],
  },
] as const;

/** Płaska, odduplikowana lista marek (np. do walidacji/podpowiedzi). */
export const VEHICLE_MAKES: string[] = Array.from(
  new Set(VEHICLE_MAKE_GROUPS.flatMap((g) => g.makes)),
).sort();

/** Moduły aplikacji, do których właściciel nadaje dostęp członkom. */
export const APP_MODULES = [
  "vehicles",
  "drivers",
  "cards",
  "forms",
  "reports",
  "map",
  "stats",
] as const;
export type AppModule = (typeof APP_MODULES)[number];

/** Czytelne nazwy modułów (UI). */
export const APP_MODULE_LABELS: Record<AppModule, string> = {
  vehicles: "Pojazdy",
  drivers: "Kierowcy",
  cards: "Karty paliwowe",
  forms: "Formularze",
  reports: "Usterki",
  map: "Mapa",
  stats: "Statystyki",
};

/** Domyślny zestaw modułów wg roli (gdy członek nie ma własnego `modules`). */
export const DEFAULT_MODULES: Record<string, AppModule[]> = {
  owner: [...APP_MODULES],
  dispatcher: [...APP_MODULES],
  manager: [...APP_MODULES],
  driver: ["forms", "reports", "map"],
  developer: [],
};

/** Efektywne moduły: własne (jeśli ustawione) lub domyślne dla roli. */
export function effectiveModules(role: string, modules: string[] | null | undefined): AppModule[] {
  if (modules && modules.length > 0) {
    return modules.filter((m): m is AppModule => (APP_MODULES as readonly string[]).includes(m));
  }
  return DEFAULT_MODULES[role] ?? [];
}

/** Kategorie prawa jazdy (PL). */
export const LICENSE_CATEGORIES = [
  "AM",
  "A1",
  "A2",
  "A",
  "B1",
  "B",
  "B+E",
  "C1",
  "C1+E",
  "C",
  "C+E",
  "D1",
  "D1+E",
  "D",
  "D+E",
  "T",
] as const;

/** Dodatkowe uprawnienia kierowcy (rozszerzalne — można dopisać własne). */
export const DRIVER_QUALIFICATIONS = [
  "Kod 95 (kwalifikacja zawodowa)",
  "Karta kierowcy (tachograf)",
  "ADR podstawowy",
  "ADR cysterny",
  "ADR klasa 1 (wybuchowe)",
  "ADR klasa 7 (promieniotwórcze)",
  "Wózki widłowe (UDT)",
  "HDS / żuraw przeładunkowy",
  "Żuraw samojezdny",
  "Koparko-ładowarka",
  "Świadectwo kwalifikacji",
  "Pierwsza pomoc",
] as const;

/** Układy/części pojazdu do zgłaszania usterek. */
export const DEFECT_PARTS = [
  "Hamulce (klocki/tarcze)",
  "Opony / koła",
  "Zawieszenie",
  "Światła",
  "Lusterka / szyby",
  "Silnik",
  "Skrzynia biegów",
  "Układ AdBlue / wydech",
  "Elektryka",
  "Kabina / wnętrze",
  "Naczepa / zabudowa",
  "Inne",
] as const;

/** Strona/umiejscowienie usterki. */
export const DEFECT_SIDES = [
  "lewa",
  "prawa",
  "przód",
  "tył",
  "oś przednia",
  "oś tylna",
  "—",
] as const;

/**
 * Mapowanie słów-kluczy z opisu kierowcy → układ pojazdu (auto-podświetlenie na schemacie).
 * Dopasowanie po fragmencie (lowercase).
 */
export const DEFECT_KEYWORDS: { match: string[]; part: string }[] = [
  { match: ["klock", "tarcz", "hamul"], part: "Hamulce (klocki/tarcze)" },
  { match: ["opon", "koł", "ogumieni", "felg"], part: "Opony / koła" },
  { match: ["zawiesz", "amortyz", "resor"], part: "Zawieszenie" },
  { match: ["świat", "żarów", "lamp", "kierunkowsk"], part: "Światła" },
  { match: ["lusterk", "szyb"], part: "Lusterka / szyby" },
  { match: ["silnik", "olej", "turbo", "rozrząd"], part: "Silnik" },
  { match: ["skrzyni", "biegów", "sprzęg"], part: "Skrzynia biegów" },
  { match: ["adblue", "wydech", "dpf", "spalin"], part: "Układ AdBlue / wydech" },
  { match: ["elektr", "akumulat", "bezpiecznik", "kontrolk"], part: "Elektryka" },
  { match: ["kabin", "fotel", "klima"], part: "Kabina / wnętrze" },
  { match: ["naczep", "plandek", "zabudow", "burt"], part: "Naczepa / zabudowa" },
];

/** Zgaduje układ na podstawie opisu (pierwsze trafienie) — do auto-podświetlenia. */
export function guessDefectPart(description: string): string | null {
  const d = description.toLowerCase();
  for (const k of DEFECT_KEYWORDS) {
    if (k.match.some((m) => d.includes(m))) return k.part;
  }
  return null;
}

/** Ubezpieczyciele komunikacyjni (PL) — do listy przy OC pojazdu. */
export const INSURERS = [
  "PZU",
  "Warta",
  "Allianz",
  "Ergo Hestia",
  "Generali",
  "Uniqa",
  "Link4",
  "TUZ",
  "Compensa",
  "InterRisk",
  "Wiener",
  "Beesafe",
  "Benefia",
  "Balcia",
  "Trasti",
  "mtu24",
] as const;
