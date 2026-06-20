import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { StyleSheet, Text, View } from "react-native";

const t = createTranslator("pl");

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>GH0ST EMPIRE</Text>
      <Text style={styles.title}>
        <Text style={styles.accent}>E</Text>-Logistic
      </Text>
      <Text style={styles.subtitle}>{t("app.tagline")}</Text>
      <Text style={styles.note}>{t("sync.offline")} · Faza 0 · v0.2.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.black,
    gap: 8,
  },
  brand: { color: palette.smoke, letterSpacing: 4, fontSize: 12 },
  title: { color: palette.offWhite, fontSize: 44, fontWeight: "800" },
  accent: { color: palette.red },
  subtitle: { color: palette.smoke, fontSize: 16 },
  note: { color: palette.smoke, fontSize: 12, marginTop: 12 },
});
