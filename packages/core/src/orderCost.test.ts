import { describe, expect, it } from "vitest";
import {
  fuelCostPerKmByVehicle,
  type OrderCostFuelEntry,
  type OrderLegEvent,
  type OrderRef,
  orderTransportCosts,
} from "./orderCost";

const fuelV1: OrderCostFuelEntry[] = [
  { vehicleId: "v1", odometerKm: 1000, liters: 100, priceTotal: 150 },
  { vehicleId: "v1", odometerKm: 2000, liters: 100, priceTotal: 150 },
];

describe("fuelCostPerKmByVehicle", () => {
  it("liczy koszt/km jako Σspend / dystans liczników", () => {
    // spend 300 / dystans 1000 = 0.3
    expect(fuelCostPerKmByVehicle(fuelV1)).toEqual({ v1: 0.3 });
  });

  it("dolicza AdBlue do licznika kosztu", () => {
    const adblue: OrderCostFuelEntry[] = [
      { vehicleId: "v1", odometerKm: 1500, liters: 10, priceTotal: 20 },
    ];
    // (300 + 20) / 1000 = 0.32
    expect(fuelCostPerKmByVehicle(fuelV1, adblue)).toEqual({ v1: 0.32 });
  });

  it("pomija pojazd z < 2 tankowaniami lub zerowym dystansem", () => {
    expect(fuelCostPerKmByVehicle([{ vehicleId: "v1", odometerKm: 1000, liters: 50 }])).toEqual({});
    expect(
      fuelCostPerKmByVehicle([
        { vehicleId: "v1", odometerKm: 1000, liters: 50, priceTotal: 100 },
        { vehicleId: "v1", odometerKm: 1000, liters: 50, priceTotal: 100 },
      ]),
    ).toEqual({});
  });
});

const orders: OrderRef[] = [
  { id: "O1", price: 1000, currency: "EUR" },
  { id: "O2", price: 500, currency: "EUR" },
  { id: "O3", price: 800, currency: "EUR" },
];

describe("orderTransportCosts", () => {
  it("liczy dystans, koszt, zysk i marżę dla kompletnego zlecenia", () => {
    const events: OrderLegEvent[] = [
      {
        orderId: "O1",
        action: "load",
        vehicleId: "v1",
        odometerKm: 1000,
        createdAt: "2026-06-01T08:00:00Z",
      },
      {
        orderId: "O1",
        action: "unload",
        vehicleId: "v1",
        odometerKm: 1500,
        createdAt: "2026-06-06T08:00:00Z",
      },
    ];
    const [r] = orderTransportCosts({ orders, events, fuel: fuelV1 });
    expect(r?.orderId).toBe("O1");
    expect(r?.distanceKm).toBe(500);
    expect(r?.durationDays).toBe(5);
    expect(r?.costPerKm).toBe(0.3);
    expect(r?.cost).toBe(150); // 500 × 0.3
    expect(r?.revenue).toBe(1000);
    expect(r?.profit).toBe(850);
    expect(r?.marginPercent).toBe(85);
    expect(r?.method).toBe("perKm");
    expect(r?.complete).toBe(true);
  });

  it("zlecenie bez rozładunku → brak dystansu i kosztu (niekompletne)", () => {
    const events: OrderLegEvent[] = [
      {
        orderId: "O2",
        action: "load",
        vehicleId: "v1",
        odometerKm: 1000,
        createdAt: "2026-06-01T08:00:00Z",
      },
    ];
    const [r] = orderTransportCosts({ orders, events, fuel: fuelV1 });
    expect(r?.distanceKm).toBeNull();
    expect(r?.cost).toBeNull();
    expect(r?.method).toBe("none");
    expect(r?.profit).toBeNull();
    expect(r?.complete).toBe(false);
  });

  it("załadunek i rozładunek na różnych pojazdach → dystans nieporównywalny (null)", () => {
    const events: OrderLegEvent[] = [
      {
        orderId: "O3",
        action: "load",
        vehicleId: "v1",
        odometerKm: 1000,
        createdAt: "2026-06-01T08:00:00Z",
      },
      {
        orderId: "O3",
        action: "unload",
        vehicleId: "v2",
        odometerKm: 5000,
        createdAt: "2026-06-03T08:00:00Z",
      },
    ];
    const [r] = orderTransportCosts({ orders, events, fuel: fuelV1 });
    expect(r?.vehicleId).toBe("v2"); // pojazd rozładunku
    expect(r?.distanceKm).toBeNull();
    expect(r?.cost).toBeNull();
    expect(r?.complete).toBe(false);
  });

  it("nadpisanie kosztu/km ma pierwszeństwo przed wyliczeniem z paliwa", () => {
    const events: OrderLegEvent[] = [
      {
        orderId: "O1",
        action: "load",
        vehicleId: "v1",
        odometerKm: 1000,
        createdAt: "2026-06-01T08:00:00Z",
      },
      {
        orderId: "O1",
        action: "unload",
        vehicleId: "v1",
        odometerKm: 1500,
        createdAt: "2026-06-02T08:00:00Z",
      },
    ];
    const [r] = orderTransportCosts({
      orders,
      events,
      fuel: fuelV1,
      costPerKmByVehicle: { v1: 1 },
    });
    expect(r?.costPerKm).toBe(1);
    expect(r?.cost).toBe(500); // 500 × 1
  });

  it("brak danych paliwowych i brak nadpisania → koszt null", () => {
    const events: OrderLegEvent[] = [
      {
        orderId: "O1",
        action: "load",
        vehicleId: "v9",
        odometerKm: 1000,
        createdAt: "2026-06-01T08:00:00Z",
      },
      {
        orderId: "O1",
        action: "unload",
        vehicleId: "v9",
        odometerKm: 1500,
        createdAt: "2026-06-02T08:00:00Z",
      },
    ];
    const [r] = orderTransportCosts({ orders, events, fuel: [] });
    expect(r?.distanceKm).toBe(500);
    expect(r?.costPerKm).toBeNull();
    expect(r?.cost).toBeNull();
    expect(r?.method).toBe("none");
  });

  it("zlecenia bez powiązanych zdarzeń są pomijane", () => {
    const events: OrderLegEvent[] = [
      {
        orderId: null,
        action: "load",
        vehicleId: "v1",
        odometerKm: 1000,
        createdAt: "2026-06-01T08:00:00Z",
      },
    ];
    expect(orderTransportCosts({ orders, events, fuel: fuelV1 })).toHaveLength(0);
  });

  it("sortuje malejąco po dacie rozładunku", () => {
    const events: OrderLegEvent[] = [
      {
        orderId: "O1",
        action: "unload",
        vehicleId: "v1",
        odometerKm: 1500,
        createdAt: "2026-06-02T08:00:00Z",
      },
      {
        orderId: "O2",
        action: "unload",
        vehicleId: "v1",
        odometerKm: 1500,
        createdAt: "2026-06-09T08:00:00Z",
      },
    ];
    const res = orderTransportCosts({ orders, events, fuel: fuelV1 });
    expect(res.map((r) => r.orderId)).toEqual(["O2", "O1"]);
  });
});
