import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { wipeCompanyData } from "./companies";

describe("wipeCompanyData", () => {
  it("woła RPC company_wipe_data z firmą i potwierdzeniem, zwraca liczniki", async () => {
    const { client, argsOf } = mockSupabase({
      data: { orders: 12, invoices: 3 },
      error: null,
    });
    const counts = await wipeCompanyData(client, "comp-1", "Moja Firma");
    expect(argsOf("rpc")).toEqual([
      "company_wipe_data",
      { p_company: "comp-1", p_confirm_name: "Moja Firma" },
    ]);
    expect(counts).toEqual({ orders: 12, invoices: 3 });
  });

  it("rzuca błędem RPC (np. brak roli owner / złe potwierdzenie)", async () => {
    const { client } = mockSupabase({
      data: null,
      error: { message: "Tylko właściciel firmy może wyczyścić jej dane." },
    });
    await expect(wipeCompanyData(client, "comp-1", "zła nazwa")).rejects.toMatchObject({
      message: "Tylko właściciel firmy może wyczyścić jej dane.",
    });
  });
});
