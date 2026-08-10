/** Analiza zleceń: najlepsi klienci, najczęstsze trasy, średnia stawka. Funkcje czyste. */
import { round2 } from "./money";

export interface OrderAnalyticsEntry {
  shipper: string | null;
  origin: string | null;
  destination: string | null;
  /**
   * [#381] Kwota JUŻ przeliczona na euro — nazwa niesie jednostkę celowo.
   *
   * Pole `currency` zniknęło z tego typu razem z filtrem `currency === "EUR"`,
   * który tu stał. Filtr wyglądał na ostrożność, a działał jak cichy kasownik:
   * zlecenie w złotówkach po prostu wypadało z wyniku, bez komunikatu i bez
   * licznika. Przeliczanie należy do warstwy, która zna kursy i datę zdarzenia
   * (`rowAmountEur`), a nie do silnika liczącego — ten ma dostać liczby
   * porównywalne i tyle.
   */
  priceEur: number | null;
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
      s.revenueEur += o.priceEur ?? 0;
      shippers.set(name, s);
    }
    const from = (o.origin ?? "").trim();
    const to = (o.destination ?? "").trim();
    if (from || to) {
      const route = `${from || "?"} → ${to || "?"}`;
      routes.set(route, (routes.get(route) ?? 0) + 1);
    }
    if (o.priceEur != null && o.priceEur > 0) {
      rateSum += o.priceEur;
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
