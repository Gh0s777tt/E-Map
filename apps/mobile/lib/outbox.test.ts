import type { FuelLogInput, TripEventInput } from "@e-logistic/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory AsyncStorage (mock natywnego modułu RN).
let store: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (k: string) => store[k] ?? null,
    setItem: async (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: async (k: string) => {
      delete store[k];
    },
  },
}));

// Klient Supabase mobilny — sterujemy sesją przez getUser.
const getUser = vi.fn();
vi.mock("./supabase", () => ({
  supabaseConfigured: true,
  getSupabase: () => ({ auth: { getUser } }),
}));

// Warstwa danych — mock zapisu (sukces/błąd sterowany w teście).
const getActiveMembership = vi.fn();
const insertFuelLog = vi.fn();
const insertTripEvent = vi.fn();
vi.mock("@e-logistic/api", () => ({ getActiveMembership, insertFuelLog, insertTripEvent }));

const { enqueue, flushQueued, listOutbox, removeOutbox } = await import("./outbox");

const fuelInput: FuelLogInput = {
  vehicleId: "v",
  station: { country: "PL" },
  odometerKm: 1,
  liters: 1,
  isFull: true,
  paymentMethod: "cash",
};
const tripInput = {
  vehicleId: "v",
  action: "start",
  place: { country: "PL" },
  odometerKm: 1,
} as TripEventInput;

beforeEach(() => {
  store = {};
  getUser.mockReset();
  getActiveMembership.mockReset();
  insertFuelLog.mockReset();
  insertTripEvent.mockReset();
});

describe("outbox (kolejka offline-first)", () => {
  it("enqueue → status synced gdy sesja + firma + insert OK", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    getActiveMembership.mockResolvedValue({ companyId: "c1" });
    insertFuelLog.mockResolvedValue({});
    const item = await enqueue("fuel", fuelInput, "2026-06-27T10:00:00Z");
    expect(item.status).toBe("synced");
    expect(insertFuelLog).toHaveBeenCalledOnce();
    expect((await listOutbox()).length).toBe(1);
  });

  it("status error (wpis czeka w kolejce) gdy brak sesji", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const item = await enqueue("fuel", fuelInput, "t");
    expect(item.status).toBe("error");
    expect(item.error ?? "").toMatch(/sesji/i);
    expect(insertFuelLog).not.toHaveBeenCalled();
  });

  it("trip → insertTripEvent", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    getActiveMembership.mockResolvedValue({ companyId: "c1" });
    insertTripEvent.mockResolvedValue({});
    const item = await enqueue("trip", tripInput, "t");
    expect(item.status).toBe("synced");
    expect(insertTripEvent).toHaveBeenCalledOnce();
  });

  it("adblue → insertFuelLog z tabelą adblue_logs", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    getActiveMembership.mockResolvedValue({ companyId: "c1" });
    insertFuelLog.mockResolvedValue({});
    await enqueue("adblue", fuelInput, "t");
    expect(insertFuelLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "adblue_logs",
    );
  });

  it("flushQueued ponawia wpisy z błędem po odzyskaniu sesji", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await enqueue("fuel", fuelInput, "t");
    expect((await listOutbox())[0]?.status).toBe("error");

    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    getActiveMembership.mockResolvedValue({ companyId: "c1" });
    insertFuelLog.mockResolvedValue({});
    await flushQueued();
    expect((await listOutbox())[0]?.status).toBe("synced");
  });

  it("listOutbox filtruje po kind; removeOutbox usuwa wpis", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await enqueue("fuel", fuelInput, "t");
    await enqueue("trip", tripInput, "t");
    expect((await listOutbox("trip")).length).toBe(1);
    const all = await listOutbox();
    await removeOutbox(all[0]?.id ?? "");
    expect((await listOutbox()).length).toBe(1);
  });
});
