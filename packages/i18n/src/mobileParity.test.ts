import { describe, expect, it } from "vitest";
import { MOBILE_LOCALES, type MobileLocale, mobileMessages, tMobile } from "./mobile";

describe("parytet i18n mobile (#300 — PL/EN/DE/UK)", () => {
  const plKeys = Object.keys(mobileMessages.pl).sort();

  it("wszystkie języki mają identyczny zestaw kluczy", () => {
    for (const loc of MOBILE_LOCALES) {
      expect(Object.keys(mobileMessages[loc]).sort(), `język: ${loc}`).toEqual(plKeys);
    }
  });

  it("żadna wartość nie jest pusta", () => {
    for (const loc of MOBILE_LOCALES) {
      for (const [key, value] of Object.entries(mobileMessages[loc])) {
        expect(value, `pusty komunikat ${loc}:${key}`).not.toBe("");
      }
    }
  });

  it("tMobile podmienia parametry {n} w każdym języku", () => {
    for (const loc of MOBILE_LOCALES) {
      const out = tMobile(loc as MobileLocale, "m.offline.pending", { n: 3 });
      expect(out).toContain("3");
      expect(out).not.toContain("{n}");
    }
  });
});
