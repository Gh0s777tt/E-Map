/**
 * #285: Pulpit 2.0 — powitanie, karta aktywnego zlecenia, szybkie akcje,
 * podsumowanie dnia (checklisty + synchronizacja). Każdy blok ładuje się
 * niezależnie i znosi offline (fail-soft).
 */
import {
  getActiveMembership,
  listChecklistSubmissions,
  listChecklistTemplates,
  listMyOrders,
  type Order,
} from "@e-logistic/api";
import { type AppModule, visibleModules } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Avatar,
  Card,
  Chip,
  GhostButton,
  PrimaryButton,
  QuickAction,
  SectionTitle,
} from "../../components/ui";
import { listOutbox } from "../../lib/outbox";
import { getSupabase, supabaseConfigured } from "../../lib/supabase";
import { initialOf, roleLabel, useProfile } from "../../lib/useProfile";

const ACTIVE: Order["status"][] = ["in_progress", "assigned", "new"];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Dobrej nocy";
  if (h < 12) return "Dzień dobry";
  if (h < 18) return "Miłej trasy";
  return "Dobry wieczór";
}

export default function Dashboard() {
  const router = useRouter();
  const profile = useProfile();
  const [mods, setMods] = useState<AppModule[] | null>(null);
  const [active, setActive] = useState<Order | null>(null);
  const [checklistsDue, setChecklistsDue] = useState<number | null>(null);
  const [pendingSync, setPendingSync] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    // Outbox działa zawsze (lokalny), reszta wymaga konfiguracji/sieci.
    listOutbox()
      .then((items) => setPendingSync(items.filter((i) => i.status !== "synced").length))
      .catch(() => {});
    if (!supabaseConfigured) return;
    const sb = getSupabase();
    getActiveMembership(sb)
      .then(async (m) => {
        if (!m) return;
        setMods(visibleModules(m.role, m.modules, m.permissions));
        // Checklisty „na dziś": aktywne szablony minus dzisiejsze wysłania.
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
  const name = profile.email ? profile.email.split("@")[0] : "kierowco";

  return (
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
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.hello} numberOfLines={1}>
            {greeting()}, {name}
          </Text>
          <Text style={s.sub} numberOfLines={1}>
            {[profile.companyName, roleLabel(profile.role)].filter(Boolean).join(" · ") ||
              "E-Logistic"}
          </Text>
        </View>
        <Avatar initial={initialOf(profile.email)} />
      </View>

      {show("orders") && (
        <Card style={s.orderCard}>
          <View style={s.redStripe} />
          <Text style={s.orderLabel}>AKTYWNE ZLECENIE</Text>
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
                  .join(" · ") || "Szczegóły w zakładce Zlecenia"}
              </Text>
              <View style={s.btnRow}>
                <PrimaryButton label="🧭 Nawiguj" onPress={() => router.push("/map")} />
                <GhostButton label="Szczegóły" onPress={() => router.push("/orders")} />
              </View>
            </>
          ) : (
            <Text style={s.orderMeta}>
              Brak aktywnego zlecenia. Gdy spedytor coś przydzieli, dostaniesz push — a karta pojawi
              się tutaj.
            </Text>
          )}
        </Card>
      )}

      {show("forms") && (
        <>
          <SectionTitle>Szybkie akcje</SectionTitle>
          <View style={s.quickRow}>
            <QuickAction glyph="⛽" label="Paliwo" onPress={() => router.push("/fuel")} />
            <QuickAction glyph="💧" label="AdBlue" onPress={() => router.push("/adblue")} />
            <QuickAction glyph="🚚" label="Trasa" onPress={() => router.push("/trip")} />
            <QuickAction glyph="📷" label="CMR" onPress={() => router.push("/orders")} />
          </View>
        </>
      )}

      <SectionTitle>Dzisiaj</SectionTitle>
      <View style={s.todayRow}>
        {show("checklists") && (
          <Card style={s.todayCard}>
            <Text style={s.todayLabel}>Checklisty</Text>
            <Text style={s.todayValue}>{checklistsDue ?? "—"}</Text>
            <Text style={s.todayHint}>
              {checklistsDue === 0 ? "wszystko wypełnione ✓" : "do wypełnienia"}
            </Text>
          </Card>
        )}
        <Card style={s.todayCard}>
          <Text style={s.todayLabel}>Synchronizacja</Text>
          <Text style={[s.todayValue, pendingSync === 0 && { color: palette.success }]}>
            {pendingSync === 0 ? "✓" : pendingSync}
          </Text>
          <Text style={s.todayHint}>
            {pendingSync === 0 ? "wszystko wysłane" : "formularze w kolejce"}
          </Text>
        </Card>
      </View>

      {checklistsDue !== null && checklistsDue > 0 && show("checklists") && (
        <Card style={s.alertCard}>
          <Chip label={`${checklistsDue}`} color={palette.warning} />
          <Text style={s.alertText} onPress={() => router.push("/checklists")}>
            Masz checklisty do wypełnienia — otwórz →
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, paddingTop: 24, gap: 12, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  hello: { color: palette.offWhite, fontSize: 28, fontWeight: "800" },
  sub: { color: palette.smoke, fontSize: 14, marginTop: 2 },
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
  quickRow: { flexDirection: "row", gap: 10 },
  todayRow: { flexDirection: "row", gap: 10 },
  todayCard: { flex: 1, gap: 4 },
  todayLabel: { color: palette.smoke, fontSize: 13 },
  todayValue: { color: palette.offWhite, fontSize: 30, fontWeight: "800" },
  todayHint: { color: palette.smoke, fontSize: 12 },
  alertCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  alertText: { color: palette.offWhite, fontSize: 14, flex: 1 },
});
