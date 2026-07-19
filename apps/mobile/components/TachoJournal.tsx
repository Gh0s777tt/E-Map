/**
 * #345: Dziennik Tacho na ekranie /tacho — kierowca loguje dzień pracy
 * (start/koniec) i odpoczynek tygodniowy (start z typem regularny/skrócony,
 * koniec). Zdarzenia zapisywane w profilu (DB), widoczne na bieżąco; po końcu
 * odpoczynku aplikacja odlicza do terminu kolejnego (144 h) i przypomina.
 */
import {
  listMyTachoEvents,
  type TachoEvent,
  type TachoEventKind,
  type TachoRestType,
} from "@e-logistic/api";
import { restCompensationLedger, weeklyRestsFromBoundaries } from "@e-logistic/core";
import type { MobileMessageKey } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fmtDT } from "../lib/date";
import { success, warn } from "../lib/haptics";
import { useT } from "../lib/i18n";
import { getSupabase } from "../lib/supabase";
import { logTachoEvent, WEEKLY_GAP_H } from "../lib/tachoJournal";
import { Card, SectionTitle } from "./ui";

const KIND_LABEL: Record<TachoEventKind, MobileMessageKey> = {
  work_start: "m.journal.workStart",
  work_end: "m.journal.workEnd",
  weekly_rest_start: "m.journal.weeklyStart",
  weekly_rest_end: "m.journal.weeklyEnd",
  daily_rest_start: "m.journal.dailyStart",
  daily_rest_end: "m.journal.dailyEnd",
};
const KIND_GLYPH: Record<TachoEventKind, string> = {
  work_start: "▶️",
  work_end: "⏹",
  weekly_rest_start: "🛌",
  weekly_rest_end: "✅",
  daily_rest_start: "😴",
  daily_rest_end: "☀️",
};

export function TachoJournal() {
  const t = useT();
  const [events, setEvents] = useState<TachoEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [pickType, setPickType] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEvents(await listMyTachoEvents(getSupabase(), { limit: 30 }));
    } catch {
      // offline — pokazujemy pusto
    }
  }, []);
  useEffect(() => {
    load();
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [load]);

  async function log(kind: TachoEventKind, restType?: TachoRestType) {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await logTachoEvent(kind, restType);
      success();
      setPickType(false);
      await load();
    } catch (e) {
      // #audyt Ś6: nie połykaj błędu cicho (sama haptyka) — pokaż komunikat, żeby
      // przycisk nie wyglądał na „martwy" gdy offline (brak konfiguracji/firmy/sieci)
      // i wpis nie ginął bez śladu (klasa buga #354).
      warn();
      setMsg(e instanceof Error ? e.message : t("m.manage.saveError"));
    } finally {
      setBusy(false);
    }
  }

  // Ostatni koniec odpoczynku tygodniowego → termin kolejnego (144 h).
  const lastWeeklyEnd = events.find((e) => e.kind === "weekly_rest_end");
  const deadlineMs = lastWeeklyEnd
    ? new Date(lastWeeklyEnd.at).getTime() + WEEKLY_GAP_H * 3_600_000
    : null;
  const hoursLeft = deadlineMs != null ? Math.round((deadlineMs - now) / 3_600_000) : null;

  const lastWorkStart = events.find((e) => e.kind === "work_start");
  const lastWorkEnd = events.find((e) => e.kind === "work_end");

  // Saldo kompensacji skróconych odpoczynków tygodniowych (561/2006 art. 8.6) —
  // z par start/koniec buduje ukończone odpoczynki i liczy dług en bloc.
  const comp = useMemo(() => {
    const boundaries = events
      .filter((e) => e.kind === "weekly_rest_start" || e.kind === "weekly_rest_end")
      .map((e) => ({ start: e.kind === "weekly_rest_start", atMs: Date.parse(e.at) }));
    if (boundaries.length === 0) return null;
    return restCompensationLedger(weeklyRestsFromBoundaries(boundaries), now);
  }, [events, now]);

  return (
    <>
      <SectionTitle>{t("m.journal.title")}</SectionTitle>
      <Card style={{ gap: 10 }}>
        {/* Status: bieżący dzień + termin odpoczynku tygodniowego */}
        {(lastWorkStart || lastWorkEnd) && (
          <Text style={s.status}>
            {lastWorkStart ? `▶️ ${fmtDT(lastWorkStart.at)}` : ""}
            {lastWorkEnd ? `   ⏹ ${fmtDT(lastWorkEnd.at)}` : ""}
          </Text>
        )}
        {hoursLeft != null && (
          <Text
            style={[
              s.deadline,
              { color: hoursLeft < 0 ? "#ef4444" : hoursLeft <= 12 ? "#f59e0b" : "#22c55e" },
            ]}
          >
            🛌{" "}
            {hoursLeft < 0
              ? t("m.journal.overdue")
              : `${t("m.journal.nextRest")}: ${t("m.journal.inHours", { h: hoursLeft })}`}
          </Text>
        )}

        {/* Przyciski dnia pracy */}
        <View style={s.row}>
          <Pressable style={[s.btn, s.btnGreen]} onPress={() => log("work_start")} disabled={busy}>
            <Text style={s.btnText}>▶️ {t("m.journal.startDay")}</Text>
          </Pressable>
          <Pressable style={[s.btn, s.btnGray]} onPress={() => log("work_end")} disabled={busy}>
            <Text style={s.btnText}>⏹ {t("m.journal.endDay")}</Text>
          </Pressable>
        </View>

        {/* Odpoczynek tygodniowy — wybór typu przy rozpoczęciu */}
        {pickType ? (
          <View style={{ gap: 8 }}>
            <Text style={s.pickHint}>{t("m.journal.pickType")}</Text>
            <View style={s.row}>
              <Pressable
                style={[s.btn, s.btnBlue]}
                onPress={() => log("weekly_rest_start", "regular")}
                disabled={busy}
              >
                <Text style={s.btnText}>45 h · {t("m.journal.regular")}</Text>
              </Pressable>
              <Pressable
                style={[s.btn, s.btnBlue]}
                onPress={() => log("weekly_rest_start", "reduced")}
                disabled={busy}
              >
                <Text style={s.btnText}>24 h · {t("m.journal.reduced")}</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setPickType(false)}>
              <Text style={s.cancel}>{t("m.journal.cancel")}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.row}>
            <Pressable style={[s.btn, s.btnBlue]} onPress={() => setPickType(true)} disabled={busy}>
              <Text style={s.btnText}>🛌 {t("m.journal.startWeekly")}</Text>
            </Pressable>
            <Pressable
              style={[s.btn, s.btnGray]}
              onPress={() => log("weekly_rest_end")}
              disabled={busy}
            >
              <Text style={s.btnText}>✅ {t("m.journal.endWeekly")}</Text>
            </Pressable>
          </View>
        )}

        {msg && <Text style={s.err}>{msg}</Text>}

        {/* Historia */}
        {events.length > 0 && (
          <View style={{ gap: 4, marginTop: 4 }}>
            <Text style={s.histHead}>{t("m.journal.history")}</Text>
            {events.slice(0, 8).map((e) => (
              <Text key={e.id} style={s.histRow}>
                {KIND_GLYPH[e.kind]} {t(KIND_LABEL[e.kind])}
                {e.rest_type ? ` (${e.rest_type === "regular" ? "45 h" : "24 h"})` : ""} ·{" "}
                {fmtDT(e.at)}
              </Text>
            ))}
          </View>
        )}

        {/* #4 Faza 2 — saldo kompensacji skróconych odpoczynków tygodniowych. */}
        {comp && (
          <View
            style={[
              s.compBox,
              {
                borderColor:
                  comp.overdueCount > 0
                    ? "#ef444488"
                    : comp.outstandingH > 0
                      ? "#f59e0b88"
                      : "#22c55e55",
              },
            ]}
          >
            <View style={s.compHead}>
              <Text style={s.compHeading}>🛏 {t("m.journal.comp.heading")}</Text>
              <Text
                style={[
                  s.compBig,
                  {
                    color:
                      comp.outstandingH > 0
                        ? comp.overdueCount > 0
                          ? "#ef4444"
                          : "#f59e0b"
                        : "#22c55e",
                  },
                ]}
              >
                {comp.outstandingH > 0
                  ? `${comp.outstandingH} h ${t("m.journal.comp.toRepay")}`
                  : `✅ ${t("m.journal.comp.clean")}`}
              </Text>
            </View>
            {comp.debts.some((d) => !d.settled) && (
              <View style={s.compList}>
                {comp.debts
                  .filter((d) => !d.settled)
                  .map((d) => (
                    <Text key={d.fromEndMs} style={s.compRow}>
                      <Text style={s.compOwed}>{d.owedH} h</Text> · {t("m.journal.comp.deadline")}{" "}
                      {fmtDT(d.deadlineMs)}
                      {d.overdue ? (
                        <Text style={s.compOverdue}> ⚠️ {t("m.journal.comp.overdue")}</Text>
                      ) : null}
                    </Text>
                  ))}
              </View>
            )}
            <Text style={s.compDisclaimer}>{t("m.journal.comp.disclaimer")}</Text>
          </View>
        )}

        <Text style={s.hint}>{t("m.journal.hint")}</Text>
      </Card>
    </>
  );
}

const s = StyleSheet.create({
  status: { color: palette.offWhite, fontSize: 13, fontWeight: "700" },
  deadline: { fontSize: 13.5, fontWeight: "800" },
  row: { flexDirection: "row", gap: 8 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  btnGreen: { backgroundColor: "#16794a" },
  btnGray: { backgroundColor: palette.graphite },
  btnBlue: { backgroundColor: "#2456a6" },
  btnText: { color: palette.white, fontWeight: "800", fontSize: 13 },
  pickHint: { color: palette.smoke, fontSize: 12.5 },
  err: { color: palette.red, fontSize: 12.5 },
  cancel: { color: palette.smoke, textAlign: "center", paddingVertical: 4 },
  histHead: { color: palette.offWhite, fontSize: 12.5, fontWeight: "800", marginTop: 4 },
  histRow: { color: palette.smoke, fontSize: 12.5, lineHeight: 18 },
  hint: { color: palette.smoke, fontSize: 12, lineHeight: 17 },
  compBox: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 4, gap: 8 },
  compHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  compHeading: { color: palette.offWhite, fontSize: 13, fontWeight: "800", flexShrink: 1 },
  compBig: { fontSize: 14, fontWeight: "800" },
  compList: { gap: 5 },
  compRow: { color: palette.smoke, fontSize: 12.5, lineHeight: 18 },
  compOwed: { color: palette.offWhite, fontWeight: "800" },
  compOverdue: { color: "#ef4444", fontWeight: "800" },
  compDisclaimer: { color: palette.smoke, fontSize: 11, lineHeight: 15 },
});
