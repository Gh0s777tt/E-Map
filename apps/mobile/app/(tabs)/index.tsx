/**
 * Pulpit kierowcy 2.1 — restyle LogiFlow (#286): „Witaj," + pojazd, karta
 * bieżącego zlecenia z paskiem akcji (Rozpocznij Trip / Tankuj / Checklist),
 * 3 kafle KPI dnia i „Ostatnie aktywności" z wyróżnionym najnowszym wpisem.
 * Każdy blok ładuje się niezależnie i znosi offline (fail-soft).
 */
import {
  getActiveMembership,
  listChecklistSubmissions,
  listChecklistTemplates,
  listMyOrders,
  type Order,
} from "@e-logistic/api";
import { type AppModule, type FuelLogInput, visibleModules } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Fab } from "../../components/Fab";
import { Avatar, Card, GhostButton, PrimaryButton, SectionTitle } from "../../components/ui";
import { navigationUrl } from "../../lib/chatNotify";
import { useT } from "../../lib/i18n";
import { listOutbox, type OutboxItem } from "../../lib/outbox";
import { getSupabase, supabaseConfigured } from "../../lib/supabase";
import { useFleet } from "../../lib/useFleet";
import { initialOf, roleLabel, useProfile } from "../../lib/useProfile";

const ACTIVE: Order["status"][] = ["in_progress", "assigned", "new"];

// #300: etykiety rodzajów wpisow przez katalog i18n (PL/EN/DE/UK)
const KIND_KEY = {
  fuel: "m.kind.fuel",
  adblue: "m.kind.adblue",
  trip: "m.kind.trip",
  checklist: "m.kind.checklist",
  expense: "m.kind.expense",
} as const;
const KIND_GLYPH: Record<OutboxItem["kind"], string> = {
  fuel: "⛽",
  adblue: "💧",
  trip: "🚚",
  checklist: "✅",
  expense: "🧾",
};

function activitySub(it: OutboxItem): string {
  const when = it.createdAt.slice(5, 16).replace("T", " ");
  if (it.kind === "fuel" || it.kind === "adblue") {
    const input = it.input as FuelLogInput;
    return `${input.liters} l · ${input.station.country || "—"} · ${when}`;
  }
  if (it.kind === "checklist") {
    const input = it.input as { templateName?: string };
    return `${input.templateName ?? ""} · ${when}`.replace(/^ · /, "");
  }
  return when;
}

export default function Dashboard() {
  const router = useRouter();
  const t = useT();
  const profile = useProfile();
  const { vehicles } = useFleet();
  const [mods, setMods] = useState<AppModule[] | null>(null);
  const [active, setActive] = useState<Order | null>(null);
  const [checklistsDue, setChecklistsDue] = useState<number | null>(null);
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    // Outbox działa zawsze (lokalny), reszta wymaga konfiguracji/sieci.
    listOutbox()
      .then((items) => setOutbox([...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))))
      .catch(() => {});
    if (!supabaseConfigured) return;
    const sb = getSupabase();
    getActiveMembership(sb)
      .then(async (m) => {
        if (!m) return;
        setMods(visibleModules(m.role, m.modules, m.permissions));
        try {
          const [templates, subs] = await Promise.all([
            listChecklistTemplates(sb, m.companyId, { activeOnly: true }),
            listChecklistSubmissions(sb, m.companyId, { limit: 50 }),
          ]);
          const today = new Date().toISOString().slice(0, 10);
          const doneToday = new Set(
            subs.filter((s) => s.created_at.slice(0, 10) === today).map((s) => s.template_name),
          );
          setChecklistsDue(templates.filter((t) => !doneToday.has(t.name)).length);
        } catch {
          setChecklistsDue(null);
        }
      })
      .catch(() => {});
    listMyOrders(sb)
      .then((orders) => {
        const found = ACTIVE.map((s) => orders.find((o) => o.status === s)).find(Boolean) ?? null;
        setActive(found);
      })
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const show = (m: AppModule) => mods === null || mods.includes(m);
  const name = profile.email ? profile.email.split("@")[0] : t("m.home.driverFallback");
  const myReg = active?.vehicle_id
    ? (vehicles.find((v) => v.id === active.vehicle_id)?.registration ?? null)
    : (vehicles[0]?.registration ?? null);

  // KPI dnia liczone z lokalnego outboxu — działają także bez zasięgu.
  const today = new Date().toISOString().slice(0, 10);
  const todayItems = outbox.filter((i) => i.createdAt.slice(0, 10) === today);
  const fuelToday = todayItems
    .filter((i) => i.kind === "fuel" || i.kind === "adblue")
    .reduce((a, i) => a + ((i.input as FuelLogInput).liters ?? 0), 0);
  const pendingSync = outbox.filter((i) => i.status !== "synced").length;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={s.screen}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={palette.red}
          />
        }
      >
        {/* Nagłówek „Witaj," (mockup 01) */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.hello}>{t("m.home.hello")}</Text>
            <Text style={s.who} numberOfLines={1}>
              {name}
              {myReg ? ` · ${myReg}` : ""}
            </Text>
            <Text style={s.sub} numberOfLines={1}>
              {[profile.companyName, roleLabel(profile.role)].filter(Boolean).join(" · ") ||
                "E-Logistic"}
            </Text>
          </View>
          <Avatar initial={initialOf(profile.email)} />
        </View>

        {/* Bieżące zlecenie */}
        {show("orders") && (
          <Card style={s.orderCard}>
            <View style={s.redStripe} />
            <Text style={s.orderLabel}>{t("m.home.currentOrder")}</Text>
            {active ? (
              <>
                <Text style={s.orderTitle} numberOfLines={2}>
                  {active.origin || "?"} → {active.destination || "?"}
                </Text>
                <Text style={s.orderMeta} numberOfLines={2}>
                  {[
                    active.reference_no,
                    active.cargo,
                    active.weight_kg != null ? `${active.weight_kg} kg` : null,
                    active.unload_date ? `rozładunek ${active.unload_date}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || t("m.home.orderDetailsIn")}
                </Text>
                <View style={s.btnRow}>
                  <PrimaryButton
                    label={`🧭 ${t("m.home.navigate")}`}
                    onPress={() => {
                      if (active?.destination) {
                        Linking.openURL(
                          navigationUrl(
                            active.destination,
                            Platform.OS === "ios" ? "ios" : "other",
                          ),
                        ).catch(() => router.push("/map"));
                      } else {
                        router.push("/map");
                      }
                    }}
                  />
                  <GhostButton label={t("m.home.details")} onPress={() => router.push("/orders")} />
                </View>
              </>
            ) : (
              <Text style={s.orderMeta}>{t("m.home.noOrder")}</Text>
            )}
          </Card>
        )}

        {/* Rząd akcji: Rozpocznij Trip / Tankuj / Checklist (mockup 01) */}
        {show("forms") && (
          <View style={s.actionRow}>
            <Pressable style={s.actionPrimary} onPress={() => router.push("/trip")}>
              <Text style={s.actionPrimaryText}>{t("m.home.startTrip")}</Text>
            </Pressable>
            <Pressable style={s.actionGhost} onPress={() => router.push("/fuel")}>
              <Text style={s.actionGhostText}>{t("m.home.fuelAction")}</Text>
            </Pressable>
            {show("checklists") && (
              <Pressable style={s.actionGhost} onPress={() => router.push("/checklists")}>
                <Text style={s.actionGhostText}>{t("m.home.checklistAction")}</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* KPI dnia */}
        <SectionTitle>{t("m.home.today")}</SectionTitle>
        <View style={s.kpiRow}>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>{t("m.home.fuelToday")}</Text>
            <Text style={s.kpiValue}>
              {fuelToday} <Text style={s.kpiUnit}>l</Text>
            </Text>
          </View>
          {show("checklists") && (
            <View style={s.kpi}>
              <Text style={s.kpiLabel}>{t("m.home.checklists")}</Text>
              <Text style={[s.kpiValue, (checklistsDue ?? 0) > 0 && { color: palette.warning }]}>
                {checklistsDue ?? "—"}
              </Text>
            </View>
          )}
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>{t("m.home.sync")}</Text>
            <Text style={[s.kpiValue, pendingSync === 0 && { color: palette.success }]}>
              {pendingSync === 0 ? "✓" : pendingSync}
            </Text>
          </View>
        </View>

        {/* Ostatnie aktywności — najnowszy wpis wyróżniony (mockup 01) */}
        <SectionTitle>{t("m.home.activities")}</SectionTitle>
        {outbox.length === 0 && <Text style={s.empty}>{t("m.home.activitiesEmpty")}</Text>}
        {outbox.slice(0, 3).map((it, i) => (
          <View key={it.id} style={[s.activity, i === 0 && s.activityHot]}>
            <Text style={s.activityGlyph}>{KIND_GLYPH[it.kind]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.activityTitle}>{t(KIND_KEY[it.kind])}</Text>
              <Text style={s.activitySub} numberOfLines={1}>
                {activitySub(it)}
              </Text>
            </View>
            <Text style={s.activityStatus}>{it.status === "synced" ? "✓" : "⏳"}</Text>
          </View>
        ))}
      </ScrollView>
      {/* #295: FAB — szybkie dodawanie bez szukania w menu */}
      <Fab
        actions={[
          { icon: "fuel", label: t("m.kind.fuel"), onPress: () => router.push("/fuel") },
          { icon: "droplet", label: t("m.kind.adblue"), onPress: () => router.push("/adblue") },
          { icon: "receipt", label: t("m.kind.expense"), onPress: () => router.push("/expenses") },
          { icon: "wrench", label: t("m.fab.defect"), onPress: () => router.push("/defects") },
        ]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, paddingTop: 24, gap: 12, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  hello: { color: palette.offWhite, fontSize: 32, fontWeight: "800", lineHeight: 36 },
  who: { color: palette.offWhite, fontSize: 19, fontWeight: "600", marginTop: 2 },
  sub: { color: palette.smoke, fontSize: 13, marginTop: 2 },
  orderCard: { gap: 8, overflow: "hidden" },
  redStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: palette.red,
  },
  orderLabel: { color: palette.red, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  orderTitle: { color: palette.offWhite, fontSize: 22, fontWeight: "800" },
  orderMeta: { color: palette.smoke, fontSize: 14, lineHeight: 20 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  actionRow: { flexDirection: "row", gap: 10 },
  actionPrimary: {
    flex: 1.3,
    backgroundColor: palette.red,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionPrimaryText: { color: palette.white, fontWeight: "800", fontSize: 15 },
  actionGhost: {
    flex: 1,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionGhostText: { color: palette.offWhite, fontWeight: "700", fontSize: 15 },
  kpiRow: { flexDirection: "row", gap: 10 },
  kpi: {
    flex: 1,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 6,
    backgroundColor: palette.nearBlack,
  },
  kpiLabel: { color: palette.smoke, fontSize: 12 },
  kpiValue: { color: palette.offWhite, fontSize: 26, fontWeight: "800" },
  kpiUnit: { fontSize: 15, color: palette.smoke, fontWeight: "600" },
  empty: { color: palette.smoke, fontSize: 13, lineHeight: 19 },
  activity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  activityHot: { borderColor: palette.red, backgroundColor: "#1c0d0f" },
  activityGlyph: { fontSize: 22 },
  activityTitle: { color: palette.offWhite, fontSize: 15, fontWeight: "700" },
  activitySub: { color: palette.smoke, fontSize: 12, marginTop: 1 },
  activityStatus: { color: palette.smoke, fontSize: 15 },
});
