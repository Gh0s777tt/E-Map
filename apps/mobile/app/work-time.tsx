/** #285: Czas pracy — podsumowanie miesiąca + ostatnie wpisy ewidencji. */
import { getActiveMembership, listWorkTimeEntries, type WorkTimeRecord } from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, SectionTitle } from "../components/ui";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

const h = (mins: number) => `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, "0")} m`;

export default function WorkTimeScreen() {
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
      setErr(e instanceof Error ? e.message : "Nie udało się pobrać ewidencji.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const month = new Date().toISOString().slice(0, 7);
  const inMonth = entries.filter((e) => e.work_date.startsWith(month));
  const driving = inMonth.reduce((a, e) => a + e.driving, 0);
  const other = inMonth.reduce((a, e) => a + e.other_work, 0);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
      }
    >
      <SectionTitle>Bieżący miesiąc</SectionTitle>
      <View style={s.row}>
        <Card style={s.kpi}>
          <Text style={s.kpiLabel}>Dni służby</Text>
          <Text style={s.kpiValue}>{inMonth.length}</Text>
        </Card>
        <Card style={s.kpi}>
          <Text style={s.kpiLabel}>Jazda</Text>
          <Text style={s.kpiValue}>{h(driving)}</Text>
        </Card>
        <Card style={s.kpi}>
          <Text style={s.kpiLabel}>Inna praca</Text>
          <Text style={s.kpiValue}>{h(other)}</Text>
        </Card>
      </View>

      {err && <Text style={s.err}>{err}</Text>}
      {!loading && !err && entries.length === 0 && (
        <Text style={s.note}>
          Brak wpisów ewidencji. Dni pracy dopisują się automatycznie z checklisty „Tachograf" albo
          wpisuje je firma w panelu.
        </Text>
      )}

      <SectionTitle>Ostatnie wpisy</SectionTitle>
      {entries.slice(0, 30).map((e) => (
        <Card key={e.id} style={s.entry}>
          <View style={s.entryHead}>
            <Text style={s.entryDate}>{e.work_date}</Text>
            {e.driver_name ? <Text style={s.entryDriver}>{e.driver_name}</Text> : null}
          </View>
          <Text style={s.entryMeta}>
            🚚 jazda {h(e.driving)} · 🔧 inna {h(e.other_work)} · 🛏 odpoczynek {h(e.rest)}
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
});
