import { describe, expect, it } from "vitest";
import { dateToMonthInput, formatCardExpiry, monthInputToDate } from "./cardExpiry";

describe("monthInputToDate", () => {
  it("normalizuje do ostatniego dnia miesiąca", () => {
    expect(monthInputToDate("2026-03")).toBe("2026-03-31");
    expect(monthInputToDate("2026-02")).toBe("2026-02-28"); // luty nieprzestępny
    expect(monthInputToDate("2024-02")).toBe("2024-02-29"); // luty przestępny
    expect(monthInputToDate("2026-04")).toBe("2026-04-30");
  });

  it("odrzuca błędne wejście", () => {
    expect(monthInputToDate("")).toBeNull();
    expect(monthInputToDate("2026-13")).toBeNull();
    expect(monthInputToDate("2026-00")).toBeNull();
    expect(monthInputToDate("2026-03-15")).toBeNull();
  });
});

describe("dateToMonthInput", () => {
  it("ucina dzień do YYYY-MM", () => {
    expect(dateToMonthInput("2026-03-31")).toBe("2026-03");
    expect(dateToMonthInput("2026-03-01")).toBe("2026-03");
  });

  it("pusto dla braku daty", () => {
    expect(dateToMonthInput(null)).toBe("");
    expect(dateToMonthInput(undefined)).toBe("");
    expect(dateToMonthInput("")).toBe("");
  });
});

describe("formatCardExpiry", () => {
  it("wyświetla MM/YYYY", () => {
    expect(formatCardExpiry("2026-03-31")).toBe("03/2026");
    expect(formatCardExpiry("2026-12-15")).toBe("12/2026");
  });

  it("myślnik dla braku", () => {
    expect(formatCardExpiry(null)).toBe("—");
    expect(formatCardExpiry(undefined)).toBe("—");
  });
});

describe("monthInputToDate — wpis ręczny (Safari, #316)", () => {
  it("akceptuje MM/YYYY", () => {
    expect(monthInputToDate("03/2027")).toBe("2027-03-31");
  });
  it("akceptuje M.YYYY", () => {
    expect(monthInputToDate("7.2026")).toBe("2026-07-31");
  });
  it("odrzuca rok spoza zakresu", () => {
    expect(monthInputToDate("03/1889")).toBeNull();
  });
});
