/**
 * Wirtualny inspektor 561/2006 — pre-kontrola PRZED kontrolą drogową (ITD/policja):
 * z bieżących wartości licznika (AetrInput) wykrywa naruszenia CZASU JAZDY i klasyfikuje
 * wagę wzorowaną na dyrektywie 2006/22/WE zał. III (drobne / poważne / bardzo poważne).
 * To POMOC ORIENTACYJNA — nie zastępuje oceny inspektora ani zapisu tachografu.
 */
import { AETR_LIMITS, type AetrInput } from "./aetr";

export type InfringementSeverity = "minor" | "serious" | "very_serious";

export type InfringementKind =
  | "continuous-driving"
  | "daily-driving"
  | "weekly-driving"
  | "two-week-driving";

export interface Infringement {
  kind: InfringementKind;
  severity: InfringementSeverity;
  /** Zmierzona wartość [min]. */
  actualMin: number;
  /** Obowiązujący limit [min]. */
  limitMin: number;
  /** O ile przekroczono [min]. */
  byMin: number;
}

export interface InspectionResult {
  infringements: Infringement[];
  counts: { minor: number; serious: number; very_serious: number };
  /** Najwyższa waga wśród naruszeń (null = brak). */
  worst: InfringementSeverity | null;
  clean: boolean;
}

const H = 60;

/**
 * Progi wagi [min przekroczenia]: [próg „poważne", próg „bardzo poważne"].
 * Poniżej pierwszego → drobne. Pasma wzorowane na 2006/22/WE zał. III.
 */
const BANDS: Record<InfringementKind, readonly [serious: number, verySerious: number]> = {
  "continuous-driving": [0.5 * H, 1.5 * H], // 4h30: <30' drobne · 30'–1h30 poważne · ≥1h30 b.poważne
  "daily-driving": [1 * H, 2 * H], // <1h drobne · 1–2h poważne · ≥2h b.poważne
  "weekly-driving": [4 * H, 14 * H], // 56–60h drobne · 60–70h poważne · ≥70h b.poważne
  "two-week-driving": [10 * H, 22.5 * H], // 90–100h drobne · 100–112.5h poważne · ≥112.5h b.poważne
};

function severityFor(kind: InfringementKind, byMin: number): InfringementSeverity {
  const [serious, verySerious] = BANDS[kind];
  if (byMin >= verySerious) return "very_serious";
  if (byMin >= serious) return "serious";
  return "minor";
}

const clamp0 = (n: number): number => Math.max(0, Math.round(n));

/** Wykrywa naruszenia czasu jazdy z bieżących wartości licznika 561. */
export function inspectAetr(raw: AetrInput): InspectionResult {
  const continuousMin = clamp0(raw.continuousDrivingMin);
  const dailyMin = clamp0(raw.dailyDrivingMin);
  const weeklyMin = clamp0(raw.weeklyDrivingMin);
  const prevWeekMin = clamp0(raw.prevWeekDrivingMin);
  const extendedUsed = clamp0(raw.extendedDrivesUsed);

  const found: Infringement[] = [];
  const add = (kind: InfringementKind, actualMin: number, limitMin: number): void => {
    if (actualMin > limitMin) {
      const byMin = actualMin - limitMin;
      found.push({ kind, severity: severityFor(kind, byMin), actualMin, limitMin, byMin });
    }
  };

  add("continuous-driving", continuousMin, AETR_LIMITS.continuousDriving);
  // Obowiązujący limit dobowy: 10h dopóki jest kredyt wydłużenia (2×/tydz.), inaczej 9h.
  const dailyLimit =
    extendedUsed < AETR_LIMITS.extendedPerWeek
      ? AETR_LIMITS.dailyDrivingExtended
      : AETR_LIMITS.dailyDriving;
  add("daily-driving", dailyMin, dailyLimit);
  add("weekly-driving", weeklyMin, AETR_LIMITS.weeklyDriving);
  add("two-week-driving", weeklyMin + prevWeekMin, AETR_LIMITS.twoWeekDriving);

  const counts = {
    minor: found.filter((i) => i.severity === "minor").length,
    serious: found.filter((i) => i.severity === "serious").length,
    very_serious: found.filter((i) => i.severity === "very_serious").length,
  };
  const worst: InfringementSeverity | null = counts.very_serious
    ? "very_serious"
    : counts.serious
      ? "serious"
      : counts.minor
        ? "minor"
        : null;
  return { infringements: found, counts, worst, clean: found.length === 0 };
}
