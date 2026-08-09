/**
 * [#373] Stawki VAT per kraj i rozbicie kwoty na netto/VAT/brutto.
 *
 * Kontekst: dotąd w systemie istniała wyłącznie `companies.default_vat_rate` —
 * JEDNA stawka firmowa, używana do faktur sprzedaży. Do zwrotu VAT za paliwo
 * potrzebna jest stawka KRAJU TANKOWANIA, a kraj już mamy w `fuel_logs.station_country`.
 *
 * `validFrom` nie jest ozdobne: stawki się zmieniają, a wniosek o zwrot dotyczy
 * okresu historycznego i musi użyć stawki obowiązującej wtedy, nie dziś.
 */
import { round2 } from "./money";

export interface VatRate {
  /** Kod ISO 3166-1 alpha-2, wielkimi literami. */
  countryCode: string;
  /** Data początku obowiązywania, `YYYY-MM-DD`. */
  validFrom: string;
  /** Stawka podstawowa w procentach (np. 23 dla Polski). */
  rate: number;
  /**
   * Czy kraj zwraca VAT od paliwa przewoźnikom zagranicznym. Bez tej flagi
   * zwrot byłby liczony także dla krajów, które go nie oddają (UK, CH, NO),
   * a klient zobaczyłby kwotę, której nigdy nie odzyska.
   */
  fuelRefundable: boolean;
}

/**
 * Stawka obowiązująca w danym kraju danego dnia — najświeższa NIE PÓŹNIEJSZA
 * niż `onDate`. `null`, gdy kraju nie znamy: lepszy brak niż domyślne 23%,
 * które po cichu zawyżyłoby wniosek o zwrot.
 */
export function pickVatRate(
  rates: readonly VatRate[],
  countryCode: string,
  onDate: string,
): VatRate | null {
  const cc = countryCode.trim().toUpperCase();
  let best: VatRate | null = null;
  for (const r of rates) {
    if (r.countryCode.toUpperCase() !== cc) continue;
    if (r.validFrom > onDate) continue;
    if (!best || r.validFrom > best.validFrom) best = r;
  }
  return best;
}

/** Rozbicie kwoty na części składowe. */
export interface VatSplit {
  net: number;
  vat: number;
  gross: number;
  /** Stawka użyta do wyliczenia, w procentach. */
  rate: number;
}

/**
 * Rozbija kwotę BRUTTO na netto i VAT.
 *
 * To jest domyślna ścieżka dla tankowań: kierowca na stacji widzi kwotę brutto
 * z terminala i zwykle nie zna stawki VAT kraju, w którym akurat stoi.
 */
export function splitFromGross(gross: number, ratePct: number): VatSplit {
  if (ratePct < 0) throw new RangeError("Stawka VAT nie może być ujemna");
  const net = round2(gross / (1 + ratePct / 100));
  // VAT liczymy jako różnicę, nie osobnym mnożeniem — inaczej netto + VAT
  // potrafi rozminąć się z brutto o grosz przez zaokrąglenia.
  return { net, vat: round2(gross - net), gross: round2(gross), rate: ratePct };
}

/** Rozbija kwotę NETTO — ścieżka dla faktur, gdzie podstawą jest netto. */
export function splitFromNet(net: number, ratePct: number): VatSplit {
  if (ratePct < 0) throw new RangeError("Stawka VAT nie może być ujemna");
  const vat = round2(net * (ratePct / 100));
  return { net: round2(net), vat, gross: round2(round2(net) + vat), rate: ratePct };
}

/** Kwoty tankowania w dowolnym stopniu uzupełnienia. */
export interface AmountsInput {
  /** Kwota zapłacona (brutto) — to widzi kierowca na terminalu. */
  gross?: number | null;
  net?: number | null;
  /** Stawka VAT w procentach. */
  ratePct?: number | null;
}

/** Kwoty po uzupełnieniu tego, co dało się wyliczyć. */
export interface ResolvedAmounts {
  gross: number | null;
  net: number | null;
  vat: number | null;
  ratePct: number | null;
}

/**
 * Uzupełnia brakujące części kwoty — zasada „podaj dwa, policz resztę".
 *
 * Nie zgaduje NICZEGO. Jeśli mamy samo brutto i nie znamy stawki, netto i VAT
 * zostają puste — bo doliczenie domyślnej stawki dałoby liczbę wyglądającą jak
 * wprowadzona przez człowieka, która weszłaby do rozliczeń i do wniosku
 * o zwrot VAT. Lepiej puste pole niż wiarygodnie wyglądająca nieprawda.
 */
export function resolveAmounts(input: AmountsInput): ResolvedAmounts {
  const gross = input.gross ?? null;
  const net = input.net ?? null;
  const rate = input.ratePct ?? null;

  // Brutto + stawka → reszta. Najczęstszy przypadek: kierowca wpisuje kwotę
  // z terminala, stawkę bierzemy z kraju tankowania.
  if (gross !== null && rate !== null) {
    const s = splitFromGross(gross, rate);
    return { gross: s.gross, net: s.net, vat: s.vat, ratePct: rate };
  }
  // Netto + stawka → reszta. Ścieżka fakturowa.
  if (net !== null && rate !== null) {
    const s = splitFromNet(net, rate);
    return { gross: s.gross, net: s.net, vat: s.vat, ratePct: rate };
  }
  // Brutto + netto → stawka wynika z nich, nie trzeba jej znać z zewnątrz.
  if (gross !== null && net !== null && net > 0) {
    const vat = round2(gross - net);
    return { gross: round2(gross), net: round2(net), vat, ratePct: round2((vat / net) * 100) };
  }
  return { gross, net, vat: null, ratePct: rate };
}

/**
 * Kwota VAT możliwa do odzyskania z tankowania.
 *
 * `null` gdy nie znamy stawki kraju — wywołujący ma to pokazać jako brak danych,
 * a nie doliczyć zero, bo zero jest twierdzeniem („nic nie odzyskasz").
 * `0` gdy kraj jawnie nie zwraca VAT od paliwa — to już twierdzenie prawdziwe.
 */
export function refundableFuelVat(
  gross: number,
  countryCode: string,
  onDate: string,
  rates: readonly VatRate[],
): number | null {
  const r = pickVatRate(rates, countryCode, onDate);
  if (!r) return null;
  if (!r.fuelRefundable) return 0;
  return splitFromGross(gross, r.rate).vat;
}
