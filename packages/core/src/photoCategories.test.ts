import { describe, expect, it } from "vitest";
import { DEFAULT_PHOTO_CATEGORY, PHOTO_CATEGORIES, photoCategoryCaption } from "./photoCategories";

describe("photoCategoryCaption", () => {
  it("domyślna kategoria → brak captiona (undefined)", () => {
    expect(photoCategoryCaption(DEFAULT_PHOTO_CATEGORY)).toBeUndefined();
    expect(photoCategoryCaption("Towar")).toBeUndefined();
  });

  it("niedomyślna kategoria → caption = etykieta", () => {
    expect(photoCategoryCaption("CMR")).toBe("CMR");
    expect(photoCategoryCaption("Dokument")).toBe("Dokument");
  });

  it("przycina białe znaki; pusty → undefined", () => {
    expect(photoCategoryCaption("  CMR  ")).toBe("CMR");
    expect(photoCategoryCaption("   ")).toBeUndefined();
    expect(photoCategoryCaption("")).toBeUndefined();
  });

  it("PHOTO_CATEGORIES zawiera kluczowe kategorie", () => {
    expect(PHOTO_CATEGORIES).toContain("Towar");
    expect(PHOTO_CATEGORIES).toContain("CMR");
    expect(PHOTO_CATEGORIES).toContain("Dokument");
  });
});
