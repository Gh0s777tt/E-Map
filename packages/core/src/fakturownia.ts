/**
 * Mapowanie faktury E-Logistic → ładunek API Fakturowni (`POST /invoices.json`,
 * obiekt `invoice`). Funkcja czysta — `api_token` dokleja warstwa serwerowa.
 * Pozycje: `total_price_gross` = wartość brutto linii, `tax` = stawka VAT (%).
 */

export interface FakturowniaPosition {
  name: string;
  quantity: number;
  total_price_gross: number;
  tax: number;
}

export interface FakturowniaInvoice {
  kind: "vat";
  /** null = numer nadaje Fakturownia (legalna numeracja). */
  number: null;
  issue_date: string;
  sell_date: string;
  payment_to?: string;
  currency: string;
  seller_name?: string;
  seller_tax_no?: string;
  seller_bank?: string;
  seller_bank_account?: string;
  buyer_name?: string;
  buyer_tax_no?: string;
  buyer_street?: string;
  positions: FakturowniaPosition[];
}

export interface ToFakturowniaInput {
  issueDate: string;
  dueDate?: string | null;
  currency: string;
  seller: {
    name?: string | null;
    taxId?: string | null;
    bank?: string | null;
    account?: string | null;
  };
  buyer: { name?: string | null; taxId?: string | null; address?: string | null };
  /** Pozycje faktury. Gdy puste, mapper tworzy jedną z `fallback`. */
  items: { description: string; quantity: number; gross: number; vatRate: number }[];
  fallback?: { description: string; gross: number; vatRate: number };
}

/** Buduje obiekt `invoice` dla Fakturowni; pomija puste pola. Rzuca, gdy brak pozycji. */
export function toFakturowniaInvoice(input: ToFakturowniaInput): FakturowniaInvoice {
  const positions: FakturowniaPosition[] = input.items.length
    ? input.items.map((it) => ({
        name: it.description,
        quantity: it.quantity,
        total_price_gross: it.gross,
        tax: it.vatRate,
      }))
    : input.fallback
      ? [
          {
            name: input.fallback.description,
            quantity: 1,
            total_price_gross: input.fallback.gross,
            tax: input.fallback.vatRate,
          },
        ]
      : [];
  if (positions.length === 0) throw new Error("Faktura bez pozycji — nie można wyeksportować.");

  const inv: FakturowniaInvoice = {
    kind: "vat",
    number: null,
    issue_date: input.issueDate,
    sell_date: input.issueDate,
    currency: input.currency,
    positions,
  };
  if (input.dueDate) inv.payment_to = input.dueDate;
  if (input.seller.name) inv.seller_name = input.seller.name;
  if (input.seller.taxId) inv.seller_tax_no = input.seller.taxId;
  if (input.seller.bank) inv.seller_bank = input.seller.bank;
  if (input.seller.account) inv.seller_bank_account = input.seller.account;
  if (input.buyer.name) inv.buyer_name = input.buyer.name;
  if (input.buyer.taxId) inv.buyer_tax_no = input.buyer.taxId;
  if (input.buyer.address) inv.buyer_street = input.buyer.address;
  return inv;
}
