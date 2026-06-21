import { describe, expect, it } from "vitest";
import { buildSettlement } from "./billing";
import { csvEscape, toCsv } from "./csv";

describe("buildSettlement", () => {
  it("liczy dystans, koszty, przychód i zysk", () => {
    const s = buildSettlement({
      fuel: [
        { odometerKm: 1000, liters: 0, isFull: true, priceTotal: 0 },
        { odometerKm: 1500, liters: 400, isFull: true, priceTotal: 600 },
      ],
      adblue: [{ liters: 20, priceTotal: 30 }],
      trips: [
        { action: "service", amount: 100 },
        { action: "other", amount: 50 },
        { action: "load", amount: null },
      ],
      ratePerKm: 2,
      tollCost: 120,
    });
    expect(s.distanceKm).toBe(500);
    expect(s.fuelLiters).toBe(400);
    expect(s.fuelCost).toBe(600);
    expect(s.adblueCost).toBe(30);
    expect(s.serviceCost).toBe(100);
    expect(s.otherCost).toBe(50);
    expect(s.tollCost).toBe(120);
    expect(s.totalCost).toBe(900); // 600+30+100+50+120
    expect(s.revenue).toBe(1000); // 500 * 2
    expect(s.profit).toBe(100); // 1000-900
    expect(s.avgConsumptionLPer100km).toBe(80); // 400L / 500km
  });

  it("brak stawki → przychód i zysk 0/ujemny", () => {
    const s = buildSettlement({
      fuel: [{ odometerKm: 0, liters: 10, priceTotal: 15 }],
      adblue: [],
      trips: [],
    });
    expect(s.revenue).toBe(0);
    expect(s.totalCost).toBe(15);
    expect(s.profit).toBe(-15);
  });
});

describe("CSV", () => {
  it("escapuje separator i cudzysłowy", () => {
    expect(csvEscape("a;b")).toBe('"a;b"');
    expect(csvEscape('on "tak"')).toBe('"on ""tak"""');
    expect(csvEscape(12.5)).toBe("12.5");
    expect(csvEscape(null)).toBe("");
  });
  it("buduje dokument z CRLF i separatorem ;", () => {
    const csv = toCsv(
      ["a", "b"],
      [
        [1, "x"],
        [2, "y;z"],
      ],
    );
    expect(csv).toBe('a;b\r\n1;x\r\n2;"y;z"');
  });
});
