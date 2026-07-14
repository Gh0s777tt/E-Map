/**
 * Parytet zarządzania (fala 8, #352): zlecenia z telefonu — właściciel/dyspozytor
 * tworzy, edytuje, przypisuje (pojazd + kierowca), zmienia status i usuwa zlecenia.
 * Dotąd mobile miało tylko widok kierowcy (moje zlecenia). Odpowiednik panelu web
 * „Zlecenia". Walidacja wspólnym `orderSchema`; status przez RPC `order_set_status`.
 */
import {
  deleteOrder,
  getActiveMembership,
  listCompanyMembers,
  listOrders,
  listVehicles,
  type Order,
  saveOrder,
  setOrderStatus,
} from "@e-logistic/api";
import { firstZodError, ORDER_STATUSES, type OrderStatus, orderSchema } from "@e-logistic/core";
import type { MobileMessageKey } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, PrimaryButton, SectionTitle, wide } from "../components/ui";
import { success, warn } from "../lib/haptics";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

/**
 * Liczba opcjonalna: `null` = puste, `"bad"` = błąd. Akceptuje kropkę I przecinek
 * dziesiętny (klawiatura decimal-pad w locale PL/DE podaje przecinek). Bez separatora
 * tysięcy — decimal-pad i tak dopuszcza tylko jeden separator.
 */
function optNum(v: string): number | null | "bad" {
  const s = v.trim().replace(",", ".");
  if (!s) return null;
  if (!/^\d+(\.\d+)?$/.test(s)) return "bad";
  return Number(s);
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  new: palette.smoke,
  assigned: "#2456a6",
  in_progress: "#f59e0b",
  delivered: "#16794a",
  invoiced: "#2456a6",
  cancelled: "#ef4444",
};

const empty = {
  id: null as string | null,
  referenceNo: "",
  shipper: "",
  consignee: "",
  origin: "",
  destination: "",
  cargo: "",
  weightKg: "",
  price: "",
  currency: "EUR",
  vehicleId: null as string | null,
  assignedTo: null as string | null,
  loadDate: "",
  unloadDate: "",
  notes: "",
};

export default function ManageOrdersScreen() {
  const t = useT();
  const statusLabel = (s: OrderStatus) => t(`m.mord.status.${s}` as MobileMessageKey);
  const [rows, setRows] = useState<Order[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; registration: string }[]>([]);
  const [members, setMembers] = useState<{ id: string; email: string }[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof empty | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabaseConfigured) return;
    try {
      const sb = getSupabase();
      const m = await getActiveMembership(sb);
      if (!m) return;
      setCompanyId(m.companyId);
      const [ord, veh, mem] = await Promise.all([
        listOrders(sb, m.companyId, { limit: 200 }),
        listVehicles(sb, m.companyId),
        listCompanyMembers(sb).catch(() => []),
      ]);
      setMsg(null);
      setRows(ord);
      setVehicles(
        (veh as { id: string; registration: string }[]).map((v) => ({
          id: v.id,
          registration: v.registration,
        })),
      );
      setMembers(mem.map((x) => ({ id: x.user_id, email: x.email })));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("m.mord.loadError"));
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  const set = (patch: Partial<typeof empty>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const regOf = (id: string | null) =>
    id ? (vehicles.find((v) => v.id === id)?.registration ?? "—") : null;
  const emailOf = (id: string | null) =>
    id ? (members.find((m) => m.id === id)?.email ?? "—") : null;

  const openNew = () => {
    setMsg(null);
    setForm({ ...empty });
  };
  const openEdit = (o: Order) => {
    setMsg(null);
    setForm({
      id: o.id,
      referenceNo: o.reference_no ?? "",
      shipper: o.shipper ?? "",
      consignee: o.consignee ?? "",
      origin: o.origin ?? "",
      destination: o.destination ?? "",
      cargo: o.cargo ?? "",
      weightKg: o.weight_kg != null ? String(o.weight_kg) : "",
      price: o.price != null ? String(o.price) : "",
      currency: o.currency || "EUR",
      vehicleId: o.vehicle_id,
      assignedTo: o.assigned_to,
      loadDate: o.load_date ?? "",
      unloadDate: o.unload_date ?? "",
      notes: o.notes ?? "",
    });
  };
  const closeForm = () => {
    setMsg(null);
    setForm(null);
  };

  async function save() {
    if (!form || !companyId || busy) return;
    const weightKg = optNum(form.weightKg);
    const price = optNum(form.price);
    if (weightKg === "bad" || price === "bad") {
      warn();
      setMsg(t("m.mord.badNumber"));
      return;
    }
    const parsed = orderSchema.safeParse({
      referenceNo: form.referenceNo.trim() || undefined,
      shipper: form.shipper.trim() || undefined,
      consignee: form.consignee.trim() || undefined,
      origin: form.origin.trim() || undefined,
      destination: form.destination.trim() || undefined,
      cargo: form.cargo.trim() || undefined,
      weightKg: weightKg ?? undefined,
      price: price ?? undefined,
      currency: form.currency.trim().toUpperCase() || "EUR",
      vehicleId: form.vehicleId ?? undefined,
      assignedTo: form.assignedTo ?? undefined,
      loadDate: form.loadDate.trim() || undefined,
      unloadDate: form.unloadDate.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
    if (!parsed.success) {
      warn();
      setMsg(firstZodError(parsed.error));
      return;
    }
    // Sensowne zlecenie musi mieć chociaż referencję, trasę, ładunek albo strony.
    if (
      !parsed.data.referenceNo &&
      !parsed.data.origin &&
      !parsed.data.destination &&
      !parsed.data.cargo &&
      !parsed.data.shipper &&
      !parsed.data.consignee
    ) {
      warn();
      setMsg(t("m.mord.needData"));
      return;
    }
    setBusy(true);
    try {
      await saveOrder(getSupabase(), companyId, parsed.data, form.id ?? undefined);
      success();
      closeForm();
      await load();
    } catch (e) {
      warn();
      setMsg(e instanceof Error ? e.message : t("m.manage.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(o: Order, status: OrderStatus) {
    try {
      await setOrderStatus(getSupabase(), o.id, status);
      success();
      await load();
    } catch (e) {
      warn();
      Alert.alert(t("m.manage.saveError"), e instanceof Error ? e.message : "");
    }
  }

  function confirmDelete(o: Order) {
    Alert.alert(
      t("m.manage.deleteTitle"),
      `${o.reference_no || o.destination || t("m.mord.orders")} — ${t("m.manage.delete")}?`,
      [
        { text: t("m.manage.cancel"), style: "cancel" },
        {
          text: t("m.manage.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteOrder(getSupabase(), o.id);
              success();
              await load();
            } catch (e) {
              warn();
              Alert.alert(t("m.manage.saveError"), e instanceof Error ? e.message : "");
            }
          },
        },
      ],
    );
  }

  // ── Formularz ─────────────────────────────────────────────────────────────
  if (form) {
    const field = (
      key: keyof typeof empty,
      labelKey: MobileMessageKey,
      opts: { ph?: string; num?: boolean; date?: boolean; multi?: boolean; upper?: boolean } = {},
    ) => (
      <View>
        <Text style={s.lbl}>{t(labelKey)}</Text>
        <TextInput
          style={[s.input, opts.multi ? { minHeight: 56 } : null]}
          value={form[key] as string}
          onChangeText={(v) => set({ [key]: v })}
          placeholder={opts.ph ?? ""}
          placeholderTextColor={palette.smoke}
          keyboardType={opts.num ? "decimal-pad" : "default"}
          autoCapitalize={opts.upper ? "characters" : opts.date ? "none" : "sentences"}
          multiline={opts.multi}
        />
      </View>
    );
    return (
      <ScrollView
        style={s.screen}
        contentContainerStyle={[s.content, wide]}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ gap: 10 }}>
          <SectionTitle>{form.id ? t("m.mord.edit") : t("m.mord.new")}</SectionTitle>

          {field("referenceNo", "m.mord.reference", { ph: "REF-2026-001" })}
          <View style={s.row2}>
            {field("origin", "m.mord.origin", { ph: "PL Warszawa" })}
            {field("destination", "m.mord.destination", { ph: "DE Berlin" })}
          </View>
          <View style={s.row2}>
            {field("shipper", "m.mord.shipper")}
            {field("consignee", "m.mord.consignee")}
          </View>
          {field("cargo", "m.mord.cargo", { ph: "Palety, 24t" })}
          <View style={s.row2}>
            {field("weightKg", "m.mord.weight", { num: true, ph: "24000" })}
            <View style={s.row2}>
              {field("price", "m.mord.price", { num: true, ph: "1800" })}
              {field("currency", "m.mord.currency", { ph: "EUR", upper: true })}
            </View>
          </View>

          <Text style={s.lbl}>{t("m.mord.vehicle")}</Text>
          <View style={s.chips}>
            <Pressable
              style={[s.chip, !form.vehicleId && s.chipOn]}
              onPress={() => set({ vehicleId: null })}
            >
              <Text style={[s.chipText, !form.vehicleId && { color: palette.white }]}>—</Text>
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

          <Text style={s.lbl}>{t("m.mord.assignee")}</Text>
          <View style={s.chips}>
            <Pressable
              style={[s.chip, !form.assignedTo && s.chipOn]}
              onPress={() => set({ assignedTo: null })}
            >
              <Text style={[s.chipText, !form.assignedTo && { color: palette.white }]}>
                {t("m.mord.unassigned")}
              </Text>
            </Pressable>
            {members.map((m) => (
              <Pressable
                key={m.id}
                style={[s.chip, form.assignedTo === m.id && s.chipOn]}
                onPress={() => set({ assignedTo: m.id })}
              >
                <Text style={[s.chipText, form.assignedTo === m.id && { color: palette.white }]}>
                  {m.email}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={s.row2}>
            {field("loadDate", "m.mord.loadDate", { date: true, ph: "2026-07-20" })}
            {field("unloadDate", "m.mord.unloadDate", { date: true, ph: "2026-07-21" })}
          </View>
          {field("notes", "m.mord.notes", { multi: true })}

          {msg && <Text style={s.err}>{msg}</Text>}
          <PrimaryButton label={busy ? "…" : t("m.manage.save")} onPress={save} />
          <Pressable onPress={closeForm}>
            <Text style={s.cancel}>{t("m.manage.cancel")}</Text>
          </Pressable>
        </Card>
      </ScrollView>
    );
  }

  // ── Lista ───────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable style={s.addBtn} onPress={openNew}>
        <Text style={s.addText}>➕ {t("m.mord.new")}</Text>
      </Pressable>

      {msg && <Text style={s.err}>{msg}</Text>}

      <SectionTitle>
        {t("m.mord.orders")} ({rows.length})
      </SectionTitle>
      {rows.length === 0 && <Text style={s.dim}>{t("m.mord.empty")}</Text>}
      {rows.map((o) => (
        <Card key={o.id} style={{ gap: 6 }}>
          <View style={s.rowTop}>
            <Text style={s.name}>
              📦 {o.reference_no || `${o.origin ?? "?"} → ${o.destination ?? "?"}`}
            </Text>
            <View style={{ flexDirection: "row", gap: 14 }}>
              <Pressable onPress={() => openEdit(o)} hitSlop={8}>
                <Text style={s.editLink}>✏️</Text>
              </Pressable>
              <Pressable onPress={() => confirmDelete(o)} hitSlop={8}>
                <Text style={s.delLink}>🗑</Text>
              </Pressable>
            </View>
          </View>
          <Text style={s.dim}>
            {[
              o.reference_no && `${o.origin ?? "?"} → ${o.destination ?? "?"}`,
              regOf(o.vehicle_id) && `🚚 ${regOf(o.vehicle_id)}`,
              emailOf(o.assigned_to) && `👤 ${emailOf(o.assigned_to)}`,
              o.price != null && `${o.price} ${o.currency}`,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </Text>
          {/* Status: bieżący + szybka zmiana (owner/dyspozytor → dowolny) */}
          <View style={s.statusRow}>
            {ORDER_STATUSES.map((st) => {
              const on = o.status === st;
              return (
                <Pressable
                  key={st}
                  style={[
                    s.statusChip,
                    { borderColor: STATUS_COLOR[st] },
                    on && { backgroundColor: STATUS_COLOR[st] },
                  ]}
                  onPress={() => !on && changeStatus(o, st)}
                >
                  <Text style={[s.statusText, { color: on ? palette.white : STATUS_COLOR[st] }]}>
                    {statusLabel(st)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ))}
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
  lbl: { color: palette.smoke, fontSize: 12.5, marginBottom: 2 },
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
  row2: { flexDirection: "row", gap: 10, flex: 1 },
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
  name: { color: palette.offWhite, fontSize: 14, fontWeight: "800", flexShrink: 1 },
  editLink: { fontSize: 16 },
  delLink: { fontSize: 16 },
  dim: { color: palette.smoke, fontSize: 12.5 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  statusChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11.5, fontWeight: "700" },
});
