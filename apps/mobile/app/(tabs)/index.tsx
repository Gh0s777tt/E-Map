/**
 * Start 3.0 — karta kierowcy w wariancie A („Kokpit", wybór właściciela #314):
 * legitymacja z imieniem i nazwiskiem (RPC z kartoteki, bez e-maila), stażem
 * i statystykami miesiąca z formularzy (km Trip, ON, AdBlue, śr. spalanie),
 * pod nią „Na dziś" (checklisty + bieżące zlecenie) i ostatnie aktywności.
 * Nagłówek: „3 kreski" (szuflada N1) + logo + avatar.
 */
import {
  getActiveMembership,
  listChecklistSubmissions,
  listMyOrders,
  listVisibleChecklistTemplates,
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
import { AppHeader } from "../../components/AppHeader";
import { GamificationCard } from "../../components/GamificationCard";
import { OwnerDashboard, useOwnerDashboard } from "../../components/OwnerDashboard";
import { TachoStrip } from "../../components/TachoStrip";
import { Avatar, wide } from "../../components/ui";
import { navigationUrl } from "../../lib/chatNotify";
import { useT } from "../../lib/i18n";
import { listOutbox, type OutboxItem } from "../../lib/outbox";
import { getSupabase, supabaseConfigured } from "../../lib/supabase";
import { tenureLabel, useDriverCard } from "../../lib/useDriverCard";
import { useFleet } from "../../lib/useFleet";
import { useGamification } from "../../lib/useGamification";
import { initialOf, roleLabel, useProfile } from "../../lib/useProfile";

const ACTIVE: Order["status"][] = ["in_progress", "assigned", "new"];

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

function fmt(n: number | null, digits = 0): string {
  if (n === null) return "—";
  return n.toLocaleString("pl-PL", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

export default function StartScreen() {
  const router = useRouter();
  const t = useT();
  const profile = useProfile();
  const { vehicles } = useFleet();
  const { data: card, reload: reloadCard } = useDriverCard();
  const isManager = profile.role === "owner" || profile.role === "dispatcher";
  const { data: owner, reload: reloadOwner } = useOwnerDashboard(profile.companyId);
  const { data: game, reload: reloadGame } = useGamification();
  const [mods, setMods] = useState<AppModule[] | null>(null);
  const [active, setActive] = useState<Order | null>(null);
  const [checklistsDue, setChecklistsDue] = useState<number | null>(null);
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    listOutbox()
      .then((items) => setOutbox([...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))))
      .catch(() => {});
    reloadCard().catch(() => {});
    reloadOwner().catch(() => {});
    reloadGame().catch(() => {});
    if (!supabaseConfigured) return;
    const sb = getSupabase();
    getActiveMembership(sb)
      .then(async (m) => {
        if (!m) return;
        setMods(visibleModules(m.role, m.modules, m.permissions));
        try {
          const [templates, subs] = await Promise.all([
            listVisibleChecklistTemplates(sb),
            listChecklistSubmissions(sb, m.companyId, { limit: 50 }),
          ]);
          const today = new Date().toISOString().slice(0, 10);
          const doneToday = new Set(
            subs.filter((s) => s.created_at.slice(0, 10) === today).map((s) => s.template_name),
          );
          setChecklistsDue(templates.filter((tp) => !doneToday.has(tp.name)).length);
        } catch {
          setChecklistsDue(null);
        }
      })
      .catch(() => {});
    listMyOrders(sb)
      .then((orders) => {
        const found = ACTIVE.map((st) => orders.find((o) => o.status === st)).find(Boolean) ?? null;
        setActive(found);
      })
      .catch(() => {});
  }, [reloadCard, reloadOwner, reloadGame]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const show = (m: AppModule) => mods === null || mods.includes(m);
  const displayName =
    card.fullName ?? (profile.email ? profile.email.split("@")[0] : t("m.home.driverFallback"));
  const myReg = active?.vehicle_id
    ? (vehicles.find((v) => v.id === active.vehicle_id)?.registration ?? null)
    : (vehicles[0]?.registration ?? null);
  const idSub = [
    roleLabel(profile.role) || null,
    card.tenureMonths !== null
      ? `${t("m.card.tenure")} ${tenureLabel(card.tenureMonths, t("m.card.years"), t("m.card.months"))}`
      : null,
    myReg,
  ]
    .filter(Boolean)
    .join(" · ");
  const pendingSync = outbox.filter((i) => i.status !== "synced").length;
  const fuelPendingToday = outbox
    .filter(
      (i) =>
        (i.kind === "fuel" || i.kind === "adblue") &&
        i.status !== "synced" &&
        i.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10),
    )
    .reduce((a, i) => a + ((i.input as FuelLogInput).liters ?? 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: palette.black }}>
      <AppHeader />
      <ScrollView
        style={s.screen}
        contentContainerStyle={[s.content, wide]}
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
        {/* Legitymacja kierowcy (wariant A) */}
        <View style={s.idCard}>
          <View style={s.idGlow} />
          <View style={s.idRow}>
            <Avatar initial={initialOf(card.fullName ?? profile.email)} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={s.idHello}>{t("m.home.hello")}</Text>
              <Text style={s.idName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={s.idSub} numberOfLines={1}>
                {idSub || profile.companyName || "E-Logistic"}
              </Text>
            </View>
          </View>
          {!isManager && (
            <View style={s.statGrid}>
              <View style={s.stat}>
                <Text style={s.statValue}>
                  {fmt(card.kmMonth)} <Text style={s.statUnit}>km</Text>
                </Text>
                <Text style={s.statLabel}>{t("m.card.kmMonth")}</Text>
              </View>
              <View style={s.stat}>
                <Text style={s.statValue}>
                  {fmt(card.avgConsumption, 1)} <Text style={s.statUnit}>l/100</Text>
                </Text>
                <Text style={s.statLabel}>{t("m.card.avgCons")}</Text>
              </View>
              <View style={s.stat}>
                <Text style={s.statValue}>
                  {fmt(card.dieselMonth)} <Text style={s.statUnit}>l</Text>
                </Text>
                <Text style={s.statLabel}>{t("m.card.dieselMonth")}</Text>
              </View>
              <View style={s.stat}>
                <Text style={s.statValue}>
                  {fmt(card.adblueMonth)} <Text style={s.statUnit}>l</Text>
                </Text>
                <Text style={s.statLabel}>{t("m.card.adblueMonth")}</Text>
              </View>
            </View>
          )}
        </View>

        {isManager && <OwnerDashboard data={owner} />}
        {!isManager && <TachoStrip />}
        {!isManager && game && <GamificationCard data={game} />}

        {/* Na dziś */}
        <Text style={s.section}>{t("m.card.today")}</Text>
        {show("checklists") && (checklistsDue ?? 0) > 0 && (
          <Pressable style={s.task} onPress={() => router.push("/checklists")}>
            <View style={[s.dot, { backgroundColor: palette.warning }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.taskTitle}>
                {t("m.card.checklistsDue", { n: checklistsDue ?? 0 })}
              </Text>
              <Text style={s.taskSub}>{t("m.card.checklistsHint")}</Text>
            </View>
            <Text style={s.go}>›</Text>
          </Pressable>
        )}
        {show("orders") && active && (
          <Pressable style={s.task} onPress={() => router.push("/orders")}>
            <View style={[s.dot, { backgroundColor: palette.success }]} />
            <View style={{ flex: 1 }}>
              {active.origin || active.destination ? (
                <Text style={s.taskTitle} numberOfLines={1}>
                  {active.origin || "—"} → {active.destination || "—"}
                </Text>
              ) : null}
              <Text style={s.taskSub} numberOfLines={1}>
                {[
                  active.reference_no,
                  active.cargo,
                  active.unload_date ? `${t("m.card.unload")} ${active.unload_date}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
            <Text style={s.go}>›</Text>
          </Pressable>
        )}
        {active?.destination && (
          <Pressable
            style={s.navBtn}
            onPress={() => {
              Linking.openURL(
                navigationUrl(active.destination ?? "", Platform.OS === "ios" ? "ios" : "other"),
              ).catch(() => router.push("/map"));
            }}
          >
            <Text style={s.navBtnText}>🧭 {t("m.home.navigate")}</Text>
          </Pressable>
        )}
        {pendingSync > 0 && (
          <View style={s.task}>
            <View style={[s.dot, { backgroundColor: palette.smoke }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.taskTitle}>{t("m.card.pendingSync", { n: pendingSync })}</Text>
              {fuelPendingToday > 0 && (
                <Text style={s.taskSub}>
                  {t("m.home.fuelToday")}: {fuelPendingToday} l
                </Text>
              )}
            </View>
          </View>
        )}
        {!active && (checklistsDue ?? 0) === 0 && pendingSync === 0 && (
          <Text style={s.empty}>{t("m.card.allClear")}</Text>
        )}

        {/* Ostatnie aktywności */}
        <Text style={s.section}>{t("m.home.activities")}</Text>
        {outbox.length === 0 && <Text style={s.empty}>{t("m.home.activitiesEmpty")}</Text>}
        {outbox.slice(0, 3).map((it, i) => (
          <View key={it.id} style={[s.task, i === 0 && s.taskHot]}>
            <Text style={{ fontSize: 20 }}>{KIND_GLYPH[it.kind]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.taskTitle}>{t(KIND_KEY[it.kind])}</Text>
              <Text style={s.taskSub} numberOfLines={1}>
                {it.createdAt.slice(5, 16).replace("T", " ")}
              </Text>
            </View>
            <Text style={s.go}>{it.status === "synced" ? "✓" : "⏳"}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingTop: 8, gap: 10, paddingBottom: 32 },
  idCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.graphite,
    backgroundColor: "#161616",
    padding: 16,
    gap: 14,
    overflow: "hidden",
  },
  idGlow: {
    position: "absolute",
    right: -50,
    bottom: -70,
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: "rgba(229,9,20,0.16)",
  },
  idRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  idHello: { color: palette.smoke, fontSize: 12, fontWeight: "600" },
  idName: { color: palette.offWhite, fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  idSub: { color: palette.smoke, fontSize: 12, marginTop: 2 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stat: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statValue: { color: palette.offWhite, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  statUnit: { fontSize: 12, color: palette.smoke, fontWeight: "600" },
  statLabel: {
    color: palette.smoke,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 3,
  },
  section: { color: palette.offWhite, fontSize: 13, fontWeight: "700", marginTop: 8 },
  task: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
  },
  taskHot: { borderColor: palette.red, backgroundColor: "#1c0d0f" },
  dot: { width: 8, height: 8, borderRadius: 999 },
  taskTitle: { color: palette.offWhite, fontSize: 14, fontWeight: "700" },
  taskSub: { color: palette.smoke, fontSize: 11.5, marginTop: 1 },
  go: { color: palette.smoke, fontSize: 16 },
  navBtn: {
    backgroundColor: palette.red,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  navBtnText: { color: palette.white, fontWeight: "800", fontSize: 14 },
  empty: { color: palette.smoke, fontSize: 13, lineHeight: 19 },
});
