/**
 * #320 (parytet web↔mobile): Diety — kierowca widzi własne podróże per diem
 * (właściciel/dyspozytor: całą firmę) z sumami per waluta, liczonymi tym samym
 * silnikiem `computePerDiem` co panel web. Wpisy dodaje biuro na webie.
 */
import { getActiveMembership, getMyDriverIdentity, listPerDiemTrips } from "@e-logistic/api";
import { computePerDiem, type DietMode, sumPerDiem } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Chip, SectionTitle, wide } from "../components/ui";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

interface Row {
  id: string;
  driverName: string | null;
  destination: string | null;
  mode: DietMode;
  hours: number;
  tripDate: string | null;
  days: number;
  amount: number;
  currency: string;
}

const money = (n: number, cur: string) => `${n.toFixed(2).replace(".", ",")} ${cur}`;

export default function PerDiemScreen() {
  const t = useT();
  const [rows, setRows] = useState<Row[]>([]);
  const [mine, setMine] = useState(false);
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
      const isManager = m.role === "owner" || m.role === "dispatcher";
      let driverName: string | undefined;
      if (!isManager) {
        const id = await getMyDriverIdentity(sb).catch(() => null);
        driverName = id ? `${id.firstName} ${id.lastName}`.trim() : undefined;
        setMine(true);
      }
      const trips = await listPerDiemTrips(sb, m.companyId, { driverName, limit: 200 });
      setRows(
        trips.map((tr) => {
          const r = computePerDiem({
            destination: tr.destination ?? "",
            mode: tr.mode,
            hours: tr.hours,
            dailyRate: tr.daily_rate,
            currency: tr.currency,
          });
          return {
            id: tr.id,
            driverName: tr.driver_name,
            destination: tr.destination,
            mode: tr.mode,
            hours: tr.hours,
            tripDate: tr.trip_date,
            days: r.days,
            amount: r.amount,
            currency: r.currency,
          };
        }),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("m.perdiem.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  const totals = sumPerDiem(
    rows.map((r) => ({
      destination: r.destination ?? "",
      mode: r.mode,
      fullDays: 0,
      remainderHours: 0,
      fraction: 0,
      days: r.days,
      amount: r.amount,
      currency: r.currency,
    })),
  );

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
      }
    >
      {err && <Text style={s.err}>{err}</Text>}

      <SectionTitle>{t("m.perdiem.total")}</SectionTitle>
      <View style={s.totalsRow}>
        {totals.length === 0 && !loading ? (
          <Card style={{ flex: 1 }}>
            <Text style={s.dim}>{t("m.perdiem.empty")}</Text>
          </Card>
        ) : (
          totals.map((tot) => (
            <Card key={tot.currency} style={s.totalCard}>
              <Text style={s.totalAmount}>{money(tot.amount, tot.currency)}</Text>
              <Text style={s.dim}>
                {tot.days.toFixed(2).replace(".", ",")} × {t("m.perdiem.daysUnit")}
              </Text>
            </Card>
          ))
        )}
      </View>

      <SectionTitle>{t("m.perdiem.trips")}</SectionTitle>
      {rows.map((r) => (
        <Card key={r.id} style={{ gap: 6 }}>
          <View style={s.rowTop}>
            <Text style={s.dest} numberOfLines={1}>
              {r.destination || "—"}
            </Text>
            <Chip
              label={r.mode === "domestic" ? t("m.perdiem.domestic") : t("m.perdiem.foreign")}
              color={r.mode === "domestic" ? "#3b82f6" : "#a855f7"}
            />
          </View>
          <Text style={s.dim}>
            {[
              r.tripDate,
              !mine && r.driverName ? r.driverName : null,
              `${r.hours} h · ${r.days.toFixed(2).replace(".", ",")} ${t("m.perdiem.daysUnit")}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          <Text style={s.amount}>{money(r.amount, r.currency)}</Text>
        </Card>
      ))}
      <Text style={s.hint}>{t("m.perdiem.hint")}</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  err: { color: palette.red, fontSize: 13 },
  totalsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  totalCard: { flexGrow: 1, minWidth: 140 },
  totalAmount: { color: palette.offWhite, fontSize: 20, fontWeight: "800" },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  dest: { color: palette.offWhite, fontSize: 15, fontWeight: "700", flexShrink: 1 },
  amount: { color: palette.red, fontSize: 16, fontWeight: "800" },
  dim: { color: palette.smoke, fontSize: 12.5 },
  hint: { color: palette.smoke, fontSize: 12, lineHeight: 17, marginTop: 4 },
});
