/** #285: Czas pracy — podsumowanie miesiąca + ostatnie wpisy ewidencji. */
import { getActiveMembership, listWorkTimeEntries, type WorkTimeRecord } from "@e-logistic/api";
import { WTD_LIMITS, weeklyWorkingFromEntries, wtdStatus } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, SectionTitle, wide } from "../components/ui";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

// Ewidencja trzyma czas w GODZINACH (dziesiętnie), jak web/.ddd/checklist (min→h przez /60).
// Poprzednio dzielone /60 (jak minuty) → licznik pokazywał ~0; teraz godziny→min i rozbicie.
const h = (hours: number) => {
  const mins = Math.round(hours * 60);
  return `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, "0")} m`;
};

export default function WorkTimeScreen() {
  const t = useT();
  const [entries, setEntries] = useState<WorkTimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      const sb = getSupabase();
      const m = await getActiveMembership(sb);
      if (m) setEntries(await listWorkTimeEntries(sb, m.companyId, { limit: 90 }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("m.worktime.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  const month = new Date().toISOString().slice(0, 7);
  const inMonth = entries.filter((e) => e.work_date.startsWith(month));
  const driving = inMonth.reduce((a, e) => a + e.driving, 0);
  const other = inMonth.reduce((a, e) => a + e.other_work, 0);

  // WTD 2002/15/WE — REŻIM ODRĘBNY od 561/2006: średnia tygodniowa ≤ 48 h (okno 17 tyg.).
  // Mapowanie 1:1 jak w wersji web (toEntry): rekord ewidencji → WorkTimeEntry rdzenia.
  const wtd = useMemo(
    () =>
      wtdStatus(
        weeklyWorkingFromEntries(
          entries.map((e) => ({
            date: e.work_date,
            driving: e.driving,
            otherWork: e.other_work,
            rest: e.rest,
          })),
        ),
      ),
    [entries],
  );

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
      }
    >
      <SectionTitle>{t("m.worktime.currentMonth")}</SectionTitle>
      <View style={s.row}>
        <Card style={s.kpi}>
          <Text style={s.kpiLabel}>{t("m.worktime.dutyDays")}</Text>
          <Text style={s.kpiValue}>{inMonth.length}</Text>
        </Card>
        <Card style={s.kpi}>
          <Text style={s.kpiLabel}>{t("m.tacho.actDriving")}</Text>
          <Text style={s.kpiValue}>{h(driving)}</Text>
        </Card>
        <Card style={s.kpi}>
          <Text style={s.kpiLabel}>{t("m.tacho.actWork")}</Text>
          <Text style={s.kpiValue}>{h(other)}</Text>
        </Card>
      </View>

      {wtd.weeksCounted > 0 && (
        <View
          style={[
            s.wtd,
            {
              borderColor:
                wtd.avgOk && wtd.weeksOver60.length === 0
                  ? `${palette.success}55`
                  : `${palette.danger}88`,
            },
          ]}
        >
          <View style={s.wtdHead}>
            <Text style={s.wtdTitle}>⏱️ {t("m.worktime.wtd.heading")}</Text>
            <Text style={[s.wtdAvg, { color: wtd.avgOk ? palette.success : palette.red }]}>
              {t("m.worktime.wtd.avgLabel", { avg: wtd.avgWeeklyH, limit: WTD_LIMITS.weeklyAvg })}
            </Text>
          </View>
          <View style={s.wtdStats}>
            <View style={s.wtdStat}>
              <Text style={s.kpiLabel}>
                {t("m.worktime.wtd.period", { weeks: wtd.weeksCounted, ref: wtd.referenceWeeks })}
              </Text>
              <Text style={s.kpiValue}>{wtd.totalWorkingH} h</Text>
            </View>
            <View style={s.wtdStat}>
              <Text style={s.kpiLabel}>{t("m.worktime.wtd.maxWeek")}</Text>
              <Text
                style={[s.kpiValue, wtd.weeksOver60.length > 0 ? { color: palette.red } : null]}
              >
                {wtd.maxWeeklyH} h
              </Text>
            </View>
            <View style={s.wtdStat}>
              <Text style={s.kpiLabel}>{t("m.worktime.wtd.weeksOver60")}</Text>
              <Text
                style={[
                  s.kpiValue,
                  { color: wtd.weeksOver60.length > 0 ? palette.red : palette.success },
                ]}
              >
                {wtd.weeksOver60.length}
              </Text>
            </View>
            <View style={s.wtdStat}>
              <Text style={s.kpiLabel}>{t("m.worktime.wtd.budget")}</Text>
              <Text
                style={[
                  s.kpiValue,
                  { color: wtd.budgetToAvgH < 0 ? palette.red : palette.success },
                ]}
              >
                {wtd.budgetToAvgH} h
              </Text>
            </View>
          </View>
          <Text style={s.wtdNote}>{t("m.worktime.wtd.disclaimer")}</Text>
        </View>
      )}

      {err && <Text style={s.err}>{err}</Text>}
      {!loading && !err && entries.length === 0 && (
        <Text style={s.note}>{t("m.worktime.empty")}</Text>
      )}

      <SectionTitle>{t("m.worktime.recent")}</SectionTitle>
      {entries.slice(0, 30).map((e) => (
        <Card key={e.id} style={s.entry}>
          <View style={s.entryHead}>
            <Text style={s.entryDate}>{e.work_date}</Text>
            {e.driver_name ? <Text style={s.entryDriver}>{e.driver_name}</Text> : null}
          </View>
          <Text style={s.entryMeta}>
            🚚 {t("m.worktime.metaDriving")} {h(e.driving)} · 🔧 {t("m.worktime.metaOther")}{" "}
            {h(e.other_work)} · 🛏 {t("m.worktime.metaRest")} {h(e.rest)}
          </Text>
          {e.note ? <Text style={s.entryNote}>{e.note}</Text> : null}
        </Card>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  row: { flexDirection: "row", gap: 10 },
  kpi: { flex: 1, gap: 4 },
  kpiLabel: { color: palette.smoke, fontSize: 12 },
  kpiValue: { color: palette.offWhite, fontSize: 18, fontWeight: "800" },
  err: { color: palette.red, fontSize: 13 },
  note: { color: palette.smoke, fontSize: 14, textAlign: "center", lineHeight: 20, marginTop: 8 },
  entry: { gap: 4 },
  entryHead: { flexDirection: "row", justifyContent: "space-between" },
  entryDate: { color: palette.offWhite, fontWeight: "800", fontSize: 15 },
  entryDriver: { color: palette.smoke, fontSize: 13 },
  entryMeta: { color: palette.smoke, fontSize: 13 },
  entryNote: { color: palette.smoke, fontSize: 12, fontStyle: "italic" },
  wtd: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 12,
    backgroundColor: "rgba(127,127,127,0.06)",
  },
  wtdHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  wtdTitle: { color: palette.offWhite, fontWeight: "800", fontSize: 14 },
  wtdAvg: { fontWeight: "800", fontSize: 15 },
  wtdStats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  wtdStat: {
    flexGrow: 1,
    flexBasis: "45%",
    minWidth: 120,
    gap: 4,
    backgroundColor: palette.nearBlack,
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  wtdNote: { color: palette.smoke, fontSize: 11, lineHeight: 16 },
});
