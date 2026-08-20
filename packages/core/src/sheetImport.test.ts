import { describe, expect, it } from "vitest";
import { parseSheetBool, parseSheetDate, parseSheetNumber } from "./sheetImport";

describe("parseSheetDate", () => {
  it("ISO z godziną i bez", () => {
    expect(parseSheetDate("2026-08-02")).toBe("2026-08-02T00:00");
    expect(parseSheetDate("2026-08-02 14:30")).toBe("2026-08-02T14:30");
    expect(parseSheetDate("2026-08-02T14:30:59")).toBe("2026-08-02T14:30");
  });

  it("format europejski z kropką i slashem", () => {
    expect(parseSheetDate("02.08.2026")).toBe("2026-08-02T00:00");
    expect(parseSheetDate("2.8.2026")).toBe("2026-08-02T00:00");
    expect(parseSheetDate("02/08/2026")).toBe("2026-08-02T00:00");
    expect(parseSheetDate("02.08.2026 07:05")).toBe("2026-08-02T07:05");
  });

  it("odrzuca datę, która nie istnieje w kalendarzu", () => {
    // Wzorzec pasuje, ale `new Date` przesunąłby to na marzec — wpis wpadłby
    // do złego miesiąca i cicho zafałszował zestawienie.
    expect(parseSheetDate("31.02.2026")).toBeNull();
    expect(parseSheetDate("2026-13-01")).toBeNull();
    expect(parseSheetDate("2026-08-32")).toBeNull();
  });

  it("odrzuca godzinę spoza zakresu", () => {
    expect(parseSheetDate("2026-08-02 25:00")).toBeNull();
    expect(parseSheetDate("2026-08-02 12:75")).toBeNull();
  });

  it("pusto i śmieci → null, nigdy „dzisiaj”", () => {
    for (const v of ["", "   ", null, undefined, "brak", "02-08-26"]) {
      expect(parseSheetDate(v)).toBeNull();
    }
  });
});

describe("parseSheetNumber", () => {
  it("polski Excel: przecinek dziesiętny i spacja jako tysiące", () => {
    expect(parseSheetNumber("1 234,56")).toBe(1234.56);
    expect(parseSheetNumber("48,3")).toBe(48.3);
  });

  it("angielski Excel: kropka dziesiętna i przecinek jako tysiące", () => {
    expect(parseSheetNumber("1,234.56")).toBe(1234.56);
    expect(parseSheetNumber("1,234")).toBe(1234);
  });

  it("jednostka doklejona do wartości", () => {
    expect(parseSheetNumber("48,30 L")).toBe(48.3);
    expect(parseSheetNumber("1 234,56 EUR")).toBe(1234.56);
    expect(parseSheetNumber("812345 km")).toBe(812345);
  });

  it("wartości ujemne (korekty na zestawieniu)", () => {
    expect(parseSheetNumber("-12,50")).toBe(-12.5);
  });

  it("pusto i tekst → undefined", () => {
    for (const v of ["", "  ", null, undefined, "brak", "—"]) {
      expect(parseSheetNumber(v)).toBeUndefined();
    }
  });

  it("zero to wartość, nie brak", () => {
    // Odróżnienie „0" od pustej komórki decyduje, czy do bazy trafi zero,
    // czy pole zostanie nieustawione — a to dwie różne informacje.
    expect(parseSheetNumber("0")).toBe(0);
    expect(parseSheetNumber("0,00")).toBe(0);
  });
});

describe("parseSheetBool", () => {
  it("rozpoznaje warianty „tak” w kilku językach", () => {
    for (const v of ["tak", "TAK", "yes", "1", "true", "x", "ja"]) {
      expect(parseSheetBool(v)).toBe(true);
    }
  });

  it("wszystko inne to „nie”", () => {
    for (const v of ["nie", "no", "0", "false"]) expect(parseSheetBool(v)).toBe(false);
  });

  it("pusta komórka to brak odpowiedzi, nie „nie”", () => {
    expect(parseSheetBool("")).toBeUndefined();
    expect(parseSheetBool(null)).toBeUndefined();
  });
});
