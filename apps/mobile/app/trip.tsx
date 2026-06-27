import {
  firstZodError,
  TRIP_ACTIONS,
  type TripEventInput,
  tripEventSchema,
} from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { VehiclePicker } from "../components/VehiclePicker";
import { enqueue, flushQueued, listOutbox, type OutboxItem } from "../lib/outbox";
import { useFleet } from "../lib/useFleet";

const t = createTranslator("pl");

const STATUS_ICON: Record<OutboxItem["status"], string> = {
  queued: "⏳",
  synced: "✅",
  error: "⚠️",
};

export default function TripScreen() {
  const { vehicles, loading } = useFleet();
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [action, setAction] = useState<(typeof TRIP_ACTIONS)[number]>("load");
  const [country, setCountry] = useState("");
  const [odometer, setOdometer] = useState("");
  const [weight, setWeight] = useState("");
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [items, setItems] = useState<OutboxItem[]>([]);

  const needsWeight = action === "load" || action === "unload";
  const commentRequired = action === "service" || action === "other";

  const refresh = useCallback(async () => {
    setItems(await listOutbox("trip"));
  }, []);

  useEffect(() => {
    flushQueued().then(refresh);
  }, [refresh]);

  useEffect(() => {
    if (!vehicleId && vehicles[0]) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);

  async function submit() {
    setMsg(null);
    if (!vehicleId) {
      setMsg("Wybierz pojazd.");
      return;
    }
    const base = {
      action,
      vehicleId,
      place: { country },
      odometerKm: Number(odometer),
      comment: comment || undefined,
    };
    const candidate = needsWeight
      ? { ...base, weightKg: weight ? Number(weight) : undefined }
      : base;

    const parsed = tripEventSchema.safeParse(candidate);
    if (!parsed.success) {
      setMsg(firstZodError(parsed.error));
      return;
    }
    const item = await enqueue("trip", parsed.data, new Date().toISOString());
    setMsg(
      item.status === "synced"
        ? `✅ Zapisano i zsynchronizowano: ${t(`trip.action.${parsed.data.action}`)}.`
        : `📥 Zapisano lokalnie: ${t(`trip.action.${parsed.data.action}`)} — sync w tle.`,
    );
    setOdometer("");
    setWeight("");
    setComment("");
    await refresh();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: t("form.trip.title") }} />

      <Text style={styles.label}>Pojazd</Text>
      <VehiclePicker
        vehicles={vehicles}
        loading={loading}
        selectedId={vehicleId}
        onSelect={setVehicleId}
      />

      <Text style={styles.label}>Akcja</Text>
      <View style={styles.chips}>
        {TRIP_ACTIONS.map((a) => (
          <Pressable
            key={a}
            style={[styles.chip, action === a && styles.chipActive]}
            onPress={() => setAction(a)}
          >
            <Text style={action === a ? styles.chipTextActive : styles.chipText}>
              {t(`trip.action.${a}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t("form.field.country")}</Text>
      <TextInput
        style={styles.input}
        value={country}
        onChangeText={setCountry}
        placeholder="PL"
        placeholderTextColor={palette.smoke}
        autoCapitalize="characters"
      />

      <Text style={styles.label}>{t("form.field.odometer")}</Text>
      <TextInput
        style={styles.input}
        value={odometer}
        onChangeText={setOdometer}
        keyboardType="numeric"
      />

      {needsWeight && (
        <>
          <Text style={styles.label}>{t("form.field.weight")}</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
          />
        </>
      )}

      <Text style={styles.label}>
        {t("form.field.comment")}
        {commentRequired ? " (wymagane)" : ""}
      </Text>
      <TextInput
        style={[styles.input, { minHeight: 70 }]}
        value={comment}
        onChangeText={setComment}
        multiline
      />

      <Pressable style={styles.btn} onPress={submit}>
        <Text style={styles.btnText}>{t("common.save")}</Text>
      </Pressable>
      {msg && <Text style={styles.msg}>{msg}</Text>}

      {items.length > 0 && (
        <View style={styles.queue}>
          <Text style={styles.queueHead}>Ostatnie zdarzenia ({items.length})</Text>
          {items.slice(0, 10).map((it) => {
            const input = it.input as TripEventInput;
            return (
              <Text key={it.id} style={styles.queueRow}>
                {STATUS_ICON[it.status]} {t(`trip.action.${input.action}`)} · {input.place.country}
                {it.status === "error" && it.error ? ` — ${it.error}` : ""}
              </Text>
            );
          })}
        </View>
      )}
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: palette.red, borderColor: palette.red },
  chipText: { color: palette.offWhite, fontSize: 13 },
  chipTextActive: { color: palette.white, fontWeight: "700", fontSize: 13 },
  btn: {
    marginTop: 14,
    backgroundColor: palette.red,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnText: { color: palette.white, fontWeight: "700", fontSize: 16 },
  msg: { color: palette.smoke, marginTop: 10 },
  queue: {
    marginTop: 16,
    borderTopColor: palette.graphite,
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 4,
  },
  queueHead: { color: palette.offWhite, fontWeight: "700", fontSize: 13 },
  queueRow: { color: palette.smoke, fontSize: 13 },
});
