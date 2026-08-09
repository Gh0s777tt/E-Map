/**
 * [#379] Zwrot VAT za paliwo — zestawienie per kraj tankowania.
 *
 * Przewoźnik tankujący za granicą płaci VAT kraju stacji i może wystąpić o jego
 * zwrot. Kwota jest realna: przy kilkuset tysiącach litrów rocznie idzie
 * w dziesiątki tysięcy euro. Wszystkie klocki istniały od [#373]
 * (`pickVatRate`, `splitFromGross`, `refundableFuelVat`, tabela `vat_rates`
 * z 28 krajami) — nie było tylko agregacji i ekranu, więc nikt tego nie widział.
 *
 * Trzy stany, których NIE WOLNO zlewać w jeden:
 *   • kwota      — znamy stawkę i kraj zwraca → tyle można odzyskać;
 *   • zero       — kraj jawnie nie zwraca VAT od paliwa (UK, CH, NO) → twierdzenie prawdziwe;
 *   • nie wiemy  — brak stawki na dany dzień → brak danych, nie „zero do odzyskania".
 * Pokazanie „nie wiemy" jako zera zaniża wniosek i nikt się o tym nie dowie.
 */
import { type FxRate, toEur } from "./fx";
import { round2 } from "./money";
import { pickVatRate, splitFromGross, type VatRate } from "./vatRates";

/** Pojedyncze tankowanie na wejściu zestawienia. */
export interface VatRefundEntry {
  /** Kod ISO 3166-1 alpha-2 kraju stacji. */
  country: string;
  /** Kwota zapłacona (brutto), w walucie `currency`. */
  gross: number | null;
  currency: string | null;
  /** Data zdarzenia (ISO). Stawka VAT i kurs biorą się z tego dnia. */
  occurredAt: string;
  liters?: number | null;
}

/** Wiersz zestawienia — jeden kraj. */
export interface VatRefundRow {
  country: string;
  /** Ile tankowań weszło do wiersza. */
  count: number;
  liters: number;
  /** Suma brutto w euro (pozycje bez kursu nie wchodzą — patrz `missingRate`). */
  grossEur: number;
  /**
   * VAT możliwy do odzyskania, w euro. `null` = nie znamy stawki tego kraju.
   * `0` przy `refundable: false` znaczy „kraj nie zwraca", a nie „nie wiemy".
   */
  refundableEur: number | null;
  /** Stawka użyta do wyliczenia (procent) albo `null`. */
  ratePct: number | null;
  /** Czy kraj zwraca VAT od paliwa przewoźnikom zagranicznym. */
  refundable: boolean | null;
  /** Pozycje z kwotą, ale bez notowania waluty na dzień zdarzenia. */
  missingRate: number;
}

export interface VatRefundSummary {
  rows: VatRefundRow[];
  /** Suma tego, co realnie da się odzyskać. Kraje bez znanej stawki NIE wchodzą. */
  totalRefundableEur: number;
  /** Kraje, dla których nie znamy stawki — ich kwota jest poza sumą. */
  unknownCountries: string[];
  /** Łączna liczba pozycji, których nie dało się przeliczyć na euro. */
  missingRate: number;
}

/**
 * Buduje zestawienie zwrotu VAT per kraj.
 *
 * Kolejność działań jest księgowa, nie wygodna: VAT liczymy od kwoty
 * W WALUCIE ZAPŁATY (bo taka kwota widnieje na paragonie i taką stawką jest
 * obciążona), a dopiero wynik przeliczamy na euro. Odwrotna kolejność daje
 * niemal to samo, ale „niemal" w dokumencie dla urzędu skarbowego jest złym
 * słowem — a różnica rośnie z każdym zaokrągleniem.
 */
export function vatRefundByCountry(
  entries: readonly VatRefundEntry[],
  vatRates: readonly VatRate[],
  fxRates: readonly FxRate[],
): VatRefundSummary {
  const acc = new Map<
    string,
    {
      count: number;
      liters: number;
      grossEur: number;
      refundEur: number;
      ratePct: number | null;
      refundable: boolean | null;
      missingRate: number;
      anyRate: boolean;
    }
  >();

  for (const e of entries) {
    const country = (e.country ?? "").trim().toUpperCase();
    if (!country) continue;
    const day = e.occurredAt.slice(0, 10);
    const cur = acc.get(country) ?? {
      count: 0,
      liters: 0,
      grossEur: 0,
      refundEur: 0,
      ratePct: null,
      refundable: null,
      missingRate: 0,
      anyRate: false,
    };
    cur.count += 1;
    cur.liters += Number(e.liters ?? 0);

    const rate = pickVatRate(vatRates, country, day);
    if (rate) {
      cur.anyRate = true;
      // Ostatnia (najświeższa w oknie) stawka trafia do nagłówka wiersza —
      // służy do pokazania „czym liczyliśmy", a nie do samego wyliczenia:
      // każda pozycja używa stawki ze SWOJEGO dnia.
      cur.ratePct = rate.rate;
      cur.refundable = rate.fuelRefundable;
    }

    if (e.gross == null) {
      acc.set(country, cur);
      continue;
    }
    const grossEur = toEur(e.gross, e.currency ?? "EUR", fxRates, day);
    if (grossEur == null) {
      cur.missingRate += 1;
      acc.set(country, cur);
      continue;
    }
    cur.grossEur += grossEur;

    if (rate?.fuelRefundable) {
      // VAT od kwoty w walucie zapłaty, potem na euro — patrz komentarz wyżej.
      const vatLocal = splitFromGross(e.gross, rate.rate).vat;
      const vatEur = toEur(vatLocal, e.currency ?? "EUR", fxRates, day);
      if (vatEur != null) cur.refundEur += vatEur;
    }
    acc.set(country, cur);
  }

  const rows: VatRefundRow[] = [...acc]
    .map(([country, a]) => ({
      country,
      count: a.count,
      liters: round2(a.liters),
      grossEur: round2(a.grossEur),
      refundableEur: a.anyRate ? round2(a.refundEur) : null,
      ratePct: a.ratePct,
      refundable: a.refundable,
      missingRate: a.missingRate,
    }))
    // Najpierw to, gdzie jest co odzyskiwać; kraje bez stawki na końcu,
    // bo wymagają uzupełnienia danych, a nie decyzji finansowej.
    .sort((x, y) => (y.refundableEur ?? -1) - (x.refundableEur ?? -1));

  return {
    rows,
    totalRefundableEur: round2(rows.reduce((s, r) => s + (r.refundableEur ?? 0), 0)),
    unknownCountries: rows.filter((r) => r.refundableEur === null).map((r) => r.country),
    missingRate: rows.reduce((s, r) => s + r.missingRate, 0),
  };
}
