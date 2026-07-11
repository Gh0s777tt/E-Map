/** #285: Ustawienia — konto, powiadomienia push, wersja aplikacji, wylogowanie. */
import { palette } from "@e-logistic/ui";
import Constants from "expo-constants";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../components/AuthProvider";
import { Card, GhostButton, PrimaryButton, SectionTitle } from "../components/ui";
import { registerForPush } from "../lib/push";

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const [pushMsg, setPushMsg] = useState<string | null>(null);
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
});
