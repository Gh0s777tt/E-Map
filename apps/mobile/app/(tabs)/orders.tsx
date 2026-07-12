/**
 * #285: Zlecenia 2.0 — segmenty Aktywne / Zaplanowane / Zakończone,
 * karty ze statusem, zmianą statusu jednym tapnięciem i zdjęciami CMR/POD.
 */
import { listMyOrders, type Order, setOrderStatus } from "@e-logistic/api";
import type { OrderStatus } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { CargoPhotosMobile } from "../../components/CargoPhotosMobile";
import { TrackingQrButton } from "../../components/TrackingQr";
import { Card, ScreenTitle } from "../../components/ui";
import { success, warn } from "../../lib/haptics";
import { getSupabase, supabaseConfigured } from "../../lib/supabase";
import { useFleet } from "../../lib/useFleet";

const STATUS_COLOR: Record<OrderStatus, string> = {
  new: palette.smoke,
  assigned: "#3b82f6",
  in_progress: palette.warning,
  delivered: palette.success,
  invoiced: "#a855f7",
  cancelled: palette.red,
};
const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Nowe",
  assigned: "Przypisane",
  in_progress: "W trasie",
  delivered: "Dostarczone",
  invoiced: "Zafakturowane",
  cancelled: "Anulowane",
};

type Segment = "active" | "planned" | "done";
const SEGMENTS: { key: Segment; label: string; statuses: OrderStatus[] }[] = [
  { key: "active", label: "Aktywne", statuses: ["in_progress"] },
  { key: "planned", label: "Zaplanowane", statuses: ["new", "assigned"] },
  { key: "done", label: "Zakończone", statuses: ["delivered", "invoiced", "cancelled"] },
];

export default function OrdersScreen() {
  const { vehicles } = useFleet();
  const [orders, setOrders] = useState<Order[]>([]);
  const [segment, setSegment] = useState<Segment>("active");
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function advance(o: Order, status: OrderStatus) {
    setMsg(null);
    const prev = o.status;
    setOrders((list) => list.map((x) => (x.id === o.id ? { ...x, status } : x)));
    try {
      await setOrderStatus(getSupabase(), o.id, status);
      success();
      setMsg(`✅ Status: ${STATUS_LABEL[status]}`);
    } catch (e) {
      warn();
      setOrders((list) => list.map((x) => (x.id === o.id ? { ...x, status: prev } : x)));
      setMsg(e instanceof Error ? e.message : "Błąd zmiany statusu.");
    }
  }

  const counts = Object.fromEntries(
    SEGMENTS.map((sgm) => [sgm.key, orders.filter((o) => sgm.statuses.includes(o.status)).length]),
  ) as Record<Segment, number>;
  const visible = orders.filter((o) =>
    SEGMENTS.find((sgm) => sgm.key === segment)?.statuses.includes(o.status),
  );

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
      }
    >
      <ScreenTitle>Zlecenia</ScreenTitle>

      <View style={s.segments}>
        {SEGMENTS.map((sgm) => {
          const on = segment === sgm.key;
          return (
            <Pressable
              key={sgm.key}
              onPress={() => setSegment(sgm.key)}
              style={[s.segment, on && s.segmentOn]}
            >
              <Text style={[s.segmentText, on && s.segmentTextOn]}>
                {sgm.label}
                {counts[sgm.key] ? ` (${counts[sgm.key]})` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {err && <Text style={s.err}>{err}</Text>}
      {msg && <Text style={s.msg}>{msg}</Text>}
      {!loading && !err && visible.length === 0 && (
        <Text style={s.note}>
          {segment === "active"
            ? "Nic w trasie. Zacznij zlecenie z zakładki Zaplanowane."
            : segment === "planned"
              ? "Brak zaplanowanych zleceń — spedytor jeszcze nic nie przydzielił."
              : "Brak zakończonych zleceń."}
        </Text>
      )}

      {visible.map((o) => (
        <Card key={o.id} style={s.orderCard}>
          <View style={s.cardHead}>
            <Text style={s.route} numberOfLines={1}>
              {o.origin || "?"} → {o.destination || "?"}
            </Text>
            <View style={[s.badge, { backgroundColor: STATUS_COLOR[o.status] }]}>
              <Text style={s.badgeText}>{STATUS_LABEL[o.status]}</Text>
            </View>
          </View>
          <Text style={s.meta} numberOfLines={2}>
            {[
              o.reference_no,
              o.cargo,
              o.weight_kg != null ? `${o.weight_kg} kg` : null,
              o.vehicle_id ? `🚚 ${regOf(o.vehicle_id)}` : null,
              o.load_date ? `zał. ${o.load_date}` : null,
              o.unload_date ? `rozł. ${o.unload_date}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </Text>

          {(o.status === "new" || o.status === "assigned") && (
            <Pressable style={s.btn} onPress={() => advance(o, "in_progress")}>
              <Text style={s.btnText}>▶️ Rozpocznij trasę</Text>
            </Pressable>
          )}
          {o.status === "in_progress" && (
            <Pressable style={s.btn} onPress={() => advance(o, "delivered")}>
              <Text style={s.btnText}>✅ Dostarczone</Text>
            </Pressable>
          )}

          {segment !== "done" && <CargoPhotosMobile orderId={o.id} />}
          {(o.status === "in_progress" || o.status === "delivered") && (
            <TrackingQrButton
              orderId={o.id}
              label={`${o.origin || "?"} → ${o.destination || "?"}`}
            />
          )}
        </Card>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, paddingTop: 24, gap: 12, paddingBottom: 32 },
  segments: {
    flexDirection: "row",
    backgroundColor: palette.nearBlack,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  segment: { flex: 1, borderRadius: 999, paddingVertical: 9, alignItems: "center" },
  segmentOn: { backgroundColor: palette.red },
  segmentText: { color: palette.smoke, fontSize: 13, fontWeight: "600" },
  segmentTextOn: { color: palette.white, fontWeight: "800" },
  note: { color: palette.smoke, fontSize: 14, marginTop: 12, textAlign: "center", lineHeight: 20 },
  err: { color: palette.red, fontSize: 13 },
  msg: { color: palette.smoke, fontSize: 13 },
  orderCard: { gap: 8 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  route: { color: palette.offWhite, fontWeight: "800", fontSize: 17, flex: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: "800", color: palette.black },
  meta: { color: palette.smoke, fontSize: 13, lineHeight: 19 },
  btn: {
    backgroundColor: palette.red,
    borderRadius: 999,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 2,
  },
  btnText: { color: palette.white, fontWeight: "700", fontSize: 15 },
});
