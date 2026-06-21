/**
 * Enumy domenowe E-Logistic. Definiowane jako `as const` tuple,
 * by współdzielić je między Zod (runtime) a typami (compile-time).
 */

export const ROLES = ["developer", "owner", "dispatcher", "driver"] as const;
export type Role = (typeof ROLES)[number];

export const VEHICLE_TYPES = ["truck", "tractor", "van", "trailer", "other"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const PAYMENT_METHODS = ["card", "cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Akcje formularza Trip — zgodne ze specyfikacją (DATA-MODEL §4). */
export const TRIP_ACTIONS = ["load", "unload", "start", "end", "service", "other"] as const;
export type TripAction = (typeof TRIP_ACTIONS)[number];

/** Wykaz dostawców kart paliwowych (rozszerzalny). */
export const FUEL_CARD_PROVIDERS = [
  "dkv",
  "eurowag",
  "shell",
  "bp",
  "circlek",
  "e100",
  "uta",
  "as24",
  "aral",
  "omv",
  "routex",
  "logpay",
  "esso",
  "totalenergies",
  "tankpool24",
  "morganfuels",
  "iqcard",
  "other",
] as const;
export type FuelCardProvider = (typeof FUEL_CARD_PROVIDERS)[number];

/** Czytelne nazwy marek kart (do UI). Brak wpisu → wersja wielkimi literami. */
export const FUEL_CARD_PROVIDER_LABELS: Record<FuelCardProvider, string> = {
  dkv: "DKV",
  eurowag: "Eurowag",
  shell: "Shell",
  bp: "BP",
  circlek: "Circle K",
  e100: "E100",
  uta: "UTA",
  as24: "AS24",
  aral: "Aral",
  omv: "OMV",
  routex: "Routex",
  logpay: "LogPay",
  esso: "Esso",
  totalenergies: "TotalEnergies",
  tankpool24: "TankPool24",
  morganfuels: "Morgan Fuels",
  iqcard: "IQ Card",
  other: "Inny",
};

/** Typy punktów POI na mapie. */
export const POI_TYPES = [
  "parking",
  "fuel_station",
  "ferry",
  "airport",
  "company",
  "wash",
  "weigh",
] as const;
export type PoiType = (typeof POI_TYPES)[number];

/** Typy zgłoszeń społecznościowych (warstwa realtime). */
export const REPORT_TYPES = [
  "accident",
  "police",
  "closure",
  "traffic",
  "weigh",
  "hazard",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];
