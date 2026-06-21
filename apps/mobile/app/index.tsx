import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const t = createTranslator("pl");

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>GH0ST EMPIRE</Text>
      <Text style={styles.title}>
        <Text style={styles.accent}>E</Text>-Logistic
      </Text>
      <Text style={styles.subtitle}>{t("app.tagline")}</Text>

      <Link href="/fuel" asChild>
        <Pressable style={styles.cta}>
          <Text style={styles.ctaText}>⛽ {t("form.fuel.title")}</Text>
        </Pressable>
      </Link>

      <Link href="/adblue" asChild>
        <Pressable style={styles.ctaSecondary}>
          <Text style={styles.ctaText}>💧 {t("form.adblue.title")}</Text>
        </Pressable>
      </Link>

      <Link href="/trip" asChild>
        <Pressable style={styles.ctaSecondary}>
          <Text style={styles.ctaText}>🚚 {t("form.trip.title")}</Text>
        </Pressable>
      </Link>

      <Text style={styles.note}>E-Logistic · mobile</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.black,
    gap: 10,
    padding: 24,
  },
  brand: { color: palette.smoke, letterSpacing: 4, fontSize: 12 },
  title: { color: palette.offWhite, fontSize: 44, fontWeight: "800" },
  accent: { color: palette.red },
  subtitle: { color: palette.smoke, fontSize: 16 },
  cta: {
    marginTop: 18,
    backgroundColor: palette.red,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 10,
  },
  ctaSecondary: {
    marginTop: 10,
    borderColor: palette.graphite,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 10,
  },
  ctaText: { color: palette.white, fontWeight: "700", fontSize: 16 },
  note: { color: palette.smoke, fontSize: 12, marginTop: 16 },
});
