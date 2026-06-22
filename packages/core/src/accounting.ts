/**
 * Rejestr VAT sprzedaży — zestawienie faktur miesiąca dla biura rachunkowego.
 * Grupuje wystawione (niezanulowane) faktury wg stawki VAT. Funkcje czyste.
 */
import { round2 } from "./money";

export interface VatRegisterInvoice {
  status: string;
  issue_date: string;
  net: number;
  vat_rate: number;
  vat_amount: number;
  gross: number;
  currency: string;
}

export interface VatRegisterRow {
  vatRate: number;
  net: number;
  vat: number;
  gross: number;
  count: number;
}

export interface VatRegister {
  rows: VatRegisterRow[];
  totalNet: number;
  totalVat: number;
  totalGross: number;
  count: number;
}

/**
 * Rejestr VAT za miesiąc `YYYY-MM`: tylko faktury wystawione (status ≠ cancelled)
 * z `issue_date` w danym miesiącu, pogrupowane wg stawki VAT (malejąco).
 */
export function monthlyVatRegister(invoices: VatRegisterInvoice[], month: string): VatRegister {
  const inMonth = invoices.filter(
    (i) => i.status !== "cancelled" && (i.issue_date ?? "").startsWith(month),
  );
  const byRate = new Map<number, VatRegisterRow>();
  for (const inv of inMonth) {
    const row = byRate.get(inv.vat_rate) ?? {
      vatRate: inv.vat_rate,
      net: 0,
      vat: 0,
      gross: 0,
      count: 0,
    };
    row.net += inv.net;
    row.vat += inv.vat_amount;
    row.gross += inv.gross;
    row.count += 1;
    byRate.set(inv.vat_rate, row);
  }
  const rows = [...byRate.values()]
    .map((r) => ({
      vatRate: r.vatRate,
      net: round2(r.net),
      vat: round2(r.vat),
      gross: round2(r.gross),
      count: r.count,
    }))
    .sort((a, b) => b.vatRate - a.vatRate);

  return {
    rows,
    totalNet: round2(rows.reduce((a, r) => a + r.net, 0)),
    totalVat: round2(rows.reduce((a, r) => a + r.vat, 0)),
    totalGross: round2(rows.reduce((a, r) => a + r.gross, 0)),
    count: inMonth.length,
  };
}

export interface CostEntry {
  category: string;
  amount: number;
}

export interface CostGroup {
  category: string;
  amount: number;
  count: number;
}

export interface CostRegister {
  groups: CostGroup[];
  total: number;
  count: number;
}

/** Rejestr kosztów: grupuje wpisy wg kategorii (malejąco wg kwoty) + suma. */
export function costRegister(entries: CostEntry[]): CostRegister {
  const byCat = new Map<string, CostGroup>();
  for (const e of entries) {
    const g = byCat.get(e.category) ?? { category: e.category, amount: 0, count: 0 };
    g.amount += e.amount;
    g.count += 1;
    byCat.set(e.category, g);
  }
  const groups = [...byCat.values()]
    .map((g) => ({ category: g.category, amount: round2(g.amount), count: g.count }))
    .sort((a, b) => b.amount - a.amount);
  return {
    groups,
    total: round2(groups.reduce((a, g) => a + g.amount, 0)),
    count: entries.length,
  };
}
