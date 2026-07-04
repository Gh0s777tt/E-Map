import { round2 } from "./money";

/**
 * Rozliczenie miesięczne kierowcy (#265) — silnik liczenia wg wzorcowego
 * formularza właściciela. WSZYSTKIE stawki/normy są parametrami per firma
 * (tabela `company_settlement_settings`) — domyślne wartości to tylko seed.
 *
 * Formuły (odtworzone 1:1 z arkusza):
 *  • kwota podstawowa   = dni × stawka dzienna
 *  • premia dokument.   = (premia mies. / 30) × dni
 *  • premia tygodniowa  = max(0, km_tygodnia − dni_tygodnia × norma_km) × stawka_km
 *  • ubezpieczenie      = stawka/dzień × dni
 *  • telefon            = (ryczałt mies. / 30) × dni
 *  • RAZEM = podstawa + PREMIA RAZEM (dok. + norma + tygodnie + ubezp.) + telefon + hotele
 */
export interface SettlementSettings {
  dailyRate: number;
  kmNormPerDay: number;
  kmRate: number;
  insurancePerDay: number;
  phoneMonthly: number;
  docBonusMonthly: number;
}

export const DEFAULT_SETTLEMENT_SETTINGS: SettlementSettings = {
  dailyRate: 250,
  kmNormPerDay: 555.5,
  kmRate: 0.45,
  insurancePerDay: 75,
  phoneMonthly: 200,
  docBonusMonthly: 1500,
};

export interface SettlementWeek {
  days: number;
  km: number;
}

export interface DriverSettlementInput {
  days: number;
  weeks: SettlementWeek[];
  settings: SettlementSettings;
  /** Premia „norma" — kwota uznaniowa (np. za spalanie poniżej normy). */
  normBonus?: number;
  /** Korekta premii dokumentacyjnej — domyślnie pełna kwota proporcjonalna do dni. */
  docBonusOverride?: number | null;
  hotels?: number;
  /** Potrącenia/zaliczki pomniejszające BALANS. */
  deductions?: number;
}

export interface DriverSettlementResult {
  base: number;
  docBonus: number;
  normBonus: number;
  weekBonuses: number[];
  insurance: number;
  bonusTotal: number;
  phone: number;
  hotels: number;
  total: number;
  deductions: number;
  balance: number;
  kmTotal: number;
}

export function computeDriverSettlement(input: DriverSettlementInput): DriverSettlementResult {
  const s = input.settings;
  const days = Math.max(0, input.days);
  const base = round2(days * s.dailyRate);
  const docBonus =
    input.docBonusOverride != null
      ? round2(input.docBonusOverride)
      : round2((s.docBonusMonthly / 30) * days);
  const normBonus = round2(input.normBonus ?? 0);
  const weekBonuses = input.weeks.map((w) =>
    round2(Math.max(0, w.km - w.days * s.kmNormPerDay) * s.kmRate),
  );
  const insurance = round2(days * s.insurancePerDay);
  const bonusTotal = round2(
    docBonus + normBonus + weekBonuses.reduce((a, b) => a + b, 0) + insurance,
  );
  const phone = round2((s.phoneMonthly / 30) * days);
  const hotels = round2(input.hotels ?? 0);
  const total = round2(base + bonusTotal + phone + hotels);
  const deductions = round2(input.deductions ?? 0);
  return {
    base,
    docBonus,
    normBonus,
    weekBonuses,
    insurance,
    bonusTotal,
    phone,
    hotels,
    total,
    deductions,
    balance: round2(total - deductions),
    kmTotal: input.weeks.reduce((a, w) => a + w.km, 0),
  };
}
