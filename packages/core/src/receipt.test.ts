import { describe, expect, it } from "vitest";
import { detectAmount, detectCurrency, parseReceiptText } from "./receipt";

const PARAGON_PL = `ORLEN S.A.
Stacja 4123 Konin
PARAGON FISKALNY
ON B7          64,71 l
Cena           6,12 zł/l
Pozycja        396,03
Rabat          -10,00
SUMA PLN       386,03
Gotówka        400,00
Reszta         13,97
NIP 774-00-01-454`;

const QUITTUNG_DE = `Shell Autohof A3
Diesel 82,40 L x 1.689 EUR
Zwischensumme 139,17
MwSt 19% 22,22
GESAMT EUR 139,17`;

const UCTENKA_CZ = `Benzina Rozvadov
Nafta 55,2 l
CELKEM 1 890,50 Kč`;

describe("parseReceiptText (#298 — OCR paragonów)", () => {
  it("polski paragon: kwota z linii SUMA (nie największa pozycja gotówki)", () => {
    // linia „Gotówka 400,00" jest większa, ale SUMA ma pierwszeństwo
    expect(detectAmount(PARAGON_PL)).toBe(386.03);
    expect(detectCurrency(PARAGON_PL)).toBe("PLN");
  });

  it("niemiecki: GESAMT + EUR, kropka dziesiętna w cenie nie myli parsera", () => {
    const p = parseReceiptText(QUITTUNG_DE);
    expect(p.amount).toBe(139.17);
    expect(p.currency).toBe("EUR");
  });

  it("czeski: separator tysięcy spacją + Kč", () => {
    const p = parseReceiptText(UCTENKA_CZ);
    expect(p.amount).toBe(1890.5);
    expect(p.currency).toBe("CZK");
  });

  it("bez słów-kluczy: bierze największą kwotę groszową", () => {
    expect(detectAmount("Parking 24h\n45,00\nVAT 8,41")).toBe(45);
  });

  it("format 1.234,56 (kropka tysięcy, przecinek dziesiętny)", () => {
    expect(detectAmount("TOTAL 1.234,56")).toBe(1234.56);
  });

  it("pusty/nieczytelny tekst → null-e (fail-soft)", () => {
    expect(parseReceiptText("")).toEqual({ amount: null, currency: null });
    expect(parseReceiptText("###???")).toEqual({ amount: null, currency: null });
  });

  it("waluta po symbolu: € i zł", () => {
    expect(detectCurrency("Total 12,00 €")).toBe("EUR");
    expect(detectCurrency("Razem 89,99 zł")).toBe("PLN");
  });
});
