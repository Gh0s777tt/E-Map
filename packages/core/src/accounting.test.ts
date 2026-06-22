import { describe, expect, it } from "vitest";
import { costRegister, monthlyVatRegister, type VatRegisterInvoice } from "./accounting";

const inv = (over: Partial<VatRegisterInvoice>): VatRegisterInvoice => ({
  status: "issued",
  issue_date: "2026-06-10",
  net: 1000,
  vat_rate: 23,
  vat_amount: 230,
  gross: 1230,
  currency: "PLN",
  ...over,
});

describe("monthlyVatRegister", () => {
  it("grupuje wg stawki VAT i sumuje (tylko dany miesiąc)", () => {
    const reg = monthlyVatRegister(
      [
        inv({}),
        inv({ net: 500, vat_amount: 115, gross: 615 }),
        inv({ vat_rate: 0, vat_amount: 0, gross: 1000 }),
        inv({ issue_date: "2026-05-30" }), // inny miesiąc
      ],
      "2026-06",
    );
    expect(reg.count).toBe(3);
    expect(reg.rows[0]).toMatchObject({ vatRate: 23, net: 1500, vat: 345, gross: 1845, count: 2 });
    expect(reg.rows[1]).toMatchObject({ vatRate: 0, net: 1000, vat: 0, count: 1 });
    expect(reg.totalNet).toBe(2500);
    expect(reg.totalVat).toBe(345);
    expect(reg.totalGross).toBe(2845);
  });

  it("pomija faktury anulowane", () => {
    const reg = monthlyVatRegister([inv({ status: "cancelled" }), inv({})], "2026-06");
    expect(reg.count).toBe(1);
    expect(reg.totalGross).toBe(1230);
  });

  it("pusty miesiąc → zerowe sumy", () => {
    const reg = monthlyVatRegister([inv({})], "2026-01");
    expect(reg).toMatchObject({ count: 0, totalNet: 0, totalVat: 0, totalGross: 0 });
    expect(reg.rows).toEqual([]);
  });
});

describe("costRegister", () => {
  it("grupuje wg kategorii malejąco i sumuje", () => {
    const reg = costRegister([
      { category: "Paliwo", amount: 300 },
      { category: "Paliwo", amount: 200 },
      { category: "Leasing / rata", amount: 1000 },
      { category: "AdBlue", amount: 50 },
    ]);
    expect(reg.count).toBe(4);
    expect(reg.groups[0]).toEqual({ category: "Leasing / rata", amount: 1000, count: 1 });
    expect(reg.groups[1]).toEqual({ category: "Paliwo", amount: 500, count: 2 });
    expect(reg.total).toBe(1550);
  });

  it("pusto → zero", () => {
    expect(costRegister([])).toEqual({ groups: [], total: 0, count: 0 });
  });
});
