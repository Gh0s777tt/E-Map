import type { TripEventInput } from "@e-logistic/core";
import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { insertTripEvent, listTripEvents, tripEventToRow } from "./tripEvents";

const ctx = { id: "i", companyId: "c", driverId: "d", deviceId: "dev" };
const startInput = {
  vehicleId: "v",
  action: "start",
  place: { country: "PL" },
  odometerKm: 1,
} as TripEventInput;

describe("tripEventToRow (czysta funkcja)", () => {
  it("mapuje akcję load z wagą i współrzędnymi (WKT)", () => {
    const input = {
      vehicleId: "veh-1",
      action: "load",
      place: { country: "PL", city: "Łódź", lat: 51.7, lng: 19.4 },
      odometerKm: 5000,
      weightKg: 24000,
    } as TripEventInput;
    const row = tripEventToRow(input, ctx);
    expect(row.action).toBe("load");
    expect(row.weight_kg).toBe(24000);
    expect(row.geo).toBe("POINT(19.4 51.7)");
    expect(row.company_id).toBe("c");
    expect(row.vehicle_id).toBe("veh-1");
  });

  it("geo = null bez współrzędnych; weight_kg null dla akcji bez wagi", () => {
    const input = {
      vehicleId: "v",
      action: "start",
      place: { country: "DE" },
      odometerKm: 1,
    } as TripEventInput;
    const row = tripEventToRow(input, { id: "i", companyId: "c", driverId: "d" });
    expect(row.geo).toBeNull();
    expect(row.weight_kg).toBeNull();
    expect(row.device_id).toBeNull();
  });
});

describe("listTripEvents (kształt zapytania)", () => {
  it("tabela trip_events, sort created_at desc, filtry opcjonalne", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listTripEvents(client, { vehicleId: "v1", from: "2026-01-01", limit: 100 });
    expect(called("from", "trip_events")).toBe(true);
    expect(argsOf("eq")).toEqual(["vehicle_id", "v1"]);
    expect(argsOf("gte")).toEqual(["created_at", "2026-01-01"]);
    expect(argsOf("limit")?.[0]).toBe(100);
  });

  it("rzuca przy błędzie Supabase", async () => {
    const { client } = mockSupabase({ data: null, error: new Error("RLS") });
    await expect(listTripEvents(client)).rejects.toThrow("RLS");
  });
});

describe("insertTripEvent (idempotentny upsert — offline-first)", () => {
  it("upsert z onConflict id + ignoreDuplicates, id z ctx (PK klienta)", async () => {
    const { client, called, argsOf } = mockSupabase({ data: { id: "i" }, error: null });
    await insertTripEvent(client, startInput, ctx);
    expect(called("from", "trip_events")).toBe(true);
    const [row, opts] = argsOf("upsert") as [Record<string, unknown>, unknown];
    expect(row.id).toBe("i");
    expect(opts).toEqual({ onConflict: "id", ignoreDuplicates: true });
  });

  it("re-sync (konflikt → maybeSingle null) zwraca null bez błędu", async () => {
    const { client } = mockSupabase({ data: null, error: null });
    expect(await insertTripEvent(client, startInput, ctx)).toBeNull();
  });

  it("rzuca przy realnym błędzie zapisu", async () => {
    const { client } = mockSupabase({ data: null, error: new Error("RLS") });
    await expect(insertTripEvent(client, startInput, ctx)).rejects.toThrow("RLS");
  });
});
