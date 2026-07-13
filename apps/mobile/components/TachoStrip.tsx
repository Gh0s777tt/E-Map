/**
 * #339: pasek Tacho na ekranie Start — najważniejsze liczniki 561 na widoku
 * bez wchodzenia w zakładkę Tacho: jazda dziś, do przerwy, do limitu tygodnia
 * i najbliższy odpoczynek. Dane z licznika LIVE (segmenty w AsyncStorage);
 * gdy licznik nieaktywny — kompaktowe wezwanie do uruchomienia.
 */
import { formatTachoMin } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useT } from "../lib/i18n";
import { type LiveSegment, liveStatus, liveToAetrInput, loadLiveSegments } from "../lib/tachoLive";

const colorFor = (min: number) => (min <= 0 ? "#ef4444" : min <= 30 ? "#f59e0b" : "#22c55e");

export function TachoStrip() {
  const t = useT();
  const router = useRouter();
  const [segments, setSegments] = useState<LiveSegment[]>([]);
  const [now, setNow] = useState(Date.now());

  const reload = useCallback(async () => {
    setSegments(await loadLiveSegments());
    setNow(Date.now());
  }, []);

  useEffect(() => {
    reload();
    const id = setInterval(reload, 60_000);
    return () => clearInterval(id);
  }, [reload]);

  const active = segments.length > 0;
  const status = active ? liveStatus(segments, now) : null;
  const input = active ? liveToAetrInput(segments, now) : null;

  if (!active || !status || !input) {
    return (
      <Pressable style={s.cta} onPress={() => router.push("/tacho")}>
        <Text style={s.ctaText}>🕓 {t("m.tacho.stripStart")}</Text>
      </Pressable>
    );
  }

  const cells: { label: string; value: string; color: string }[] = [
    {
      label: t("m.tacho.stripDriven"),
      value: formatTachoMin(input.dailyDrivingMin),
      color: palette.offWhite,
    },
    {
      label: t("m.tacho.toBreak"),
      value: formatTachoMin(status.toBreakMin),
      color: colorFor(status.toBreakMin),
    },
    {
      label: t("m.tacho.dailyLeft"),
      value: formatTachoMin(status.dailyRemainingMin),
      color: colorFor(status.dailyRemainingMin),
    },
    {
      label: t("m.tacho.weekLeft"),
      value: formatTachoMin(status.weeklyRemainingMin),
      color: colorFor(status.weeklyRemainingMin),
    },
  ];

  return (
    <Pressable style={s.wrap} onPress={() => router.push("/tacho")}>
      <View style={s.head}>
        <Text style={s.title}>🕓 {t("m.tacho.strip")}</Text>
        {status.alerts.length > 0 && <Text style={s.alert}>⚠️ {t("m.tacho.stripAlert")}</Text>}
      </View>
      <View style={s.grid}>
        {cells.map((c) => (
          <View key={c.label} style={s.cell}>
            <Text style={[s.value, { color: c.color }]}>{c.value}</Text>
            <Text style={s.label} numberOfLines={1}>
              {c.label}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: palette.offWhite, fontSize: 14, fontWeight: "800" },
  alert: { color: "#ef4444", fontSize: 11.5, fontWeight: "800" },
  grid: { flexDirection: "row", gap: 8 },
  cell: {
    flex: 1,
    alignItems: "center",
    backgroundColor: palette.black,
    borderRadius: 10,
    paddingVertical: 8,
  },
  value: { fontSize: 16, fontWeight: "800" },
  label: { color: palette.smoke, fontSize: 10, marginTop: 2, textAlign: "center" },
  cta: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  ctaText: { color: palette.offWhite, fontSize: 13.5, fontWeight: "600" },
});
