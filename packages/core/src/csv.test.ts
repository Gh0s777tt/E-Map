import { describe, expect, it } from "vitest";
import { csvEscape, toCsv } from "./csv";

describe("CSV", () => {
  it("escapuje separator i cudzysłowy", () => {
    expect(csvEscape("a;b")).toBe('"a;b"');
    expect(csvEscape('on "tak"')).toBe('"on ""tak"""');
    expect(csvEscape(12.5)).toBe("12.5");
    expect(csvEscape(null)).toBe("");
  });
  it("buduje dokument z CRLF i separatorem ;", () => {
    const csv = toCsv(
      ["a", "b"],
      [
        [1, "x"],
        [2, "y;z"],
      ],
    );
    expect(csv).toBe('a;b\r\n1;x\r\n2;"y;z"');
  });
});
