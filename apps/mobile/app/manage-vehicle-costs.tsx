/**
 * Parytet zarządzania (fala 4, #347): koszty pojazdów z telefonu — właściciel/
 * dyspozytor rejestruje i usuwa koszty inne niż paliwo (naprawa, leasing,
 * ubezpieczenie, podatek, mandat, parking, opony, inne), tak jak w panelu web
 * „Koszty". Wspólna warstwa `@e-logistic/api` + walidacja `vehicleCostSchema`.
 */
import {
  deleteVehicleCost,
  getActiveMembership,
  insertVehicleCost,
  listVehicleCosts,
  listVehicles,
  type VehicleCost,
} from "@e-logistic/api";
import {
  firstZodError,
  VEHICLE_COST_CATEGORIES,
  VEHICLE_COST_CATEGORY_LABELS,
  type VehicleCostCategory,
  vehicleCostSchema,
} from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, PrimaryButton, SectionTitle, wide } from "../components/ui";
import { success, warn } from "../lib/haptics";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

const todayISO = () => new Date().toISOString().slice(0, 10);

const empty = {
  vehicleId: null as string | null,
  category: "repair" as VehicleCostCategory,
  amount: "",
  currency: "EUR",
  costDate: todayISO(),
  description: "",
};

export default function ManageVehicleCostsScreen() {
  const t = useT();
  const [rows, setRows] = useState<VehicleCost[]>([]);
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
    const [costs, veh] = await Promise.all([
      listVehicleCosts(sb, m.companyId, { limit: 200 }),
      listVehicles(sb, m.companyId),
    ]);
    setRows(costs);
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
  const regOf = (id: string) => vehicles.find((v) => v.id === id)?.registration ?? "—";

  async function save() {
    if (!form || !companyId || busy) return;
    const parsed = vehicleCostSchema.safeParse({
      vehicleId: form.vehicleId ?? "",
      category: form.category,
      amount: Number(form.amount.replace(",", ".")) || 0,
      currency: form.currency.trim() || "EUR",
      costDate: form.costDate.trim(),
      description: form.description.trim() || undefined,
    });
    if (!parsed.success) {
      warn();
      setMsg(firstZodError(parsed.error));
      return;
    }
    setBusy(true);
    try {
      await insertVehicleCost(getSupabase(), parsed.data, companyId);
      success();
      setForm(null);
      setMsg(null);
      await load();
    } catch (e) {
      warn();
      setMsg(e instanceof Error ? e.message : t("m.manage.saveError"));
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(r: VehicleCost) {
    Alert.alert(
      t("m.manage.deleteTitle"),
      `${VEHICLE_COST_CATEGORY_LABELS[r.category as VehicleCostCategory] ?? r.category} ${r.amount} ${r.currency} — ${t("m.manage.delete")}?`,
      [
        { text: t("m.manage.cancel"), style: "cancel" },
        {
          text: t("m.manage.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVehicleCost(getSupabase(), r.id);
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
          <SectionTitle>{t("m.mvc.new")}</SectionTitle>

          <Text style={s.lbl}>{t("m.mvc.vehicle")}</Text>
          <View style={s.chips}>
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

          <Text style={s.lbl}>{t("m.mvc.category")}</Text>
          <View style={s.chips}>
            {VEHICLE_COST_CATEGORIES.map((c) => (
              <Pressable
                key={c}
                style={[s.chip, form.category === c && s.chipOn]}
                onPress={() => set({ category: c })}
              >
                <Text style={[s.chipText, form.category === c && { color: palette.white }]}>
                  {VEHICLE_COST_CATEGORY_LABELS[c]}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={s.row2}>
            <View style={{ flex: 2 }}>
              <Text style={s.lbl}>{t("m.mvc.amount")}</Text>
              <TextInput
                style={s.input}
                value={form.amount}
                onChangeText={(v) => set({ amount: v })}
                placeholder="0.00"
                placeholderTextColor={palette.smoke}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.lbl}>{t("m.mvc.currency")}</Text>
              <TextInput
                style={s.input}
                value={form.currency}
                onChangeText={(v) => set({ currency: v.toUpperCase() })}
                placeholder="EUR"
                placeholderTextColor={palette.smoke}
                autoCapitalize="characters"
                maxLength={3}
              />
            </View>
          </View>

          <Text style={s.lbl}>{t("m.mvc.date")}</Text>
          <TextInput
            style={s.input}
            value={form.costDate}
            onChangeText={(v) => set({ costDate: v })}
            placeholder="2026-07-14"
            placeholderTextColor={palette.smoke}
            autoCapitalize="none"
          />

          <Text style={s.lbl}>{t("m.mvc.description")}</Text>
          <TextInput
            style={[s.input, { minHeight: 60 }]}
            value={form.description}
            onChangeText={(v) => set({ description: v })}
            placeholder="—"
            placeholderTextColor={palette.smoke}
            multiline
          />

          {msg && <Text style={s.err}>{msg}</Text>}
          <PrimaryButton label={busy ? "…" : t("m.manage.save")} onPress={save} />
          <Pressable onPress={() => setForm(null)}>
            <Text style={s.cancel}>{t("m.manage.cancel")}</Text>
          </Pressable>
        </Card>
      ) : (
        <Pressable style={s.addBtn} onPress={() => setForm({ ...empty, costDate: todayISO() })}>
          <Text style={s.addText}>➕ {t("m.mvc.new")}</Text>
        </Pressable>
      )}

      {!form && (
        <>
          <SectionTitle>
            {t("m.mvc.costs")} ({rows.length})
          </SectionTitle>
          {rows.length === 0 && <Text style={s.dim}>{t("m.mvc.empty")}</Text>}
          {rows.map((r) => (
            <Card key={r.id} style={{ gap: 6 }}>
              <View style={s.rowTop}>
                <Text style={s.name}>
                  {VEHICLE_COST_CATEGORY_LABELS[r.category as VehicleCostCategory] ?? r.category} ·{" "}
                  {r.amount} {r.currency}
                </Text>
                <Pressable onPress={() => confirmDelete(r)} hitSlop={8}>
                  <Text style={s.delLink}>🗑</Text>
                </Pressable>
              </View>
              <Text style={s.dim}>
                {[`🚚 ${regOf(r.vehicle_id)}`, r.cost_date, r.description]
                  .filter(Boolean)
                  .join(" · ")}
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
  row2: { flexDirection: "row", gap: 10 },
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
  name: { color: palette.offWhite, fontSize: 14.5, fontWeight: "800", flexShrink: 1 },
  delLink: { fontSize: 16 },
  dim: { color: palette.smoke, fontSize: 12.5 },
});
