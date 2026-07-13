/**
 * #320 (parytet web↔mobile): Wypłaty — saldo rozliczeń kierowcy per waluta
 * (należność − zaliczki − potrącenia − wypłaty, silnik `settleDriverPayouts`
 * wspólny z panelem web) + historia pozycji. Wpisy dodaje biuro na webie.
 */
import { getActiveMembership, getMyDriverIdentity, listDriverPayouts } from "@e-logistic/api";
import { type PayoutKind, settleDriverPayouts } from "@e-logistic/core";
import type { MobileMessageKey } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Chip, SectionTitle, wide } from "../components/ui";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

interface Row {
  id: string;
  driverName: string | null;
  kind: PayoutKind;
  amount: number;
  currency: string;
  entryDate: string;
  note: string | null;
}

const KIND_KEY: Record<PayoutKind, MobileMessageKey> = {
  due: "m.payouts.due",
  advance: "m.payouts.advance",
  deduction: "m.payouts.deduction",
  payout: "m.payouts.payout",
};
const KIND_COLOR: Record<PayoutKind, string> = {
  due: "#22c55e",
  advance: "#f59e0b",
  deduction: "#ef4444",
  payout: "#3b82f6",
};

const money = (n: number, cur: string) => `${n.toFixed(2).replace(".", ",")} ${cur}`;

export default function PayoutsScreen() {
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
      const entries = await listDriverPayouts(sb, m.companyId, { driverName, limit: 200 });
      setRows(
        entries.map((e) => ({
          id: e.id,
          driverName: e.driver_name,
          kind: e.kind,
          amount: e.amount,
          currency: e.currency,
          entryDate: e.entry_date,
          note: e.note,
        })),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("m.payouts.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  const balances = settleDriverPayouts(rows);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
      }
    >
      {err && <Text style={s.err}>{err}</Text>}

      <SectionTitle>{t("m.payouts.balance")}</SectionTitle>
      <View style={s.totalsRow}>
        {balances.length === 0 && !loading ? (
          <Card style={{ flex: 1 }}>
            <Text style={s.dim}>{t("m.payouts.empty")}</Text>
          </Card>
        ) : (
          balances.map((b) => (
            <Card key={b.currency} style={s.totalCard}>
              <Text style={[s.totalAmount, b.balance < 0 && { color: "#ef4444" }]}>
                {money(b.balance, b.currency)}
              </Text>
              <Text style={s.dim}>
                {t("m.payouts.due")}: {money(b.due, b.currency)}
              </Text>
            </Card>
          ))
        )}
      </View>

      <SectionTitle>{t("m.payouts.history")}</SectionTitle>
      {rows.map((r) => (
        <Card key={r.id} style={{ gap: 6 }}>
          <View style={s.rowTop}>
            <Chip label={t(KIND_KEY[r.kind])} color={KIND_COLOR[r.kind]} />
            <Text style={s.amount}>{money(r.amount, r.currency)}</Text>
          </View>
          <Text style={s.dim}>
            {[r.entryDate, !mine && r.driverName ? r.driverName : null, r.note]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </Card>
      ))}
      <Text style={s.hint}>{t("m.payouts.hint")}</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  err: { color: palette.red, fontSize: 13 },
  totalsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  totalCard: { flexGrow: 1, minWidth: 140 },
  totalAmount: { color: "#22c55e", fontSize: 20, fontWeight: "800" },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  amount: { color: palette.offWhite, fontSize: 15, fontWeight: "800" },
  dim: { color: palette.smoke, fontSize: 12.5 },
  hint: { color: palette.smoke, fontSize: 12, lineHeight: 17, marginTop: 4 },
});
