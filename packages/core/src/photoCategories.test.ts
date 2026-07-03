import { describe, expect, it } from "vitest";
import {
  DEFAULT_PHOTO_CATEGORY,
  PHOTO_CATEGORIES,
  PHOTO_KIND_LABEL,
  photoCategoryCaption,
  resolvePhotoKind,
} from "./photoCategories";

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

describe("resolvePhotoKind", () => {
  it("preferuje kolumnę kind (po migracji 0054)", () => {
    expect(resolvePhotoKind({ kind: "cmr" })).toBe("cmr");
    expect(resolvePhotoKind({ kind: "document", caption: "CMR" })).toBe("document"); // kind > caption
  });

  it("nieznany kind → fallback z caption", () => {
    expect(resolvePhotoKind({ kind: "bogus", caption: "CMR" })).toBe("cmr");
    expect(resolvePhotoKind({ kind: null, caption: "Dokument" })).toBe("document");
  });

  it("bez kind: POD po prefiksie, kategorie po treści, reszta → cargo", () => {
    expect(resolvePhotoKind({ caption: "POD: Jan Kowalski · 2026-07-03" })).toBe("pod");
    expect(resolvePhotoKind({ caption: "CMR" })).toBe("cmr");
    expect(resolvePhotoKind({ caption: "Inne" })).toBe("other");
    expect(resolvePhotoKind({ caption: null })).toBe("cargo");
    expect(resolvePhotoKind({})).toBe("cargo");
  });

  it("PHOTO_KIND_LABEL pokrywa wszystkie typy", () => {
    expect(PHOTO_KIND_LABEL.cmr).toBe("CMR");
    expect(PHOTO_KIND_LABEL.pod).toBe("POD");
    expect(PHOTO_KIND_LABEL.cargo).toBe("Towar");
  });
});
