/**
 * Rozliczenie kierowcy — ewidencja należności, zaliczek, potrąceń i wypłat.
 * Saldo do wypłaty = należność − zaliczki − potrącenia − wypłaty. Czyste,
 * per waluta (kierowcy bywają rozliczani w PLN/EUR — bez kursów).
 */
import { round2 } from "./money";

export const PAYOUT_KINDS = ["due", "advance", "deduction", "payout"] as const;
export type PayoutKind = (typeof PAYOUT_KINDS)[number];

export const PAYOUT_KIND_LABELS: Record<PayoutKind, string> = {
  due: "Należność",
  advance: "Zaliczka",
  deduction: "Potrącenie",
  payout: "Wypłata",
};

/** Znak pozycji w saldzie: należność (+), reszta zmniejsza saldo (−). */
const SIGN: Record<PayoutKind, 1 | -1> = { due: 1, advance: -1, deduction: -1, payout: -1 };

export interface PayoutEntry {
  kind: PayoutKind;
  amount: number;
  currency: string;
}

export interface PayoutBalance {
  currency: string;
  due: number;
  advance: number;
  deduction: number;
  payout: number;
  /** Pozostało do wypłaty = należność − zaliczki − potrącenia − wypłaty. */
  balance: number;
}

/** Rozlicza pozycje kierowcy per waluta (malejąco wg salda). Ujemne kwoty → 0. */
export function settleDriverPayouts(entries: PayoutEntry[]): PayoutBalance[] {
  const byCur = new Map<string, PayoutBalance>();
  for (const e of entries) {
    const amount = Math.max(0, e.amount);
    const cur = byCur.get(e.currency) ?? {
      currency: e.currency,
      due: 0,
      advance: 0,
      deduction: 0,
      payout: 0,
      balance: 0,
    };
    cur[e.kind] = round2(cur[e.kind] + amount);
    cur.balance = round2(cur.balance + SIGN[e.kind] * amount);
    byCur.set(e.currency, cur);
  }
  return [...byCur.values()].sort((a, b) => b.balance - a.balance);
}
