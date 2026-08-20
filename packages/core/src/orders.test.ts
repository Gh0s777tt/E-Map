import { describe, expect, it } from "vitest";
import { orderAnalytics } from "./orders";

const o = (
  shipper: string | null,
  origin: string | null,
  destination: string | null,
  priceEur: number | null,
  status = "delivered",
) => ({ shipper, origin, destination, priceEur, status });

describe("orderAnalytics", () => {
  it("top nadawcy wg przychodu EUR, top trasy wg liczby, średnia stawka", () => {
    const a = orderAnalytics([
      o("Acme", "Warszawa", "Berlin", 2000),
      o("Acme", "Warszawa", "Berlin", 1000),
      o("Beta", "Łódź", "Praga", 1500),
      // [#381] Wcześniej to zlecenie było w PLN i test sprawdzał, że NIE wchodzi
      // do przychodu — czyli utrwalał błąd: kwota w obcej walucie wypadała z sumy
      // po cichu. Silnik dostaje teraz kwoty już przeliczone, więc wchodzi normalnie.
      o("Acme", "Kraków", "Wiedeń", 3000),
    ]);
    expect(a.count).toBe(4);
    // Acme ma teraz 2000 + 1000 + 3000: trzecie zlecenie wchodzi do przychodu,
    // bo silnik dostaje kwotę już przeliczoną, a nie surową w obcej walucie.
    expect(a.topShippers[0]).toEqual({ name: "Acme", count: 3, revenueEur: 6000 });
    expect(a.topShippers[1]).toEqual({ name: "Beta", count: 1, revenueEur: 1500 });
    expect(a.topRoutes[0]).toEqual({ route: "Warszawa → Berlin", count: 2 });
    // średnia ze wszystkich z ceną > 0: (2000+1000+1500+3000)/4 = 1875
    expect(a.avgRateEur).toBe(1875);
  });

  it("pomija anulowane", () => {
    const a = orderAnalytics([
      o("Acme", "A", "B", 1000, "cancelled"),
      o("Beta", "C", "D", 500, "delivered"),
    ]);
    expect(a.count).toBe(1);
    expect(a.topShippers).toHaveLength(1);
    expect(a.topShippers[0]?.name).toBe("Beta");
  });

  // [#381] Było „brak zleceń EUR z ceną" i drugie zlecenie miało walutę PLN —
  // test sprawdzał, że kwota w obcej walucie nie liczy się do średniej. To był
  // utrwalony błąd. Warunkiem jest teraz brak ceny, a nie waluta.
  it("avgRateEur null gdy żadne zlecenie nie ma ceny", () => {
    const a = orderAnalytics([o("X", "A", "B", null), o("Y", "A", "B", null)]);
    expect(a.avgRateEur).toBeNull();
  });

  it("respektuje topN", () => {
    const orders = Array.from({ length: 8 }, (_, i) => o(`S${i}`, "A", `B${i}`, 100 * (i + 1)));
    const a = orderAnalytics(orders, 3);
    expect(a.topShippers).toHaveLength(3);
    expect(a.topRoutes).toHaveLength(3);
  });
});
