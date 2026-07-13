/**
 * #315: pulpit właściciela — wariant W1 („liczby najpierw", wybór właściciela):
 * liczniki floty (w trasie / przerwa / serwis), przychód bieżącego miesiąca
 * z faktur oraz ALERTY TERMINÓW SCALONE PER POJAZD (1 wiersz = 1 auto:
 * OC, przegląd, leasing, karty paliwowe) — skaluje się przy 30–50 autach.
 */
import {
  listDefects,
  listFuelCardsSafe,
  listInvoices,
  listOrders,
  listVehicles,
} from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

interface VehicleAlert {
  vehicleId: string | null;
  registration: string;
  /** [etykieta, dni-do-terminu] posortowane rosnąco. */
  items: [string, number][];
}

interface OwnerData {
  onRoute: number | null;
  idle: number | null;
  inService: number | null;
  revenueMonth: number | null;
  currency: string;
  alerts: VehicleAlert[];
}

const EMPTY: OwnerData = {
  onRoute: null,
  idle: null,
  inService: null,
  revenueMonth: null,
  currency: "PLN",
  alerts: [],
};

const ALERT_WINDOW_DAYS = 30;

function daysTo(dateIso: string | null | undefined): number | null {
  if (!dateIso) return null;
  return Math.floor((Date.parse(dateIso) - Date.now()) / 86_400_000);
}

export function useOwnerDashboard(companyId: string | null) {
  const [data, setData] = useState<OwnerData>(EMPTY);

  const reload = useCallback(async () => {
    if (!supabaseConfigured || !companyId) return;
    const sb = getSupabase();
    const monthStart = new Date();
    const from = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);

    const [vehicles, orders, defects, invoices, cards] = await Promise.all([
      listVehicles(sb, companyId).catch(() => null),
      listOrders(sb, companyId, { limit: 300 }).catch(() => null),
      listDefects(sb, { limit: 300 }).catch(() => null),
      listInvoices(sb, companyId, { from }).catch(() => null),
      listFuelCardsSafe(sb, companyId).catch(() => null),
    ]);

    let onRoute: number | null = null;
    let idle: number | null = null;
    let inService: number | null = null;
    const alerts: VehicleAlert[] = [];

    if (vehicles) {
      const routeIds = new Set(
        (orders ?? [])
          .filter((o) => o.status === "in_progress" && o.vehicle_id)
          .map((o) => o.vehicle_id as string),
      );
      const serviceIds = new Set(
        (defects ?? [])
          .filter((d) => d.status === "open" && d.severity === "high" && d.vehicle_id)
          .map((d) => d.vehicle_id as string),
      );
      onRoute = vehicles.filter((v) => routeIds.has(v.id)).length;
      inService = vehicles.filter((v) => serviceIds.has(v.id) && !routeIds.has(v.id)).length;
      idle = Math.max(0, vehicles.length - onRoute - inService);

      // Scalone alerty terminów per pojazd (Twój punkt: 1 wiersz = 1 auto).
      const cardByVehicle = new Map<string, { valid_until: string | null }[]>();
      for (const c of cards ?? []) {
        if (!c.vehicle_id) continue;
        const list = cardByVehicle.get(c.vehicle_id) ?? [];
        list.push({ valid_until: c.valid_until });
        cardByVehicle.set(c.vehicle_id, list);
      }
      for (const v of vehicles) {
        const items: [string, number][] = [];
        const push = (label: string, iso: string | null | undefined) => {
          const d = daysTo(iso);
          if (d !== null && d <= ALERT_WINDOW_DAYS) items.push([label, d]);
        };
        push("oc", v.insurance_expiry);
        push("inspection", v.inspection_expiry);
        push("leasing", v.leasing_end);
        for (const c of cardByVehicle.get(v.id) ?? []) push("card", c.valid_until);
        if (items.length) {
          items.sort((a, b) => a[1] - b[1]);
          alerts.push({ vehicleId: v.id, registration: v.registration, items });
        }
      }
      alerts.sort((a, b) => (a.items[0]?.[1] ?? 99) - (b.items[0]?.[1] ?? 99));
    }

    let revenueMonth: number | null = null;
    let currency = "PLN";
    if (invoices) {
      const issued = invoices.filter((i) => i.status !== "cancelled");
      revenueMonth = issued.reduce((a, i) => a + (i.gross ?? 0), 0);
      currency = issued[0]?.currency ?? "PLN";
    }

    setData({ onRoute, idle, inService, revenueMonth, currency, alerts });
  }, [companyId]);

  return { data, reload };
}

function fmtMoney(v: number | null, currency: string): string {
  if (v === null) return "—";
  return `${v.toLocaleString("pl-PL", { maximumFractionDigits: 0 })} ${currency}`;
}

function alertLine(
  items: [string, number][],
  labels: Record<string, string>,
  overdueWord: string,
  daysWord: string,
): string {
  return items
    .slice(0, 3)
    .map(([key, d]) => {
      const label = labels[key] ?? key;
      return d < 0 ? `${label} ${overdueWord}` : `${label} ${d} ${daysWord}`;
    })
    .join(" · ");
}

export function OwnerDashboard({ data }: { data: OwnerData }) {
  const router = useRouter();
  const t = useT();
  const labels: Record<string, string> = {
    oc: t("m.owner.oc"),
    inspection: t("m.owner.inspection"),
    leasing: t("m.owner.leasing"),
    card: t("m.owner.card"),
  };
  return (
    <View style={{ gap: 10 }}>
      <View style={s.kpiRow}>
        <View style={s.kpi}>
          <Text style={[s.kpiValue, { color: palette.success }]}>{data.onRoute ?? "—"}</Text>
          <Text style={s.kpiLabel}>{t("m.owner.onRoute")}</Text>
        </View>
        <View style={s.kpi}>
          <Text style={[s.kpiValue, { color: palette.warning }]}>{data.idle ?? "—"}</Text>
          <Text style={s.kpiLabel}>{t("m.owner.idle")}</Text>
        </View>
        <View style={s.kpi}>
          <Text style={[s.kpiValue, { color: palette.red }]}>{data.inService ?? "—"}</Text>
          <Text style={s.kpiLabel}>{t("m.owner.inService")}</Text>
        </View>
      </View>

      <View style={s.revenue}>
        <Text style={s.revenueLabel}>{t("m.owner.revenueMonth")}</Text>
        <Text style={s.revenueValue}>{fmtMoney(data.revenueMonth, data.currency)}</Text>
      </View>

      <Text style={s.section}>{t("m.owner.alerts")}</Text>
      {data.alerts.length === 0 && <Text style={s.empty}>{t("m.owner.noAlerts")}</Text>}
      {data.alerts.slice(0, 6).map((a) => (
        <Pressable
          key={a.registration}
          style={[s.alert, (a.items[0]?.[1] ?? 99) <= 7 && s.alertRed]}
          onPress={() => router.push("/vehicle")}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.alertTitle}>
              {a.registration} · {t("m.owner.terms", { n: a.items.length })}
            </Text>
            <Text style={s.alertSub} numberOfLines={1}>
              {alertLine(a.items, labels, t("m.owner.overdue"), t("m.owner.days"))}
            </Text>
          </View>
          <Text style={s.go}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  kpiRow: { flexDirection: "row", gap: 8 },
  kpi: {
    flex: 1,
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  kpiValue: { fontSize: 24, fontWeight: "800", color: palette.offWhite, letterSpacing: -0.5 },
  kpiLabel: {
    color: palette.smoke,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 3,
  },
  revenue: {
    backgroundColor: "#161616",
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  revenueLabel: { color: palette.smoke, fontSize: 11.5 },
  revenueValue: { color: palette.offWhite, fontSize: 24, fontWeight: "800", marginTop: 2 },
  section: { color: palette.offWhite, fontSize: 13, fontWeight: "700", marginTop: 6 },
  empty: { color: palette.smoke, fontSize: 13, lineHeight: 19 },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderLeftColor: palette.warning,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 12,
    padding: 12,
  },
  alertRed: { borderLeftColor: palette.red },
  alertTitle: { color: palette.offWhite, fontSize: 13.5, fontWeight: "700" },
  alertSub: { color: palette.smoke, fontSize: 11.5, marginTop: 2 },
  go: { color: palette.smoke, fontSize: 16 },
});
