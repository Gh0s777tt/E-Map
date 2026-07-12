/**
 * Prymitywy UI 2.0 aplikacji kierowcy (#285) — spójne karty, wiersze list,
 * chipy statusów i nagłówki w motywie red/black. Zero logiki — tylko wygląd
 * (+ #294: lekka haptyka przy dotknięciach, żeby apka czuła się natywnie).
 */
import { palette } from "@e-logistic/ui";
import { type ReactNode, useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { tap } from "../lib/haptics";

/** Owija onPress lekkim kliknięciem haptycznym. */
function withTap(onPress?: () => void): (() => void) | undefined {
  if (!onPress) return undefined;
  return () => {
    tap();
    onPress();
  };
}

/** Karta-kontener (ciemna, zaokrąglona, z obrysem). */
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[ui.card, style]}>{children}</View>;
}

/** Nagłówek sekcji (mały, wersalikowy, szary). */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={ui.sectionTitle}>{children}</Text>;
}

/** Duży tytuł ekranu (odpowiednik iOS large title). */
export function ScreenTitle({ children }: { children: ReactNode }) {
  return <Text style={ui.screenTitle}>{children}</Text>;
}

/** Kolorowy chip statusu (wypełniony). */
export function Chip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[ui.chip, { backgroundColor: color }]}>
      <Text style={ui.chipText}>{label}</Text>
    </View>
  );
}

/** Okrągły awatar z inicjałem. */
export function Avatar({ initial, size = 52 }: { initial: string; size?: number }) {
  return (
    <View
      style={[ui.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityLabel="Awatar"
    >
      <Text style={[ui.avatarText, { fontSize: size * 0.45 }]}>{initial}</Text>
    </View>
  );
}

/** #295: pulsujący szkielet ładowania (zamiast spinnera) — kształt przyszłej treści. */
export function Skeleton({ height = 44, style }: { height?: number; style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[{ height, borderRadius: 16, backgroundColor: palette.graphite, opacity }, style]}
    />
  );
}

/** Pasek postępu 0..1. */
export function ProgressBar({ value, color = palette.red }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={ui.progressTrack}>
      <View style={[ui.progressFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

export interface ListRowProps {
  glyph: string;
  title: string;
  subtitle?: string | null;
  badge?: number;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}

/** Wiersz listy sekcyjnej (ikona w kwadracie, tytuł, podtekst, badge, chevron). */
export function ListRow({ glyph, title, subtitle, badge, onPress, danger, last }: ListRowProps) {
  return (
    <Pressable onPress={withTap(onPress)} style={({ pressed }) => [pressed && ui.rowPressed]}>
      <View style={ui.row}>
        <View style={[ui.rowIcon, danger && { backgroundColor: palette.graphite }]}>
          <Text style={ui.rowGlyph}>{glyph}</Text>
        </View>
        <View style={ui.rowBody}>
          <Text style={[ui.rowTitle, danger && { color: palette.red }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={ui.rowSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {badge ? (
          <View style={ui.rowBadge}>
            <Text style={ui.rowBadgeText}>{badge}</Text>
          </View>
        ) : null}
        <Text style={ui.rowChevron}>›</Text>
      </View>
      {!last && <View style={ui.rowSeparator} />}
    </Pressable>
  );
}

/** Kafel szybkiej akcji (emoji + podpis). */
export function QuickAction({
  glyph,
  label,
  onPress,
}: {
  glyph: string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={withTap(onPress)}
      style={({ pressed }) => [ui.quick, pressed && ui.rowPressed]}
    >
      <Text style={ui.quickGlyph}>{glyph}</Text>
      <Text style={ui.quickLabel}>{label}</Text>
    </Pressable>
  );
}

/** Duży czerwony przycisk. */
export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={withTap(onPress)}
      disabled={disabled}
      style={({ pressed }) => [ui.primaryBtn, (pressed || disabled) && { opacity: 0.7 }]}
    >
      <Text style={ui.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

/** Przycisk drugorzędny (obrys). */
export function GhostButton({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={withTap(onPress)}
      style={({ pressed }) => [ui.ghostBtn, pressed && ui.rowPressed]}
    >
      <Text style={ui.ghostBtnText}>{label}</Text>
    </Pressable>
  );
}

const ui = StyleSheet.create({
  card: {
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  sectionTitle: {
    color: palette.smoke,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  screenTitle: { color: palette.offWhite, fontSize: 32, fontWeight: "800" },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, alignSelf: "flex-start" },
  chipText: { color: palette.black, fontSize: 13, fontWeight: "700" },
  avatar: { backgroundColor: palette.red, alignItems: "center", justifyContent: "center" },
  avatarText: { color: palette.white, fontWeight: "800" },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.graphite,
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: 3 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
  rowPressed: { opacity: 0.7 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: palette.red,
    alignItems: "center",
    justifyContent: "center",
  },
  rowGlyph: { fontSize: 21 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { color: palette.offWhite, fontSize: 16, fontWeight: "600" },
  rowSubtitle: { color: palette.smoke, fontSize: 13 },
  rowBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: palette.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  rowBadgeText: { color: palette.white, fontSize: 13, fontWeight: "800" },
  rowChevron: { color: palette.smoke, fontSize: 22, marginTop: -2 },
  rowSeparator: { height: 1, backgroundColor: palette.graphite, marginLeft: 52 },
  quick: {
    flex: 1,
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 14,
    gap: 6,
  },
  quickGlyph: { fontSize: 28 },
  quickLabel: { color: palette.smoke, fontSize: 13, fontWeight: "600" },
  primaryBtn: {
    backgroundColor: palette.red,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
    flex: 1,
  },
  primaryBtnText: { color: palette.white, fontWeight: "700", fontSize: 16 },
  ghostBtn: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
    flex: 1,
  },
  ghostBtnText: { color: palette.offWhite, fontWeight: "700", fontSize: 16 },
});
