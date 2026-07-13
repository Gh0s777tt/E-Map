/**
 * #321 (parytet web↔mobile): Status floty — kto jedzie, kto zaplanowany,
 * kto wolny; ten sam silnik `buildFleetStatus` co /fleet-status na webie
 * (zlecenie in_progress → w trasie, assigned → zaplanowany, inaczej wolny)
 * + ostatnie zdarzenie Trip pojazdu.
 */
import { getActiveMembership, listOrders, listTripEvents, listVehicles } from "@e-logistic/api";
import { buildFleetStatus, type FleetStatusRow, type FleetVehicleState } from "@e-logistic/core";
import type { MobileMessageKey } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Chip, wide } from "../components/ui";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

const STATE_KEY: Record<FleetVehicleState, MobileMessageKey> = {
  driving: "m.fleet.driving",
  planned: "m.fleet.planned",
  idle: "m.fleet.idle",
};
const STATE_COLOR: Record<FleetVehicleState, string> = {
  driving: "#22c55e",
  planned: "#f59e0b",
  idle: "#6b7280",
};

export default function FleetStatusScreen() {
  const t = useT();
  const [rows, setRows] = useState<FleetStatusRow[]>([]);
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
      const [vehicles, orders, trips] = await Promise.all([
        listVehicles(sb, m.companyId),
        listOrders(sb, m.companyId),
        listTripEvents(sb, { limit: 1000 }),
      ]);
      setRows(
        buildFleetStatus({
          vehicles: (vehicles as { id: string; registration: string }[]).map((v) => ({
            id: v.id,
            registration: v.registration,
          })),
          orders: (
            orders as {
              vehicle_id: string | null;
              status: string;
              reference_no: string | null;
              origin: string | null;
              destination: string | null;
              assigned_to: string | null;
              load_date: string | null;
              unload_date: string | null;
            }[]
          ).map((o) => ({
            vehicleId: o.vehicle_id,
            status: o.status,
            referenceNo: o.reference_no,
            origin: o.origin,
            destination: o.destination,
            assignedTo: o.assigned_to,
            loadDate: o.load_date,
            unloadDate: o.unload_date,
          })),
          events: (
            trips as {
              vehicle_id: string;
              action: string;
              location: string | null;
              country: string | null;
              created_at: string;
            }[]
          ).map((e) => ({
            vehicleId: e.vehicle_id,
            action: e.action,
            location: e.location,
            country: e.country,
            createdAt: e.created_at,
          })),
        }),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("m.fleet.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  const counts = { driving: 0, planned: 0, idle: 0 };
  for (const r of rows) counts[r.state]++;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
      }
    >
      {err && <Text style={s.err}>{err}</Text>}

      <View style={s.kpiRow}>
        {(["driving", "planned", "idle"] as const).map((st) => (
          <Card key={st} style={s.kpi}>
            <Text style={[s.kpiNum, { color: STATE_COLOR[st] }]}>{counts[st]}</Text>
            <Text style={s.dim}>{t(STATE_KEY[st])}</Text>
          </Card>
        ))}
      </View>

      {rows.length === 0 && !loading && !err && <Text style={s.dim}>{t("m.fleet.empty")}</Text>}
      {rows.map((r) => (
        <Card key={r.vehicleId} style={{ gap: 6 }}>
          <View style={s.rowTop}>
            <Text style={s.reg}>{r.registration}</Text>
            <Chip label={t(STATE_KEY[r.state])} color={STATE_COLOR[r.state]} />
          </View>
          {r.order && (
            <Text style={s.orderLine} numberOfLines={2}>
              {[
                r.order.referenceNo,
                [r.order.origin, r.order.destination].filter(Boolean).join(" → "),
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          )}
          {r.lastEvent && (
            <Text style={s.dim} numberOfLines={1}>
              {[
                r.lastEvent.action,
                [r.lastEvent.location, r.lastEvent.country].filter(Boolean).join(", "),
                r.lastEvent.createdAt.slice(0, 16).replace("T", " "),
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          )}
        </Card>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  err: { color: palette.red, fontSize: 13 },
  dim: { color: palette.smoke, fontSize: 12 },
  kpiRow: { flexDirection: "row", gap: 10 },
  kpi: { flex: 1, alignItems: "center" },
  kpiNum: { fontSize: 22, fontWeight: "800" },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  reg: { color: palette.offWhite, fontSize: 15, fontWeight: "800" },
  orderLine: { color: palette.offWhite, fontSize: 13 },
});
