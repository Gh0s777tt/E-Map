/**
 * Schematy walidacji Zod — współdzielone między web, mobile i Edge Functions.
 * Odwzorowują model danych (docs/DATA-MODEL.md) 1:1 ze specyfikacją formularzy.
 */
import { z } from "zod";
import { cardLast4 } from "./cardMask";
import { normalizeCountry } from "./countries";
import {
  DEFECT_SEVERITIES,
  DEFECT_STATUSES,
  FUEL_CARD_PROVIDERS,
  PAYMENT_METHODS,
  REPORT_TYPES,
  VEHICLE_TYPES,
} from "./enums";
import { VEHICLE_COST_CATEGORIES } from "./vehicleCosts";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data w formacie YYYY-MM-DD");

/**
 * [#373] Data i godzina zdarzenia. Celowo pobłażliwa: pole `datetime-local`
 * w przeglądarce daje „2026-08-09T14:30" (bez sekund i strefy), a picker mobilny
 * pełne ISO. Oba są poprawne — normalizacja do znacznika czasu należy do mapera.
 */
const isoDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Data i godzina w formacie ISO");

/**
 * [#373] Waluta kwoty. Kod ISO 4217 wielkimi literami — inaczej tabela `fx_rates`
 * nigdy nie dopasuje kursu i kwota po cichu wypadnie z każdej sumy.
 */
export const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Waluta jako kod ISO, np. EUR lub PLN");

/** Lokalizacja: kraj + miejsce, opcjonalnie współrzędne GPS (auto lub ręcznie). */
export const geoLocationSchema = z.object({
  /**
   * [#375] Kraj jako kod ISO 3166-1 alpha-2, znormalizowany przy zapisie.
   *
   * Wcześniej `z.string().min(2).max(56)` przepuszczało wszystko — łącznie
   * z „10115 Berlin", które wstawiał tam zepsuty geokoder (#372). Skutek sięgał
   * dalej niż brzydki wpis: stawka VAT i zwrot podatku są kluczowane po kraju
   * tankowania, więc taka wartość cicho wypadała z rozliczenia.
   *
   * Transform przyjmuje też nazwy („Niemcy", „Germany", „Deutschland") i skróty,
   * ale do bazy trafia zawsze dwuliterowy kod.
   */
  country: z
    .string()
    .min(2)
    .max(56)
    .refine((v) => normalizeCountry(v) !== null, "Podaj kraj — np. PL, DE albo Niemcy")
    .transform((v) => normalizeCountry(v) as string),
  city: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  /** Kod pocztowy (np. wymagany dla UK/Anglii). */
  postcode: z.string().min(1).max(16).optional(),
  /** Nazwa firmy w miejscu (opcjonalnie). */
  company: z.string().min(1).max(120).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});
export type GeoLocation = z.infer<typeof geoLocationSchema>;

// ── Pojazd ──────────────────────────────────────────────────────────

export const vehicleSchema = z.object({
  registration: z.string().min(1).max(16),
  make: z.string().min(1).max(40).optional(),
  model: z.string().min(1),
  /** VIN: 17 znaków, bez I/O/Q (norma ISO 3779). Walidowany tylko gdy podany. */
  vin: z
    .string()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/i, "VIN to 17 znaków (bez I, O, Q)")
    .optional(),
  year: z.number().int().min(1950).max(2100),
  firstRegistrationDate: isoDate.optional(),
  inspectionExpiry: isoDate.optional(),
  insuranceExpiry: isoDate.optional(),
  licenseExpiry: isoDate.optional(),
  insurer: z.string().max(60).optional(),
  licenseNumber: z.string().max(40).optional(),
  leasingEnd: isoDate.optional(),
  curbWeightKg: z.number().int().positive().optional(),
  maxPayloadKg: z.number().int().positive().optional(),
  fuelTankL: z.number().int().positive().optional(),
  adblueTankL: z.number().int().positive().optional(),
  heightCm: z.number().int().positive().optional(),
  widthCm: z.number().int().positive().optional(),
  lengthCm: z.number().int().positive().optional(),
  /**
   * [#385] Pola wchodzące wprost do routingu. Do tej pory ekran mapy podstawiał
   * wartości domyślne ze stanu komponentu, więc solówka i pięcioosiowy zestaw
   * dostawały tę samą trasę i to samo myto.
   *
   * `adrTunnelCode` pusty znaczy „ładunek zwykły", a nie „nie wiemy" — zestaw
   * bez ADR to normalny stan, nie brak danych.
   */
  axleCount: z.number().int().min(2).max(12).optional(),
  adrTunnelCode: z.enum(["B", "C", "D", "E"]).optional(),
  emissionClass: z.enum(["euro3", "euro4", "euro5", "euro6"]).optional(),
  vehicleType: z.enum(VEHICLE_TYPES),
  forwarder: z.string().optional(),
  comment: z.string().max(2000).optional(),
  /** Naczepa (jeśli auto ją posiada — #250): rejestracja + typ. Opcjonalne. */
  trailerRegistration: z.string().max(16).optional(),
  trailerType: z.string().max(40).optional(),
});
export type VehicleInput = z.infer<typeof vehicleSchema>;

// ── Naczepa ─────────────────────────────────────────────────────────

/**
 * [#405] Naczepa jako osobny sprzęt firmy.
 *
 * Do tej pory naczepa była dwoma polami tekstowymi w kartotece ciągnika, co
 * zakładało, że należy do niego na stałe. W transporcie ciągnik wymienia naczepy,
 * a naczepa ma WŁASNY przegląd i WŁASNE ubezpieczenie — i to one zatrzymują
 * zestaw równie skutecznie jak dokumenty ciągnika.
 *
 * Gabaryty są tu istotniejsze niż w ciągniku: to naczepa wyznacza wysokość
 * i długość zestawu, czyli wartości, które idą do routingu.
 */
export const trailerSchema = z.object({
  registration: z.string().trim().min(1).max(16),
  trailerType: z.string().trim().max(40).optional(),
  vin: z
    .string()
    .trim()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/i, "VIN to 17 znaków (bez I, O, Q)")
    .optional(),
  year: z.number().int().min(1950).max(2100).optional(),
  inspectionExpiry: isoDate.optional(),
  insuranceExpiry: isoDate.optional(),
  leasingEnd: isoDate.optional(),
  insurer: z.string().trim().max(60).optional(),
  heightCm: z.number().int().positive().max(500).optional(),
  widthCm: z.number().int().positive().max(400).optional(),
  lengthCm: z.number().int().positive().max(2000).optional(),
  curbWeightKg: z.number().int().positive().max(60000).optional(),
  maxPayloadKg: z.number().int().positive().max(60000).optional(),
  /** Naczepy mają zwykle 1–3 osie; górna granica z zapasem na zestawy nietypowe. */
  axleCount: z.number().int().min(1).max(6).optional(),
  note: z.string().trim().max(2000).optional(),
});
export type TrailerInput = z.infer<typeof trailerSchema>;

// ── Linki firmowe ───────────────────────────────────────────────────

/**
 * [#404] Skrót do strony zewnętrznej (portal myta, prom, ubezpieczyciel).
 *
 * `url` sprawdzany REGEXEM na `http(s)`, a nie samym `z.url()`. Powód jest
 * bezpieczeństwem, nie estetyką: `z.url()` przyjmuje także `javascript:alert(1)`
 * i `data:text/html,...`, a ten adres aplikacja kierowcy otwiera jednym
 * dotknięciem. Ten sam warunek stoi jako CHECK w bazie (migracja 0109) — obie
 * warstwy muszą się zgadzać, bo inaczej formularz przyjmuje coś, co baza odrzuci.
 */
export const companyLinkSchema = z.object({
  label: z.string().trim().min(1).max(60),
  url: z
    .string()
    .trim()
    .regex(/^https?:\/\/.+/i, "Adres musi zaczynać się od http:// lub https://")
    .max(2000),
  /** Emoji albo krótki znak — kierowca szuka wzrokiem ikony, nie tekstu. */
  icon: z.string().trim().max(8).optional(),
  note: z.string().trim().max(200).optional(),
  /** `true` = tylko owner/dispatcher; `false` = każdy członek firmy. */
  managementOnly: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});
export type CompanyLinkInput = z.infer<typeof companyLinkSchema>;

// ── Karta paliwowa ──────────────────────────────────────────────────

export const fuelCardSchema = z.object({
  provider: z.enum(FUEL_CARD_PROVIDERS),
  /**
   * Do bazy trafiają WYŁĄCZNIE cztery ostatnie cyfry. Użytkownik może wkleić
   * pełny numer (tak jest wygodniej przy przepisywaniu z karty) — schemat
   * przycina go jeszcze przed zapisem, więc pełny PAN nigdy nie opuszcza
   * formularza. Patrz packages/core/src/cardMask.ts.
   */
  cardNumberMasked: z
    .string()
    .min(1)
    .refine((v) => /\d/.test(v), "Numer karty musi zawierać cyfry")
    .transform(cardLast4),
  /** Karta przypisana do pojazdu (opcjonalnie) — dla widoczności która karta do którego auta. */
  vehicleId: z.uuid().optional(),
  /** PIN tylko na wejściu — w bazie przechowywany zaszyfrowany (nigdy plaintext). */
  pin: z
    .string()
    .regex(/^\d{4,6}$/, "PIN to 4–6 cyfr")
    .optional(),
  validUntil: isoDate.optional(),
  discountPercent: z.number().min(0).max(100).default(0),
  notes: z.string().max(2000).optional(),
});
export type FuelCardInput = z.infer<typeof fuelCardSchema>;

// ── Koszt pojazdu (inny niż paliwo: naprawy, leasing, ubezpieczenie…) ──

export const vehicleCostSchema = z.object({
  vehicleId: z.uuid(),
  category: z.enum(VEHICLE_COST_CATEGORIES),
  amount: z.number().nonnegative(),
  currency: z.string().min(1).default("EUR"),
  costDate: isoDate,
  description: z.string().max(2000).optional(),
});
export type VehicleCostInput = z.infer<typeof vehicleCostSchema>;

// ── Kierowca (kartoteka kadrowa) ────────────────────────────────────

export const driverSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  birthDate: isoDate
    .refine(
      (d) => d <= new Date().toISOString().slice(0, 10),
      "Data urodzenia nie może być w przyszłości",
    )
    .optional(),
  licenseNumber: z.string().max(40).optional(),
  idCardNumber: z.string().max(40).optional(),
  passportNumber: z.string().max(40).optional(),
  licenseCategories: z.array(z.string()).default([]),
  qualifications: z.array(z.string()).default([]),
  notes: z.string().max(2000).optional(),
  // Terminy dokumentów (compliance) — daty ważności.
  licenseExpiry: isoDate.optional(),
  code95Expiry: isoDate.optional(),
  medicalExpiry: isoDate.optional(),
  psychotechExpiry: isoDate.optional(),
  adrExpiry: isoDate.optional(),
  passportExpiry: isoDate.optional(),
  idCardExpiry: isoDate.optional(),
  /** #319: uprawnienia (UDT/HDS itd.) z numerem dokumentu i datą ważności. */
  qualificationDetails: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        docNumber: z.string().max(60).optional(),
        expiry: isoDate.optional(),
      }),
    )
    .default([]),
  // Firma własna kierowcy (B2B / kontrakt, nie etat) — opcjonalne dane rejestrowe.
  companyName: z.string().max(160).optional(),
  companyTaxId: z.string().max(32).optional(),
  companyRegon: z.string().max(32).optional(),
  companyAddress: z.string().max(200).optional(),
  companyActivity: z.string().max(200).optional(),
});
export type DriverInput = z.infer<typeof driverSchema>;

// ── Zlecenie / ładunek ──────────────────────────────────────────────

export const orderSchema = z.object({
  referenceNo: z.string().max(60).optional(),
  shipper: z.string().max(160).optional(),
  consignee: z.string().max(160).optional(),
  origin: z.string().max(160).optional(),
  destination: z.string().max(160).optional(),
  cargo: z.string().max(300).optional(),
  weightKg: z.number().nonnegative().max(100000).optional(),
  price: z.number().nonnegative().max(10000000).optional(),
  /**
   * [#389] Kod ISO, nie dowolny tekst do ośmiu znaków.
   *
   * `z.string().max(8)` przepuszczało `pln`, ` EUR `, `euro`, a nawet `zł` —
   * podczas gdy migracja 0100 nałożyła na `orders.currency` CHECK `^[A-Z]{3}$`.
   * Rozjazd kończył się więc na dwa sposoby, oba złe: zapis odrzucony przez bazę
   * z komunikatem o naruszeniu więzów zamiast czytelnego błędu przy polu, albo —
   * dla wierszy sprzed migracji — waluta, której `pickFxRate` nie dopasuje,
   * czyli cena zlecenia wypadająca po cichu z przychodu.
   *
   * `currencyCode` istniał w tym samym pliku od [#373] i był już używany przy
   * paliwie, AdBlue i kosztach trasy. `.trim().toUpperCase()` sprawia, że
   * `pln` wpisane z telefonu przechodzi jako `PLN`, zamiast być odrzucone.
   *
   * `.default("EUR")` zostaje: pole jest wymagane w bazie, a zlecenia bez
   * podanej waluty (import, starsze formularze) mają się nadal zapisywać.
   */
  currency: currencyCode.default("EUR"),
  vehicleId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  loadDate: isoDate.optional(),
  unloadDate: isoDate.optional(),
  notes: z.string().max(2000).optional(),
});
export type OrderInput = z.infer<typeof orderSchema>;

// ── Usterka pojazdu ─────────────────────────────────────────────────

export const defectSchema = z.object({
  vehicleId: z.uuid(),
  part: z.string().min(1).max(60),
  side: z.string().max(20).optional(),
  severity: z.enum(DEFECT_SEVERITIES).default("medium"),
  dashboardLight: z.boolean().default(false),
  description: z.string().min(1).max(2000),
  status: z.enum(DEFECT_STATUSES).default("open"),
});
export type DefectInput = z.infer<typeof defectSchema>;

// ── Formularz Paliwo / AdBlue ───────────────────────────────────────

export const fuelLogSchema = z
  .object({
    vehicleId: z.uuid(),
    station: geoLocationSchema,
    odometerKm: z.number().int().nonnegative(),
    liters: z.number().positive(),
    /** Czy zatankowano „do pełna" — do liczenia spalania (full-to-full). */
    isFull: z.boolean().default(true),
    paymentMethod: z.enum(PAYMENT_METHODS),
    fuelCardId: z.uuid().optional(),
    /**
     * Kwota zapłacona = BRUTTO. Nazwa została z czasów, gdy była to jedyna kwota
     * w systemie; zmiana dotknęłaby ponad trzydziestu miejsc w kodzie i wszystkich
     * buildów mobile w sklepach, więc pole zostaje, a znaczenie jest udokumentowane.
     */
    priceTotal: z.number().nonnegative().optional(),
    /**
     * [#373] Waluta kwoty. `optional`, a nie `default("EUR")` — `default` czyni pole
     * WYMAGANYM w typie wyjściowym, co zmusiłoby każdego istniejącego wywołującego
     * (i każdy stary build mobile) do przekazywania waluty. Wartość domyślną nadaje
     * maper i kolumna w bazie.
     */
    currency: currencyCode.optional(),
    /** [#373] Netto i stawka VAT. Opcjonalne: kierowca na stacji widzi samo brutto. */
    priceNet: z.number().nonnegative().optional(),
    vatRate: z.number().min(0).max(100).optional(),
    /**
     * [#373] Kiedy tankowanie faktycznie miało miejsce. Bez tego wpis zrobiony
     * offline i zsynchronizowany trzy dni później wpadał do złego miesiąca.
     * Opcjonalne — brak oznacza „teraz" (baza ma `default now()`).
     */
    occurredAt: isoDateTime.optional(),
    comment: z.string().max(2000).optional(),
  })
  .refine((d) => d.paymentMethod !== "card" || d.fuelCardId !== undefined, {
    message: "Płatność kartą wymaga wskazania karty paliwowej (fuelCardId).",
    path: ["fuelCardId"],
  });
export type FuelLogInput = z.infer<typeof fuelLogSchema>;

/** AdBlue — identyczna struktura jak paliwo (pole `liters` = AdBlue). */
export const adblueLogSchema = fuelLogSchema;
export type AdblueLogInput = z.infer<typeof adblueLogSchema>;

// ── Formularz Trip (akcje z polami warunkowymi) ─────────────────────

const tripBase = {
  vehicleId: z.uuid(),
  place: geoLocationSchema,
  odometerKm: z.number().int().nonnegative(),
  /** [#373] Kiedy zdarzenie faktycznie miało miejsce — patrz `fuelLogSchema.occurredAt`. */
  occurredAt: isoDateTime.optional(),
};

export const tripEventSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("load"),
    ...tripBase,
    weightKg: z.number().int().nonnegative().optional(),
    /** Powiązanie z zleceniem (do auto-zamykania + kosztu transportu). */
    orderId: z.string().uuid().optional(),
    /** [#375] Zlecenie ekspresowe — wpływa na rozliczenie. */
    express: z.boolean().optional(),
    /** [#375] Ładunek wymaga parkingu strzeżonego — planowanie postoju. */
    securedParking: z.boolean().optional(),
    comment: z.string().max(2000).optional(),
  }),
  z.object({
    action: z.literal("unload"),
    ...tripBase,
    weightKg: z.number().int().nonnegative().optional(),
    orderId: z.string().uuid().optional(),
    express: z.boolean().optional(),
    securedParking: z.boolean().optional(),
    comment: z.string().max(2000).optional(),
  }),
  z.object({
    action: z.literal("transshipment"),
    ...tripBase,
    weightKg: z.number().int().nonnegative().optional(),
    /** Rejestracja auta, Z KTÓREGO przeładowano. */
    fromVehicleReg: z.string().min(2).max(20),
    /** Rejestracja auta, NA KTÓRE przeładowano. */
    toVehicleReg: z.string().min(2).max(20),
    orderId: z.string().uuid().optional(),
    comment: z.string().max(2000).optional(),
  }),
  z.object({
    action: z.literal("start"),
    ...tripBase,
    comment: z.string().max(2000).optional(),
  }),
  z.object({
    action: z.literal("end"),
    ...tripBase,
    comment: z.string().max(2000).optional(),
  }),
  z.object({
    action: z.literal("service"),
    ...tripBase,
    /** Kwota płatności za serwis — opcjonalna. */
    amount: z.number().nonnegative().optional(),
    /**
     * [#378] Waluta kwoty. `optional`, nie `default` — `default` uczyniłoby pole
     * wymaganym w typie wyjściowym, a stare buildy mobile o nim nie wiedzą.
     * Wartość domyślną nadaje kolumna w bazie.
     */
    currency: currencyCode.optional(),
    /** Co zostało naprawione — wymagane. */
    comment: z.string().min(1).max(2000),
  }),
  z.object({
    action: z.literal("other"),
    ...tripBase,
    amount: z.number().nonnegative().optional(),
    /** [#378] Patrz `service.currency`. */
    currency: currencyCode.optional(),
    /** Opis wykonywanej akcji — wymagany. */
    comment: z.string().min(1).max(2000),
  }),
]);
export type TripEventInput = z.infer<typeof tripEventSchema>;

// ── Zgłoszenie na mapie ─────────────────────────────────────────────

export const mapReportSchema = z.object({
  type: z.enum(REPORT_TYPES),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  comment: z.string().max(500).optional(),
});
export type MapReportInput = z.infer<typeof mapReportSchema>;
