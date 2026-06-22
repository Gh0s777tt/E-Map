/** Status płatności faktury — funkcja czysta (UI + pulpit „Co wymaga uwagi"). */

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
