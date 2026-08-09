/**
 * [#375] Zamiana wiersza arkusza na wpis tankowania.
 *
 * Wydzielone ze strony importu, żeby dało się to przetestować bez renderowania
 * Reacta. Nie jest to kosmetyka: pierwsza wersja tej logiki odrzucała **każdy**
 * wiersz, bo `fuelLogSchema` wymaga `fuelCardId` przy płatności kartą, a import
 * ustawiał kartę jako domyślną metodę i nie podawał żadnej karty. Taki błąd
 * widać w teście natychmiast, a w przeglądarce dopiero po wgraniu pliku.
 */
import {
  type FuelLogInput,
  fuelLogSchema,
  parseSheetBool,
  parseSheetDate,
  parseSheetNumber,
} from "@e-logistic/core";

export interface FuelImportMessages {
  /** `{reg}` zostanie podmienione na rejestrację z pliku. */
  vehicleUnknown: string;
  pickCard: string;
}

export interface FuelImportOptions {
  /** Rejestracja z pliku → id pojazdu; `undefined`, gdy floty nie zna. */
  resolveVehicle: (registration: string) => string | undefined;
  /** Karta wskazana dla całego pliku (puste = nie wybrano). */
  cardId: string;
  /** Klucze już zaimportowanych wpisów — patrz `fuelImportDupKey`. */
  existing: ReadonlySet<string>;
  messages: FuelImportMessages;
}

export type FuelImportRow = { input: FuelLogInput; registration: string };
export type FuelImportResult = { ok: true; value: FuelImportRow } | { ok: false; error: string };

/**
 * Klucz porównawczy duplikatu: to samo auto, ten sam moment, te same litry.
 *
 * Świadomie bez kwoty — ta sama transakcja bywa na zestawieniu raz w walucie
 * stacji, a raz przeliczona, i wtedy kwoty się różnią, choć tankowanie było jedno.
 */
export function fuelImportDupKey(vehicleId: string, occurredAt: string, liters: number): string {
  return `${vehicleId}|${occurredAt.slice(0, 16)}|${liters}`;
}

/** Normalizacja rejestracji do porównania: „WX 1234", „wx-1234" i „WX1234" to jedno auto. */
export function normalizeRegistration(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

export function buildFuelImportRow(
  rec: Record<string, string>,
  opts: FuelImportOptions,
): FuelImportResult {
  const registration = (rec.vehicle ?? "").trim();
  const vehicleId = opts.resolveVehicle(registration);
  if (!vehicleId) {
    return { ok: false, error: opts.messages.vehicleUnknown.replace("{reg}", registration) };
  }

  const occurredAt = parseSheetDate(rec.date);
  if (!occurredAt) return { ok: false, error: `data nieczytelna: „${(rec.date ?? "").trim()}”` };

  const odometerKm = parseSheetNumber(rec.odometer);
  if (odometerKm == null) {
    return { ok: false, error: "brak stanu licznika — bez niego nie da się policzyć spalania" };
  }
  const liters = parseSheetNumber(rec.liters);
  if (liters == null || liters <= 0) {
    return { ok: false, error: "brak/niepoprawna liczba litrów" };
  }

  // Zestawienie z karty paliwowej to z definicji płatność kartą; gotówkę trzeba
  // w pliku napisać wprost.
  const payment = (rec.payment ?? "").trim().toLowerCase();
  const paymentMethod = /gotów|gotow|cash|bar/.test(payment) ? "cash" : "card";
  if (paymentMethod === "card" && !opts.cardId) {
    return { ok: false, error: opts.messages.pickCard };
  }

  const parsed = fuelLogSchema.safeParse({
    vehicleId,
    station: {
      country: (rec.country ?? "").trim(),
      city: (rec.city ?? "").trim() || undefined,
    },
    odometerKm: Math.round(odometerKm),
    liters,
    isFull: parseSheetBool(rec.full) ?? true,
    paymentMethod,
    fuelCardId: paymentMethod === "card" ? opts.cardId : undefined,
    priceTotal: parseSheetNumber(rec.gross),
    currency: (rec.currency ?? "").trim().toUpperCase() || undefined,
    priceNet: parseSheetNumber(rec.net),
    vatRate: parseSheetNumber(rec.vatRate),
    occurredAt,
    comment: (rec.comment ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "wiersz odrzucony" };
  }

  // Duplikat sprawdzamy na danych już znormalizowanych przez schemat.
  if (opts.existing.has(fuelImportDupKey(vehicleId, occurredAt, liters))) {
    return { ok: false, error: "już zaimportowane — pominięte, żeby nie zdublować" };
  }
  return { ok: true, value: { input: parsed.data, registration } };
}
