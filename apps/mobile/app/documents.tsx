import {
  DEFAULT_PAGE_SIZE,
  type DocumentMeta,
  getActiveMembership,
  getDocumentUrl,
  listDocuments,
} from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

/**
 * Sufit listy — WŁASNY, choć liczbowo równy domyślnemu `api.max_rows` Supabase.
 *
 * Bez `limit` pobranie urywało się dokładnie tak samo, tylko po stronie PostgREST
 * i bez żadnego śladu: wracało 200 z krótszą tablicą, nieodróżnialną od kompletu.
 * Wpisanie tej samej wartości jawnie nie zmienia w wyniku ANI JEDNEGO wiersza,
 * ale daje jedyną rzecz, której z cudzego sufitu odczytać się nie da — moment
 * ucięcia (`length === DOCS_LIMIT`), a więc możliwość powiedzenia o nim kierowcy.
 */
const DOCS_LIMIT = DEFAULT_PAGE_SIZE;

/**
 * #275: dokumenty udostępnione kierowcy (tachobooki, listy kontrolne…) —
 * RLS pokazuje tylko to, co firma udostępniła (wszystkim albo imiennie).
 * Otwarcie = podpisany URL → systemowa przeglądarka PDF (podgląd/druk).
 *
 * Dlaczego dalej `listDocuments`, a nie stronicowane `listDocumentsAll`: ten ekran
 * jest listą do przeglądania. Nie pokazuje kolumny „ważne do" (`expiry_date` w ogóle
 * tu nie schodzi do JSX) i niczego z tych wierszy nie liczy ani nie eksportuje —
 * terminów pilnuje webowy panel „Wymaga uwagi" i to on woła wersję stronicowaną.
 * Porządek `created_at` malejąco jest tu w dodatku porządkiem WŁAŚCIWYM: kierowcy
 * w trasie potrzebne są najświeższe skany, nie archiwum sprzed lat, więc ucięcie
 * zabiera akurat tę część zbioru, która jest mu najmniej potrzebna. Doładowywanie
 * kolejnych stron kosztowałoby go zapytania w roamingu i wsypało cały sejf do
 * `ScrollView`, który renderuje drzewo w całości. Brakowało tu zatem nie kompletu,
 * tylko PRAWDY o tym, że lista się urwała — i to ona jest niżej dopisana.
 */
export default function DocumentsScreen() {
  const t = useT();
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** Lista dobiła do `DOCS_LIMIT` — dalsze dokumenty istnieją, ale tu ich nie ma. */
  const [truncated, setTruncated] = useState(false);

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
        const rows = await listDocuments(sb, m.companyId, { limit: DOCS_LIMIT });
        setDocs(rows);
        // Przy dokładnie DOCS_LIMIT dokumentach ostrzeżenie jest fałszywym alarmem —
        // i dobrze, bo pomyłka w tę stronę kosztuje kierowcę jedno zdanie za dużo,
        // a w drugą uznanie brakującego skanu za nieistniejący. Ten sam kompromis
        // co w `fetchAllByKeyset` (pełna ostatnia strona → `complete: false`).
        setTruncated(rows.length >= DOCS_LIMIT);
      } catch {
        setMsg(t("m.docs.loadError"));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  async function open(doc: DocumentMeta) {
    try {
      const url = await getDocumentUrl(getSupabase(), doc.path);
      if (url) await Linking.openURL(url);
    } catch {
      setMsg(t("m.docs.openError"));
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: t("m.screen.documents") }} />
      {loading && <Text style={styles.note}>{t("m.docs.loading")}</Text>}
      {!loading && docs.length === 0 && <Text style={styles.note}>{t("m.docs.empty")}</Text>}
      {/* Nad listą, nie pod nią: kierowca, który nie znajdzie skanu, przestaje
          przewijać w miejscu, w którym się poddał — a to zdanie ma go dojść ZANIM
          uzna, że dokumentu nie ma, więc musi stać tam, gdzie zaczyna czytać. */}
      {truncated && <Text style={styles.warn}>{t("m.docs.truncated", { n: DOCS_LIMIT })}</Text>}
      {docs.map((d) => (
        <Pressable key={d.id} style={styles.row} onPress={() => open(d)}>
          <Text style={styles.icon}>{d.mime?.includes("pdf") ? "📕" : "📄"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {d.name}
            </Text>
            <Text style={styles.sub}>
              {d.category ?? t("m.docs.fallbackCategory")} · {d.created_at.slice(0, 10)}
            </Text>
          </View>
          <Text style={styles.open}>{t("m.docs.open")}</Text>
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
  /** Ten sam wygląd co ostrzeżenie o niepełnym zbiorze na mobilnym /fleet-status. */
  warn: { color: palette.warning, fontSize: 12, lineHeight: 17 },
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
