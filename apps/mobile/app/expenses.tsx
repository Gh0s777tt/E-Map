/**
 * #288: Rejestr wydatków (mockup 10) — chipy kategorii, kwota + waluta, opis,
 * zdjęcie paragonu (aparat), czerwone „Dodaj wydatek" i lista ostatnich wpisów
 * ze statusem rozliczenia. Wymaga zasięgu (zdjęcie + insert); offline → komunikat.
 */
import {
  type DriverExpense,
  deleteDriverExpense,
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  getActiveMembership,
  insertDriverExpense,
  listDriverExpenses,
  uploadExpensePhotoBinary,
} from "@e-logistic/api";
import { parseReceiptText } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Card, PrimaryButton, SectionTitle, wide } from "../components/ui";
import { VehiclePicker } from "../components/VehiclePicker";
import { useT } from "../lib/i18n";
import { enqueue } from "../lib/outbox";
import { getSupabase, supabaseConfigured } from "../lib/supabase";
import { useFleet } from "../lib/useFleet";

const STATUS_META = {
  submitted: { key: "m.exp.submitted", color: palette.warning },
  approved: { key: "m.exp.approved", color: palette.success },
  rejected: { key: "m.exp.rejected", color: palette.red },
} as const;

// #307: kategorie przez katalog i18n (PL/EN/DE/UK) zamiast polskich etykiet z api
const CATEGORY_KEY = {
  toll: "m.cat.toll",
  parking: "m.cat.parking",
  repair: "m.cat.repair",
  wash: "m.cat.wash",
  other: "m.cat.other",
} as const;

const CURRENCIES = ["PLN", "EUR", "GBP", "CZK"] as const;

export default function ExpensesScreen() {
  const t = useT();
  const { vehicles, loading: fleetLoading } = useFleet();
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [category, setCategory] = useState<ExpenseCategory>("toll");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("PLN");
  const [note, setNote] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [items, setItems] = useState<DriverExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      const sb = getSupabase();
      const m = await getActiveMembership(sb);
      if (!m) return;
      setCompanyId(m.companyId);
      setItems(await listDriverExpenses(sb, { limit: 30 }));
    } catch {
      setMsg(t("m.exp.listOffline"));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  /** #298: OCR paragonu na urządzeniu (ML Kit) — fail-soft: brak modułu/nieczytelne
   *  zdjęcie po prostu nie uzupełnia pól. Kwoty nie nadpisuje, jeśli już wpisana. */
  async function ocrPrefill(imageUri: string): Promise<string | null> {
    try {
      const TextRecognition = (await import("@react-native-ml-kit/text-recognition")).default;
      const result = await TextRecognition.recognize(imageUri);
      const parsed = parseReceiptText(result.text);
      const filled: string[] = [];
      if (parsed.amount != null && !amount.trim()) {
        setAmount(parsed.amount.toFixed(2).replace(".", ","));
        filled.push(`kwota ${parsed.amount.toFixed(2)}`);
      }
      if (parsed.currency && (CURRENCIES as readonly string[]).includes(parsed.currency)) {
        setCurrency(parsed.currency as (typeof CURRENCIES)[number]);
        filled.push(parsed.currency);
      }
      return filled.length > 0 ? t("m.exp.ocrRead", { v: filled.join(" ") }) : null;
    } catch {
      return null; // OCR niedostępny (np. Expo Go) — bez wpływu na przepływ
    }
  }

  async function attachPhoto() {
    if (!companyId) {
      setMsg(t("m.exp.waitCompany"));
      return;
    }
    setPhotoBusy(true);
    setMsg(null);
    try {
      const res = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
      const asset = res.assets?.[0];
      if (res.canceled || !asset?.base64) return;
      const ocrMsg = await ocrPrefill(asset.uri);
      const path = await uploadExpensePhotoBinary(getSupabase(), companyId, decode(asset.base64), {
        mime: asset.mimeType ?? "image/jpeg",
      });
      setPhotoPath(path);
      setMsg(ocrMsg ? `${t("m.exp.photoAttached")} · ${ocrMsg}` : t("m.exp.photoAttached"));
    } catch {
      setMsg(t("m.exp.photoFail"));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function submit() {
    setMsg(null);
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setMsg(t("m.exp.amountInvalid"));
      return;
    }
    setBusy(true);
    const input = {
      companyId: companyId ?? "",
      vehicleId,
      category,
      amount: Math.round(value * 100) / 100,
      currency,
      note: note.trim() || null,
      photoPath,
    };
    try {
      if (!companyId) throw new Error("offline");
      await insertDriverExpense(getSupabase(), input);
      setAmount("");
      setNote("");
      setPhotoPath(null);
      setMsg(t("m.exp.saved"));
      load();
    } catch {
      // #291: offline — wydatek trafia do outboxu (zdjęcie wymaga zasięgu).
      await enqueue("expense", { ...input, photoPath: null }, new Date().toISOString());
      setAmount("");
      setNote("");
      setPhotoPath(null);
      setMsg(photoPath ? t("m.exp.savedOfflineNoPhoto") : t("m.exp.savedOffline"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteDriverExpense(getSupabase(), id);
      setItems((list) => list.filter((x) => x.id !== id));
    } catch {
      setMsg(t("m.exp.deleteFail"));
    }
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
      }
    >
      {/* Kategorie (mockup: chipy na górze) */}
      <View style={s.chips}>
        {EXPENSE_CATEGORIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(c)}
            style={[s.chip, category === c && s.chipOn]}
          >
            <Text style={[s.chipText, category === c && s.chipTextOn]}>{t(CATEGORY_KEY[c])}</Text>
          </Pressable>
        ))}
      </View>

      <Card style={{ gap: 12 }}>
        <View style={s.row}>
          <TextInput
            style={[s.input, { flex: 1.4 }]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder={t("m.exp.amount")}
            placeholderTextColor={palette.smoke}
          />
          <View style={[s.row, { flex: 1, gap: 6 }]}>
            {CURRENCIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCurrency(c)}
                style={[s.curr, currency === c && s.currOn]}
              >
                <Text style={[s.currText, currency === c && s.currTextOn]}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <VehiclePicker
          vehicles={vehicles}
          loading={fleetLoading}
          selectedId={vehicleId}
          onSelect={setVehicleId}
        />

        <TextInput
          style={s.input}
          value={note}
          onChangeText={setNote}
          placeholder={t("m.exp.note")}
          placeholderTextColor={palette.smoke}
        />

        <Pressable style={s.photoBtn} onPress={attachPhoto} disabled={photoBusy}>
          <Text style={s.photoText}>
            {photoBusy
              ? t("m.exp.photoBusy")
              : photoPath
                ? t("m.exp.photoChange")
                : t("m.exp.photoAdd")}
          </Text>
        </Pressable>

        {msg && <Text style={s.msg}>{msg}</Text>}
        <PrimaryButton
          label={busy ? t("m.exp.saving") : t("m.exp.submit")}
          onPress={submit}
          disabled={busy}
        />
      </Card>

      <SectionTitle>{t("m.exp.recent")}</SectionTitle>
      {!loading && items.length === 0 && <Text style={s.note}>{t("m.exp.empty")}</Text>}
      {items.map((e) => {
        const st = STATUS_META[e.status];
        return (
          <Card key={e.id} style={s.entry}>
            <View style={s.entryHead}>
              <Text style={s.entryAmount}>
                {e.amount.toFixed(2)} {e.currency}
              </Text>
              <Text style={[s.entryStatus, { color: st.color }]}>{t(st.key)}</Text>
            </View>
            <Text style={s.entryMeta}>
              {t(CATEGORY_KEY[e.category])} · {e.expense_date}
              {e.photo_path ? " · 📷" : ""}
              {e.note ? ` · ${e.note}` : ""}
            </Text>
            {e.status === "submitted" && (
              <Pressable onPress={() => remove(e.id)} hitSlop={8}>
                <Text style={s.entryDelete}>{t("m.exp.delete")}</Text>
              </Pressable>
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipOn: { backgroundColor: palette.red, borderColor: palette.red },
  chipText: { color: palette.smoke, fontSize: 14, fontWeight: "600" },
  chipTextOn: { color: palette.white, fontWeight: "800" },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    backgroundColor: palette.black,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.offWhite,
    fontSize: 16,
  },
  curr: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  currOn: { backgroundColor: palette.red, borderColor: palette.red },
  currText: { color: palette.smoke, fontSize: 12, fontWeight: "700" },
  currTextOn: { color: palette.white },
  photoBtn: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  photoText: { color: palette.offWhite, fontSize: 14, fontWeight: "600" },
  msg: { color: palette.smoke, fontSize: 13 },
  note: { color: palette.smoke, fontSize: 14, textAlign: "center", marginTop: 8 },
  entry: { gap: 4 },
  entryHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  entryAmount: { color: palette.offWhite, fontSize: 18, fontWeight: "800" },
  entryStatus: { fontSize: 12, fontWeight: "700" },
  entryMeta: { color: palette.smoke, fontSize: 13 },
  entryDelete: { color: palette.red, fontSize: 13, fontWeight: "600", marginTop: 4 },
});
