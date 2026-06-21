/**
 * Schematy walidacji Zod — współdzielone między web, mobile i Edge Functions.
 * Odwzorowują model danych (docs/DATA-MODEL.md) 1:1 ze specyfikacją formularzy.
 */
import { z } from "zod";
import { FUEL_CARD_PROVIDERS, PAYMENT_METHODS, REPORT_TYPES, VEHICLE_TYPES } from "./enums";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data w formacie YYYY-MM-DD");

/** Lokalizacja: kraj + miejsce, opcjonalnie współrzędne GPS (auto lub ręcznie). */
export const geoLocationSchema = z.object({
  country: z.string().min(2).max(56),
  city: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
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
  insurer: z.string().max(60).optional(),
  licenseNumber: z.string().max(40).optional(),
  leasingEnd: isoDate.optional(),
  curbWeightKg: z.number().int().positive().optional(),
  maxPayloadKg: z.number().int().positive().optional(),
  heightCm: z.number().int().positive().optional(),
  widthCm: z.number().int().positive().optional(),
  lengthCm: z.number().int().positive().optional(),
  vehicleType: z.enum(VEHICLE_TYPES),
  forwarder: z.string().optional(),
  comment: z.string().max(2000).optional(),
});
export type VehicleInput = z.infer<typeof vehicleSchema>;

// ── Karta paliwowa ──────────────────────────────────────────────────

export const fuelCardSchema = z.object({
  provider: z.enum(FUEL_CARD_PROVIDERS),
  cardNumberMasked: z.string().min(1),
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

// ── Kierowca (kartoteka kadrowa) ────────────────────────────────────

export const driverSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  birthDate: isoDate.optional(),
  licenseNumber: z.string().max(40).optional(),
  idCardNumber: z.string().max(40).optional(),
  passportNumber: z.string().max(40).optional(),
  licenseCategories: z.array(z.string()).default([]),
  qualifications: z.array(z.string()).default([]),
  notes: z.string().max(2000).optional(),
});
export type DriverInput = z.infer<typeof driverSchema>;

// ── Formularz Paliwo / AdBlue ───────────────────────────────────────

export const fuelLogSchema = z
  .object({
    vehicleId: z.uuid(),
    station: geoLocationSchema,
    odometerKm: z.number().int().nonnegative(),
    liters: z.number().positive(),
    paymentMethod: z.enum(PAYMENT_METHODS),
    fuelCardId: z.uuid().optional(),
    priceTotal: z.number().nonnegative().optional(),
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
};

export const tripEventSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("load"),
    ...tripBase,
    weightKg: z.number().int().nonnegative(),
    comment: z.string().max(2000).optional(),
  }),
  z.object({
    action: z.literal("unload"),
    ...tripBase,
    weightKg: z.number().int().nonnegative(),
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
    /** Co zostało naprawione — wymagane. */
    comment: z.string().min(1).max(2000),
  }),
  z.object({
    action: z.literal("other"),
    ...tripBase,
    amount: z.number().nonnegative().optional(),
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
