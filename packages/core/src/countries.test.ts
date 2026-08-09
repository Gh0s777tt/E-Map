import { describe, expect, it } from "vitest";
import { countryName, countryOptions, isKnownCountry, normalizeCountry } from "./countries";

describe("normalizeCountry", () => {
  it("przepuszcza poprawny kod ISO", () => {
    expect(normalizeCountry("PL")).toBe("PL");
    expect(normalizeCountry("de")).toBe("DE");
  });

  it("rozpoznaje nazwy po polsku i angielsku", () => {
    expect(normalizeCountry("Niemcy")).toBe("DE");
    expect(normalizeCountry("Germany")).toBe("DE");
    expect(normalizeCountry("Deutschland")).toBe("DE");
  });

  it("radzi sobie z polskimi znakami i skrótami trzyliterowymi", () => {
    expect(normalizeCountry("Słowacja")).toBe("SK");
    expect(normalizeCountry("Węgry")).toBe("HU");
    expect(normalizeCountry("SVK")).toBe("SK");
  });

  it("mapuje nieoficjalne UK na ISO GB", () => {
    // „UK" nie jest kodem ISO, ale w praktyce wpisuje się je najczęściej.
    expect(normalizeCountry("UK")).toBe("GB");
    expect(normalizeCountry("Anglia")).toBe("GB");
    expect(normalizeCountry("United Kingdom")).toBe("GB");
  });

  it("ODRZUCA to, co wstawiał zepsuty geokoder", () => {
    // Dokładny objaw z #372: do pola „Kraj" trafiał kod pocztowy z miastem.
    // Skutek sięgał dalej niż brzydki wpis — stawka VAT jest kluczowana po kraju,
    // więc taka wartość cicho wypadała ze zwrotu podatku.
    expect(normalizeCountry("10115 Berlin")).toBeNull();
    expect(normalizeCountry("31-042 Kraków")).toBeNull();
  });

  it("puste i śmieciowe wejście daje null, nie wyjątek", () => {
    for (const v of [null, undefined, "", "   ", "???", "12345"]) {
      expect(normalizeCountry(v)).toBeNull();
    }
  });

  it("normalizuje nadmiarowe spacje", () => {
    expect(normalizeCountry("  united   kingdom ")).toBe("GB");
  });

  it("jest idempotentna", () => {
    const once = normalizeCountry("Polska");
    expect(normalizeCountry(once)).toBe(once);
  });
});

describe("isKnownCountry", () => {
  it("odróżnia rozpoznane od nierozpoznanych", () => {
    expect(isKnownCountry("PL")).toBe(true);
    expect(isKnownCountry("10115 Berlin")).toBe(false);
  });
});

describe("countryName", () => {
  it("rozwija kod do nazwy", () => {
    expect(countryName("PL")).toBe("Polska");
  });

  it("nieznany kod zwraca sam siebie zamiast pustki", () => {
    expect(countryName("ZZ")).toBe("ZZ");
  });
});

describe("countryOptions", () => {
  it("zwraca listę posortowaną po polsku", () => {
    const opts = countryOptions();
    expect(opts.length).toBeGreaterThan(30);
    const names = opts.map((o) => o.name);
    expect([...names].sort((a, b) => a.localeCompare(b, "pl"))).toEqual(names);
  });

  it("każdy wpis ma dwuliterowy kod", () => {
    for (const o of countryOptions()) expect(o.code).toMatch(/^[A-Z]{2}$/);
  });
});
