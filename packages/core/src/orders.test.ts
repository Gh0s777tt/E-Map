import { describe, expect, it } from "vitest";
import { orderAnalytics } from "./orders";

const o = (
  shipper: string | null,
  origin: string | null,
  destination: string | null,
  price: number | null,
  currency = "EUR",
  status = "delivered",
) => ({ shipper, origin, destination, price, currency, status });

describe("orderAnalytics", () => {
  it("top nadawcy wg przychodu EUR, top trasy wg liczby, średnia stawka", () => {
    const a = orderAnalytics([
      o("Acme", "Warszawa", "Berlin", 2000),
      o("Acme", "Warszawa", "Berlin", 1000),
      o("Beta", "Łódź", "Praga", 1500),
      o("Acme", "Kraków", "Wiedeń", 3000, "PLN"), // PLN → liczy się do count, nie do EUR/avg
    ]);
    expect(a.count).toBe(4);
    expect(a.topShippers[0]).toEqual({ name: "Acme", count: 3, revenueEur: 3000 });
    expect(a.topShippers[1]).toEqual({ name: "Beta", count: 1, revenueEur: 1500 });
    expect(a.topRoutes[0]).toEqual({ route: "Warszawa → Berlin", count: 2 });
    // średnia z EUR z ceną>0: (2000+1000+1500)/3 = 1500
    expect(a.avgRateEur).toBe(1500);
  });

  it("pomija anulowane", () => {
    const a = orderAnalytics([
      o("Acme", "A", "B", 1000, "EUR", "cancelled"),
      o("Beta", "C", "D", 500, "EUR", "delivered"),
    ]);
    expect(a.count).toBe(1);
    expect(a.topShippers).toHaveLength(1);
    expect(a.topShippers[0]?.name).toBe("Beta");
  });

  it("avgRateEur null gdy brak zleceń EUR z ceną", () => {
    const a = orderAnalytics([o("X", "A", "B", null, "EUR"), o("Y", "A", "B", 100, "PLN")]);
    expect(a.avgRateEur).toBeNull();
  });

  it("respektuje topN", () => {
    const orders = Array.from({ length: 8 }, (_, i) => o(`S${i}`, "A", `B${i}`, 100 * (i + 1)));
    const a = orderAnalytics(orders, 3);
    expect(a.topShippers).toHaveLength(3);
    expect(a.topRoutes).toHaveLength(3);
  });
});
