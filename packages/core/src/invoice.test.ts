import { describe, expect, it } from "vitest";
import { invoicePaymentStatus, vatSummary } from "./invoice";

describe("invoicePaymentStatus", () => {
  const today = "2026-06-22";

  it("paid gdy ustawiono datę opłacenia", () => {
    expect(
      invoicePaymentStatus({
        paidAt: "2026-06-10T10:00:00Z",
        dueDate: "2026-06-01",
        status: "issued",
        todayISO: today,
      }),
    ).toBe("paid");
  });

  it("overdue gdy nieopłacona, wystawiona i po terminie", () => {
    expect(
      invoicePaymentStatus({
        paidAt: null,
        dueDate: "2026-06-01",
        status: "issued",
        todayISO: today,
      }),
    ).toBe("overdue");
  });

  it("unpaid gdy termin jeszcze nie minął", () => {
    expect(
      invoicePaymentStatus({
        paidAt: null,
        dueDate: "2026-07-01",
        status: "issued",
        todayISO: today,
      }),
    ).toBe("unpaid");
  });

  it("anulowana po terminie nie jest przeterminowana", () => {
    expect(
      invoicePaymentStatus({
        paidAt: null,
        dueDate: "2026-06-01",
        status: "cancelled",
        todayISO: today,
      }),
    ).toBe("unpaid");
  });

  it("brak terminu → unpaid (nie overdue)", () => {
    expect(
      invoicePaymentStatus({ paidAt: null, dueDate: null, status: "issued", todayISO: today }),
    ).toBe("unpaid");
  });
});

describe("vatSummary", () => {
  it("grupuje pozycje wg stawki VAT i sumuje", () => {
    const rows = vatSummary([
      { vatRate: 23, net: 1000, vatAmount: 230, gross: 1230 },
      { vatRate: 23, net: 500, vatAmount: 115, gross: 615 },
      { vatRate: 8, net: 200, vatAmount: 16, gross: 216 },
    ]);
    expect(rows).toHaveLength(2);
    // sortowane malejąco wg stawki: 23% pierwsze
    expect(rows[0]).toEqual({ rate: 23, net: 1500, vat: 345, gross: 1845 });
    expect(rows[1]).toEqual({ rate: 8, net: 200, vat: 16, gross: 216 });
  });

  it("pusta lista → pusty wynik", () => {
    expect(vatSummary([])).toEqual([]);
  });
});
