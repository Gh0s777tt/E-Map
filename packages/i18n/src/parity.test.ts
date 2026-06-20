import { describe, expect, it } from "vitest";
import { en } from "./locales/en";
import { pl } from "./locales/pl";

describe("parytet i18n", () => {
  const plKeys = Object.keys(pl).sort();
  const enKeys = Object.keys(en).sort();

  it("PL i EN mają identyczny zestaw kluczy", () => {
    expect(enKeys).toEqual(plKeys);
  });

  it("żadna wartość nie jest pusta", () => {
    for (const [key, value] of Object.entries({ ...pl, ...en })) {
      expect(value, `pusty komunikat dla klucza: ${key}`).not.toBe("");
    }
  });
});
