import {
  type FuelLogInput,
  firstZodError,
  fuelLogSchema,
  parseReceiptText,
} from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { success, warn } from "../lib/haptics";
import { useT } from "../lib/i18n";
import { enqueue, flushQueued, listOutbox, type OutboxItem } from "../lib/outbox";
import { useFleet } from "../lib/useFleet";
import { usePermission } from "../lib/usePermission";
import { VehiclePicker } from "./VehiclePicker";

const STATUS_ICON: Record<OutboxItem["status"], string> = {
  queued: "⏳",
  synced: "✅",
  error: "⚠️",
};

/**
 * Wspólny formularz cieczy — restyle LogiFlow (#286): segment Diesel/AdBlue na
 * górze (przełącza formularz bez zmiany ekranu), pola pill, karta „Historia
 * ostatnich 3 tankowań". Walidacja i outbox bez zmian.
 */
export function LiquidForm({ kind: initialKind }: { kind: "fuel" | "adblue" }) {
  const [kind, setKind] = useState<"fuel" | "adblue">(initialKind);
  const t = useT();
  const { vehicles, loading } = useFleet();
  const perm = usePermission("forms"); // #278: view = tylko podgląd
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [country, setCountry] = useState("");
  const [odometer, setOdometer] = useState("");
  const [liters, setLiters] = useState("");
  const [payment, setPayment] = useState<"card" | "cash">("cash");
  const [isFull, setIsFull] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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

  // A5: powtórz ostatni wpis — prefill kraju/płatności z ostatniego wpisu (outbox).
  function repeatLast() {
    const last = items[0];
    if (!last) {
      setMsg(t("m.fuel.repeatNone"));
      return;
    }
    const input = last.input as FuelLogInput;
    setCountry(input.station.country ?? "");
    if (input.paymentMethod === "card" || input.paymentMethod === "cash") {
      setPayment(input.paymentMethod);
    }
    setIsFull(input.isFull !== false);
    setMsg(t("m.fuel.repeatLoaded"));
  }

  /** #299: skan paragonu stacji — OCR na urządzeniu (ML Kit) uzupełnia litry.
   *  Fail-soft: nieczytelne zdjęcie/brak modułu = zwykły przepływ ręczny;
   *  ręcznie wpisanych litrów nie nadpisuje. Zdjęcie nigdzie nie jest wysyłane. */
  async function scanReceipt() {
    setMsg(null);
    try {
      const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
      const asset = res.assets?.[0];
      if (res.canceled || !asset?.uri) return;
      const TextRecognition = (await import("@react-native-ml-kit/text-recognition")).default;
      const parsed = parseReceiptText((await TextRecognition.recognize(asset.uri)).text);
      if (parsed.liters != null && !liters.trim()) {
        setLiters(String(parsed.liters));
        success();
        setMsg(t("m.fuel.scanOk", { l: parsed.liters }));
      } else {
        warn();
        setMsg(
          parsed.liters != null
            ? t("m.fuel.scanFilled", { l: parsed.liters })
            : t("m.fuel.scanFail"),
        );
      }
    } catch {
      warn();
      setMsg(t("m.fuel.scanUnavailable"));
    }
  }

  async function submit() {
    if (busy) return; // blokada podwójnego zapisu (każdy tap = osobny wpis w outboxie)
    setMsg(null);
    if (!vehicleId) {
      setMsg(t("m.fuel.pickVehicle"));
      return;
    }
    const parsed = fuelLogSchema.safeParse({
      vehicleId,
      station: { country },
      // przecinek dziesiętny (klawiatura EU / prefill z OCR) traktujemy jak kropkę
      odometerKm: Number(odometer.replace(",", ".")),
      liters: Number(liters.replace(",", ".")),
      paymentMethod: payment,
      isFull,
    });
    if (!parsed.success) {
      warn();
      setMsg(firstZodError(parsed.error));
      return;
    }
    setBusy(true);
    try {
      const item = await enqueue(kind, parsed.data, new Date().toISOString());
      success();
      setMsg(item.status === "synced" ? t("m.fuel.savedSynced") : t("m.fuel.savedLocal"));
      setOdometer("");
      setLiters("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Segment Diesel | AdBlue (mockup 04) */}
      <View style={styles.segment}>
        {(
          [
            ["fuel", "⛽ Diesel"],
            ["adblue", "💧 AdBlue"],
          ] as const
        ).map(([k, label]) => (
          <Pressable
            key={k}
            style={[styles.segmentBtn, kind === k && styles.segmentBtnOn]}
            onPress={() => {
              setKind(k);
              setMsg(null);
            }}
          >
            <Text style={[styles.segmentText, kind === k && styles.segmentTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t("m.fuel.vehicle")}</Text>
      <VehiclePicker
        vehicles={vehicles}
        loading={loading}
        selectedId={vehicleId}
        onSelect={setVehicleId}
      />
      {/* #264: przycisk zawsze widoczny — bez historii disabled z wyjaśnieniem. */}
      <Pressable
        style={[styles.repeatBtn, items.length === 0 && styles.repeatBtnOff]}
        onPress={repeatLast}
        disabled={items.length === 0}
      >
        <Text style={styles.repeatText}>
          {items.length > 0 ? t("m.fuel.repeatLast") : t("m.fuel.repeatFirst")}
        </Text>
      </Pressable>

      {/* #299: OCR — aparat czyta litry z paragonu (obok pola ręcznego) */}
      <Pressable style={styles.repeatBtn} onPress={scanReceipt}>
        <Text style={styles.repeatText}>📷 {t("m.fuel.scan")}</Text>
      </Pressable>

      <TextInput
        style={styles.input}
        value={liters}
        onChangeText={setLiters}
        keyboardType="numeric"
        placeholder={t("m.fuel.liters")}
        placeholderTextColor={palette.smoke}
      />
      <TextInput
        style={styles.input}
        value={odometer}
        onChangeText={setOdometer}
        keyboardType="numeric"
        placeholder={t("m.fuel.odometer")}
        placeholderTextColor={palette.smoke}
      />

      <Text style={styles.label}>
        {t("m.fuel.location")} <Text style={styles.accent}>▾</Text>
      </Text>
      <TextInput
        style={styles.input}
        value={country}
        onChangeText={setCountry}
        placeholder={t("m.fuel.country")}
        placeholderTextColor={palette.smoke}
        autoCapitalize="characters"
      />

      <Text style={styles.label}>{t("m.fuel.payment")}</Text>
      <View style={styles.row}>
        {(["cash", "card"] as const).map((m) => (
          <Pressable
            key={m}
            style={[styles.chip, payment === m && styles.chipActive]}
            onPress={() => setPayment(m)}
          >
            <Text style={payment === m ? styles.chipTextActive : styles.chipText}>
              {m === "card" ? t("m.fuel.card") : t("m.fuel.cash")}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.fullRow} onPress={() => setIsFull((v) => !v)}>
        <View style={[styles.checkbox, isFull && styles.checkboxOn]}>
          {isFull && <Text style={styles.checkboxTick}>✓</Text>}
        </View>
        <Text style={styles.fullLabel}>
          {kind === "fuel" ? t("m.fuel.fullFuel") : t("m.fuel.fullAdblue")}
        </Text>
      </Pressable>

      {perm === "view" ? (
        <Text style={styles.viewOnly}>{t("m.fuel.viewOnly")}</Text>
      ) : (
        <Pressable style={[styles.btn, busy && styles.btnBusy]} onPress={submit} disabled={busy}>
          <Text style={styles.btnText}>
            {busy
              ? t("m.fuel.saving")
              : kind === "fuel"
                ? t("m.fuel.saveFuel")
                : t("m.fuel.saveAdblue")}
          </Text>
        </Pressable>
      )}
      {msg && <Text style={styles.msg}>{msg}</Text>}

      {items.length > 0 && (
        <View style={styles.history}>
          <Text style={styles.historyHead}>
            {t(kind === "fuel" ? "m.fuel.historyFuel" : "m.fuel.historyAdblue", {
              n: Math.min(items.length, 3),
            })}
          </Text>
          {items.slice(0, 3).map((it, i, arr) => {
            const input = it.input as FuelLogInput;
            return (
              <View key={it.id} style={[styles.historyRow, i < arr.length - 1 && styles.histSep]}>
                <Text style={styles.histWhen}>
                  {STATUS_ICON[it.status]} {it.createdAt.slice(5, 10)}
                </Text>
                <Text style={styles.histLiters}>{input.liters} L</Text>
                <Text style={styles.histMeta}>
                  {input.station.country || "—"} · {input.odometerKm} km
                </Text>
              </View>
            );
          })}
          {items.some((it) => it.status === "error") && (
            <Text style={styles.histError}>
              ⚠️ {items.find((it) => it.status === "error")?.error ?? t("m.fuel.syncError")}
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 20, gap: 10 },
  segment: {
    flexDirection: "row",
    backgroundColor: palette.nearBlack,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  segmentBtn: { flex: 1, borderRadius: 999, paddingVertical: 11, alignItems: "center" },
  segmentBtnOn: { backgroundColor: palette.red },
  segmentText: { color: palette.smoke, fontSize: 15, fontWeight: "600" },
  segmentTextOn: { color: palette.white, fontWeight: "800" },
  label: { color: palette.smoke, fontSize: 13, fontWeight: "600", marginTop: 6 },
  accent: { color: palette.red },
  input: {
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: palette.offWhite,
    fontSize: 16,
  },
  row: { flexDirection: "row", gap: 10 },
  chip: {
    flex: 1,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 11,
    alignItems: "center",
  },
  chipActive: { backgroundColor: palette.red, borderColor: palette.red },
  chipText: { color: palette.offWhite, fontSize: 14 },
  chipTextActive: { color: palette.white, fontWeight: "700", fontSize: 14 },
  fullRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: palette.graphite,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: palette.red, borderColor: palette.red },
  checkboxTick: { color: palette.white, fontSize: 15, fontWeight: "700" },
  fullLabel: { color: palette.offWhite, fontSize: 14, flex: 1 },
  btn: {
    marginTop: 14,
    backgroundColor: palette.red,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnBusy: { opacity: 0.5 },
  repeatBtnOff: { opacity: 0.45 },
  repeatBtn: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  repeatText: { color: palette.offWhite, fontWeight: "600", fontSize: 13 },
  btnText: { color: palette.white, fontWeight: "800", fontSize: 16 },
  msg: { color: palette.smoke, marginTop: 8 },
  viewOnly: { color: palette.smoke, marginTop: 14, fontSize: 13, textAlign: "center" },
  history: {
    marginTop: 14,
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  historyHead: { color: palette.offWhite, fontWeight: "800", fontSize: 15, marginBottom: 4 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  histSep: { borderBottomWidth: 1, borderBottomColor: palette.graphite },
  histWhen: { color: palette.smoke, fontSize: 13, width: 76 },
  histLiters: { color: palette.offWhite, fontSize: 15, fontWeight: "800", width: 70 },
  histMeta: { color: palette.smoke, fontSize: 13, flex: 1 },
  histError: { color: palette.warning, fontSize: 12 },
});
