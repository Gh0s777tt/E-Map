/**
 * #320 (parytet web↔mobile): Ceny diesla w Europie — ranking krajów wg €/L
 * z tego samego źródła co panel web (trasa `/api/fuel-eu` na Vercelu).
 * Kierowca w trasie widzi, gdzie zatankować taniej.
 */
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card, Chip, wide } from "../components/ui";
import { useT } from "../lib/i18n";

const API_URL = "https://e-logistic-one.vercel.app/api/fuel-eu";

interface Row {
  cc: string;
  name: string;
  dieselEur: number;
  dieselLocal: number;
  currency: string;
}

export default function FuelPricesScreen() {
  const t = useT();
  const [rows, setRows] = useState<Row[]>([]);
  const [updated, setUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = (await res.json()) as { countries?: Row[]; updated?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? t("m.fuelPrices.error"));
      setRows(data.countries ?? []);
      setUpdated(data.updated ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("m.fuelPrices.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
      }
    >
      <Text style={s.sub}>{t("m.fuelPrices.subtitle")}</Text>
      {updated && (
        <Text style={s.dim}>
          {t("m.fuelPrices.updated")}: {updated.slice(0, 10)}
        </Text>
      )}
      {err && <Text style={s.err}>{err}</Text>}
      {loading && rows.length === 0 && (
        <ActivityIndicator color={palette.red} style={{ marginTop: 24 }} />
      )}
      {!loading && !err && rows.length === 0 && (
        <Text style={s.empty}>{t("m.fuelPrices.empty")}</Text>
      )}

      {rows.map((r, i) => (
        <Card key={r.cc} style={s.row}>
          <Text style={s.rank}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.name} numberOfLines={1}>
              {r.name}
            </Text>
            {r.currency !== "EUR" && (
              <Text style={s.dim}>
                {r.dieselLocal} {r.currency}/L
              </Text>
            )}
          </View>
          {i === 0 && <Chip label={t("m.fuelPrices.cheapest")} color="#22c55e" />}
          <Text style={s.price}>{r.dieselEur.toFixed(3)} €/L</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  sub: { color: palette.smoke, fontSize: 13, lineHeight: 18 },
  err: { color: palette.red, fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rank: { color: palette.smoke, fontSize: 13, fontWeight: "800", width: 22, textAlign: "center" },
  name: { color: palette.offWhite, fontSize: 15, fontWeight: "700" },
  price: { color: palette.red, fontSize: 15, fontWeight: "800" },
  dim: { color: palette.smoke, fontSize: 12 },
  empty: { color: palette.smoke, fontSize: 14, textAlign: "center", marginTop: 24, lineHeight: 20 },
});
