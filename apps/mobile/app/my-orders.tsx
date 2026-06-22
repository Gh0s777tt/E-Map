import { listMyOrders, type Order, setOrderStatus } from "@e-logistic/api";
import type { OrderStatus } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { CargoPhotosMobile } from "../components/CargoPhotosMobile";
import { getSupabase, supabaseConfigured } from "../lib/supabase";
import { useFleet } from "../lib/useFleet";

const STATUS_COLOR: Record<OrderStatus, string> = {
  new: palette.smoke,
  assigned: "#3b82f6",
  in_progress: "#f59e0b",
  delivered: "#22c55e",
  invoiced: "#a855f7",
  cancelled: palette.red,
};
const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Nowe",
  assigned: "Przypisane",
  in_progress: "W trakcie",
  delivered: "Dostarczone",
  invoiced: "Zafakturowane",
  cancelled: "Anulowane",
};

export default function MyOrdersScreen() {
  const { vehicles } = useFleet();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const regOf = (id: string | null) =>
    id ? (vehicles.find((v) => v.id === id)?.registration ?? "—") : "—";

  const load = useCallback(async () => {
    setErr(null);
    if (!supabaseConfigured) {
      setLoading(false);
      setErr("Brak konfiguracji Supabase.");
      return;
    }
    try {
      setOrders(await listMyOrders(getSupabase()));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nie udało się pobrać zleceń.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function advance(o: Order, status: OrderStatus) {
    setMsg(null);
    try {
      await setOrderStatus(getSupabase(), o.id, status);
      setMsg(`✅ Status: ${STATUS_LABEL[status]}`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Błąd zmiany statusu.");
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
      }
    >
      <Stack.Screen options={{ title: "Moje zlecenia" }} />

      {err && <Text style={styles.err}>{err}</Text>}
      {msg && <Text style={styles.msg}>{msg}</Text>}
      {!loading && !err && orders.length === 0 && (
        <Text style={styles.note}>Brak przypisanych zleceń.</Text>
      )}

      {orders.map((o) => (
        <View key={o.id} style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.ref}>{o.reference_no || "(bez numeru)"}</Text>
            <View style={[styles.badge, { borderColor: STATUS_COLOR[o.status] }]}>
              <Text style={[styles.badgeText, { color: STATUS_COLOR[o.status] }]}>
                {STATUS_LABEL[o.status]}
              </Text>
            </View>
          </View>

          {(o.origin || o.destination) && (
            <Text style={styles.row}>
              📍 {o.origin || "?"} → {o.destination || "?"}
            </Text>
          )}
          <View style={styles.metaRow}>
            {o.cargo && <Text style={styles.meta}>📦 {o.cargo}</Text>}
            {o.weight_kg != null && <Text style={styles.meta}>{o.weight_kg} kg</Text>}
            {o.vehicle_id && <Text style={styles.meta}>🚚 {regOf(o.vehicle_id)}</Text>}
            {o.load_date && <Text style={styles.meta}>zał. {o.load_date}</Text>}
          </View>

          {(o.status === "new" || o.status === "assigned") && (
            <Pressable style={styles.btn} onPress={() => advance(o, "in_progress")}>
              <Text style={styles.btnText}>▶️ W trakcie</Text>
            </Pressable>
          )}
          {o.status === "in_progress" && (
            <Pressable style={styles.btn} onPress={() => advance(o, "delivered")}>
              <Text style={styles.btnText}>✅ Dostarczone</Text>
            </Pressable>
          )}

          <CargoPhotosMobile orderId={o.id} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10 },
  note: { color: palette.smoke, fontSize: 14, marginTop: 12, textAlign: "center" },
  err: { color: palette.red, fontSize: 13 },
  msg: { color: palette.smoke, fontSize: 13 },
  card: {
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  ref: { color: palette.offWhite, fontWeight: "800", fontSize: 15 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  row: { color: palette.offWhite, fontSize: 14 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  meta: { color: palette.smoke, fontSize: 13 },
  btn: {
    backgroundColor: palette.red,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 2,
  },
  btnText: { color: palette.white, fontWeight: "700", fontSize: 15 },
});
