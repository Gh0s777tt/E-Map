import { describe, expect, it } from "vitest";
import { buildPodCaption, isPodCaption, parsePodCaption } from "./pod";

describe("isPodCaption", () => {
  it("rozpoznaje podpis POD", () => {
    expect(isPodCaption("POD: Jan Kowalski · 22.06.2026, 14:00")).toBe(true);
    expect(isPodCaption("POD · 22.06.2026")).toBe(true);
  });
  it("zwykłe/puste captiony to nie POD", () => {
    expect(isPodCaption(null)).toBe(false);
    expect(isPodCaption("")).toBe(false);
    expect(isPodCaption("Zdjęcie towaru")).toBe(false);
  });
});

describe("parsePodCaption", () => {
  it("rozkłada odbiorcę i datę", () => {
    expect(parsePodCaption("POD: Jan Kowalski · 22.06.2026, 14:00")).toEqual({
      recipient: "Jan Kowalski",
      when: "22.06.2026, 14:00",
    });
  });
  it("obsługuje brak odbiorcy", () => {
    expect(parsePodCaption("POD · 22.06.2026")).toEqual({ recipient: null, when: "22.06.2026" });
  });
  it("nie-POD → puste pola", () => {
    expect(parsePodCaption("Zdjęcie")).toEqual({ recipient: null, when: null });
    expect(parsePodCaption(null)).toEqual({ recipient: null, when: null });
  });
});

describe("buildPodCaption", () => {
  it("buduje caption z odbiorcą i bez", () => {
    expect(buildPodCaption("Anna Nowak", "01.07.2026")).toBe("POD: Anna Nowak · 01.07.2026");
    expect(buildPodCaption("", "01.07.2026")).toBe("POD · 01.07.2026");
    expect(buildPodCaption(null, "01.07.2026")).toBe("POD · 01.07.2026");
  });
  it("round-trip build → parse", () => {
    const cap = buildPodCaption("Piotr Zięba", "02.07.2026, 09:30");
    expect(parsePodCaption(cap)).toEqual({ recipient: "Piotr Zięba", when: "02.07.2026, 09:30" });
  });
});
