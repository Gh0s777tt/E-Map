/**
 * Filtrowanie i sortowanie listy zleceń (po stronie klienta) — wyszukiwanie
 * tekstowe (nadawca/odbiorca/trasa/referencja), filtr statusu i sortowanie.
 * Czyste i generyczne: zachowuje pełny typ wejściowy (do renderu). Bez UI/API.
 */

export interface OrderFilterItem {
  reference_no?: string | null;
  shipper?: string | null;
  consignee?: string | null;
  origin?: string | null;
  destination?: string | null;
  status: string;
  price?: number | null;
  load_date?: string | null;
  created_at: string;
}

export const ORDER_SORTS = ["date_desc", "date_asc", "price_desc", "price_asc"] as const;
export type OrderSort = (typeof ORDER_SORTS)[number];

export interface OrderQuery {
  /** Fraza szukana w referencji/nadawcy/odbiorcy/trasie (bez rozróżniania wielkości liter). */
  text?: string;
  /** Status do filtra lub "all". */
  status?: string;
  sort?: OrderSort;
}

/** Data użyta do sortowania: data załadunku, w razie braku — utworzenia. */
function orderDate(o: OrderFilterItem): string {
  return (o.load_date ?? o.created_at ?? "").slice(0, 10);
}

function haystack(o: OrderFilterItem): string {
  return [o.reference_no, o.shipper, o.consignee, o.origin, o.destination]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Filtruje (tekst + status) i sortuje zlecenia. Zwraca nową tablicę. */
export function filterSortOrders<T extends OrderFilterItem>(orders: T[], q: OrderQuery = {}): T[] {
  const text = (q.text ?? "").trim().toLowerCase();
  const status = q.status ?? "all";
  const sort = q.sort ?? "date_desc";

  const out = orders.filter((o) => {
    if (status !== "all" && o.status !== status) return false;
    if (text && !haystack(o).includes(text)) return false;
    return true;
  });

  out.sort((a, b) => {
    switch (sort) {
      case "date_asc":
        return orderDate(a).localeCompare(orderDate(b));
      case "price_desc":
        return (b.price ?? 0) - (a.price ?? 0);
      case "price_asc":
        return (a.price ?? 0) - (b.price ?? 0);
      default:
        return orderDate(b).localeCompare(orderDate(a));
    }
  });
  return out;
}
