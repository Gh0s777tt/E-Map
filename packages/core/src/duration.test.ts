import { describe, expect, it } from "vitest";
import { formatDuration } from "./duration";

describe("formatDuration", () => {
  it("minuty poniżej godziny", () => {
    expect(formatDuration(0)).toBe("0 min");
    expect(formatDuration(45)).toBe("45 min");
  });

  it("godziny i minuty", () => {
    expect(formatDuration(90)).toBe("1 h 30 min");
    expect(formatDuration(1114)).toBe("18 h 34 min"); // ~1300 km @ 70 km/h
  });

  it("dni, godziny, minuty dla długich tras", () => {
    expect(formatDuration(1440)).toBe("1 d");
    expect(formatDuration(2880)).toBe("2 d");
    expect(formatDuration(2010)).toBe("1 d 9 h 30 min");
  });

  it("zaokrągla i nie schodzi poniżej zera", () => {
    expect(formatDuration(59.6)).toBe("1 h"); // 60 min → 1 h
    expect(formatDuration(-5)).toBe("0 min");
  });
});
