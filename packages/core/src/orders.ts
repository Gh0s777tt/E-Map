/** Analiza zleceń: najlepsi klienci, najczęstsze trasy, średnia stawka. Funkcje czyste. */
import { round2 } from "./money";

export interface OrderAnalyticsEntry {
  shipper: string | null;
  origin: string | null;
  destination: string | null;
  price: number | null;
  currency: string;
  status: string;
}

export interface ShipperStat {
  name: string;
  count: number;
  revenueEur: number;
}
export interface RouteStat {
  route: string;
  count: number;
}
export interface OrderAnalytics {
  topShippers: ShipperStat[];
  topRoutes: RouteStat[];
  /** Średnia stawka EUR (zlecenia EUR z ceną > 0, niezanulowane). null gdy brak. */
  avgRateEur: number | null;
  /** Liczba uwzględnionych zleceń (niezanulowane). */
  count: number;
}

/**
 * Analiza zleceń (pomija anulowane): top nadawcy wg przychodu EUR, najczęstsze
 * trasy wg liczby, średnia stawka EUR. `topN` ogranicza listy.
 */
export function orderAnalytics(orders: OrderAnalyticsEntry[], topN = 5): OrderAnalytics {
  const active = orders.filter((o) => o.status !== "cancelled");

  const shippers = new Map<string, { count: number; revenueEur: number }>();
  const routes = new Map<string, number>();
  let rateSum = 0;
  let rateCount = 0;

  for (const o of active) {
    const name = (o.shipper ?? "").trim();
    if (name) {
      const s = shippers.get(name) ?? { count: 0, revenueEur: 0 };
      s.count += 1;
      if (o.currency === "EUR") s.revenueEur += o.price ?? 0;
      shippers.set(name, s);
    }
    const from = (o.origin ?? "").trim();
    const to = (o.destination ?? "").trim();
    if (from || to) {
      const route = `${from || "?"} → ${to || "?"}`;
      routes.set(route, (routes.get(route) ?? 0) + 1);
    }
    if (o.currency === "EUR" && o.price != null && o.price > 0) {
      rateSum += o.price;
      rateCount += 1;
    }
  }

  const topShippers: ShipperStat[] = [...shippers.entries()]
    .map(([name, s]) => ({ name, count: s.count, revenueEur: round2(s.revenueEur) }))
    .sort((a, b) => b.revenueEur - a.revenueEur || b.count - a.count)
    .slice(0, topN);

  const topRoutes: RouteStat[] = [...routes.entries()]
    .map(([route, count]) => ({ route, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);

  return {
    topShippers,
    topRoutes,
    avgRateEur: rateCount > 0 ? round2(rateSum / rateCount) : null,
    count: active.length,
  };
}
