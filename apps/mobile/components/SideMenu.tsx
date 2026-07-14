/**
 * #314 (N1): szuflada nawigacyjna „3 kreski" — komplet zakładek aplikacji
 * w grupach PRACA / NARZĘDZIA / KONTO (parytet z panelem web), z profilem
 * na górze. Własny overlay (Modal + animacja) — bez nowych zależności.
 */
import { getActiveMembership } from "@e-logistic/api";
import { type AppModule, visibleModules } from "@e-logistic/core";
import type { MobileMessageKey } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../components/AuthProvider";
import { useDrawer } from "../lib/drawer";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";
import { initialOf, roleLabel, useProfile } from "../lib/useProfile";
import { Avatar } from "./ui";

interface Item {
  glyph: string;
  labelKey: MobileMessageKey;
  href: string;
  module?: AppModule;
  /** #321: pozycje zarządcze — tylko owner/dyspozytor. */
  managerOnly?: boolean;
}
interface Group {
  titleKey: MobileMessageKey;
  items: Item[];
}

const GROUPS: Group[] = [
  {
    titleKey: "m.drawer.work",
    items: [
      { glyph: "🏠", labelKey: "m.nav.start", href: "/" },
      { glyph: "📋", labelKey: "m.tab.orders", href: "/orders", module: "orders" },
      { glyph: "⛽️", labelKey: "m.nav.forms", href: "/forms", module: "forms" },
      { glyph: "✅", labelKey: "m.screen.checklists", href: "/checklists", module: "checklists" },
      { glyph: "🧾", labelKey: "m.screen.expenses", href: "/expenses" },
      { glyph: "🕓", labelKey: "m.screen.tacho", href: "/tacho" },
    ],
  },
  {
    titleKey: "m.drawer.tools",
    items: [
      { glyph: "💳", labelKey: "m.nav.cards", href: "/cards" },
      { glyph: "🗺", labelKey: "m.tab.map", href: "/map" },
      { glyph: "💬", labelKey: "m.screen.chat", href: "/chat" },
      { glyph: "📄", labelKey: "m.screen.documents", href: "/documents", module: "documents" },
      { glyph: "🔧", labelKey: "m.screen.defects", href: "/defects", module: "damages" },
      { glyph: "🚛", labelKey: "m.screen.vehicle", href: "/vehicle", module: "vehicles" },
      { glyph: "💶", labelKey: "m.screen.settlement", href: "/settlement", module: "settlements" },
      { glyph: "🧳", labelKey: "m.screen.perDiem", href: "/per-diem", module: "settlements" },
      { glyph: "💰", labelKey: "m.screen.payouts", href: "/payouts", module: "settlements" },
      { glyph: "🛢", labelKey: "m.screen.fuelPrices", href: "/fuel-prices" },
      { glyph: "📊", labelKey: "m.screen.stats", href: "/stats", module: "stats" },
    ],
  },
  {
    titleKey: "m.drawer.manage",
    items: [
      { glyph: "🗓", labelKey: "m.screen.schedule", href: "/schedule", managerOnly: true },
      { glyph: "🚦", labelKey: "m.screen.fleetStatus", href: "/fleet-status", managerOnly: true },
      { glyph: "🧾", labelKey: "m.screen.invoices", href: "/invoices", managerOnly: true },
      {
        glyph: "🚛",
        labelKey: "m.screen.manageVehicles",
        href: "/manage-vehicles",
        managerOnly: true,
      },
      { glyph: "💳", labelKey: "m.screen.manageCards", href: "/manage-cards", managerOnly: true },
      {
        glyph: "✅",
        labelKey: "m.screen.manageChecklists",
        href: "/manage-checklists",
        managerOnly: true,
      },
      {
        glyph: "🏢",
        labelKey: "m.screen.manageContractors",
        href: "/manage-contractors",
        managerOnly: true,
      },
      {
        glyph: "💸",
        labelKey: "m.screen.manageCosts",
        href: "/manage-vehicle-costs",
        managerOnly: true,
      },
      {
        glyph: "👤",
        labelKey: "m.screen.manageDrivers",
        href: "/manage-drivers",
        managerOnly: true,
      },
      {
        glyph: "🔧",
        labelKey: "m.screen.manageService",
        href: "/manage-service",
        managerOnly: true,
      },
      {
        glyph: "👥",
        labelKey: "m.screen.manageTeam",
        href: "/manage-team",
        managerOnly: true,
      },
    ],
  },
];

export function SideMenu() {
  const { open, closeDrawer } = useDrawer();
  const router = useRouter();
  const t = useT();
  const profile = useProfile();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelW = Math.min(320, width * 0.82);
  const slide = useRef(new Animated.Value(-panelW)).current;
  const [mods, setMods] = useState<AppModule[] | null>(null);

  useEffect(() => {
    if (!open || !supabaseConfigured) return;
    getActiveMembership(getSupabase())
      .then((m) => m && setMods(visibleModules(m.role, m.modules, m.permissions)))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 0 : -panelW,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [open, panelW, slide]);

  const isManager = profile.role === "owner" || profile.role === "dispatcher";
  const show = (i: Item) =>
    (!i.managerOnly || isManager) && (!i.module || mods === null || mods.includes(i.module));
  const go = (href: string) => {
    closeDrawer();
    router.push(href as never);
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={closeDrawer}>
      <Pressable style={s.scrim} onPress={closeDrawer} accessibilityLabel={t("m.drawer.close")} />
      <Animated.View
        style={[
          s.panel,
          { width: panelW, paddingTop: insets.top + 10, transform: [{ translateX: slide }] },
        ]}
      >
        <View style={s.user}>
          <Avatar initial={initialOf(profile.email)} size={40} uri={profile.avatarUrl} />
          <View style={{ flex: 1 }}>
            <Text style={s.userName} numberOfLines={1}>
              {profile.email ?? "—"}
            </Text>
            <Text style={s.userSub} numberOfLines={1}>
              {[profile.companyName, roleLabel(profile.role)].filter(Boolean).join(" · ") ||
                "E-Logistic"}
            </Text>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
          {GROUPS.filter((g) => g.items.some(show)).map((g) => (
            <View key={g.titleKey}>
              <Text style={s.group}>{t(g.titleKey)}</Text>
              {g.items.filter(show).map((i) => (
                <Pressable key={i.href} style={s.item} onPress={() => go(i.href)}>
                  <Text style={s.itemGlyph}>{i.glyph}</Text>
                  <Text style={s.itemText}>{t(i.labelKey)}</Text>
                </Pressable>
              ))}
            </View>
          ))}
          <Text style={s.group}>{t("m.drawer.account")}</Text>
          <Pressable style={s.item} onPress={() => go("/profile")}>
            <Text style={s.itemGlyph}>👤</Text>
            <Text style={s.itemText}>{t("m.profile.title")}</Text>
          </Pressable>
          <Pressable style={s.item} onPress={() => go("/settings")}>
            <Text style={s.itemGlyph}>⚙️</Text>
            <Text style={s.itemText}>{t("m.screen.settings")}</Text>
          </Pressable>
          <Pressable
            style={s.item}
            onPress={() => {
              closeDrawer();
              signOut();
            }}
          >
            <Text style={s.itemGlyph}>🚪</Text>
            <Text style={[s.itemText, { color: palette.red }]}>{t("m.more.logout")}</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#121212",
    borderRightWidth: 1,
    borderRightColor: palette.graphite,
  },
  user: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: palette.graphite,
  },
  userName: { color: palette.offWhite, fontSize: 14, fontWeight: "800" },
  userSub: { color: palette.smoke, fontSize: 11, marginTop: 1 },
  group: {
    color: palette.smoke,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  itemGlyph: { fontSize: 16, width: 22, textAlign: "center" },
  itemText: { color: palette.offWhite, fontSize: 14.5, fontWeight: "600" },
});
