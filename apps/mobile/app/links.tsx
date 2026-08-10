/**
 * [#404] Linki firmowe — skróty zdefiniowane przez właściciela.
 *
 * Kierowca w trasie potrzebuje kilku adresów, które nie należą do tej aplikacji
 * i nigdy nie będą: portal myta, rezerwacja promu, zgłoszenie szkody, awizacja
 * u konkretnego klienta. Dotąd każdy przewoźnik rozwiązywał to tak samo — wysyłał
 * link na czacie albo dyktował przez telefon, a kierowca przepisywał go z pamięci
 * na parkingu, w rękawicach, przy złym zasięgu.
 *
 * RLS zawęża listę sama: kierowca dostaje wyłącznie pozycje ogólne, zarząd
 * wszystkie. Ekran nie musi więc niczego filtrować po roli.
 */
import { type CompanyLink, getActiveMembership, listCompanyLinks } from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card, SectionTitle, wide } from "../components/ui";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

export default function LinksScreen() {
  const t = useT();
  const [links, setLinks] = useState<CompanyLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      const sb = getSupabase();
      const m = await getActiveMembership(sb);
      if (m) setLinks(await listCompanyLinks(sb, m.companyId));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("m.links.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
      }
    >
      <SectionTitle>{t("m.links.title")}</SectionTitle>
      {err && <Text style={s.err}>{err}</Text>}

      {!loading && links.length === 0 && (
        /* Pusto znaczy tu „właściciel jeszcze nic nie dodał", a nie „coś się
           zepsuło" — mówimy to wprost, żeby kierowca nie odświeżał w kółko. */
        <Text style={s.dim}>{t("m.links.empty")}</Text>
      )}

      {links.map((l) => (
        <Pressable
          key={l.id}
          onPress={() => {
            // `openURL` bez `canOpenURL`: adres jest sprawdzony regexem na
            // http(s) po obu stronach (schemat Zod i CHECK w bazie), więc
            // dodatkowe pytanie systemu niczego by tu nie wniosło.
            Linking.openURL(l.url).catch(() => setErr(t("m.links.openError")));
          }}
        >
          <Card style={s.row}>
            <Text style={s.icon}>{l.icon || "🔗"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{l.label}</Text>
              {l.note ? <Text style={s.note}>{l.note}</Text> : null}
              <Text style={s.url} numberOfLines={1}>
                {l.url}
              </Text>
            </View>
            <Text style={s.chev}>›</Text>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { fontSize: 22 },
  label: { color: palette.offWhite, fontSize: 15, fontWeight: "700" },
  note: { color: palette.smoke, fontSize: 12.5, marginTop: 2 },
  url: { color: palette.graphite, fontSize: 11.5, marginTop: 2 },
  chev: { color: palette.smoke, fontSize: 22 },
  err: { color: palette.red, fontSize: 13 },
  dim: { color: palette.smoke, fontSize: 13.5, lineHeight: 1.6 },
});
