import { describe, expect, it } from "vitest";
import type { FxRate } from "./fx";
import type { VatRate } from "./vatRates";
import { vatRefundByCountry } from "./vatRefund";

const VAT: VatRate[] = [
  { countryCode: "DE", validFrom: "2026-01-01", rate: 19, fuelRefundable: true },
  { countryCode: "PL", validFrom: "2026-01-01", rate: 23, fuelRefundable: true },
  // Wielka Brytania nie zwraca VAT od paliwa przewoźnikom zagranicznym.
  { countryCode: "GB", validFrom: "2026-01-01", rate: 20, fuelRefundable: false },
];

const FX: FxRate[] = [
  { asOf: "2026-07-15", currency: "PLN", unitsPerEur: 4 },
  { asOf: "2026-07-15", currency: "EUR", unitsPerEur: 1 },
  { asOf: "2026-07-15", currency: "GBP", unitsPerEur: 0.85 },
];

const at = (over: Partial<Parameters<typeof vatRefundByCountry>[0][number]> = {}) => ({
  country: "DE",
  gross: 119,
  currency: "EUR",
  occurredAt: "2026-07-15T10:00:00Z",
  liters: 100,
  ...over,
});

describe("vatRefundByCountry", () => {
  it("liczy VAT do odzyskania od kwoty brutto", () => {
    // 119 € brutto przy 19% → 19 € VAT.
    const s = vatRefundByCountry([at()], VAT, FX);
    expect(s.rows).toHaveLength(1);
    expect(s.rows[0]?.refundableEur).toBe(19);
    expect(s.rows[0]?.ratePct).toBe(19);
    expect(s.totalRefundableEur).toBe(19);
  });

  it("VAT liczony od kwoty w walucie zapłaty, dopiero potem przeliczony", () => {
    // 492 PLN brutto przy 23% → 92 PLN VAT → przy kursie 4 to 23 €.
    const s = vatRefundByCountry([at({ country: "PL", gross: 492, currency: "PLN" })], VAT, FX);
    expect(s.rows[0]?.refundableEur).toBe(23);
    expect(s.rows[0]?.grossEur).toBe(123);
  });

  it("kraj, który nie zwraca VAT, daje ZERO — to twierdzenie, nie brak danych", () => {
    const s = vatRefundByCountry([at({ country: "GB", gross: 120, currency: "GBP" })], VAT, FX);
    expect(s.rows[0]?.refundableEur).toBe(0);
    expect(s.rows[0]?.refundable).toBe(false);
    // Kwota brutto nadal się liczy — wydatek był, tylko nie do odzyskania.
    expect(s.rows[0]?.grossEur).toBeGreaterThan(0);
  });

  it("nieznana stawka daje `null`, a NIE zero", () => {
    // Zero znaczyłoby „nic nie odzyskasz" i po cichu zaniżyłoby wniosek.
    const s = vatRefundByCountry([at({ country: "CZ", gross: 100 })], VAT, FX);
    expect(s.rows[0]?.refundableEur).toBeNull();
    expect(s.unknownCountries).toEqual(["CZ"]);
    // Kraj bez stawki nie wchodzi do sumy.
    expect(s.totalRefundableEur).toBe(0);
  });

  it("stawka z dnia zdarzenia, nie z dzisiaj", () => {
    const rates: VatRate[] = [
      { countryCode: "DE", validFrom: "2020-01-01", rate: 16, fuelRefundable: true },
      { countryCode: "DE", validFrom: "2026-08-01", rate: 25, fuelRefundable: true },
    ];
    const fx: FxRate[] = [{ asOf: "2026-07-15", currency: "EUR", unitsPerEur: 1 }];
    // Tankowanie z 15 lipca — obowiązuje stawka 16%, nie 25% wprowadzona w sierpniu.
    const s = vatRefundByCountry([at({ gross: 116 })], rates, fx);
    expect(s.rows[0]?.ratePct).toBe(16);
    expect(s.rows[0]?.refundableEur).toBe(16);
  });

  it("pozycja bez kursu jest liczona osobno, nie wchodzi do sumy", () => {
    const s = vatRefundByCountry([at(), at({ gross: 1000, currency: "HUF" })], VAT, FX);
    expect(s.missingRate).toBe(1);
    expect(s.rows[0]?.count).toBe(2);
    // Suma to nadal tylko ta pozycja, którą dało się przeliczyć.
    expect(s.totalRefundableEur).toBe(19);
  });

  it("brak kwoty nie jest brakiem kursu", () => {
    const s = vatRefundByCountry([at({ gross: null })], VAT, FX);
    expect(s.missingRate).toBe(0);
    expect(s.rows[0]?.count).toBe(1);
    expect(s.rows[0]?.grossEur).toBe(0);
  });

  it("grupuje po kraju i sumuje litry", () => {
    const s = vatRefundByCountry(
      [at(), at({ liters: 50 }), at({ country: "PL", gross: 123, currency: "PLN", liters: 30 })],
      VAT,
      FX,
    );
    const de = s.rows.find((r) => r.country === "DE");
    expect(de?.count).toBe(2);
    expect(de?.liters).toBe(150);
    expect(s.rows.find((r) => r.country === "PL")?.liters).toBe(30);
  });

  it("kraj podany małymi literami trafia do tego samego wiersza", () => {
    const s = vatRefundByCountry([at(), at({ country: "de" })], VAT, FX);
    expect(s.rows).toHaveLength(1);
    expect(s.rows[0]?.count).toBe(2);
  });

  it("sortuje malejąco po kwocie do odzyskania, kraje bez stawki na końcu", () => {
    const s = vatRefundByCountry(
      [
        at({ country: "CZ", gross: 10_000 }),
        at({ gross: 119 }),
        at({ country: "PL", gross: 4000, currency: "PLN" }),
      ],
      VAT,
      FX,
    );
    expect(s.rows.map((r) => r.country)).toEqual(["PL", "DE", "CZ"]);
  });
});
