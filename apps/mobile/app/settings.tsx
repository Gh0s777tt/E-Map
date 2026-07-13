/** #285: Ustawienia — konto, powiadomienia push, wersja aplikacji, wylogowanie.
 *  #300: wybór języka aplikacji (Systemowy / PL / EN / DE / UK). */
import { MOBILE_LOCALES, type MobileLocale } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../components/AuthProvider";
import { Card, GhostButton, PrimaryButton, SectionTitle } from "../components/ui";
import { type LocalePref, useLocale } from "../lib/i18n";
import { type PowerSyncStatusInfo, powersyncConfigured, powersyncStatus } from "../lib/powersync";
import { registerForPush } from "../lib/push";

const LOCALE_LABEL: Record<MobileLocale, string> = {
  pl: "Polski",
  en: "English",
  de: "Deutsch",
  uk: "Українська",
};

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const { pref, setPref, t } = useLocale();
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  // #311: status PowerSync (offline sync) — tylko gdy skonfigurowany
  const [ps, setPs] = useState<PowerSyncStatusInfo | null>(null);
  useEffect(() => {
    if (!powersyncConfigured()) return;
    const tick = () =>
      powersyncStatus()
        .then(setPs)
        .catch(() => {});
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);
  const version = Constants.expoConfig?.version ?? "—";

  async function enablePush() {
    setPushMsg(null);
    const uid = session?.user?.id;
    if (!uid) {
      setPushMsg("Zaloguj się, aby włączyć powiadomienia.");
      return;
    }
    try {
      await registerForPush(uid);
      setPushMsg("✅ Powiadomienia włączone (token zapisany).");
    } catch (e) {
      setPushMsg(e instanceof Error ? e.message : "Nie udało się włączyć powiadomień.");
    }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <SectionTitle>Konto</SectionTitle>
      <Card style={{ gap: 8 }}>
        <View style={s.kv}>
          <Text style={s.k}>E-mail</Text>
          <Text style={s.v} numberOfLines={1}>
            {session?.user?.email ?? "—"}
          </Text>
        </View>
        <Text style={s.hint}>
          Hasło i dane konta zmienisz w panelu web: e-logistic-one.vercel.app
        </Text>
      </Card>

      <SectionTitle>Powiadomienia</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Text style={s.hint}>
          Push o nowych zleceniach i terminach. Jeśli nie dostajesz powiadomień, dotknij poniżej i
          zaakceptuj zgodę systemową.
        </Text>
        <PrimaryButton label="🔔 Włącz / odśwież powiadomienia" onPress={enablePush} />
        {pushMsg && <Text style={s.msg}>{pushMsg}</Text>}
      </Card>

      <SectionTitle>{t("m.settings.language")}</SectionTitle>
      <Card>
        <View style={s.langRow}>
          {(["auto", ...MOBILE_LOCALES] as LocalePref[]).map((p) => {
            const on = pref === p;
            return (
              <Pressable
                key={p}
                style={[s.lang, on && s.langOn]}
                onPress={() => setPref(p)}
                accessibilityState={{ selected: on }}
              >
                <Text style={[s.langText, on && s.langTextOn]}>
                  {p === "auto" ? t("m.settings.languageAuto") : LOCALE_LABEL[p]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {powersyncConfigured() && (
        <>
          <SectionTitle>Synchronizacja offline</SectionTitle>
          <Card style={{ gap: 8 }}>
            <View style={s.kv}>
              <Text style={s.k}>PowerSync</Text>
              <Text style={[s.v, { color: ps?.connected ? palette.success : palette.warning }]}>
                {ps ? (ps.connected ? "● połączony" : "○ łączenie…") : "—"}
              </Text>
            </View>
            <View style={s.kv}>
              <Text style={s.k}>Ostatnia synchronizacja</Text>
              <Text style={s.v}>
                {ps?.lastSyncedAt ? ps.lastSyncedAt.slice(0, 16).replace("T", " ") : "—"}
              </Text>
            </View>
            <View style={s.kv}>
              <Text style={s.k}>Wiersze lokalnie</Text>
              <Text style={s.v}>{ps?.rows ?? "—"}</Text>
            </View>
          </Card>
        </>
      )}

      <SectionTitle>Aplikacja</SectionTitle>
      <Card style={{ gap: 8 }}>
        <View style={s.kv}>
          <Text style={s.k}>Wersja</Text>
          <Text style={s.v}>{version}</Text>
        </View>
        <View style={s.kv}>
          <Text style={s.k}>Wsparcie</Text>
          <Text style={s.v}>e-logistic-one.vercel.app/support</Text>
        </View>
      </Card>

      <View style={{ marginTop: 18 }}>
        <GhostButton label="🚪 Wyloguj" onPress={() => signOut()} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  kv: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  k: { color: palette.smoke, fontSize: 14 },
  v: { color: palette.offWhite, fontSize: 14, fontWeight: "600", flexShrink: 1 },
  hint: { color: palette.smoke, fontSize: 13, lineHeight: 19 },
  msg: { color: palette.smoke, fontSize: 13 },
  langRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  lang: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  langOn: { backgroundColor: palette.red, borderColor: palette.red },
  langText: { color: palette.smoke, fontSize: 14, fontWeight: "600" },
  langTextOn: { color: palette.white, fontWeight: "800" },
});
