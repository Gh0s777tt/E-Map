/**
 * #327–#331: Tacho PRO — centrum tachografowe kierowcy:
 * • #329 Licznik LIVE: przełączasz czynność jak w tacho, aplikacja liczy
 *   jazdę ciągłą/dobową/tygodniową i wysyła LOKALNE powiadomienia o przerwie,
 * • #327 Licznik 561 (kalkulator ręczny) + #330 skan wyświetlacza OCR,
 * • #331 Planer odpoczynku tygodniowego (144 h, warianty 45/24 h),
 * • poradnik z realnych zdjęć VDO, wpis manualny, rozporządzenie 561/2006.
 */
import {
  type DriverRow,
  getActiveMembership,
  listDrivers,
  listTachoDownloads,
  type TachoDownloadRow,
} from "@e-logistic/api";
import {
  aetrStatus,
  checkDownload,
  DOWNLOAD_LIMITS,
  type DownloadStatus,
  formatTachoMin,
  type InfringementKind,
  type InfringementSeverity,
  inspectAetr,
  parseTachoTimes,
  planWeeklyRest,
} from "@e-logistic/core";
import type { MobileMessageKey } from "@e-logistic/i18n";
import { haversineKm } from "@e-logistic/maps";
import { palette } from "@e-logistic/ui";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { TachoJournal } from "../components/TachoJournal";
import { Card, Chip, SectionTitle, wide } from "../components/ui";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";
import {
  addKmToday,
  cancelBreakAlerts,
  type LiveActivity,
  type LiveSegment,
  liveStatus,
  loadKmToday,
  loadLiveSegments,
  resetLive,
  scheduleBreakAlerts,
  setLiveActivity,
} from "../lib/tachoLive";
import { useFleet } from "../lib/useFleet";

const BASE = "https://e-logistic-one.vercel.app/tacho";
const PDF_URL = `${BASE}/rozporzadzenie-561-2006.pdf`;

/** Zdjęcie poradnika z Vercela — po błędzie sieci/404 pokazuje dyskretny
 *  placeholder zamiast pustej ramki (podpis zostaje na miejscu). */
function TachoShot({ file, aspect, caption }: { file: string; aspect: number; caption: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <Card style={{ gap: 8, padding: 10 }}>
      {failed ? (
        <View style={[s.shotFallback, { aspectRatio: aspect }]}>
          <Text style={s.shotFallbackGlyph}>🖼</Text>
        </View>
      ) : (
        <Image
          source={{ uri: `${BASE}/${file}` }}
          style={{ width: "100%", aspectRatio: aspect, borderRadius: 8 }}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      )}
      <Text style={s.caption}>{caption}</Text>
    </Card>
  );
}

interface Shot {
  file: string;
  aspect: number;
  captionKey: MobileMessageKey;
}
const DRIVING_SHOTS: Shot[] = [
  { file: "jazda-ekran-glowny.jpg", aspect: 1600 / 1380, captionKey: "m.tacho.capJazdaMain" },
  { file: "jazda-do-przerwy.jpg", aspect: 1600 / 1303, captionKey: "m.tacho.capJazdaBreak" },
  { file: "jazda-cykl-4h30.jpg", aspect: 1600 / 1248, captionKey: "m.tacho.capJazdaCycle" },
];
const STOP_SHOTS: Shot[] = [
  { file: "postoj-ekran-glowny.jpg", aspect: 1600 / 951, captionKey: "m.tacho.capStopMain" },
  { file: "postoj-czas-utc.jpg", aspect: 1600 / 706, captionKey: "m.tacho.capStopUtc" },
  { file: "postoj-kredyty-9h-10h.jpg", aspect: 1600 / 810, captionKey: "m.tacho.capStopCredits" },
  { file: "postoj-limity-tygodnia.jpg", aspect: 1600 / 820, captionKey: "m.tacho.capStopWeek" },
  { file: "postoj-limity-doby.jpg", aspect: 1600 / 815, captionKey: "m.tacho.capStopDay" },
  { file: "postoj-do-odpoczynku.jpg", aspect: 1600 / 815, captionKey: "m.tacho.capStopRest" },
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

const LIVE_ACTIVITIES: { key: LiveActivity; glyph: string; labelKey: MobileMessageKey }[] = [
  { key: "driving", glyph: "🚛", labelKey: "m.tacho.actDriving" },
  { key: "break", glyph: "☕", labelKey: "m.tacho.actBreak" },
  { key: "work", glyph: "🔧", labelKey: "m.tacho.actWork" },
  { key: "rest", glyph: "🛏", labelKey: "m.tacho.actRest" },
];

// Wirtualny inspektor 561 — etykiety naruszeń i skala wagi (2006/22/WE zał. III).
const INFRINGEMENT_LABEL: Record<InfringementKind, MobileMessageKey> = {
  "continuous-driving": "m.tacho.infr.continuousDriving",
  "daily-driving": "m.tacho.infr.dailyDriving",
  "weekly-driving": "m.tacho.infr.weeklyDriving",
  "two-week-driving": "m.tacho.infr.twoWeekDriving",
};
const SEVERITY_LABEL: Record<InfringementSeverity, MobileMessageKey> = {
  minor: "m.tacho.severity.minor",
  serious: "m.tacho.severity.serious",
  very_serious: "m.tacho.severity.verySerious",
};
const SEVERITY_COLOR: Record<InfringementSeverity, string> = {
  minor: "#f59e0b",
  serious: "#f97316",
  very_serious: "#ef4444",
};

// Terminy sczytań (581/2010) — kolor i etykieta badge'a per status z silnika `checkDownload`.
const DL_STATUS_COLOR: Record<DownloadStatus, string> = {
  ok: "#22c55e",
  soon: "#f59e0b",
  overdue: "#ef4444",
};
const DL_STATUS_LABEL: Record<DownloadStatus, MobileMessageKey> = {
  ok: "m.tacho.dl.statusOk",
  soon: "m.tacho.dl.statusSoon",
  overdue: "m.tacho.dl.statusOverdue",
};

const colorFor = (min: number) => (min <= 0 ? "#ef4444" : min <= 30 ? "#f59e0b" : "#22c55e");

const fmtDT = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

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

/**
 * Faza 2 tacho: terminy sczytań (581/2010) — WYŁĄCZNIE podgląd dla właściciela/
 * dyspozytora. Karta kierowcy ≤ 28 dni, jednostka pojazdowa ≤ 90 dni; datę
 * ostatniego pobrania ustawia firma na webie, telefon tylko POKAZUJE status.
 * Ukrywa się dla kierowcy, offline oraz gdy tabela `tacho_downloads` nieobecna.
 */
function TachoDownloadsStatus() {
  const t = useT();
  const { vehicles } = useFleet();
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [rows, setRows] = useState<TachoDownloadRow[]>([]);
  const [canView, setCanView] = useState(false);
  // false dopóki tabela/migracja nieobecna (zapytanie rzuca) → sekcja ukryta zamiast błędu.
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let alive = true;
    (async () => {
      try {
        const sb = getSupabase();
        const m = await getActiveMembership(sb);
        if (!m || !alive) return;
        if (m.role !== "owner" && m.role !== "dispatcher") return; // read-only, tylko zarząd
        setCanView(true);
        listDrivers(sb, m.companyId)
          .then((d) => {
            if (alive) setDrivers(d);
          })
          .catch(() => {}); // brak kartoteki → etykiety zejdą do skróconego id
        try {
          const r = await listTachoDownloads(sb, m.companyId);
          if (alive) {
            setRows(r);
            setAvailable(true);
          }
        } catch {
          if (alive) setAvailable(false); // tabela tacho_downloads jeszcze nie nałożona
        }
      } catch {
        // offline / brak firmy → sekcja się nie pokaże
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const items = useMemo(() => {
    const n = new Date();
    const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
    const dName = (id: string | null) => {
      if (!id) return "—";
      const d = drivers.find((x) => x.id === id);
      return d ? `${d.first_name} ${d.last_name}`.trim() || id.slice(0, 8) : id.slice(0, 8);
    };
    const vReg = (id: string | null) =>
      id ? (vehicles.find((v) => v.id === id)?.registration ?? id.slice(0, 8)) : "—";
    return rows
      .map((r) => ({
        row: r,
        check: checkDownload(r.kind, r.last_download, today),
        label: r.kind === "card" ? dName(r.driver_id) : vReg(r.vehicle_id),
      }))
      .sort((a, b) => a.check.daysLeft - b.check.daysLeft);
  }, [rows, drivers, vehicles]);

  const overdue = items.filter((i) => i.check.status === "overdue").length;
  const soon = items.filter((i) => i.check.status === "soon").length;
  const attention = overdue + soon;
  const accent = overdue > 0 ? "#ef4444" : "#f59e0b";

  // Nic dla kierowcy, przy braku tabeli i dla pustej listy — sekcja tylko gdy jest co pokazać.
  if (!canView || !available || items.length === 0) return null;

  const counts: string[] = [];
  if (overdue > 0) counts.push(`${overdue} ${t("m.tacho.dl.statusOverdue")}`);
  if (soon > 0) counts.push(`${soon} ${t("m.tacho.dl.statusSoon")}`);

  return (
    <View style={[s.inspBox, { borderColor: attention > 0 ? `${accent}88` : "#22c55e55" }]}>
      <View style={s.inspHeader}>
        <Text style={s.inspHeading}>🗓️ {t("m.tacho.dl.heading")}</Text>
        {attention > 0 && (
          <View style={[s.inspCountPill, { backgroundColor: accent }]}>
            <Text style={s.inspCountText}>{attention}</Text>
          </View>
        )}
      </View>
      <Text style={s.hint}>
        {t("m.tacho.dl.limits", { card: DOWNLOAD_LIMITS.cardDays, vu: DOWNLOAD_LIMITS.vuDays })}
      </Text>
      {counts.length > 0 && (
        <Text style={[s.dlSummary, { color: accent }]}>{counts.join(" · ")}</Text>
      )}
      {items.map(({ row, check, label }) => (
        <View key={row.id} style={s.dlRow}>
          <View style={[s.dlBadge, { backgroundColor: DL_STATUS_COLOR[check.status] }]}>
            <Text style={s.dlBadgeText}>{t(DL_STATUS_LABEL[check.status])}</Text>
          </View>
          <View style={s.dlBody}>
            <Text style={s.dlLabel} numberOfLines={1}>
              {label}{" "}
              <Text style={s.dlKind}>
                · {row.kind === "card" ? t("m.tacho.dl.card") : t("m.tacho.dl.vu")}
              </Text>
            </Text>
            <Text style={s.dlMeta}>
              {t("m.tacho.dl.lastPrefix")} {check.lastISO} · {t("m.tacho.dl.duePrefix")}{" "}
              {check.dueISO} (
              {check.daysLeft < 0
                ? t("m.tacho.dl.overdueByDays", { days: -check.daysLeft })
                : t("m.tacho.dl.dueInDays", { days: check.daysLeft })}
              )
            </Text>
          </View>
        </View>
      ))}
      <Text style={s.inspDisclaimer}>{t("m.tacho.dl.disclaimer")}</Text>
    </View>
  );
}

export default function TachoScreen() {
  const t = useT();

  // ── #329: LIVE ────────────────────────────────────────────────────
  const [segments, setSegments] = useState<LiveSegment[]>([]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    loadLiveSegments().then(setSegments);
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const current = segments[segments.length - 1] ?? null;
  const live = segments.length > 0 ? liveStatus(segments, now) : null;
  const router = useRouter();

  // #332: GPS w trybie LIVE — prędkość, km dziś, auto-przełączenie na jazdę.
  const [speed, setSpeed] = useState<number | null>(null);
  const [kmToday, setKmToday] = useState(0);
  const lastFix = useRef<{ lat: number; lng: number } | null>(null);
  const currentRef = useRef(current);
  currentRef.current = current;
  const switchRef = useRef<(a: LiveActivity) => void>(() => {});
  useEffect(() => {
    loadKmToday().then(setKmToday);
  }, []);
  // #audyt tacho: GPS startuje przy WEJŚCIU na ekran (nie dopiero po ręcznym tapnięciu czynności).
  // Dzięki temu km liczą się automatycznie po ruszeniu, a auto-przełączenie >15 km/h samo otwiera
  // sesję „jazda". Licznik km działa, gdy ekran Tacho jest otwarty (foreground).
  // biome-ignore lint/correctness/useExhaustiveDependencies: watcher raz na montowanie ekranu
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      try {
        let perm = await Location.getForegroundPermissionsAsync();
        if (!perm.granted) perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted || cancelled) return;
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 30 },
          (pos) => {
            const raw = pos.coords.speed;
            const kmh = raw != null && raw >= 0 ? Math.round(raw * 3.6) : null;
            setSpeed(kmh);
            const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            const prev = lastFix.current;
            lastFix.current = fix;
            if (prev && currentRef.current?.activity === "driving") {
              const d = haversineKm(prev, fix);
              if (d > 0.02 && d < 3) addKmToday(d).then(setKmToday);
            }
            // auto-wypełnianie: ruszyłeś (>15 km/h) → licznik sam przechodzi na jazdę
            if (kmh != null && kmh > 15 && currentRef.current?.activity !== "driving") {
              switchRef.current("driving");
            }
          },
        );
      } catch {
        // GPS niedostępny / odmowa / błąd natywny — ekran Tacho działa dalej bez licznika km.
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  async function switchActivity(a: LiveActivity) {
    const segs = await setLiveActivity(a);
    setSegments([...segs]);
    setNow(Date.now());
    if (a === "driving") {
      const st = liveStatus(segs, Date.now());
      await scheduleBreakAlerts(st.toBreakMin, {
        warn: t("m.tacho.notifWarn"),
        now: t("m.tacho.notifNow"),
      });
    } else {
      await cancelBreakAlerts();
    }
  }
  switchRef.current = switchActivity;

  // ── #327: kalkulator ręczny ───────────────────────────────────────
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
  // Wirtualna kontrola 561 — te same wejścia co licznik, wykrywa naruszenia czasu jazdy.
  const insp = inspectAetr({
    continuousDrivingMin: continuous,
    breakTakenMin: breakTaken,
    dailyDrivingMin: daily,
    weeklyDrivingMin: weekly,
    prevWeekDrivingMin: prevWeek,
    extendedDrivesUsed: extUsed,
    reducedRestsUsed: redUsed,
  });

  // ── #330: OCR wyświetlacza ────────────────────────────────────────
  const [detected, setDetected] = useState<number[]>([]);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  async function scanDisplay() {
    setScanMsg(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      // #354: bez tego tapnięcie przy odmowie aparatu nic nie robiło (cichy return).
      setScanMsg(t("m.tacho.scanNoCamera"));
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (res.canceled) return;
    const uri = res.assets[0]?.uri;
    if (!uri) return;
    try {
      const TextRecognition = (await import("@react-native-ml-kit/text-recognition")).default;
      const text = (await TextRecognition.recognize(uri)).text;
      const times = parseTachoTimes(text);
      setDetected(times);
      if (times.length === 0) setScanMsg(t("m.tacho.scanNone"));
    } catch {
      setScanMsg(t("m.tacho.scanNone"));
    }
  }

  // ── #331: planer odpoczynku tygodniowego ──────────────────────────
  const [pDate, setPDate] = useState("");
  const [pTime, setPTime] = useState("06:00");
  const [pType, setPType] = useState<"regular" | "reduced">("regular");
  const endMs = Date.parse(`${pDate.trim()}T${pTime.trim() || "00:00"}:00`);
  const plan = Number.isFinite(endMs)
    ? planWeeklyRest({ lastWeeklyRestEndMs: endMs, lastType: pType }, now)
    : null;

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
      <TachoShot key={file} file={file} aspect={aspect} caption={t(captionKey)} />
    ));

  const currentMin = current ? Math.max(0, Math.round((now - current.start) / 60_000)) : 0;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, wide]}>
      {/* Rozporządzenie — zawsze na wierzchu */}
      <Pressable style={s.regBtn} onPress={() => Linking.openURL(PDF_URL).catch(() => {})}>
        <Text style={s.regBtnText}>📜 {t("m.tacho.regulation")}</Text>
      </Pressable>
      <Text style={s.hint}>{t("m.tacho.regulationHint")}</Text>
      <Pressable style={s.worktimeBtn} onPress={() => router.push("/work-time")}>
        <Text style={s.worktimeText}>📋 {t("m.tacho.worktime")}</Text>
        <Text style={s.hint}>{t("m.tacho.worktimeHint")}</Text>
      </Pressable>

      {/* Terminy sczytań (581/2010) — read-only, tylko właściciel/dyspozytor */}
      <TachoDownloadsStatus />

      {/* #329: Licznik LIVE */}
      <SectionTitle>{t("m.tacho.live")}</SectionTitle>
      <Card style={{ gap: 10 }}>
        <View style={s.liveRow}>
          {LIVE_ACTIVITIES.map((a) => {
            const on = current?.activity === a.key;
            return (
              <Pressable
                key={a.key}
                style={[s.liveBtn, on && s.liveBtnOn]}
                onPress={() => switchActivity(a.key)}
              >
                <Text style={s.liveGlyph}>{a.glyph}</Text>
                <Text style={[s.liveLabel, on && { color: palette.white }]}>{t(a.labelKey)}</Text>
              </Pressable>
            );
          })}
        </View>
        {live && current ? (
          <>
            <Text style={s.liveNow}>
              {LIVE_ACTIVITIES.find((a) => a.key === current.activity)?.glyph}{" "}
              {formatTachoMin(currentMin)}
            </Text>
            <View style={s.liveStats}>
              {speed != null && <Chip label={`🚀 ${speed} km/h`} color="#3b82f6" />}
              <Chip label={`🛣 ${kmToday.toFixed(1)} km`} color="#a855f7" />
              <Chip
                label={`${t("m.tacho.toBreak")}: ${formatTachoMin(live.toBreakMin)}`}
                color={colorFor(live.toBreakMin)}
              />
              <Chip
                label={`${t("m.tacho.dailyLeft")}: ${formatTachoMin(live.dailyRemainingMin)}`}
                color={colorFor(live.dailyRemainingMin)}
              />
              <Chip
                label={`${t("m.tacho.weekLeft")}: ${formatTachoMin(live.weeklyRemainingMin)}`}
                color={colorFor(live.weeklyRemainingMin)}
              />
            </View>
            <Pressable
              onPress={async () => {
                await resetLive();
                setSegments([]);
              }}
            >
              <Text style={s.liveReset}>✕ {t("m.tacho.liveReset")}</Text>
            </Pressable>
          </>
        ) : (
          <Text style={s.hint}>{t("m.tacho.liveOff")}</Text>
        )}
        <Text style={s.hint}>{t("m.tacho.liveHint")}</Text>
        <Text style={s.hint}>{t("m.tacho.gpsHint")}</Text>
      </Card>

      {/* #327: Licznik 561 (ręczny) + #330 OCR */}
      <SectionTitle>{t("m.tacho.counter")}</SectionTitle>
      <Card style={{ gap: 4 }}>
        <Pressable style={s.scanBtn} onPress={scanDisplay}>
          <Text style={s.scanBtnText}>📷 {t("m.tacho.scan")}</Text>
        </Pressable>
        <Text style={s.hint}>{t("m.tacho.scanHint")}</Text>
        {scanMsg && <Text style={s.hint}>{scanMsg}</Text>}
        {detected.length > 0 && (
          <View style={{ gap: 6, paddingVertical: 4 }}>
            <Text style={s.detectedTitle}>{t("m.tacho.scanDetected")}:</Text>
            {detected.map((v) => (
              <View key={v} style={s.detectedRow}>
                <Text style={s.detectedValue}>{formatTachoMin(v)}</Text>
                <Pressable style={s.assignBtn} onPress={() => setContinuous(Math.min(360, v))}>
                  <Text style={s.assignText}>{t("m.tacho.assignContinuous")}</Text>
                </Pressable>
                <Pressable style={s.assignBtn} onPress={() => setDaily(Math.min(660, v))}>
                  <Text style={s.assignText}>{t("m.tacho.assignDaily")}</Text>
                </Pressable>
                <Pressable style={s.assignBtn} onPress={() => setWeekly(Math.min(3600, v))}>
                  <Text style={s.assignText}>{t("m.tacho.assignWeekly")}</Text>
                </Pressable>
                <Pressable style={s.assignBtn} onPress={() => setPrevWeek(Math.min(3600, v))}>
                  <Text style={s.assignText}>{t("m.tacho.assignPrev")}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
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

      {/* Wirtualna kontrola 561 — pre-kontrola naruszeń czasu jazdy (2006/22/WE zał. III) */}
      <View
        style={[
          s.inspBox,
          {
            borderColor: insp.clean
              ? "#22c55e55"
              : `${SEVERITY_COLOR[insp.worst ?? "very_serious"]}88`,
          },
        ]}
      >
        <View style={s.inspHeader}>
          <Text style={s.inspHeading}>🚔 {t("m.tacho.inspection.heading")}</Text>
          {!insp.clean && (
            <View
              style={[
                s.inspCountPill,
                { backgroundColor: SEVERITY_COLOR[insp.worst ?? "very_serious"] },
              ]}
            >
              <Text style={s.inspCountText}>{insp.infringements.length}</Text>
            </View>
          )}
        </View>
        {insp.clean ? (
          <Text style={s.inspClean}>✅ {t("m.tacho.inspection.clean")}</Text>
        ) : (
          insp.infringements.map((i) => (
            <View key={i.kind} style={s.inspRow}>
              <View style={[s.sevBadge, { backgroundColor: SEVERITY_COLOR[i.severity] }]}>
                <Text style={s.sevBadgeText}>{t(SEVERITY_LABEL[i.severity])}</Text>
              </View>
              <Text style={s.inspLabel}>{t(INFRINGEMENT_LABEL[i.kind])}</Text>
              <Text style={s.inspOver}>+{formatTachoMin(i.byMin)}</Text>
              <Text style={s.inspLimit}>≤ {formatTachoMin(i.limitMin)}</Text>
            </View>
          ))
        )}
        <Text style={s.inspDisclaimer}>{t("m.tacho.inspection.disclaimer")}</Text>
      </View>

      <Text style={s.hint}>{t("m.tacho.counterHint")}</Text>

      {/* #345: Dziennik — dzień pracy i odpoczynek tygodniowy zapisywane w profilu */}
      <TachoJournal />

      {/* #331: Planer odpoczynku tygodniowego */}
      <SectionTitle>{t("m.tacho.planner")}</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Text style={s.hint}>{t("m.tacho.plannerHint")}</Text>
        <Text style={s.detectedTitle}>{t("m.tacho.plannerEnd")}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={[s.input, { flex: 1.4 }]}
            value={pDate}
            onChangeText={setPDate}
            placeholder="2026-07-12"
            placeholderTextColor={palette.smoke}
            autoCapitalize="none"
          />
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={pTime}
            onChangeText={setPTime}
            placeholder="06:00"
            placeholderTextColor={palette.smoke}
            autoCapitalize="none"
          />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["regular", "reduced"] as const).map((k) => (
            <Pressable
              key={k}
              style={[s.typeBtn, pType === k && s.typeBtnOn]}
              onPress={() => setPType(k)}
            >
              <Text style={[s.typeText, pType === k && { color: palette.white }]}>
                {k === "regular" ? t("m.tacho.plannerRegular") : t("m.tacho.plannerReduced")}
              </Text>
            </Pressable>
          ))}
        </View>
        {plan && (
          <View style={{ gap: 6 }}>
            <Text
              style={[
                s.planLine,
                {
                  color:
                    plan.hoursUntilLatestStart < 0
                      ? "#ef4444"
                      : colorFor(plan.hoursUntilLatestStart * 60),
                },
              ]}
            >
              ⏳ {t("m.tacho.latestStart")}: {fmtDT(plan.latestStartMs)}{" "}
              {plan.hoursUntilLatestStart >= 0
                ? `(${t("m.tacho.hoursLeft")} ${plan.hoursUntilLatestStart.toFixed(0)} h)`
                : ""}
            </Text>
            {plan.hoursUntilLatestStart < 0 && (
              <Text style={s.alert}>{t("m.tacho.overdueRest")}</Text>
            )}
            {plan.mustBeRegular && <Text style={s.planWarn}>⚠️ {t("m.tacho.mustRegular")}</Text>}
            <Text style={s.planLine}>
              🛏 {t("m.tacho.optRegular")}: {fmtDT(plan.regularEndMs)}
            </Text>
            {plan.reducedEndMs != null && (
              <Text style={s.planLine}>
                💤 {t("m.tacho.optReduced")}: {fmtDT(plan.reducedEndMs)}
                {plan.compensationDeadlineMs != null &&
                  ` (${t("m.tacho.compensation")} ${fmtDT(plan.compensationDeadlineMs)})`}
              </Text>
            )}
          </View>
        )}
      </Card>

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
  shotFallback: {
    width: "100%",
    borderRadius: 8,
    backgroundColor: palette.nearBlack,
    borderWidth: 1,
    borderColor: palette.graphite,
    alignItems: "center",
    justifyContent: "center",
  },
  shotFallbackGlyph: { fontSize: 28, opacity: 0.4 },
  liveRow: { flexDirection: "row", gap: 8 },
  liveBtn: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 12,
    paddingVertical: 10,
  },
  liveBtnOn: { backgroundColor: palette.red, borderColor: palette.red },
  liveGlyph: { fontSize: 18 },
  liveLabel: { color: palette.smoke, fontSize: 11, fontWeight: "700" },
  liveNow: { color: palette.offWhite, fontSize: 22, fontWeight: "800", textAlign: "center" },
  liveStats: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  liveReset: { color: palette.smoke, fontSize: 12.5, textAlign: "center", paddingVertical: 2 },
  scanBtn: {
    borderWidth: 1,
    borderColor: palette.red,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  scanBtnText: { color: palette.red, fontWeight: "800", fontSize: 13.5 },
  detectedTitle: { color: palette.offWhite, fontSize: 13, fontWeight: "700" },
  detectedRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  detectedValue: { color: palette.offWhite, fontSize: 14, fontWeight: "800", minWidth: 52 },
  assignBtn: {
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  assignText: { color: palette.smoke, fontSize: 11.5, fontWeight: "700" },
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
  inspBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: palette.nearBlack,
  },
  inspHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  inspHeading: { color: palette.offWhite, fontSize: 14, fontWeight: "800" },
  inspCountPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  inspCountText: { color: palette.black, fontSize: 12.5, fontWeight: "800" },
  inspClean: { color: "#22c55e", fontSize: 13, fontWeight: "800" },
  inspRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  sevBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  sevBadgeText: {
    color: palette.black,
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  inspLabel: { color: palette.offWhite, fontSize: 12.5, flex: 1, minWidth: 120 },
  inspOver: { color: palette.offWhite, fontSize: 12.5, fontWeight: "800" },
  inspLimit: { color: palette.smoke, fontSize: 12 },
  inspDisclaimer: { color: palette.smoke, fontSize: 11, lineHeight: 15 },
  stepItem: { flexDirection: "row", gap: 10 },
  stepNo: { color: palette.red, fontWeight: "800", fontSize: 14, width: 18, textAlign: "center" },
  stepText: { color: palette.offWhite, fontSize: 13.5, lineHeight: 19, flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: palette.offWhite,
    fontSize: 14,
    backgroundColor: palette.nearBlack,
  },
  typeBtn: {
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  typeBtnOn: { backgroundColor: palette.red, borderColor: palette.red },
  typeText: { color: palette.smoke, fontSize: 12.5, fontWeight: "700" },
  planLine: { color: palette.offWhite, fontSize: 13.5, lineHeight: 19 },
  planWarn: { color: "#f59e0b", fontSize: 13, fontWeight: "700" },
  worktimeBtn: {
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  worktimeText: { color: palette.offWhite, fontSize: 14, fontWeight: "800" },
  dlSummary: { fontSize: 12.5, fontWeight: "800" },
  dlRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  dlBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 1 },
  dlBadgeText: {
    color: palette.black,
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  dlBody: { flex: 1, gap: 2 },
  dlLabel: { color: palette.offWhite, fontSize: 13, fontWeight: "700" },
  dlKind: { color: palette.smoke, fontSize: 12, fontWeight: "600" },
  dlMeta: { color: palette.smoke, fontSize: 12, lineHeight: 16 },
});
