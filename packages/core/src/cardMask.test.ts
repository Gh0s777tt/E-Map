import { describe, expect, it } from "vitest";
import { cardLast4, isMaskedCardValue, maskCardNumber, maskedCardLabel } from "./cardMask";

describe("cardLast4", () => {
  it("zwraca cztery ostatnie cyfry pełnego numeru", () => {
    expect(cardLast4("7008194512345678")).toBe("5678");
  });

  it("ignoruje spacje i myślniki, którymi ludzie rozdzielają numer", () => {
    expect(cardLast4("7008 1945 1234 5678")).toBe("5678");
    expect(cardLast4("7008-1945-1234-5678")).toBe("5678");
  });

  it("krótszy numer zwraca w całości, nie dopełnia", () => {
    expect(cardLast4("123")).toBe("123");
  });

  it("brak wartości → pusty ciąg, bez wyjątku", () => {
    expect(cardLast4(null)).toBe("");
    expect(cardLast4(undefined)).toBe("");
    expect(cardLast4("")).toBe("");
    expect(cardLast4("brak")).toBe("");
  });

  it("jest idempotentna — ponowne przycięcie nie psuje danych", () => {
    expect(cardLast4(cardLast4("7008194512345678"))).toBe("5678");
  });
});

describe("maskCardNumber", () => {
  it("pokazuje wyłącznie cztery ostatnie cyfry", () => {
    expect(maskCardNumber("7008194512345678")).toBe("•••• 5678");
  });

  it("nie odtwarza długości oryginału gwiazdkami", () => {
    // Krótki i długi numer dają maskę tej samej długości — po przycięciu
    // w bazie nie wiemy już, ile cyfr miał oryginał, i nie udajemy że wiemy.
    expect(maskCardNumber("1234567890123456")).toBe("•••• 3456");
    expect(maskCardNumber("123456")).toBe("•••• 3456");
  });

  it("brak numeru → sama maska, nigdy pusty string", () => {
    expect(maskCardNumber(null)).toBe("••••");
    expect(maskCardNumber("")).toBe("••••");
  });

  it("nigdy nie przepuszcza więcej niż czterech cyfr", () => {
    for (const raw of ["7008194512345678", "4111111111111111", "12345678"]) {
      const digits = maskCardNumber(raw).replace(/\D/g, "");
      expect(digits.length).toBeLessThanOrEqual(4);
    }
  });
});

describe("maskedCardLabel", () => {
  it("łączy dostawcę z maską", () => {
    expect(maskedCardLabel("dkv", "7008194512345678")).toBe("DKV •••• 5678");
  });

  it("bez dostawcy zwraca samą maskę", () => {
    expect(maskedCardLabel(null, "7008194512345678")).toBe("•••• 5678");
    expect(maskedCardLabel("  ", "7008194512345678")).toBe("•••• 5678");
  });
});

describe("isMaskedCardValue", () => {
  it("akceptuje wartości już przycięte", () => {
    expect(isMaskedCardValue("5678")).toBe(true);
    expect(isMaskedCardValue("")).toBe(true);
  });

  it("odrzuca pełne numery — to sprawdza migracja danych historycznych", () => {
    expect(isMaskedCardValue("7008194512345678")).toBe(false);
    expect(isMaskedCardValue("•••• 5678")).toBe(false);
  });
});
