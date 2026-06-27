import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { deleteDriver, getDriverDocuments, listDrivers, setDriverDocuments } from "./drivers";

describe("listDrivers (RPC — PII deszyfrowane w bazie)", () => {
  it("woła RPC list_drivers z p_company", async () => {
    const { client, argsOf } = mockSupabase({ data: [], error: null });
    await listDrivers(client, "comp-1");
    expect(argsOf("rpc")).toEqual(["list_drivers", { p_company: "comp-1" }]);
  });
});

describe("getDriverDocuments (RPC)", () => {
  it("brak danych → pusty obiekt", async () => {
    const { client } = mockSupabase({ data: null, error: null });
    expect(await getDriverDocuments(client, "d1")).toEqual({});
  });
});

describe("setDriverDocuments (RPC)", () => {
  it("mapuje dokumenty na parametry, brakujące → null", async () => {
    const { client, argsOf } = mockSupabase({ data: null, error: null });
    await setDriverDocuments(client, "d1", { idCard: "AB123" });
    expect(argsOf("rpc")).toEqual([
      "driver_set_documents",
      { p_driver: "d1", p_id_card: "AB123", p_passport: null, p_license: null },
    ]);
  });
});

describe("deleteDriver", () => {
  it("from drivers → delete → eq id", async () => {
    const { client, called, argsOf } = mockSupabase({ data: null, error: null });
    await deleteDriver(client, "d1");
    expect(called("from", "drivers")).toBe(true);
    expect(called("delete")).toBe(true);
    expect(argsOf("eq")).toEqual(["id", "d1"]);
  });
});
