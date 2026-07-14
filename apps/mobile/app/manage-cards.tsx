/**
 * Parytet zarządzania (fala 2): CRUD kart paliwowych z telefonu — dodawanie,
 * edycja, przypisanie do pojazdu, rabat, data ważności i ustawienie PIN
 * (szyfrowany, nigdy plaintext). Wspólna warstwa `@e-logistic/api` + `fuelCardSchema`.
 */
import {
  deleteFuelCard,
  getActiveMembership,
  insertFuelCard,
  listFuelCardsSafe,
  listVehicles,
  setFuelCardPin,
  updateFuelCard,
} from "@e-logistic/api";
import {
  FUEL_CARD_PROVIDER_LABELS,
  FUEL_CARD_PROVIDERS,
  type FuelCardProvider,
  firstZodError,
  fuelCardSchema,
} from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, PrimaryButton, SectionTitle, wide } from "../components/ui";
import { success, warn } from "../lib/haptics";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

interface Row {
  id: string;
  provider: FuelCardProvider;
  card_number_masked: string | null;
  valid_until: string | null;
  discount_percent: number | null;
  vehicle_id: string | null;
}

const empty = {
  id: null as string | null,
  provider: "dkv" as FuelCardProvider,
  cardNumberMasked: "",
  validUntil: "",
  discountPercent: "0",
  vehicleId: null as string | null,
  pin: "",
};

export default function ManageCardsScreen() {
  const t = useT();
  const [rows, setRows] = useState<Row[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; registration: string }[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof empty | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabaseConfigured) return;
    const sb = getSupabase();
    const m = await getActiveMembership(sb);
    if (!m) return;
    setCompanyId(m.companyId);
    const [cards, veh] = await Promise.all([
      listFuelCardsSafe(sb, m.companyId),
      listVehicles(sb, m.companyId),
    ]);
    setRows(cards as unknown as Row[]);
    setVehicles(
      (veh as { id: string; registration: string }[]).map((v) => ({
        id: v.id,
        registration: v.registration,
      })),
    );
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const set = (patch: Partial<typeof empty>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const regOf = (id: string | null) =>
    id ? (vehicles.find((v) => v.id === id)?.registration ?? "—") : null;

  function openEdit(r: Row) {
    setForm({
      id: r.id,
      provider: r.provider,
      cardNumberMasked: r.card_number_masked ?? "",
      validUntil: r.valid_until ?? "",
      discountPercent: String(r.discount_percent ?? 0),
      vehicleId: r.vehicle_id,
      pin: "",
    });
    setMsg(null);
  }

  async function save() {
    if (!form || !companyId || busy) return;
    const parsed = fuelCardSchema.safeParse({
      provider: form.provider,
      cardNumberMasked: form.cardNumberMasked.trim(),
      validUntil: form.validUntil.trim() || undefined,
      discountPercent: Number(form.discountPercent) || 0,
      vehicleId: form.vehicleId ?? undefined,
      pin: form.pin.trim() || undefined,
    });
    if (!parsed.success) {
      warn();
      setMsg(firstZodError(parsed.error));
      return;
    }
    setBusy(true);
    try {
      const sb = getSupabase();
      let cardId = form.id;
      if (cardId) await updateFuelCard(sb, cardId, parsed.data);
      else cardId = await insertFuelCard(sb, parsed.data, companyId);
      if (form.pin.trim() && cardId) await setFuelCardPin(sb, cardId, form.pin.trim());
      success();
      setForm(null);
      await load();
    } catch (e) {
      warn();
      setMsg(e instanceof Error ? e.message : t("m.manage.saveError"));
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(r: Row) {
    Alert.alert(
      t("m.manage.deleteTitle"),
      `${FUEL_CARD_PROVIDER_LABELS[r.provider]} ${r.card_number_masked ?? ""} — ${t("m.manage.deleteCard")}`,
      [
        { text: t("m.manage.cancel"), style: "cancel" },
        {
          text: t("m.manage.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFuelCard(getSupabase(), r.id);
              success();
              await load();
            } catch (e) {
              warn();
              setMsg(e instanceof Error ? e.message : t("m.manage.saveError"));
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      keyboardShouldPersistTaps="handled"
    >
      {form ? (
        <Card style={{ gap: 10 }}>
          <SectionTitle>{form.id ? t("m.manage.editCard") : t("m.manage.newCard")}</SectionTitle>
          <Text style={s.lbl}>{t("m.manage.provider")}</Text>
          <View style={s.chips}>
            {FUEL_CARD_PROVIDERS.map((p) => (
              <Pressable
                key={p}
                style={[s.chip, form.provider === p && s.chipOn]}
                onPress={() => set({ provider: p })}
              >
                <Text style={[s.chipText, form.provider === p && { color: palette.white }]}>
                  {FUEL_CARD_PROVIDER_LABELS[p]}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.lbl}>{t("m.manage.cardNumber")}</Text>
          <TextInput
            style={s.input}
            value={form.cardNumberMasked}
            onChangeText={(v) => set({ cardNumberMasked: v })}
            placeholder="**** **** 1234"
            placeholderTextColor={palette.smoke}
          />
          <Text style={s.lbl}>{t("m.manage.validUntil")}</Text>
          <TextInput
            style={s.input}
            value={form.validUntil}
            onChangeText={(v) => set({ validUntil: v })}
            placeholder="2027-12-31"
            placeholderTextColor={palette.smoke}
            autoCapitalize="none"
          />
          <Text style={s.lbl}>{t("m.manage.discount")}</Text>
          <TextInput
            style={s.input}
            value={form.discountPercent}
            onChangeText={(v) => set({ discountPercent: v })}
            placeholder="0"
            placeholderTextColor={palette.smoke}
            keyboardType="numeric"
          />
          <Text style={s.lbl}>{t("m.manage.assignVehicle")}</Text>
          <View style={s.chips}>
            <Pressable
              style={[s.chip, !form.vehicleId && s.chipOn]}
              onPress={() => set({ vehicleId: null })}
            >
              <Text style={[s.chipText, !form.vehicleId && { color: palette.white }]}>
                {t("m.manage.noVehicle")}
              </Text>
            </Pressable>
            {vehicles.map((v) => (
              <Pressable
                key={v.id}
                style={[s.chip, form.vehicleId === v.id && s.chipOn]}
                onPress={() => set({ vehicleId: v.id })}
              >
                <Text style={[s.chipText, form.vehicleId === v.id && { color: palette.white }]}>
                  {v.registration}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.lbl}>{t("m.manage.pin")}</Text>
          <TextInput
            style={s.input}
            value={form.pin}
            onChangeText={(v) => set({ pin: v })}
            placeholder={form.id ? t("m.manage.pinKeep") : "4–6 cyfr"}
            placeholderTextColor={palette.smoke}
            keyboardType="numeric"
            secureTextEntry
            maxLength={6}
          />
          {msg && <Text style={s.err}>{msg}</Text>}
          <PrimaryButton label={busy ? "…" : t("m.manage.save")} onPress={save} />
          <Pressable onPress={() => setForm(null)}>
            <Text style={s.cancel}>{t("m.manage.cancel")}</Text>
          </Pressable>
        </Card>
      ) : (
        <Pressable style={s.addBtn} onPress={() => setForm({ ...empty })}>
          <Text style={s.addText}>➕ {t("m.manage.newCard")}</Text>
        </Pressable>
      )}

      {!form && (
        <>
          <SectionTitle>
            {t("m.manage.cards")} ({rows.length})
          </SectionTitle>
          {rows.map((r) => (
            <Card key={r.id} style={{ gap: 6 }}>
              <View style={s.rowTop}>
                <Text style={s.reg}>
                  💳 {FUEL_CARD_PROVIDER_LABELS[r.provider]} {r.card_number_masked ?? ""}
                </Text>
                <View style={{ flexDirection: "row", gap: 14 }}>
                  <Pressable onPress={() => openEdit(r)} hitSlop={8}>
                    <Text style={s.editLink}>✏️</Text>
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(r)} hitSlop={8}>
                    <Text style={s.delLink}>🗑</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={s.dim}>
                {[
                  regOf(r.vehicle_id) && `🚚 ${regOf(r.vehicle_id)}`,
                  (r.discount_percent ?? 0) > 0 && `−${r.discount_percent}%`,
                  r.valid_until && `${t("m.manage.validUntil")}: ${r.valid_until}`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </Text>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  addBtn: {
    backgroundColor: palette.red,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  addText: { color: palette.white, fontWeight: "800", fontSize: 15 },
  lbl: { color: palette.smoke, fontSize: 12.5 },
  input: {
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: palette.offWhite,
    fontSize: 15,
    backgroundColor: palette.nearBlack,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipOn: { backgroundColor: palette.red, borderColor: palette.red },
  chipText: { color: palette.smoke, fontSize: 12.5, fontWeight: "600" },
  err: { color: palette.red, fontSize: 13 },
  cancel: { color: palette.smoke, textAlign: "center", paddingVertical: 8 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  reg: { color: palette.offWhite, fontSize: 14.5, fontWeight: "800", flexShrink: 1 },
  editLink: { fontSize: 16 },
  delLink: { fontSize: 16 },
  dim: { color: palette.smoke, fontSize: 12.5 },
});
