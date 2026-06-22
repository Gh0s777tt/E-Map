/** Status płatności faktury — funkcja czysta (UI + pulpit „Co wymaga uwagi"). */
import { round2 } from "./money";

export type PaymentStatus = "paid" | "overdue" | "unpaid";

/**
 * Status płatności na podstawie daty opłacenia, terminu i statusu faktury.
 * - `paid` gdy ustawiono `paidAt`,
 * - `overdue` gdy nieopłacona, wystawiona (nie anulowana) i po terminie (`dueDate < dziś`),
 * - `unpaid` w pozostałych przypadkach (w tym anulowana — nie liczona jako przeterminowana).
 */
export function invoicePaymentStatus(input: {
  paidAt: string | null;
  dueDate: string | null;
  status: string;
  todayISO: string;
}): PaymentStatus {
  if (input.paidAt) return "paid";
  if (input.status === "cancelled") return "unpaid";
  if (input.dueDate && input.dueDate < input.todayISO) return "overdue";
  return "unpaid";
}

export interface VatSummaryRow {
  rate: number;
  net: number;
  vat: number;
  gross: number;
}

/**
 * Podsumowanie VAT wg stawek (wymagane na fakturze przy różnych stawkach).
 * Grupuje pozycje po `vatRate`, sumuje netto/VAT/brutto, sortuje malejąco wg stawki.
 */
export function vatSummary(
  items: { vatRate: number; net: number; vatAmount: number; gross: number }[],
): VatSummaryRow[] {
  const map = new Map<number, { net: number; vat: number; gross: number }>();
  for (const it of items) {
    const r = map.get(it.vatRate) ?? { net: 0, vat: 0, gross: 0 };
    r.net += it.net;
    r.vat += it.vatAmount;
    r.gross += it.gross;
    map.set(it.vatRate, r);
  }
  return [...map.entries()]
    .map(([rate, r]) => ({
      rate,
      net: round2(r.net),
      vat: round2(r.vat),
      gross: round2(r.gross),
    }))
    .sort((a, b) => b.rate - a.rate);
}
