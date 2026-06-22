/**
 * Katalogi do list rozwijanych (UI). Marki pojazdów wg segmentów rynku PL
 * oraz wykaz ubezpieczycieli komunikacyjnych. Wartości to zwykłe stringi —
 * pole `make`/`insurer` nie jest sztywnym enumem (dopuszczamy „Inna/Inny").
 */

import type { FuelCardProvider } from "./enums";

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
  "settlements",
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
  settlements: "Rozliczenia",
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

/** Statusy zlecenia transportowego. */
export const ORDER_STATUSES = [
  "new",
  "assigned",
  "in_progress",
  "delivered",
  "invoiced",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Nowe",
  assigned: "Przypisane",
  in_progress: "W trakcie",
  delivered: "Dostarczone",
  invoiced: "Zafakturowane",
  cancelled: "Anulowane",
};

/** Kategorie dokumentów w sejfie (Storage). Wartość = string (rozszerzalne). */
export const DOCUMENT_CATEGORIES = [
  "OC / ubezpieczenie",
  "Przegląd techniczny",
  "Leasing / umowa",
  "Dowód rejestracyjny",
  "Licencja / zezwolenie",
  "Umowa przewozu",
  "Faktura / rachunek",
  "CMR / list przewozowy",
  "Tachograf",
  "Inne",
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

/**
 * Orientacyjne marki stacji akceptujących daną kartę flotową (słowa-klucze,
 * dopasowanie po fragmencie do tagów OSM `brand`/`operator`/`name`).
 * UWAGA: sieci akceptacji są ogromne i zmienne — to filtr **poglądowy**,
 * nie wiążąca lista akceptacji (do tego potrzebne są API partnerów).
 */
export const FUEL_CARD_STATION_BRANDS: Record<FuelCardProvider, string[]> = {
  dkv: [
    "shell",
    "bp",
    "aral",
    "esso",
    "total",
    "omv",
    "eni",
    "agip",
    "circle k",
    "orlen",
    "lotos",
    "moya",
    "amic",
    "avia",
    "q8",
    "tamoil",
    "mol",
    "slovnaft",
    "petrol",
    "hem",
    "westfalen",
    "star",
    "jet",
    "gulf",
    "ina",
    "lukoil",
  ],
  eurowag: [
    "eurowag",
    "orlen",
    "lotos",
    "mol",
    "omv",
    "slovnaft",
    "petrol",
    "ina",
    "hem",
    "avia",
    "amic",
    "moya",
    "circle k",
    "shell",
    "eni",
    "lukoil",
    "socar",
    "benzina",
  ],
  shell: ["shell"],
  bp: ["bp", "aral"],
  circlek: ["circle k", "circlek", "statoil", "ingo"],
  e100: [
    "e100",
    "orlen",
    "lotos",
    "amic",
    "moya",
    "circle k",
    "shell",
    "bp",
    "lukoil",
    "socar",
    "petrol",
    "omv",
    "mol",
    "eni",
    "avia",
  ],
  uta: [
    "uta",
    "shell",
    "esso",
    "total",
    "omv",
    "eni",
    "agip",
    "avia",
    "westfalen",
    "star",
    "aral",
    "bp",
    "orlen",
    "mol",
    "q8",
    "tamoil",
    "gulf",
    "jet",
  ],
  as24: ["as24", "as 24", "total"],
  aral: ["aral", "bp"],
  omv: ["omv", "avanti", "petrom"],
  routex: ["shell", "bp", "aral", "omv", "eni", "agip", "circle k", "mol", "slovnaft", "avia"],
  logpay: [
    "shell",
    "esso",
    "aral",
    "bp",
    "total",
    "omv",
    "eni",
    "avia",
    "westfalen",
    "star",
    "jet",
  ],
  esso: ["esso", "exxon", "mobil"],
  totalenergies: ["total", "as24", "as 24"],
  tankpool24: [
    "tankpool24",
    "tankpool",
    "hem",
    "westfalen",
    "avia",
    "raiffeisen",
    "baywa",
    "classic",
  ],
  morganfuels: ["morgan", "certas", "gulf", "texaco", "emo", "maxol", "top oil"],
  iqcard: ["iq", "circle k", "orlen", "lotos", "amic", "moya", "shell", "bp"],
  other: [],
};

/** Zbiór słów-kluczy marek dla wskazanych kart (poglądowo). */
export function stationBrandsForProviders(providers: FuelCardProvider[]): string[] {
  return Array.from(new Set(providers.flatMap((p) => FUEL_CARD_STATION_BRANDS[p] ?? [])));
}

/**
 * Czy stacja (tekst z tagów OSM: marka/operator/nazwa) pasuje do którejś
 * z kart? `haystack` powinien być złączeniem brand/operator/name (lowercase).
 * Pusty zestaw kart → brak filtra (zwraca `true`).
 */
export function stationMatchesProviders(haystack: string, providers: FuelCardProvider[]): boolean {
  if (providers.length === 0) return true;
  const h = haystack.toLowerCase();
  if (!h.trim()) return false; // stacja bez rozpoznanej marki — przy filtrze ukrywamy
  return stationBrandsForProviders(providers).some((b) => h.includes(b));
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
