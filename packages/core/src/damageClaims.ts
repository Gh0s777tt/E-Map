/**
 * Rejestr szkód / OC — zgłoszenia szkód pojazdów, ich status i koszty.
 * Czyste: statusy, rodzaje, podsumowanie (otwarte + koszt per waluta).
 */
import { round2 } from "./money";

export const DAMAGE_STATUSES = [
  "reported",
  "in_progress",
  "repaired",
  "closed",
  "rejected",
] as const;
export type DamageStatus = (typeof DAMAGE_STATUSES)[number];

export const DAMAGE_STATUS_LABELS: Record<DamageStatus, string> = {
  reported: "Zgłoszona",
  in_progress: "W likwidacji",
  repaired: "Naprawiona",
  closed: "Zamknięta",
  rejected: "Odrzucona",
};

export const DAMAGE_KINDS = [
  "collision",
  "theft",
  "glass",
  "weather",
  "vandalism",
  "other",
] as const;
export type DamageKind = (typeof DAMAGE_KINDS)[number];

export const DAMAGE_KIND_LABELS: Record<DamageKind, string> = {
  collision: "Kolizja / wypadek",
  theft: "Kradzież",
  glass: "Szyby",
  weather: "Żywioł / pogoda",
  vandalism: "Wandalizm",
  other: "Inne",
};

/** Statusy uznawane za „otwarte" (wymagające działania). */
const OPEN = new Set<DamageStatus>(["reported", "in_progress"]);

export interface DamageClaimEntry {
  status: DamageStatus;
  cost: number | null;
  currency: string;
}

export interface DamageSummary {
  total: number;
  /** Zgłoszone + w likwidacji. */
  open: number;
  /** Suma kosztów per waluta (tylko pozycje z kwotą), malejąco. */
  costByCurrency: { currency: string; amount: number }[];
}

/** Podsumowanie rejestru szkód: liczba, otwarte, koszty per waluta. */
export function summarizeDamageClaims(claims: DamageClaimEntry[]): DamageSummary {
  const byCur = new Map<string, number>();
  for (const c of claims) {
    if (c.cost == null || c.cost <= 0) continue;
    byCur.set(c.currency, (byCur.get(c.currency) ?? 0) + c.cost);
  }
  return {
    total: claims.length,
    open: claims.filter((c) => OPEN.has(c.status)).length,
    costByCurrency: [...byCur.entries()]
      .map(([currency, amount]) => ({ currency, amount: round2(amount) }))
      .sort((a, b) => b.amount - a.amount),
  };
}
