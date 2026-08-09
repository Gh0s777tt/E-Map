import { describe, expect, it } from "vitest";
import {
  pickVatRate,
  refundableFuelVat,
  resolveAmounts,
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

describe("resolveAmounts — zasada „podaj dwa, policz resztę”", () => {
  it("brutto + stawka → netto i VAT", () => {
    expect(resolveAmounts({ gross: 123, ratePct: 23 })).toEqual({
      gross: 123,
      net: 100,
      vat: 23,
      ratePct: 23,
    });
  });

  it("netto + stawka → brutto i VAT", () => {
    expect(resolveAmounts({ net: 100, ratePct: 19 })).toEqual({
      gross: 119,
      net: 100,
      vat: 19,
      ratePct: 19,
    });
  });

  it("brutto + netto → wylicza stawkę, nie trzeba jej znać z zewnątrz", () => {
    expect(resolveAmounts({ gross: 123, net: 100 })).toEqual({
      gross: 123,
      net: 100,
      vat: 23,
      ratePct: 23,
    });
  });

  it("samo brutto NIE dorabia stawki — puste pole zamiast wiarygodnej nieprawdy", () => {
    // Domyślne 23% dałoby liczbę wyglądającą jak wpisana przez człowieka,
    // która weszłaby do rozliczeń i do wniosku o zwrot VAT.
    expect(resolveAmounts({ gross: 500 })).toEqual({
      gross: 500,
      net: null,
      vat: null,
      ratePct: null,
    });
  });

  it("pusty wejściowo zostaje pusty", () => {
    expect(resolveAmounts({})).toEqual({ gross: null, net: null, vat: null, ratePct: null });
  });

  it("netto zero nie powoduje dzielenia przez zero przy wyliczaniu stawki", () => {
    const r = resolveAmounts({ gross: 50, net: 0 });
    expect(Number.isFinite(r.ratePct ?? 0)).toBe(true);
  });

  it("wynik zawsze się spina: netto + VAT = brutto", () => {
    for (const g of [123.45, 0.07, 999.99, 61.5]) {
      const r = resolveAmounts({ gross: g, ratePct: 19 });
      expect((r.net ?? 0) + (r.vat ?? 0)).toBeCloseTo(r.gross ?? 0, 10);
    }
  });
});
