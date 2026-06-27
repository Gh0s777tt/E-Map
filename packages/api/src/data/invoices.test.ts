import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { listInvoiceItems, listInvoices } from "./invoices";

describe("listInvoices (kształt zapytania)", () => {
  it("filtruje po company_id i sortuje malejąco po created_at", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listInvoices(client, "comp-1");
    expect(called("from", "invoices")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "comp-1"]);
    expect(argsOf("order")?.[0]).toBe("created_at");
    expect(called("limit")).toBe(false);
  });

  it("stosuje from/to/limit gdy podane", async () => {
    const { client, argsOf } = mockSupabase({ data: [], error: null });
    await listInvoices(client, "c", { from: "2026-01-01", to: "2026-03-01", limit: 100 });
    expect(argsOf("gte")).toEqual(["created_at", "2026-01-01"]);
    expect(argsOf("lte")).toEqual(["created_at", "2026-03-01"]);
    expect(argsOf("limit")?.[0]).toBe(100);
  });

  it("rzuca przy błędzie", async () => {
    const { client } = mockSupabase({ data: null, error: new Error("boom") });
    await expect(listInvoices(client, "c")).rejects.toThrow("boom");
  });
});

describe("listInvoiceItems (limit ochronny)", () => {
  it("filtruje po invoice_id, sortuje po position, ogranicza do 500", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listInvoiceItems(client, "inv-1");
    expect(called("from", "invoice_items")).toBe(true);
    expect(argsOf("eq")).toEqual(["invoice_id", "inv-1"]);
    expect(argsOf("order")?.[0]).toBe("position");
    expect(argsOf("limit")?.[0]).toBe(500);
  });
});
