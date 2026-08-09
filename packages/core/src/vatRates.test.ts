import { describe, expect, it } from "vitest";
import {
  pickVatRate,
  refundableFuelVat,
  splitFromGross,
  splitFromNet,
  type VatRate,
} from "./vatRates";

const RATES: VatRate[] = [
  { countryCode: "PL", validFrom: "2011-01-01", rate: 23, fuelRefundable: true },
  { countryCode: "DE", validFrom: "2020-07-01", rate: 16, fuelRefundable: true }, // obniżka covidowa
  { countryCode: "DE", validFrom: "2021-01-01", rate: 19, fuelRefundable: true },
  { countryCode: "GB", validFrom: "2011-01-04", rate: 20, fuelRefundable: false },
];

describe("pickVatRate", () => {
  it("bierze stawkę obowiązującą w dniu zdarzenia, nie dzisiejszą", () => {
    // Wniosek o zwrot dotyczy okresu historycznego — stawka musi być z tamtego czasu.
    expect(pickVatRate(RATES, "DE", "2020-09-15")?.rate).toBe(16);
    expect(pickVatRate(RATES, "DE", "2026-06-01")?.rate).toBe(19);
  });

  it("ignoruje wielkość liter w kodzie kraju", () => {
    expect(pickVatRate(RATES, "pl", "2026-06-01")?.rate).toBe(23);
  });

  it("nieznany kraj daje null, nie domyślne 23%", () => {
    // Domyślna stawka po cichu zawyżyłaby wniosek o zwrot.
    expect(pickVatRate(RATES, "CZ", "2026-06-01")).toBeNull();
  });

  it("data sprzed pierwszej znanej stawki daje null", () => {
    expect(pickVatRate(RATES, "DE", "2019-01-01")).toBeNull();
  });
});

describe("splitFromGross", () => {
  it("rozbija brutto na netto i VAT", () => {
    const s = splitFromGross(123, 23);
    expect(s.net).toBe(100);
    expect(s.vat).toBe(23);
    expect(s.gross).toBe(123);
  });

  it("netto + VAT zawsze daje dokładnie brutto", () => {
    // VAT liczymy jako różnicę, nie osobnym mnożeniem — inaczej suma
    // rozjeżdża się z brutto o grosz i faktura się nie spina.
    for (const g of [100, 123.45, 0.03, 999.99, 7.77]) {
      const s = splitFromGross(g, 19);
      expect(s.net + s.vat).toBeCloseTo(s.gross, 10);
    }
  });

  it("stawka zerowa zostawia całość jako netto", () => {
    expect(splitFromGross(50, 0)).toMatchObject({ net: 50, vat: 0, gross: 50 });
  });

  it("odrzuca ujemną stawkę", () => {
    expect(() => splitFromGross(100, -1)).toThrow(RangeError);
  });
});

describe("splitFromNet", () => {
  it("dolicza VAT do netto", () => {
    expect(splitFromNet(100, 23)).toMatchObject({ net: 100, vat: 23, gross: 123 });
  });

  it("jest odwrotnością splitFromGross", () => {
    const fromNet = splitFromNet(100, 19);
    expect(splitFromGross(fromNet.gross, 19).net).toBe(100);
  });
});

describe("refundableFuelVat", () => {
  it("liczy VAT do odzyskania po stawce kraju tankowania", () => {
    expect(refundableFuelVat(123, "PL", "2026-06-01", RATES)).toBe(23);
  });

  it("kraj spoza procedury zwrotu daje 0 — to twierdzenie prawdziwe", () => {
    expect(refundableFuelVat(120, "GB", "2026-06-01", RATES)).toBe(0);
  });

  it("nieznany kraj daje null — to brak danych, nie zero", () => {
    // Zero znaczyłoby „nic nie odzyskasz", a my po prostu nie wiemy.
    expect(refundableFuelVat(123, "CZ", "2026-06-01", RATES)).toBeNull();
  });

  it("używa stawki historycznej, nie bieżącej", () => {
    // 116 brutto przy 16% = 16 VAT (Niemcy, druga połowa 2020).
    expect(refundableFuelVat(116, "DE", "2020-09-15", RATES)).toBe(16);
  });
});
