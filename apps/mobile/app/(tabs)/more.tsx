/**
 * #285: „Więcej" — profil + wszystkie funkcje w sekcjach (PRACA / POJAZD / KONTO).
 * Tu dokładamy kolejne moduły web bez zaśmiecania pulpitu.
 */

import { getActiveMembership } from "@e-logistic/api";
import { type AppModule, visibleModules } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../components/AuthProvider";
import { Avatar, Card, ListRow, ScreenTitle, SectionTitle } from "../../components/ui";
import { useT } from "../../lib/i18n";
import { getSupabase, supabaseConfigured } from "../../lib/supabase";
import { initialOf, roleLabel, useProfile } from "../../lib/useProfile";

export default function MoreScreen() {
  const router = useRouter();
  const t = useT();
  const { signOut } = useAuth();
  const profile = useProfile();
  const [mods, setMods] = useState<AppModule[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!supabaseConfigured) return;
      getActiveMembership(getSupabase())
        .then((m) => m && setMods(visibleModules(m.role, m.modules, m.permissions)))
        .catch(() => {});
    }, []),
  );
  const show = (m: AppModule) => mods === null || mods.includes(m);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <ScreenTitle>{t("m.tab.more")}</ScreenTitle>

      <Card style={s.profile}>
        <Avatar initial={initialOf(profile.email)} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={s.profileName} numberOfLines={1}>
            {profile.email ?? "—"}
          </Text>
          <Text style={s.profileSub} numberOfLines={1}>
            {[profile.companyName, roleLabel(profile.role)].filter(Boolean).join(" · ") || "—"}
          </Text>
        </View>
        <View style={s.online}>
          <View style={s.onlineDot} />
          <Text style={s.onlineText}>online</Text>
        </View>
      </Card>

      <SectionTitle>{t("m.more.work")}</SectionTitle>
      <Card style={s.list}>
        <ListRow
          glyph="💬"
          title={t("m.more.chatTitle")}
          subtitle={t("m.more.chatSub")}
          onPress={() => router.push("/chat")}
        />
        {show("checklists") && (
          <ListRow
            glyph="✅"
            title={t("m.screen.checklists")}
            subtitle={t("m.more.checklistsSub")}
            onPress={() => router.push("/checklists")}
          />
        )}
        <ListRow
          glyph="⏱"
          title={t("m.screen.workTime")}
          subtitle={t("m.more.workTimeSub")}
          onPress={() => router.push("/work-time")}
        />
        <ListRow
          glyph="🧾"
          title={t("m.screen.expenses")}
          subtitle={t("m.more.expensesSub")}
          onPress={() => router.push("/expenses")}
        />
        {show("settlements") && (
          <ListRow
            glyph="💶"
            title={t("m.screen.settlement")}
            subtitle={t("m.more.settlementSub")}
            onPress={() => router.push("/settlement")}
          />
        )}
        {show("documents") && (
          <ListRow
            glyph="📄"
            title={t("m.screen.documents")}
            subtitle={t("m.more.documentsSub")}
            onPress={() => router.push("/documents")}
            last
          />
        )}
      </Card>

      <SectionTitle>{t("m.more.vehicleSec")}</SectionTitle>
      <Card style={s.list}>
        {show("damages") && (
          <ListRow
            glyph="🔧"
            title={t("m.screen.defects")}
            subtitle={t("m.more.defectsSub")}
            onPress={() => router.push("/defects")}
          />
        )}
        {show("vehicles") && (
          <ListRow
            glyph="🚛"
            title={t("m.screen.vehicle")}
            subtitle={t("m.more.vehicleSub")}
            onPress={() => router.push("/vehicle")}
          />
        )}
        {show("stats") && (
          <ListRow
            glyph="📊"
            title={t("m.screen.stats")}
            subtitle={t("m.more.statsSub")}
            onPress={() => router.push("/stats")}
            last
          />
        )}
      </Card>

      <SectionTitle>{t("m.more.account")}</SectionTitle>
      <Card style={s.list}>
        <ListRow
          glyph="⚙️"
          title={t("m.screen.settings")}
          subtitle={t("m.more.settingsSub")}
          onPress={() => router.push("/settings")}
        />
        <ListRow glyph="🚪" title={t("m.more.logout")} danger onPress={() => signOut()} last />
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, paddingTop: 24, paddingBottom: 32 },
  profile: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
  profileName: { color: palette.offWhite, fontSize: 17, fontWeight: "800" },
  profileSub: { color: palette.smoke, fontSize: 13, marginTop: 2 },
  online: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#12351f",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.success },
  onlineText: { color: palette.success, fontSize: 12, fontWeight: "600" },
  list: { paddingVertical: 4 },
});
