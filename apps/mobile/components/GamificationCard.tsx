/**
 * #334: Karta gamifikacji na ekranie Start — poziom, punkty, pasek postępu
 * do kolejnej rangi i odznaki (brąz/srebro/złoto) z realnych statystyk.
 * Motywacja kierowcy; oparta o silnik `computeDriverGamification`.
 */
import type { Badge, GamificationResult } from "@e-logistic/core";
import type { MobileMessageKey } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { StyleSheet, Text, View } from "react-native";
import { useT } from "../lib/i18n";
import { Card, SectionTitle } from "./ui";

const BADGE_GLYPH: Record<string, string> = {
  deliveries: "📦",
  punctual: "⏱",
  checklists: "✅",
  km: "🛣",
  veteran: "🎖",
  caretaker: "🔧",
  streak: "🔥",
  eco: "🌿",
};
const TIER_COLOR: Record<Badge["tier"], string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#f5c518",
};

function rankKey(k: string): MobileMessageKey {
  return `m.game.rank.${k}` as MobileMessageKey;
}
function badgeKey(k: string): MobileMessageKey {
  return `m.game.badge.${k}` as MobileMessageKey;
}

export function GamificationCard({ data }: { data: GamificationResult }) {
  const t = useT();
  const span = Math.max(1, data.levelCeil - data.levelFloor);
  const pct = Math.max(0, Math.min(1, (data.points - data.levelFloor) / span));
  // odznaki zdobyte (srebro/złoto) na przód, potem brąz, potem „w toku"
  const earned = data.badges.filter(
    (b) => b.nextThreshold === null || b.progress >= 1 || b.value > 0,
  );
  const sorted = [...data.badges].sort((a, b) => {
    const rank = (x: Badge) =>
      x.tier === "gold" ? 0 : x.tier === "silver" ? 1 : x.nextThreshold ? 3 : 2;
    return rank(a) - rank(b);
  });

  return (
    <>
      <SectionTitle>{t("m.game.title")}</SectionTitle>
      <Card style={{ gap: 12 }}>
        <View style={s.head}>
          <View style={s.levelBadge}>
            <Text style={s.levelNum}>{data.level}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.rank}>{t(rankKey(data.rankKey))}</Text>
            <Text style={s.points}>
              {data.points} {t("m.game.points")}
            </Text>
          </View>
          <Text style={s.earned}>
            {
              earned.filter((b) => b.progress >= 1 || (b.nextThreshold != null && b.value > 0))
                .length
            }
            /{data.badges.length} 🏅
          </Text>
        </View>

        <View style={s.barTrack}>
          <View style={[s.barFill, { width: `${pct * 100}%` }]} />
        </View>
        <Text style={s.toNext}>
          {data.levelCeil > data.levelFloor
            ? `${data.levelCeil - data.points} ${t("m.game.toNext")}`
            : t("m.game.maxRank")}
        </Text>

        <View style={s.badges}>
          {sorted.map((b) => {
            const active =
              b.progress >= 1 || (b.nextThreshold != null && b.value > 0 && b.progress > 0.3);
            return (
              <View
                key={b.key}
                style={[s.badge, { borderColor: active ? TIER_COLOR[b.tier] : palette.graphite }]}
              >
                <Text style={[s.badgeGlyph, !active && { opacity: 0.35 }]}>
                  {BADGE_GLYPH[b.key] ?? "🏅"}
                </Text>
                <Text style={s.badgeLabel} numberOfLines={1}>
                  {t(badgeKey(b.key))}
                </Text>
                <Text style={[s.badgeTier, { color: active ? TIER_COLOR[b.tier] : palette.smoke }]}>
                  {b.nextThreshold != null && b.progress < 1 && b.value < b.nextThreshold && !active
                    ? `${Math.round(b.progress * 100)}%`
                    : t(`m.game.tier.${b.tier}` as MobileMessageKey)}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>
    </>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  levelBadge: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: palette.red,
    alignItems: "center",
    justifyContent: "center",
  },
  levelNum: { color: palette.white, fontSize: 20, fontWeight: "800" },
  rank: { color: palette.offWhite, fontSize: 16, fontWeight: "800" },
  points: { color: palette.smoke, fontSize: 12.5, marginTop: 1 },
  earned: { color: palette.offWhite, fontSize: 13, fontWeight: "700" },
  barTrack: { height: 8, borderRadius: 999, backgroundColor: palette.graphite, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 999, backgroundColor: palette.red },
  toNext: { color: palette.smoke, fontSize: 11.5, marginTop: -4 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 2,
    minWidth: 76,
    flexGrow: 1,
  },
  badgeGlyph: { fontSize: 20 },
  badgeLabel: { color: palette.offWhite, fontSize: 10.5, fontWeight: "600" },
  badgeTier: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
});
