/**
 * #334: Gamifikacja kierowców — punkty, poziomy, odznaki i serie liczone
 * z realnych danych (dostawy, terminowość, checklisty, km, spalanie, staż).
 * Czysty silnik: żadnych zapytań, tylko przeliczenie zagregowanych statystyk.
 * Nadbudowa nad scoringiem (#288) — motywacja kierowcy, nie narzędzie kontroli.
 */

export interface GamificationInput {
  /** Domknięte dostawy (delivered/invoiced) — całość. */
  deliveries: number;
  /** Odsetek dostaw na czas (0–1) lub null gdy brak mierzalnych. */
  onTimePct: number | null;
  /** Wypełnione checklisty. */
  checklists: number;
  /** Kilometry z tras (trip events). */
  km: number;
  /** Średnie spalanie l/100 km (null gdy brak danych). */
  avgConsumption: number | null;
  /** Staż w firmie w miesiącach. */
  tenureMonths: number;
  /** Zgłoszone usterki (dbałość o pojazd). */
  defectsReported: number;
  /** Dni z rzędu z aktywnością (seria). */
  activeStreakDays: number;
}

export interface Badge {
  key: string;
  /** Poziom brązowy/srebrny/złoty (progresja tej samej odznaki). */
  tier: "bronze" | "silver" | "gold";
  /** Postęp do kolejnego progu (0–1); 1 gdy złota (maks). */
  progress: number;
  /** Wartość bieżąca i próg kolejnego tieru (do UI). */
  value: number;
  nextThreshold: number | null;
}

export interface GamificationResult {
  points: number;
  level: number;
  /** Nazwa poziomu (klucz i18n: m.game.rank.<key>). */
  rankKey: string;
  /** Punkty na starcie bieżącego poziomu i progu następnego. */
  levelFloor: number;
  levelCeil: number;
  badges: Badge[];
  /** Liczba zdobytych odznak (tier != null zawsze; liczymy srebrne+ jako „mocne"). */
  earnedCount: number;
}

/** Progi odznak: [brąz, srebro, złoto]. */
const BADGE_DEFS: {
  key: string;
  metric: (i: GamificationInput) => number;
  thresholds: [number, number, number];
  /** Odwrócone (mniej = lepiej), np. spalanie. */
  lowerIsBetter?: boolean;
}[] = [
  { key: "deliveries", metric: (i) => i.deliveries, thresholds: [10, 50, 200] },
  {
    key: "punctual",
    metric: (i) => Math.round((i.onTimePct ?? 0) * 100),
    thresholds: [80, 90, 98],
  },
  { key: "checklists", metric: (i) => i.checklists, thresholds: [10, 40, 120] },
  { key: "km", metric: (i) => Math.round(i.km), thresholds: [5000, 25000, 100000] },
  { key: "veteran", metric: (i) => Math.round(i.tenureMonths), thresholds: [3, 12, 36] },
  { key: "caretaker", metric: (i) => i.defectsReported, thresholds: [1, 5, 20] },
  { key: "streak", metric: (i) => i.activeStreakDays, thresholds: [3, 7, 30] },
  // Eco: niższe spalanie = lepiej. Metryka = ile poniżej 32 l/100 (0 gdy brak/ponad).
  {
    key: "eco",
    metric: (i) => (i.avgConsumption != null ? Math.max(0, 32 - i.avgConsumption) : 0),
    thresholds: [2, 5, 8],
  },
];

const POINTS_PER_TIER = { bronze: 50, silver: 150, gold: 400 } as const;

const RANKS: { key: string; min: number }[] = [
  { key: "rookie", min: 0 },
  { key: "driver", min: 200 },
  { key: "pro", min: 600 },
  { key: "veteran", min: 1400 },
  { key: "master", min: 3000 },
  { key: "legend", min: 6000 },
];

function badgeFor(def: (typeof BADGE_DEFS)[number], input: GamificationInput): Badge | null {
  const value = def.metric(input);
  const [b, s, g] = def.thresholds;
  let tier: Badge["tier"] | null = null;
  if (value >= g) tier = "gold";
  else if (value >= s) tier = "silver";
  else if (value >= b) tier = "bronze";
  if (!tier) {
    // jeszcze nie zdobyta — pokaż postęp do brązu (do UI „w toku")
    return {
      key: def.key,
      tier: "bronze",
      progress: Math.min(1, value / b),
      value,
      nextThreshold: b,
    } as Badge & {
      tier: "bronze";
    };
  }
  const next = tier === "bronze" ? s : tier === "silver" ? g : null;
  const floor = tier === "bronze" ? b : tier === "silver" ? s : g;
  const progress = next == null ? 1 : Math.min(1, (value - floor) / (next - floor));
  return { key: def.key, tier, progress, value, nextThreshold: next };
}

/** Liczy pełny profil gamifikacji kierowcy. */
export function computeDriverGamification(input: GamificationInput): GamificationResult {
  const badges: Badge[] = [];
  let points = 0;
  let earnedCount = 0;
  for (const def of BADGE_DEFS) {
    const value = def.metric(input);
    const [b, s, g] = def.thresholds;
    const earnedTier = value >= g ? "gold" : value >= s ? "silver" : value >= b ? "bronze" : null;
    const badge = badgeFor(def, input);
    if (badge) badges.push(badge);
    if (earnedTier) {
      points += POINTS_PER_TIER[earnedTier];
      earnedCount++;
    }
  }
  // punkty bazowe z aktywności (dostawy + km), by ranking rósł płynnie
  points += input.deliveries * 5 + Math.floor(input.km / 100);

  let level = 1;
  let rankKey = RANKS[0]?.key ?? "rookie";
  for (let i = 0; i < RANKS.length; i++) {
    const r = RANKS[i];
    if (r && points >= r.min) {
      level = i + 1;
      rankKey = r.key;
    }
  }
  const levelFloor = RANKS[level - 1]?.min ?? 0;
  const levelCeil = RANKS[level]?.min ?? levelFloor + 3000;

  return { points, level, rankKey, levelFloor, levelCeil, badges, earnedCount };
}
