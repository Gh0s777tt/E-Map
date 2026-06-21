import { describe, expect, it } from "vitest";
import { guessDefectPart, stationBrandsForProviders, stationMatchesProviders } from "./catalog";

describe("guessDefectPart", () => {
  it("rozpoznaje hamulce z opisu", () => {
    expect(guessDefectPart("piszczą klocki przy hamowaniu")).toBe("Hamulce (klocki/tarcze)");
  });
  it("rozpoznaje opony", () => {
    expect(guessDefectPart("przebita opona na osi tylnej")).toBe("Opony / koła");
  });
  it("zwraca null bez dopasowania", () => {
    expect(guessDefectPart("coś dziwnego stuka")).toBeNull();
  });
});

describe("stationMatchesProviders", () => {
  it("bez kart = brak filtra (true)", () => {
    expect(stationMatchesProviders("Shell", [])).toBe(true);
  });
  it("dopasowuje markę akceptowaną przez kartę", () => {
    expect(stationMatchesProviders("Orlen Stacja", ["eurowag"])).toBe(true);
  });
  it("odrzuca markę spoza sieci karty", () => {
    expect(stationMatchesProviders("Shell", ["as24"])).toBe(false);
  });
  it("stacja bez rozpoznanej marki jest ukrywana przy filtrze", () => {
    expect(stationMatchesProviders("", ["dkv"])).toBe(false);
  });
  it("łączy sieci wielu kart", () => {
    const brands = stationBrandsForProviders(["shell", "bp"]);
    expect(brands).toContain("shell");
    expect(brands).toContain("aral");
  });
});
