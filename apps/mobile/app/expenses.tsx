/**
 * #288: Rejestr wydatków (mockup 10) — chipy kategorii, kwota + waluta, opis,
 * zdjęcie paragonu (aparat), czerwone „Dodaj wydatek" i lista ostatnich wpisów
 * ze statusem rozliczenia. Wymaga zasięgu (zdjęcie + insert); offline → komunikat.
 */
import {
  type DriverExpense,
  deleteDriverExpense,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
  getActiveMembership,
  insertDriverExpense,
  listDriverExpenses,
  uploadExpensePhotoBinary,
} from "@e-logistic/api";
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
import { Card, PrimaryButton, SectionTitle } from "../components/ui";
import { VehiclePicker } from "../components/VehiclePicker";
import { enqueue } from "../lib/outbox";
import { getSupabase, supabaseConfigured } from "../lib/supabase";
import { useFleet } from "../lib/useFleet";

const STATUS_LABEL: Record<DriverExpense["status"], { label: string; color: string }> = {
  submitted: { label: "do rozliczenia", color: palette.warning },
  approved: { label: "zatwierdzony", color: palette.success },
  rejected: { label: "odrzucony", color: palette.red },
};

const CURRENCIES = ["PLN", "EUR", "GBP", "CZK"] as const;

export default function ExpensesScreen() {
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
      setMsg("Brak zasięgu — lista wydatków wczyta się przy sieci.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function attachPhoto() {
    if (!companyId) {
      setMsg("Poczekaj na wczytanie firmy (wymaga zasięgu).");
      return;
    }
    setPhotoBusy(true);
    setMsg(null);
    try {
      const res = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
      const asset = res.assets?.[0];
      if (res.canceled || !asset?.base64) return;
      const path = await uploadExpensePhotoBinary(getSupabase(), companyId, decode(asset.base64), {
        mime: asset.mimeType ?? "image/jpeg",
      });
      setPhotoPath(path);
      setMsg("📷 Paragon dołączony.");
    } catch {
      setMsg("Nie udało się wgrać zdjęcia — spróbuj przy lepszym zasięgu.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function submit() {
    setMsg(null);
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setMsg("Podaj kwotę większą od zera.");
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
      setMsg("✅ Wydatek dodany — firma zobaczy go w panelu.");
      load();
    } catch {
      // #291: offline — wydatek trafia do outboxu (zdjęcie wymaga zasięgu).
      await enqueue("expense", { ...input, photoPath: null }, new Date().toISOString());
      setAmount("");
      setNote("");
      setPhotoPath(null);
      setMsg(
        photoPath
          ? "📥 Zapisano offline (bez zdjęcia) — wyśle się przy zasięgu."
          : "📥 Zapisano offline — wyśle się automatycznie przy zasięgu.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteDriverExpense(getSupabase(), id);
      setItems((list) => list.filter((x) => x.id !== id));
    } catch {
      setMsg("Nie udało się usunąć wpisu.");
    }
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
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
            <Text style={[s.chipText, category === c && s.chipTextOn]}>
              {EXPENSE_CATEGORY_LABELS[c]}
            </Text>
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
            placeholder="Kwota"
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
          placeholder="Opis (np. A2 bramka Konin)"
          placeholderTextColor={palette.smoke}
        />

        <Pressable style={s.photoBtn} onPress={attachPhoto} disabled={photoBusy}>
          <Text style={s.photoText}>
            {photoBusy
              ? "Wgrywam…"
              : photoPath
                ? "📷 Paragon dołączony ✓ (zmień)"
                : "📷 Zdjęcie paragonu"}
          </Text>
        </Pressable>

        {msg && <Text style={s.msg}>{msg}</Text>}
        <PrimaryButton
          label={busy ? "Zapisuję…" : "Dodaj wydatek"}
          onPress={submit}
          disabled={busy}
        />
      </Card>

      <SectionTitle>Ostatnie wydatki</SectionTitle>
      {!loading && items.length === 0 && (
        <Text style={s.note}>Brak wydatków — dodaj pierwszy powyżej.</Text>
      )}
      {items.map((e) => {
        const st = STATUS_LABEL[e.status];
        return (
          <Card key={e.id} style={s.entry}>
            <View style={s.entryHead}>
              <Text style={s.entryAmount}>
                {e.amount.toFixed(2)} {e.currency}
              </Text>
              <Text style={[s.entryStatus, { color: st.color }]}>{st.label}</Text>
            </View>
            <Text style={s.entryMeta}>
              {EXPENSE_CATEGORY_LABELS[e.category]} · {e.expense_date}
              {e.photo_path ? " · 📷" : ""}
              {e.note ? ` · ${e.note}` : ""}
            </Text>
            {e.status === "submitted" && (
              <Pressable onPress={() => remove(e.id)} hitSlop={8}>
                <Text style={s.entryDelete}>Usuń</Text>
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
