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
