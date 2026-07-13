import { describe, expect, it } from "vitest";
import { fuelCardSchema, fuelLogSchema, tripEventSchema, vehicleSchema } from "./schemas";

const VID = "11111111-1111-4111-8111-111111111111";
const CID = "22222222-2222-4222-8222-222222222222";

describe("vehicleSchema", () => {
  it("akceptuje poprawny pojazd", () => {
    const r = vehicleSchema.safeParse({
      registration: "WL5145U",
      model: "Volvo FH",
      year: 2021,
      vehicleType: "tractor",
      heightCm: 400,
    });
    expect(r.success).toBe(true);
  });

  it("odrzuca rok spoza zakresu", () => {
    const r = vehicleSchema.safeParse({
      registration: "X",
      model: "Y",
      year: 1800,
      vehicleType: "truck",
    });
    expect(r.success).toBe(false);
  });
});

describe("fuelCardSchema", () => {
  it("ustawia domyślny rabat 0", () => {
    const r = fuelCardSchema.parse({ provider: "dkv", cardNumberMasked: "**** 1234" });
    expect(r.discountPercent).toBe(0);
  });

  it("odrzuca PIN o złym formacie", () => {
    const r = fuelCardSchema.safeParse({ provider: "shell", cardNumberMasked: "x", pin: "abc" });
    expect(r.success).toBe(false);
  });
});

describe("fuelLogSchema", () => {
  it("wymaga karty przy płatności kartą", () => {
    const r = fuelLogSchema.safeParse({
      vehicleId: VID,
      station: { country: "DE", city: "Berlin" },
      odometerKm: 100000,
      liters: 300,
      paymentMethod: "card",
    });
    expect(r.success).toBe(false);
  });

  it("akceptuje płatność gotówką bez karty", () => {
    const r = fuelLogSchema.safeParse({
      vehicleId: VID,
      station: { country: "PL" },
      odometerKm: 100000,
      liters: 300,
      paymentMethod: "cash",
    });
    expect(r.success).toBe(true);
  });

  it("akceptuje płatność kartą z fuelCardId", () => {
    const r = fuelLogSchema.safeParse({
      vehicleId: VID,
      station: { country: "PL" },
      odometerKm: 100000,
      liters: 300,
      paymentMethod: "card",
      fuelCardId: CID,
    });
    expect(r.success).toBe(true);
  });
});

describe("tripEventSchema", () => {
  it("load — waga opcjonalna (#343: kierowca może wysłać bez wagi)", () => {
    const ok = tripEventSchema.safeParse({
      action: "load",
      vehicleId: VID,
      place: { country: "PL" },
      odometerKm: 100000,
    });
    expect(ok.success).toBe(true);

    const withWeight = tripEventSchema.safeParse({
      action: "load",
      vehicleId: VID,
      place: { country: "PL" },
      odometerKm: 100000,
      weightKg: 24000,
    });
    expect(withWeight.success).toBe(true);
  });

  it("kod pocztowy i firma w miejscu (#343)", () => {
    const ok = tripEventSchema.safeParse({
      action: "unload",
      vehicleId: VID,
      place: { country: "GB", city: "London", postcode: "SW1A 1AA", company: "Tesco DC" },
      odometerKm: 100000,
    });
    expect(ok.success).toBe(true);
  });

  it("start nie wymaga wagi", () => {
    const r = tripEventSchema.safeParse({
      action: "start",
      vehicleId: VID,
      place: { country: "PL", city: "Poznań" },
      odometerKm: 100000,
    });
    expect(r.success).toBe(true);
  });

  it("service wymaga komentarza (co naprawiono)", () => {
    const r = tripEventSchema.safeParse({
      action: "service",
      vehicleId: VID,
      place: { country: "PL" },
      odometerKm: 100000,
      amount: 1200,
    });
    expect(r.success).toBe(false);
  });
});
