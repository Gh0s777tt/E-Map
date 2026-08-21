/**
 * #321 (parytet web↔mobile): Status floty — kto jedzie, kto zaplanowany,
 * kto wolny; ten sam silnik `buildFleetStatus` co /fleet-status na webie
 * (zlecenie in_progress → w trasie, assigned → zaplanowany, inaczej wolny)
 * + ostatnie zdarzenie Trip pojazdu.
 */
import {
  getActiveMembership,
  listOrdersAll,
  listTripEventsAll,
  listVehicles,
} from "@e-logistic/api";
import {
  buildFleetStatus,
  type FleetStatusRow,
  type FleetVehicleState,
  type OrderStatus,
} from "@e-logistic/core";
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

/** Stan pojazdu daje wyłącznie te dwa statusy — reszta historii nie ma tu czego wnieść. */
const ACTIVE_STATUSES: OrderStatus[] = ["in_progress", "assigned"];

/**
 * Okno „ostatniego zdarzenia". Jawne 14 dni zamiast dawnego `limit: 1000`, które było
 * oknem niejawnym i tym krótszym, im większa flota (patrz web `/fleet-status`).
 */
const EVENTS_WINDOW_DAYS = 14;

export default function FleetStatusScreen() {
  const t = useT();
  const [rows, setRows] = useState<FleetStatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  /** Zbiór urwany na sufit pobrania — pojazd z aktywną trasą pokazałby się jako wolny. */
  const [incomplete, setIncomplete] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    setIncomplete(false);
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      const sb = getSupabase();
      const m = await getActiveMembership(sb);
      if (!m) return;
      const eventsFrom = new Date(Date.now() - EVENTS_WINDOW_DAYS * 86_400_000).toISOString();
      const [vehicles, ordPaged, tripPaged] = await Promise.all([
        listVehicles(sb, m.companyId),
        listOrdersAll(sb, m.companyId, { statuses: ACTIVE_STATUSES }),
        listTripEventsAll(sb, { from: eventsFrom }),
      ]);
      setIncomplete(!ordPaged.complete || !tripPaged.complete);
      const orders = ordPaged.rows;
      const trips = tripPaged.rows;
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
      {incomplete && !err && <Text style={s.warn}>{t("m.fleet.incomplete")}</Text>}

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
          {r.lastEvent ? (
            <Text style={s.dim} numberOfLines={1}>
              {[
                r.lastEvent.action,
                [r.lastEvent.location, r.lastEvent.country].filter(Boolean).join(", "),
                r.lastEvent.createdAt.slice(0, 16).replace("T", " "),
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          ) : (
            /* „Brak zdarzeń" i „zdarzenia sprzed okna" to dwa różne stany — pojazd po
               dłuższym postoju musi wyglądać inaczej niż taki, który nigdy nie raportował. */
            <Text style={s.dim} numberOfLines={1}>
              {t("m.fleet.noEvents").replace("{days}", String(EVENTS_WINDOW_DAYS))}
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
  /** Ostrzeżenie, nie błąd — dane są, tylko niepełne; kolor odróżnia je od awarii pobrania. */
  warn: { color: palette.warning, fontSize: 12, lineHeight: 17 },
  dim: { color: palette.smoke, fontSize: 12 },
  kpiRow: { flexDirection: "row", gap: 10 },
  kpi: { flex: 1, alignItems: "center" },
  kpiNum: { fontSize: 22, fontWeight: "800" },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  reg: { color: palette.offWhite, fontSize: 15, fontWeight: "800" },
  orderLine: { color: palette.offWhite, fontSize: 13 },
});
