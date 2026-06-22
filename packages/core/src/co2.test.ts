import { describe, expect, it } from "vitest";
import { co2ByClient, co2ByVehicle, co2PerHundredKm, dieselCo2Kg, formatCo2 } from "./co2";

describe("dieselCo2Kg", () => {
  it("liczy CO₂ z litrów (2,64 kg/L)", () => {
    expect(dieselCo2Kg(100)).toBe(264);
    expect(dieselCo2Kg(0)).toBe(0);
  });
  it("nie schodzi poniżej zera", () => {
    expect(dieselCo2Kg(-50)).toBe(0);
  });
});

describe("co2PerHundredKm", () => {
  it("intensywność z spalania L/100km", () => {
    expect(co2PerHundredKm(30)).toBe(79.2);
  });
});

describe("formatCo2", () => {
  it("kg poniżej tony, tony powyżej", () => {
    expect(formatCo2(500)).toBe("500 kg");
    expect(formatCo2(2640)).toBe("2.64 t");
    expect(formatCo2(1000)).toBe("1 t");
  });
});

describe("co2ByVehicle", () => {
  it("liczy emisje per pojazd, sortuje malejąco wg CO₂", () => {
    const rows = co2ByVehicle([
      { id: "a", registration: "WL1", liters: 100, consumption: 30 },
      { id: "b", registration: "WL2", liters: 250 },
    ]);
    expect(rows[0]).toMatchObject({ id: "b", co2Kg: 660, co2Per100Km: null });
    expect(rows[1]).toMatchObject({ id: "a", co2Kg: 264, co2Per100Km: 79.2 });
  });

  it("pusta lista → pusto", () => {
    expect(co2ByVehicle([])).toEqual([]);
  });
});

describe("co2ByClient", () => {
  it("przypisuje litry pojazdu do klientów proporcjonalnie do przychodu", () => {
    // Pojazd v1: 100 L; dwa zlecenia EUR (A=750, B=250) → A:75 L, B:25 L.
    const rows = co2ByClient(
      [
        { shipper: "A", vehicleId: "v1", price: 750, currency: "EUR", status: "delivered" },
        { shipper: "B", vehicleId: "v1", price: 250, currency: "EUR", status: "invoiced" },
      ],
      [{ vehicleId: "v1", liters: 100 }],
    );
    expect(rows[0]).toMatchObject({ client: "A", liters: 75, co2Kg: 198 }); // 75*2.64
    expect(rows[1]).toMatchObject({ client: "B", liters: 25, co2Kg: 66 });
  });

  it("pomija zlecenia niezrealizowane / nie-EUR", () => {
    const rows = co2ByClient(
      [
        { shipper: "A", vehicleId: "v1", price: 1000, currency: "EUR", status: "new" },
        { shipper: "A", vehicleId: "v1", price: 1000, currency: "PLN", status: "delivered" },
      ],
      [{ vehicleId: "v1", liters: 100 }],
    );
    expect(rows).toEqual([]);
  });
});
