import { describe, expect, it } from "vitest";
import { pickRate, type RateLike } from "./rates";

const R = (vehicleId: string | null, ratePerKm: number, validFrom: string): RateLike => ({
  vehicleId,
  ratePerKm,
  validFrom,
});

describe("pickRate", () => {
  it("zwraca null, gdy brak stawek", () => {
    expect(pickRate([], "v1")).toBeNull();
  });

  it("wybiera stawkę konkretnego pojazdu", () => {
    const rates = [R("v1", 1.2, "2026-01-01"), R("v2", 1.5, "2026-01-01")];
    expect(pickRate(rates, "v1")).toBe(1.2);
    expect(pickRate(rates, "v2")).toBe(1.5);
  });

  it("dla stawki pojazdu bierze najnowszą po validFrom", () => {
    const rates = [
      R("v1", 1.2, "2026-01-01"),
      R("v1", 1.4, "2026-06-01"),
      R("v1", 1.1, "2025-12-01"),
    ];
    expect(pickRate(rates, "v1")).toBe(1.4);
  });

  it("gdy brak stawki pojazdu, używa domyślnej firmowej (vehicleId=null)", () => {
    const rates = [R(null, 1.0, "2026-01-01"), R("v2", 1.5, "2026-01-01")];
    expect(pickRate(rates, "v1")).toBe(1.0);
  });

  it("stawka pojazdu ma priorytet nad domyślną firmową", () => {
    const rates = [R(null, 1.0, "2026-05-01"), R("v1", 1.3, "2026-01-01")];
    expect(pickRate(rates, "v1")).toBe(1.3);
  });

  it("dla domyślnej firmowej też bierze najnowszą", () => {
    const rates = [R(null, 1.0, "2026-01-01"), R(null, 1.25, "2026-06-01")];
    expect(pickRate(rates, "v9")).toBe(1.25);
  });
});
