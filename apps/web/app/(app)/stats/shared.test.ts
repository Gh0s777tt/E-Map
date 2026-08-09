/**
 * [#378] Przeliczanie walut w statystykach.
 *
 * Ekran sumował złotówki razem z euro jak jedną walutę — 1200 PLN wchodziło do
 * kosztu jako 1200 €, czyli ponad czterokrotne zawyżenie. Te testy pilnują, żeby
 * nikt nie wrócił do surowego `price_total ?? 0`: to nie jest uproszczenie,
 * tylko fałszywa liczba na ekranie zarządu.
 */
import type { FxRate } from "@e-logistic/core";
import { describe, expect, it } from "vitest";
import { countMissingRate, entry, type FuelRaw, monthlyCost } from "./shared";

const RATES: FxRate[] = [
  { asOf: "2026-07-15", currency: "PLN", unitsPerEur: 4.3 },
  { asOf: "2026-07-15", currency: "EUR", unitsPerEur: 1 },
];

const row = (over: Partial<FuelRaw> = {}): FuelRaw => ({
  id: "r1",
  vehicle_id: "v1",
  odometer_km: 100_000,
  liters: 100,
  price_total: 430,
  currency: "PLN",
  price_net: null,
  vat_rate: null,
  fuel_card_id: null,
  station_country: "PL",
  created_at: "2026-07-16T00:00:00Z",
  occurred_at: "2026-07-15T10:00:00Z",
  ...over,
});

describe("entry — kwota przeliczona na granicy odczytu", () => {
  it("złotówki idą dalej jako euro, nie jako surowa liczba", () => {
    expect(entry(row(), RATES).priceTotal).toBe(100);
  });

  it("euro zostaje euro", () => {
    expect(entry(row({ price_total: 100, currency: "EUR" }), RATES).priceTotal).toBe(100);
  });

  it("brak kursu daje `undefined`, nie zero i nie kurs 1:1", () => {
    // Zero znaczyłoby „tankowanie za darmo" i zaniżyłoby koszt; kurs 1:1
    // zawyżyłby go ponad czterokrotnie. Oba są gorsze niż brak liczby.
    const r = entry(row({ currency: "CZK" }), RATES);
    expect(r.priceTotal).toBeUndefined();
  });

  it("kurs bierzemy z dnia zdarzenia, nie z dnia synchronizacji", () => {
    // Wpis zrobiony offline 15 lipca, zsynchronizowany 16 — liczy się 15.
    const rates: FxRate[] = [
      { asOf: "2026-07-15", currency: "PLN", unitsPerEur: 4.3 },
      { asOf: "2026-07-16", currency: "PLN", unitsPerEur: 8.6 },
    ];
    expect(entry(row(), rates).priceTotal).toBe(100);
  });

  it("brak kwoty to nadal brak kwoty", () => {
    expect(entry(row({ price_total: null }), RATES).priceTotal).toBeUndefined();
  });
});

describe("countMissingRate — brak kursu ≠ brak kwoty", () => {
  it("liczy tylko wiersze z kwotą, której nie da się przeliczyć", () => {
    const rows = [
      row(), // PLN, kurs jest
      row({ currency: "CZK" }), // kurs brakuje  → liczy się
      row({ price_total: null }), // brak kwoty    → NIE liczy się
      row({ currency: "HUF" }), // kurs brakuje  → liczy się
    ];
    expect(countMissingRate(rows, RATES)).toBe(2);
  });

  it("bez kursów wszystkie kwoty w obcej walucie są nieprzeliczalne", () => {
    expect(countMissingRate([row()], [])).toBe(1);
  });
});

describe("monthlyCost", () => {
  it("grupuje po miesiącu zdarzenia i sumuje w euro", () => {
    const out = monthlyCost([row(), row({ price_total: 86, currency: "PLN" })], RATES);
    expect(out).toEqual([{ label: "07.26", value: 120 }]);
  });

  it("pomija wiersz bez kursu zamiast doliczać go 1:1", () => {
    const out = monthlyCost([row(), row({ currency: "CZK", price_total: 1000 })], RATES);
    expect(out).toEqual([{ label: "07.26", value: 100 }]);
  });
});
