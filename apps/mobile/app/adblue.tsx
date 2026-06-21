import { fuelLogSchema, newId } from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { Stack } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

const t = createTranslator("pl");
const DEMO_VEHICLE = "11111111-1111-4111-8111-111111111111";

type Saved = { id: string; country: string; liters: number };

export default function AdblueScreen() {
  const [country, setCountry] = useState("");
  const [odometer, setOdometer] = useState("");
  const [liters, setLiters] = useState("");
  const [payment, setPayment] = useState<"card" | "cash">("cash");
  const [msg, setMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved[]>([]);

  function submit() {
    setMsg(null);
    const parsed = fuelLogSchema.safeParse({
      vehicleId: DEMO_VEHICLE,
      station: { country },
      odometerKm: Number(odometer),
      liters: Number(liters),
      paymentMethod: payment,
    });
    if (!parsed.success) {
      setMsg(parsed.error.issues[0]?.message ?? "Błąd walidacji");
      return;
    }
    setSaved((prev) => [
      { id: newId(), country: parsed.data.station.country, liters: parsed.data.liters },
      ...prev,
    ]);
    setMsg("📥 Zapisano lokalnie (offline-first).");
    setOdometer("");
    setLiters("");
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: t("form.adblue.title") }} />
      <Text style={styles.label}>{t("form.field.country")}</Text>
      <TextInput
        style={styles.input}
        value={country}
        onChangeText={setCountry}
        placeholder="DE"
        placeholderTextColor={palette.smoke}
      />

      <Text style={styles.label}>{t("form.field.odometer")}</Text>
      <TextInput
        style={styles.input}
        value={odometer}
        onChangeText={setOdometer}
        keyboardType="numeric"
      />

      <Text style={styles.label}>{t("form.field.liters")} (AdBlue)</Text>
      <TextInput
        style={styles.input}
        value={liters}
        onChangeText={setLiters}
        keyboardType="numeric"
      />

      <Text style={styles.label}>{t("form.field.paymentMethod")}</Text>
      <View style={styles.row}>
        {(["cash", "card"] as const).map((m) => (
          <Pressable
            key={m}
            style={[styles.chip, payment === m && styles.chipActive]}
            onPress={() => setPayment(m)}
          >
            <Text style={payment === m ? styles.chipTextActive : styles.chipText}>
              {m === "card" ? t("form.payment.card") : t("form.payment.cash")}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.btn} onPress={submit}>
        <Text style={styles.btnText}>{t("common.save")}</Text>
      </Pressable>
      {msg && <Text style={styles.msg}>{msg}</Text>}

      {saved.map((s) => (
        <Text key={s.id} style={styles.savedRow}>
          • {s.liters} L · {s.country}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 20, gap: 8 },
  label: { color: palette.smoke, fontSize: 12, marginTop: 8 },
  input: {
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: palette.offWhite,
  },
  row: { flexDirection: "row", gap: 10 },
  chip: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: palette.red, borderColor: palette.red },
  chipText: { color: palette.offWhite },
  chipTextActive: { color: palette.white, fontWeight: "700" },
  btn: {
    marginTop: 14,
    backgroundColor: palette.red,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnText: { color: palette.white, fontWeight: "700", fontSize: 16 },
  msg: { color: palette.smoke, marginTop: 10 },
  savedRow: { color: palette.smoke, marginTop: 4 },
});
