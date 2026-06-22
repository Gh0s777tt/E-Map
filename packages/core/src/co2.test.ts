import { describe, expect, it } from "vitest";
import { co2PerHundredKm, dieselCo2Kg, formatCo2 } from "./co2";

describe("dieselCo2Kg", () => {
  it("liczy CO₂ z litrów (2,64 kg/L)", () => {
    expect(dieselCo2Kg(100)).toBe(264);
    expect(dieselCo2Kg(0)).toBe(0);
  });
  it("nie schodzi poniżej zera", () => {
    expect(dieselCo2Kg(-50)).toBe(0);
  });
});

describe("co2PerHundredKm", () => {
  it("intensywność z spalania L/100km", () => {
    expect(co2PerHundredKm(30)).toBe(79.2);
  });
});

describe("formatCo2", () => {
  it("kg poniżej tony, tony powyżej", () => {
    expect(formatCo2(500)).toBe("500 kg");
    expect(formatCo2(2640)).toBe("2.64 t");
    expect(formatCo2(1000)).toBe("1 t");
  });
});
