/**
 * #314 (N1): hub Formularzy — Tankowanie / AdBlue / Trasa / Wydatek / Usterka
 * jednym tapnięciem z doka. Duże kafle (obsługa w rękawicach), offline-first
 * jak dotąd (każdy formularz zapisuje przez outbox).
 */
import { palette } from "@e-logistic/ui";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader } from "../../components/AppHeader";
import { wide } from "../../components/ui";
import { useT } from "../../lib/i18n";

export default function FormsHub() {
  const router = useRouter();
  const t = useT();
  const tiles = [
    { glyph: "⛽️", title: t("m.kind.fuel"), sub: t("m.forms.fuelSub"), href: "/fuel", hot: true },
    {
      glyph: "💧",
      title: t("m.kind.adblue"),
      sub: t("m.forms.adblueSub"),
      href: "/adblue",
      hot: false,
    },
    { glyph: "🛣", title: t("m.kind.trip"), sub: t("m.forms.tripSub"), href: "/trip", hot: false },
    {
      glyph: "🧾",
      title: t("m.kind.expense"),
      sub: t("m.forms.expenseSub"),
      href: "/expenses",
      hot: false,
    },
    {
      glyph: "🔧",
      title: t("m.fab.defect"),
      sub: t("m.forms.defectSub"),
      href: "/defects",
      hot: false,
    },
  ] as const;

  return (
    <View style={s.screen}>
      <AppHeader subtitle={t("m.nav.forms")} />
      <ScrollView contentContainerStyle={[s.content, wide]}>
        <Text style={s.hint}>{t("m.forms.hint")}</Text>
        <View style={s.grid}>
          {tiles.map((tile) => (
            <Pressable
              key={tile.href}
              style={[s.tile, tile.hot && s.tileHot]}
              onPress={() => router.push(tile.href)}
            >
              <Text style={s.glyph}>{tile.glyph}</Text>
              <Text style={s.title}>{tile.title}</Text>
              <Text style={s.sub} numberOfLines={2}>
                {tile.sub}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, paddingBottom: 32 },
  hint: { color: palette.smoke, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  tileHot: { borderColor: "rgba(229,9,20,0.5)", backgroundColor: "#1c0d0f" },
  glyph: { fontSize: 26, marginBottom: 4 },
  title: { color: palette.offWhite, fontSize: 16, fontWeight: "800" },
  sub: { color: palette.smoke, fontSize: 12, lineHeight: 17 },
});
