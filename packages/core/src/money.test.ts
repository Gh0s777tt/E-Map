import { describe, expect, it } from "vitest";
import { formatMoney, round2 } from "./money";

describe("round2", () => {
  it("zaokrągla do 2 miejsc", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.344)).toBe(2.34);
  });
});

describe("formatMoney", () => {
  it("2 miejsca po przecinku, przecinek dziesiętny", () => {
    expect(formatMoney(1234.5)).toBe("1 234,50");
    expect(formatMoney(0)).toBe("0,00");
    expect(formatMoney(9.1)).toBe("9,10");
  });

  it("separator tysięcy (spacja)", () => {
    expect(formatMoney(1234567.89)).toBe("1 234 567,89");
    expect(formatMoney(100)).toBe("100,00");
  });

  it("waluta doklejana po wartości", () => {
    expect(formatMoney(1234.5, "EUR")).toBe("1 234,50 EUR");
    expect(formatMoney(50, "PLN")).toBe("50,00 PLN");
  });

  it("wartości ujemne", () => {
    expect(formatMoney(-1234.5)).toBe("-1 234,50");
  });
});
