/**
 * [#373] Przeliczanie walut po kursie z DNIA ZDARZENIA.
 *
 * Dotąd jedenaście miejsc w kodzie po prostu odrzucało wszystko, co nie jest EUR
 * (`if (currency !== "EUR") continue`). Efekt: koszt w PLN znikał z podsumowania
 * bez słowa, a użytkownik widział sumę niższą niż rzeczywista i nie miał jak
 * się zorientować.
 *
 * Dwie zasady, które rządzą tym modułem:
 *
 *  1. KIERUNEK KURSU JEST JAWNY. `unitsPerEur` = ile jednostek waluty kosztuje
 *     1 EUR (format EBC, np. PLN ≈ 4.30). Nie ma tu żadnej inwersji, bo odwrócony
 *     kurs to błąd, którego nikt nie zauważy, dopóki nie policzy zwrotu VAT.
 *
 *  2. BRAK KURSU TO `null`, NIGDY ZERO. Zwrócenie 0 dla brakującego kursu
 *     zamieniłoby „nie wiem" w „nic nie kosztowało" — dokładnie ta klasa błędu,
 *     przez którą zestawienie miesięczne pokazywało 0 €.
 */
import { round2 } from "./money";

/** Notowanie: ile jednostek `currency` kosztuje 1 EUR w dniu `asOf`. */
export interface FxRate {
  /** Dzień notowania, `YYYY-MM-DD`. */
  asOf: string;
  /** Kod ISO 4217, wielkimi literami. */
  currency: string;
  /** Ile jednostek waluty za 1 EUR. Zawsze > 0. */
  unitsPerEur: number;
}

/** Waluta rozliczeniowa systemu — względem niej wyrażone są wszystkie kursy. */
export const BASE_CURRENCY = "EUR";

/**
 * Najświeższe notowanie waluty NIE NOWSZE niż `onDate`.
 *
 * Kurs z przyszłości jest świadomie odrzucany: przeliczenie tankowania sprzed
 * pół roku dzisiejszym kursem daje liczbę, która nie zgadza się z żadnym
 * dokumentem księgowym.
 *
 * Weekendy i święta: EBC nie publikuje kursów, więc sięgamy po ostatni znany —
 * to standardowa praktyka, a nie obejście.
 */
export function pickFxRate(
  rates: readonly FxRate[],
  currency: string,
  onDate: string,
): FxRate | null {
  const cur = currency.trim().toUpperCase();
  let best: FxRate | null = null;
  for (const r of rates) {
    if (r.currency.toUpperCase() !== cur) continue;
    if (r.asOf > onDate) continue;
    if (!best || r.asOf > best.asOf) best = r;
  }
  return best;
}

/**
 * Przelicza kwotę na EUR. `null`, gdy nie znamy kursu — wywołujący MUSI
 * rozstrzygnąć, co z tym zrobić (pokazać ostrzeżenie, pominąć, zapytać).
 */
export function toEur(
  amount: number,
  currency: string,
  rates: readonly FxRate[],
  onDate: string,
): number | null {
  const cur = currency.trim().toUpperCase();
  if (cur === BASE_CURRENCY) return round2(amount);
  const rate = pickFxRate(rates, cur, onDate);
  if (!rate || rate.unitsPerEur <= 0) return null;
  return round2(amount / rate.unitsPerEur);
}

/** Przelicza kwotę z EUR na wskazaną walutę. `null` przy braku kursu. */
export function fromEur(
  amountEur: number,
  currency: string,
  rates: readonly FxRate[],
  onDate: string,
): number | null {
  const cur = currency.trim().toUpperCase();
  if (cur === BASE_CURRENCY) return round2(amountEur);
  const rate = pickFxRate(rates, cur, onDate);
  if (!rate || rate.unitsPerEur <= 0) return null;
  return round2(amountEur * rate.unitsPerEur);
}

/**
 * Przelicza między dowolnymi walutami (przez EUR jako oś).
 * `null`, gdy brakuje któregokolwiek z dwóch kursów.
 */
export function convert(
  amount: number,
  from: string,
  to: string,
  rates: readonly FxRate[],
  onDate: string,
): number | null {
  if (from.trim().toUpperCase() === to.trim().toUpperCase()) return round2(amount);
  const eur = toEur(amount, from, rates, onDate);
  if (eur === null) return null;
  return fromEur(eur, to, rates, onDate);
}

/** Wynik sumowania kwot w różnych walutach. */
export interface SumResult {
  /** Suma tego, co udało się przeliczyć. */
  total: number;
  /** Waluta wyniku. */
  currency: string;
  /**
   * Pozycje pominięte z braku kursu — do pokazania użytkownikowi.
   * Suma bez tej informacji jest myląca, bo wygląda na kompletną.
   */
  skipped: { amount: number; currency: string; date: string }[];
}

/**
 * Sumuje kwoty w mieszanych walutach do jednej. Pozycje bez kursu NIE są
 * wliczane po kursie 1:1 ani jako zero — trafiają do `skipped`, żeby interfejs
 * mógł uczciwie powiedzieć „suma niepełna".
 */
export function sumInCurrency(
  items: readonly { amount: number; currency: string; date: string }[],
  target: string,
  rates: readonly FxRate[],
): SumResult {
  const cur = target.trim().toUpperCase();
  let total = 0;
  const skipped: SumResult["skipped"] = [];
  for (const it of items) {
    const v = convert(it.amount, it.currency, cur, rates, it.date);
    if (v === null) skipped.push(it);
    else total += v;
  }
  return { total: round2(total), currency: cur, skipped };
}
