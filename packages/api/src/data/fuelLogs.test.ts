import type { FuelLogInput } from "@e-logistic/core";
import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { fuelLogToRow, insertFuelLog, listFuelLogs } from "./fuelLogs";

const baseInput: FuelLogInput = {
  vehicleId: "veh-1",
  station: { country: "PL", city: "Warszawa", location: "Stacja X", lat: 52.2, lng: 21.0 },
  odometerKm: 100000,
  liters: 300,
  isFull: true,
  paymentMethod: "cash",
};
const ctx = { id: "uuid-1", companyId: "comp-1", driverId: "drv-1", deviceId: "dev-1" };

describe("fuelLogToRow (czysta funkcja)", () => {
  it("mapuje input na wiersz snake_case z kontekstem", () => {
    const row = fuelLogToRow(baseInput, ctx);
    expect(row.id).toBe("uuid-1");
    expect(row.company_id).toBe("comp-1");
    expect(row.driver_id).toBe("drv-1");
    expect(row.vehicle_id).toBe("veh-1");
    expect(row.liters).toBe(300);
    expect(row.payment_method).toBe("cash");
    expect(row.device_id).toBe("dev-1");
  });

  it("buduje WKT POINT(lng lat) gdy są współrzędne", () => {
    expect(fuelLogToRow(baseInput, ctx).geo).toBe("POINT(21 52.2)");
  });

  it("geo = null bez współrzędnych", () => {
    const row = fuelLogToRow({ ...baseInput, station: { country: "PL" } }, ctx);
    expect(row.geo).toBeNull();
  });

  it("is_full domyślnie true; pola opcjonalne → null", () => {
    const row = fuelLogToRow(
      {
        vehicleId: "v",
        station: { country: "DE" },
        odometerKm: 1,
        liters: 1,
        isFull: true,
        paymentMethod: "cash",
      },
      { id: "i", companyId: "c", driverId: "d" },
    );
    expect(row.is_full).toBe(true);
    expect(row.fuel_card_id).toBeNull();
    expect(row.price_total).toBeNull();
    expect(row.device_id).toBeNull();
  });
});

describe("listFuelLogs (kształt zapytania)", () => {
  it("domyślnie tabela fuel_logs, sort created_at desc, bez filtrów", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listFuelLogs(client);
    expect(called("from", "fuel_logs")).toBe(true);
    expect(argsOf("order")?.[0]).toBe("created_at");
    expect(called("eq")).toBe(false);
    expect(called("limit")).toBe(false);
  });

  it("stosuje vehicleId/from/to/limit i tabelę adblue gdy podane", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listFuelLogs(client, {
      table: "adblue_logs",
      vehicleId: "veh-9",
      from: "2026-01-01",
      to: "2026-02-01",
      limit: 500,
    });
    expect(called("from", "adblue_logs")).toBe(true);
    expect(argsOf("eq")).toEqual(["vehicle_id", "veh-9"]);
    expect(argsOf("gte")).toEqual(["created_at", "2026-01-01"]);
    expect(argsOf("lte")).toEqual(["created_at", "2026-02-01"]);
    expect(argsOf("limit")?.[0]).toBe(500);
  });

  it("rzuca, gdy Supabase zwróci błąd", async () => {
    const { client } = mockSupabase({ data: null, error: new Error("RLS") });
    await expect(listFuelLogs(client)).rejects.toThrow("RLS");
  });
});

describe("insertFuelLog (idempotentny upsert — offline-first)", () => {
  it("upsert z onConflict id + ignoreDuplicates, id z ctx (PK klienta)", async () => {
    const { client, called, argsOf } = mockSupabase({ data: { id: "uuid-1" }, error: null });
    await insertFuelLog(client, baseInput, ctx);
    expect(called("from", "fuel_logs")).toBe(true);
    const [row, opts] = argsOf("upsert") as [Record<string, unknown>, unknown];
    expect(row.id).toBe("uuid-1");
    expect(opts).toEqual({ onConflict: "id", ignoreDuplicates: true });
  });

  it("kieruje do adblue_logs gdy wskazano tabelę", async () => {
    const { client, called } = mockSupabase({ data: null, error: null });
    await insertFuelLog(client, baseInput, ctx, "adblue_logs");
    expect(called("from", "adblue_logs")).toBe(true);
  });

  it("re-sync (konflikt → DO NOTHING → maybeSingle null) zwraca null bez błędu", async () => {
    const { client } = mockSupabase({ data: null, error: null });
    expect(await insertFuelLog(client, baseInput, ctx)).toBeNull();
  });

  it("rzuca przy realnym błędzie zapisu (nie-konflikt)", async () => {
    const { client } = mockSupabase({ data: null, error: new Error("RLS") });
    await expect(insertFuelLog(client, baseInput, ctx)).rejects.toThrow("RLS");
  });
});
