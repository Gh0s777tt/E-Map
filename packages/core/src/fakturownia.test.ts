import { describe, expect, it } from "vitest";
import { toFakturowniaInvoice } from "./fakturownia";

const base = {
  issueDate: "2026-06-22",
  dueDate: "2026-07-06",
  currency: "EUR",
  seller: { name: "Moja Firma", taxId: "1234567890", bank: "mBank", account: "PL00 1111" },
  buyer: { name: "Klient Sp. z o.o.", taxId: "9876543210", address: "ul. Długa 1, Warszawa" },
  items: [{ description: "Transport", quantity: 2, gross: 2460, vatRate: 23 }],
};

describe("toFakturowniaInvoice", () => {
  it("mapuje fakturę z pozycjami", () => {
    const r = toFakturowniaInvoice(base);
    expect(r.kind).toBe("vat");
    expect(r.number).toBeNull(); // numer nadaje Fakturownia
    expect(r.issue_date).toBe("2026-06-22");
    expect(r.sell_date).toBe("2026-06-22");
    expect(r.payment_to).toBe("2026-07-06");
    expect(r.currency).toBe("EUR");
    expect(r.seller_name).toBe("Moja Firma");
    expect(r.seller_tax_no).toBe("1234567890");
    expect(r.seller_bank_account).toBe("PL00 1111");
    expect(r.buyer_name).toBe("Klient Sp. z o.o.");
    expect(r.buyer_tax_no).toBe("9876543210");
    expect(r.buyer_street).toBe("ul. Długa 1, Warszawa");
    expect(r.positions).toEqual([
      { name: "Transport", quantity: 2, total_price_gross: 2460, tax: 23 },
    ]);
  });

  it("pomija puste pola opcjonalne", () => {
    const r = toFakturowniaInvoice({
      issueDate: "2026-06-22",
      dueDate: null,
      currency: "PLN",
      seller: { name: "F", taxId: null, bank: null, account: null },
      buyer: { name: null, taxId: null, address: null },
      items: [{ description: "X", quantity: 1, gross: 100, vatRate: 23 }],
    });
    expect(r.payment_to).toBeUndefined();
    expect(r.seller_tax_no).toBeUndefined();
    expect(r.buyer_name).toBeUndefined();
    expect(r.buyer_street).toBeUndefined();
  });

  it("używa fallbacku, gdy brak pozycji", () => {
    const r = toFakturowniaInvoice({
      ...base,
      items: [],
      fallback: { description: "Usługa transportowa", gross: 1230, vatRate: 23 },
    });
    expect(r.positions).toEqual([
      { name: "Usługa transportowa", quantity: 1, total_price_gross: 1230, tax: 23 },
    ]);
  });

  it("rzuca, gdy brak pozycji i brak fallbacku", () => {
    expect(() => toFakturowniaInvoice({ ...base, items: [] })).toThrow();
  });
});
