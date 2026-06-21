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
export const APP_MODULES = ["vehicles", "drivers", "cards", "forms", "map", "stats"] as const;
export type AppModule = (typeof APP_MODULES)[number];

/** Czytelne nazwy modułów (UI). */
export const APP_MODULE_LABELS: Record<AppModule, string> = {
  vehicles: "Pojazdy",
  drivers: "Kierowcy",
  cards: "Karty paliwowe",
  forms: "Formularze",
  map: "Mapa",
  stats: "Statystyki",
};

/** Domyślny zestaw modułów wg roli (gdy członek nie ma własnego `modules`). */
export const DEFAULT_MODULES: Record<string, AppModule[]> = {
  owner: [...APP_MODULES],
  dispatcher: [...APP_MODULES],
  manager: [...APP_MODULES],
  driver: ["forms", "map"],
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
