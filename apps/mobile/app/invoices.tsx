/**
 * #321 (parytet web↔mobile): Faktury — widok odczytu dla właściciela:
 * suma brutto bieżącego miesiąca per waluta + lista z rozróżnieniem
 * opłacona / nieopłacona / po terminie / anulowana. Wystawianie na webie.
 */
import { getActiveMembership, type Invoice, listInvoices } from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Chip, SectionTitle, wide } from "../components/ui";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

type PayState = "paid" | "unpaid" | "overdue" | "cancelled";

function payState(inv: Invoice): PayState {
  if (inv.status === "cancelled") return "cancelled";
  if (inv.paid_at) return "paid";
  if (inv.due_date && new Date(inv.due_date).getTime() < Date.now()) return "overdue";
  return "unpaid";
}
const PAY_COLOR: Record<PayState, string> = {
  paid: "#22c55e",
  unpaid: "#f59e0b",
  overdue: "#ef4444",
  cancelled: "#6b7280",
};

const money = (n: number, cur: string) => `${n.toFixed(2).replace(".", ",")} ${cur}`;

export default function InvoicesScreen() {
  const t = useT();
  const [rows, setRows] = useState<Invoice[]>([]);
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
      setRows(await listInvoices(sb, m.companyId, { limit: 200 }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("m.invoices.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  const month = new Date().toISOString().slice(0, 7);
  const monthSums = new Map<string, number>();
  for (const inv of rows) {
    if (inv.status !== "cancelled" && inv.issue_date.startsWith(month)) {
      monthSums.set(inv.currency, (monthSums.get(inv.currency) ?? 0) + inv.gross);
    }
  }

  const PAY_KEY = {
    paid: t("m.invoices.paid"),
    unpaid: t("m.invoices.unpaid"),
    overdue: t("m.invoices.overdue"),
    cancelled: t("m.invoices.cancelled"),
  } as const;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
      }
    >
      {err && <Text style={s.err}>{err}</Text>}

      <SectionTitle>{t("m.invoices.monthSum")}</SectionTitle>
      <View style={s.totalsRow}>
        {monthSums.size === 0 && !loading ? (
          <Card style={{ flex: 1 }}>
            <Text style={s.dim}>{t("m.invoices.empty")}</Text>
          </Card>
        ) : (
          [...monthSums.entries()].map(([cur, sum]) => (
            <Card key={cur} style={s.totalCard}>
              <Text style={s.totalAmount}>{money(sum, cur)}</Text>
              <Text style={s.dim}>{month}</Text>
            </Card>
          ))
        )}
      </View>

      <SectionTitle>{t("m.invoices.list")}</SectionTitle>
      {rows.map((inv) => {
        const st = payState(inv);
        return (
          <Card key={inv.id} style={{ gap: 6 }}>
            <View style={s.rowTop}>
              <Text style={s.number} numberOfLines={1}>
                {inv.number}
              </Text>
              <Chip label={PAY_KEY[st]} color={PAY_COLOR[st]} />
            </View>
            <Text style={s.dim} numberOfLines={1}>
              {[inv.buyer_name, inv.issue_date].filter(Boolean).join(" · ")}
              {inv.due_date ? ` · ${t("m.invoices.due")}: ${inv.due_date}` : ""}
            </Text>
            <Text style={s.amount}>{money(inv.gross, inv.currency)}</Text>
          </Card>
        );
      })}
      <Text style={s.hint}>{t("m.invoices.hint")}</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  err: { color: palette.red, fontSize: 13 },
  dim: { color: palette.smoke, fontSize: 12.5 },
  totalsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  totalCard: { flexGrow: 1, minWidth: 140 },
  totalAmount: { color: palette.offWhite, fontSize: 20, fontWeight: "800" },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  number: { color: palette.offWhite, fontSize: 15, fontWeight: "800", flexShrink: 1 },
  amount: { color: palette.red, fontSize: 16, fontWeight: "800" },
  hint: { color: palette.smoke, fontSize: 12, lineHeight: 17, marginTop: 4 },
});
