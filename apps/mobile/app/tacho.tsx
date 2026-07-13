/**
 * #327: Tacho 2.0 — centrum wiedzy i licznik 561 w aplikacji:
 * • Licznik 561 (jak licznik VDO): interaktywny kalkulator przerw i limitów
 *   jazdy z silnika `aetrStatus` (@e-logistic/core),
 * • Poradnik „co pokazuje tachograf" — realne zdjęcia wyświetlacza VDO
 *   (postój i jazda) z opisami,
 * • Wpis manualny krok po kroku (własne opracowanie),
 * • Rozporządzenie (WE) 561/2006 — pełny PDF zawsze pod ręką.
 */
import { aetrStatus, formatTachoMin } from "@e-logistic/core";
import type { MobileMessageKey } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, SectionTitle, wide } from "../components/ui";
import { useT } from "../lib/i18n";

const BASE = "https://e-logistic-one.vercel.app/tacho";
const PDF_URL = `${BASE}/rozporzadzenie-561-2006.pdf`;

interface Shot {
  file: string;
  aspect: number;
  captionKey: MobileMessageKey;
}
const DRIVING_SHOTS: Shot[] = [
  { file: "jazda-ekran-glowny.jpg", aspect: 1200 / 795, captionKey: "m.tacho.capJazdaMain" },
  { file: "jazda-do-przerwy.jpg", aspect: 1200 / 687, captionKey: "m.tacho.capJazdaBreak" },
  { file: "jazda-cykl-4h30.jpg", aspect: 1200 / 705, captionKey: "m.tacho.capJazdaCycle" },
];
const STOP_SHOTS: Shot[] = [
  { file: "postoj-ekran-glowny.jpg", aspect: 1200 / 736, captionKey: "m.tacho.capStopMain" },
  { file: "postoj-czas-utc.jpg", aspect: 1200 / 469, captionKey: "m.tacho.capStopUtc" },
  { file: "postoj-kredyty-9h-10h.jpg", aspect: 1200 / 558, captionKey: "m.tacho.capStopCredits" },
  { file: "postoj-limity-tygodnia.jpg", aspect: 1200 / 671, captionKey: "m.tacho.capStopWeek" },
  { file: "postoj-limity-doby.jpg", aspect: 1200 / 606, captionKey: "m.tacho.capStopDay" },
  { file: "postoj-do-odpoczynku.jpg", aspect: 1200 / 577, captionKey: "m.tacho.capStopRest" },
];

const MANUAL_STEPS: MobileMessageKey[] = [
  "m.tacho.manualStep1",
  "m.tacho.manualStep2",
  "m.tacho.manualStep3",
  "m.tacho.manualStep4",
  "m.tacho.manualStep5",
  "m.tacho.manualStep6",
  "m.tacho.manualStep7",
];

/** Wiersz kalkulatora: etykieta + wartość + przyciski −/+. */
function Stepper({
  label,
  value,
  display,
  onChange,
  step,
  max,
}: {
  label: string;
  value: number;
  display: string;
  onChange: (v: number) => void;
  step: number;
  max: number;
}) {
  return (
    <View style={s.stepRow}>
      <Text style={s.stepLabel} numberOfLines={2}>
        {label}
      </Text>
      <Pressable style={s.stepBtn} onPress={() => onChange(Math.max(0, value - step))} hitSlop={6}>
        <Text style={s.stepBtnText}>−</Text>
      </Pressable>
      <Text style={s.stepValue}>{display}</Text>
      <Pressable
        style={s.stepBtn}
        onPress={() => onChange(Math.min(max, value + step))}
        hitSlop={6}
      >
        <Text style={s.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

export default function TachoScreen() {
  const t = useT();
  const [continuous, setContinuous] = useState(0);
  const [breakTaken, setBreakTaken] = useState(0);
  const [daily, setDaily] = useState(0);
  const [weekly, setWeekly] = useState(0);
  const [prevWeek, setPrevWeek] = useState(0);
  const [extUsed, setExtUsed] = useState(0);
  const [redUsed, setRedUsed] = useState(0);

  const st = aetrStatus({
    continuousDrivingMin: continuous,
    breakTakenMin: breakTaken,
    dailyDrivingMin: daily,
    weeklyDrivingMin: weekly,
    prevWeekDrivingMin: prevWeek,
    extendedDrivesUsed: extUsed,
    reducedRestsUsed: redUsed,
  });

  const colorFor = (min: number) => (min <= 0 ? "#ef4444" : min <= 30 ? "#f59e0b" : "#22c55e");

  const results: { label: string; value: string; color: string }[] = [
    {
      label: t("m.tacho.toBreak"),
      value: formatTachoMin(st.toBreakMin),
      color: colorFor(st.toBreakMin),
    },
    { label: t("m.tacho.reqBreak"), value: `${st.requiredBreakMin} min`, color: palette.offWhite },
    {
      label: t("m.tacho.dailyLeft"),
      value: formatTachoMin(st.dailyRemainingMin),
      color: colorFor(st.dailyRemainingMin),
    },
    {
      label: t("m.tacho.dailyLeftExt"),
      value:
        st.dailyRemainingExtendedMin != null ? formatTachoMin(st.dailyRemainingExtendedMin) : "—",
      color: palette.offWhite,
    },
    {
      label: t("m.tacho.weekLeft"),
      value: formatTachoMin(st.weeklyRemainingMin),
      color: colorFor(st.weeklyRemainingMin),
    },
    {
      label: t("m.tacho.twoWeekLeft"),
      value: formatTachoMin(st.twoWeekRemainingMin),
      color: palette.offWhite,
    },
    { label: t("m.tacho.extLeft"), value: `${st.extendedLeft} × 10h`, color: palette.offWhite },
    { label: t("m.tacho.redLeft"), value: `${st.reducedRestsLeft} × 9h`, color: palette.offWhite },
  ];

  const shotBlock = (shots: Shot[]) =>
    shots.map(({ file, aspect, captionKey }) => (
      <Card key={file} style={{ gap: 8, padding: 10 }}>
        <Image
          source={{ uri: `${BASE}/${file}` }}
          style={{ width: "100%", aspectRatio: aspect, borderRadius: 8 }}
          resizeMode="contain"
        />
        <Text style={s.caption}>{t(captionKey)}</Text>
      </Card>
    ));

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, wide]}>
      {/* Rozporządzenie — zawsze na wierzchu */}
      <Pressable style={s.regBtn} onPress={() => Linking.openURL(PDF_URL)}>
        <Text style={s.regBtnText}>📜 {t("m.tacho.regulation")}</Text>
      </Pressable>
      <Text style={s.hint}>{t("m.tacho.regulationHint")}</Text>

      {/* Licznik 561 */}
      <SectionTitle>{t("m.tacho.counter")}</SectionTitle>
      <Card style={{ gap: 4 }}>
        <Stepper
          label={t("m.tacho.inContinuous")}
          value={continuous}
          display={formatTachoMin(continuous)}
          onChange={setContinuous}
          step={15}
          max={360}
        />
        <Stepper
          label={t("m.tacho.inBreakTaken")}
          value={breakTaken}
          display={`${breakTaken} min`}
          onChange={setBreakTaken}
          step={15}
          max={45}
        />
        <Stepper
          label={t("m.tacho.inDaily")}
          value={daily}
          display={formatTachoMin(daily)}
          onChange={setDaily}
          step={30}
          max={660}
        />
        <Stepper
          label={t("m.tacho.inWeekly")}
          value={weekly}
          display={formatTachoMin(weekly)}
          onChange={setWeekly}
          step={60}
          max={3600}
        />
        <Stepper
          label={t("m.tacho.inPrevWeek")}
          value={prevWeek}
          display={formatTachoMin(prevWeek)}
          onChange={setPrevWeek}
          step={60}
          max={3600}
        />
        <Stepper
          label={t("m.tacho.inExtUsed")}
          value={extUsed}
          display={`${extUsed}`}
          onChange={setExtUsed}
          step={1}
          max={2}
        />
        <Stepper
          label={t("m.tacho.inRedUsed")}
          value={redUsed}
          display={`${redUsed}`}
          onChange={setRedUsed}
          step={1}
          max={3}
        />
      </Card>
      {st.alerts.length > 0 && <Text style={s.alert}>{t("m.tacho.alert")}</Text>}
      <View style={s.resultGrid}>
        {results.map((r) => (
          <Card key={r.label} style={s.resultCard}>
            <Text style={[s.resultValue, { color: r.color }]}>{r.value}</Text>
            <Text style={s.resultLabel}>{r.label}</Text>
          </Card>
        ))}
      </View>
      <Text style={s.hint}>{t("m.tacho.counterHint")}</Text>

      {/* Poradnik: zdjęcia */}
      <SectionTitle>{t("m.tacho.guide")}</SectionTitle>
      <Text style={s.subTitle}>🚛 {t("m.tacho.guideDriving")}</Text>
      {shotBlock(DRIVING_SHOTS)}
      <Text style={s.subTitle}>🅿️ {t("m.tacho.guideStop")}</Text>
      {shotBlock(STOP_SHOTS)}

      {/* Wpis manualny */}
      <SectionTitle>{t("m.tacho.manual")}</SectionTitle>
      <Card style={{ gap: 10 }}>
        {MANUAL_STEPS.map((key, i) => (
          <View key={key} style={s.stepItem}>
            <Text style={s.stepNo}>{i + 1}</Text>
            <Text style={s.stepText}>{t(key)}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  regBtn: {
    backgroundColor: palette.red,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  regBtnText: { color: palette.white, fontWeight: "800", fontSize: 15 },
  hint: { color: palette.smoke, fontSize: 12.5, lineHeight: 18 },
  subTitle: { color: palette.offWhite, fontSize: 14, fontWeight: "800", marginTop: 4 },
  caption: { color: palette.smoke, fontSize: 12.5, lineHeight: 18 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 },
  stepLabel: { color: palette.offWhite, fontSize: 13, flex: 1 },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.graphite,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { color: palette.red, fontSize: 18, fontWeight: "800" },
  stepValue: {
    color: palette.offWhite,
    fontSize: 14,
    fontWeight: "800",
    minWidth: 56,
    textAlign: "center",
  },
  alert: { color: "#ef4444", fontSize: 13.5, fontWeight: "800" },
  resultGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  resultCard: { flexGrow: 1, minWidth: 150, alignItems: "center" },
  resultValue: { fontSize: 20, fontWeight: "800" },
  resultLabel: { color: palette.smoke, fontSize: 11.5, marginTop: 3, textAlign: "center" },
  stepItem: { flexDirection: "row", gap: 10 },
  stepNo: {
    color: palette.red,
    fontWeight: "800",
    fontSize: 14,
    width: 18,
    textAlign: "center",
  },
  stepText: { color: palette.offWhite, fontSize: 13.5, lineHeight: 19, flex: 1 },
});
