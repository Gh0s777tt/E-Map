/** #285: Statystyki — ostatnie 30 dni tankowań (litry, koszt) + lista wpisów. */
import { listFuelLogs } from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, SectionTitle } from "../components/ui";
import { getSupabase, supabaseConfigured } from "../lib/supabase";
import { useFleet } from "../lib/useFleet";

interface FuelRow {
  id: string;
  vehicle_id: string | null;
  liters: number | null;
  price_total: number | null;
  station_country: string | null;
  station_city: string | null;
  created_at: string;
}

export default function StatsScreen() {
  const { vehicles } = useFleet();
  const [logs, setLogs] = useState<FuelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      const from = new Date(Date.now() - 30 * 86_400_000).toISOString();
      setLogs((await listFuelLogs(getSupabase(), { from, limit: 100 })) as FuelRow[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nie udało się pobrać statystyk.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const liters = logs.reduce((a, l) => a + (l.liters ?? 0), 0);
  const cost = logs.reduce((a, l) => a + (l.price_total ?? 0), 0);
  const regOf = (id: string | null) =>
    id ? (vehicles.find((v) => v.id === id)?.registration ?? "—") : "—";

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
      }
    >
      <SectionTitle>Ostatnie 30 dni</SectionTitle>
      <View style={s.row}>
        <Card style={s.kpi}>
          <Text style={s.kpiLabel}>Tankowania</Text>
          <Text style={s.kpiValue}>{logs.length}</Text>
        </Card>
        <Card style={s.kpi}>
          <Text style={s.kpiLabel}>Litry</Text>
          <Text style={s.kpiValue}>{Math.round(liters)}</Text>
        </Card>
        <Card style={s.kpi}>
          <Text style={s.kpiLabel}>Koszt</Text>
          <Text style={s.kpiValue}>{Math.round(cost)}</Text>
        </Card>
      </View>

      {err && <Text style={s.err}>{err}</Text>}
      {!loading && !err && logs.length === 0 && (
        <Text style={s.note}>Brak tankowań w ostatnich 30 dniach.</Text>
      )}

      <SectionTitle>Tankowania</SectionTitle>
      {logs.slice(0, 30).map((l) => (
        <Card key={l.id} style={s.entry}>
          <View style={s.entryHead}>
            <Text style={s.entryTitle}>
              ⛽ {l.liters ?? "—"} L · {regOf(l.vehicle_id)}
            </Text>
            <Text style={s.entryPrice}>{l.price_total != null ? `${l.price_total}` : "—"}</Text>
          </View>
          <Text style={s.entryMeta}>
            {[
              [l.station_city, l.station_country].filter(Boolean).join(", "),
              l.created_at.slice(0, 10),
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
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
  kpiValue: { color: palette.offWhite, fontSize: 20, fontWeight: "800" },
  err: { color: palette.red, fontSize: 13 },
  note: { color: palette.smoke, fontSize: 14, textAlign: "center", marginTop: 8 },
  entry: { gap: 4 },
  entryHead: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  entryTitle: { color: palette.offWhite, fontWeight: "700", fontSize: 15 },
  entryPrice: { color: palette.offWhite, fontSize: 14, fontWeight: "600" },
  entryMeta: { color: palette.smoke, fontSize: 13 },
});
