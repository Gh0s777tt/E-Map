/**
 * #285: Moje rozliczenie — stawki firmy (#265) + szacunek bieżącego miesiąca
 * liczony silnikiem `computeDriverSettlement` z dni ewidencji czasu pracy.
 */
import { getActiveMembership, getSettlementSettings, listWorkTimeEntries } from "@e-logistic/api";
import {
  computeDriverSettlement,
  DEFAULT_SETTLEMENT_SETTINGS,
  type SettlementSettings,
} from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, SectionTitle } from "../components/ui";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

const zl = (n: number) => `${n.toFixed(2).replace(".", ",")} zł`;

export default function SettlementScreen() {
  const [settings, setSettings] = useState<SettlementSettings>(DEFAULT_SETTLEMENT_SETTINGS);
  const [days, setDays] = useState(0);
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
      if (!m) return;
      const [st, entries] = await Promise.all([
        getSettlementSettings(sb, m.companyId),
        listWorkTimeEntries(sb, m.companyId, { limit: 90 }),
      ]);
      setSettings(st);
      const month = new Date().toISOString().slice(0, 7);
      setDays(entries.filter((e) => e.work_date.startsWith(month)).length);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nie udało się pobrać rozliczenia.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // Szacunek: dni ze służby, bez tygodni km (te wpisuje firma przy rozliczeniu).
  const est = computeDriverSettlement({ days, weeks: [], settings });

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
      }
    >
      {err && <Text style={s.err}>{err}</Text>}

      <SectionTitle>Szacunek — bieżący miesiąc</SectionTitle>
      <Card style={s.total}>
        <Text style={s.totalLabel}>{days} dni służby (z ewidencji)</Text>
        <Text style={s.totalValue}>{zl(est.total)}</Text>
        <Text style={s.totalHint}>
          podstawa {zl(est.base)} · premie {zl(est.bonusTotal)} · telefon {zl(est.phone)}
        </Text>
      </Card>
      <Text style={s.note}>
        To podgląd wg stawek Twojej firmy — bez premii kilometrowych i potrąceń, które firma dolicza
        przy zamknięciu miesiąca. Pełne rozliczenie z PDF-em znajdziesz w panelu firmy.
      </Text>

      <SectionTitle>Stawki mojej firmy</SectionTitle>
      <Card style={s.rates}>
        {[
          ["Stawka dzienna", zl(settings.dailyRate)],
          ["Norma km / dzień", `${settings.kmNormPerDay} km`],
          ["Stawka za km ponad normę", zl(settings.kmRate)],
          ["Ubezpieczenie / dzień", zl(settings.insurancePerDay)],
          ["Ryczałt telefoniczny / mies.", zl(settings.phoneMonthly)],
          ["Premia dokumentacyjna / mies.", zl(settings.docBonusMonthly)],
        ].map(([label, value], i, arr) => (
          <View key={label} style={[s.rateRow, i < arr.length - 1 && s.rateSep]}>
            <Text style={s.rateLabel}>{label}</Text>
            <Text style={s.rateValue}>{value}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  err: { color: palette.red, fontSize: 13 },
  total: { gap: 6, alignItems: "center", paddingVertical: 22 },
  totalLabel: { color: palette.smoke, fontSize: 13 },
  totalValue: { color: palette.offWhite, fontSize: 40, fontWeight: "800" },
  totalHint: { color: palette.smoke, fontSize: 12 },
  note: { color: palette.smoke, fontSize: 12, lineHeight: 18 },
  rates: { paddingVertical: 4 },
  rateRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 11 },
  rateSep: { borderBottomWidth: 1, borderBottomColor: palette.graphite },
  rateLabel: { color: palette.smoke, fontSize: 14 },
  rateValue: { color: palette.offWhite, fontSize: 14, fontWeight: "700" },
});
