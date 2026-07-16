import {
  type DocumentMeta,
  getActiveMembership,
  getDocumentUrl,
  listDocuments,
} from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

/**
 * #275: dokumenty udostępnione kierowcy (tachobooki, listy kontrolne…) —
 * RLS pokazuje tylko to, co firma udostępniła (wszystkim albo imiennie).
 * Otwarcie = podpisany URL → systemowa przeglądarka PDF (podgląd/druk).
 */
export default function DocumentsScreen() {
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) {
      // #audyt N8: bez tego `loading` zostawało na true → wieczne „Ładowanie…".
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const sb = getSupabase();
        const m = await getActiveMembership(sb);
        if (!m) return;
        setDocs(await listDocuments(sb, m.companyId));
      } catch {
        setMsg("Nie udało się pobrać dokumentów — spróbuj przy zasięgu.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function open(doc: DocumentMeta) {
    try {
      const url = await getDocumentUrl(getSupabase(), doc.path);
      if (url) await Linking.openURL(url);
    } catch {
      setMsg("Nie udało się otworzyć dokumentu.");
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Dokumenty" }} />
      {loading && <Text style={styles.note}>Ładowanie…</Text>}
      {!loading && docs.length === 0 && (
        <Text style={styles.note}>
          Brak udostępnionych dokumentów — właściciel udostępnia je w panelu web (Dokumenty →
          widoczność).
        </Text>
      )}
      {docs.map((d) => (
        <Pressable key={d.id} style={styles.row} onPress={() => open(d)}>
          <Text style={styles.icon}>{d.mime?.includes("pdf") ? "📕" : "📄"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {d.name}
            </Text>
            <Text style={styles.sub}>
              {d.category ?? "dokument"} · {d.created_at.slice(0, 10)}
            </Text>
          </View>
          <Text style={styles.open}>otwórz ↗</Text>
        </Pressable>
      ))}
      {msg && <Text style={styles.note}>{msg}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 20, gap: 10 },
  note: { color: palette.smoke, fontSize: 13, lineHeight: 18 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  icon: { fontSize: 22 },
  name: { color: palette.offWhite, fontSize: 15, fontWeight: "600" },
  sub: { color: palette.smoke, fontSize: 12, marginTop: 2 },
  open: { color: palette.red, fontSize: 13, fontWeight: "700" },
});
