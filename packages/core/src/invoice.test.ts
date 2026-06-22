import { describe, expect, it } from "vitest";
import { invoicePaymentStatus } from "./invoice";

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
