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
import { getSupabase, supabaseConfigured } from "../../lib/supabase";
import { initialOf, roleLabel, useProfile } from "../../lib/useProfile";

export default function MoreScreen() {
  const router = useRouter();
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
      <ScreenTitle>Więcej</ScreenTitle>

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

      <SectionTitle>Praca</SectionTitle>
      <Card style={s.list}>
        {show("checklists") && (
          <ListRow
            glyph="✅"
            title="Checklisty"
            subtitle="Wjazd do UK · Tachograf"
            onPress={() => router.push("/checklists")}
          />
        )}
        <ListRow
          glyph="⏱"
          title="Czas pracy"
          subtitle="dni służby i odpoczynki"
          onPress={() => router.push("/work-time")}
        />
        {show("settlements") && (
          <ListRow
            glyph="💶"
            title="Moje rozliczenie"
            subtitle="stawki firmy · podgląd miesiąca"
            onPress={() => router.push("/settlement")}
          />
        )}
        {show("documents") && (
          <ListRow
            glyph="📄"
            title="Dokumenty"
            subtitle="od firmy · tachobooki"
            onPress={() => router.push("/documents")}
            last
          />
        )}
      </Card>

      <SectionTitle>Pojazd</SectionTitle>
      <Card style={s.list}>
        {show("damages") && (
          <ListRow
            glyph="🔧"
            title="Usterki i szkody"
            subtitle="zgłoś usterkę pojazdu"
            onPress={() => router.push("/defects")}
          />
        )}
        {show("vehicles") && (
          <ListRow
            glyph="🚛"
            title="Mój pojazd"
            subtitle="przeglądy · OC · terminy"
            onPress={() => router.push("/vehicle")}
          />
        )}
        {show("stats") && (
          <ListRow
            glyph="📊"
            title="Statystyki"
            subtitle="tankowania · koszty"
            onPress={() => router.push("/stats")}
            last
          />
        )}
      </Card>

      <SectionTitle>Konto</SectionTitle>
      <Card style={s.list}>
        <ListRow
          glyph="⚙️"
          title="Ustawienia"
          subtitle="powiadomienia · wersja aplikacji"
          onPress={() => router.push("/settings")}
        />
        <ListRow glyph="🚪" title="Wyloguj" danger onPress={() => signOut()} last />
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
