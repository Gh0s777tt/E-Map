import { type FuelLogInput, fuelLogSchema } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { enqueue, flushQueued, listOutbox, type OutboxItem } from "../lib/outbox";
import { useFleet } from "../lib/useFleet";
import { VehiclePicker } from "./VehiclePicker";

const STATUS_ICON: Record<OutboxItem["status"], string> = {
  queued: "⏳",
  synced: "✅",
  error: "⚠️",
};

/** Wspólny formularz cieczy: paliwo (`fuel`) i AdBlue (`adblue`) — ta sama walidacja. */
export function LiquidForm({ kind }: { kind: "fuel" | "adblue" }) {
  const { vehicles, loading } = useFleet();
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [country, setCountry] = useState("");
  const [odometer, setOdometer] = useState("");
  const [liters, setLiters] = useState("");
  const [payment, setPayment] = useState<"card" | "cash">("cash");
  const [msg, setMsg] = useState<string | null>(null);
  const [items, setItems] = useState<OutboxItem[]>([]);

  const refresh = useCallback(async () => {
    setItems(await listOutbox(kind));
  }, [kind]);

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
    const parsed = fuelLogSchema.safeParse({
      vehicleId,
      station: { country },
      odometerKm: Number(odometer),
      liters: Number(liters),
      paymentMethod: payment,
    });
    if (!parsed.success) {
      setMsg(parsed.error.issues[0]?.message ?? "Błąd walidacji");
      return;
    }
    const item = await enqueue(kind, parsed.data, new Date().toISOString());
    setMsg(
      item.status === "synced"
        ? "✅ Zapisano i zsynchronizowano."
        : "📥 Zapisano lokalnie — synchronizacja w tle.",
    );
    setOdometer("");
    setLiters("");
    await refresh();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Pojazd</Text>
      <VehiclePicker
        vehicles={vehicles}
        loading={loading}
        selectedId={vehicleId}
        onSelect={setVehicleId}
      />

      <Text style={styles.label}>Kraj</Text>
      <TextInput
        style={styles.input}
        value={country}
        onChangeText={setCountry}
        placeholder="DE"
        placeholderTextColor={palette.smoke}
        autoCapitalize="characters"
      />

      <Text style={styles.label}>Przebieg (km)</Text>
      <TextInput
        style={styles.input}
        value={odometer}
        onChangeText={setOdometer}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Litry</Text>
      <TextInput
        style={styles.input}
        value={liters}
        onChangeText={setLiters}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Płatność</Text>
      <View style={styles.row}>
        {(["cash", "card"] as const).map((m) => (
          <Pressable
            key={m}
            style={[styles.chip, payment === m && styles.chipActive]}
            onPress={() => setPayment(m)}
          >
            <Text style={payment === m ? styles.chipTextActive : styles.chipText}>
              {m === "card" ? "Karta" : "Gotówka"}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.btn} onPress={submit}>
        <Text style={styles.btnText}>Zapisz</Text>
      </Pressable>
      {msg && <Text style={styles.msg}>{msg}</Text>}

      {items.length > 0 && (
        <View style={styles.queue}>
          <Text style={styles.queueHead}>Ostatnie wpisy ({items.length})</Text>
          {items.slice(0, 10).map((it) => {
            const input = it.input as FuelLogInput;
            return (
              <Text key={it.id} style={styles.queueRow}>
                {STATUS_ICON[it.status]} {input.liters} L · {input.station.country}
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
