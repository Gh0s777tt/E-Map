/**
 * Parytet zarządzania (fala 3, #346): rejestr kontrahentów z telefonu —
 * właściciel/dyspozytor dodaje, edytuje i usuwa nabywców/nadawców (nazwa, NIP,
 * adres, kraj), tak jak w panelu web „Kontrahenci". Wspólna warstwa `@e-logistic/api`.
 */
import {
  type Contractor,
  deleteContractor,
  getActiveMembership,
  listContractors,
  updateContractor,
  upsertContractor,
} from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, PrimaryButton, SectionTitle, wide } from "../components/ui";
import { success, warn } from "../lib/haptics";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

const empty = {
  id: null as string | null,
  name: "",
  taxId: "",
  address: "",
  country: "",
};

export default function ManageContractorsScreen() {
  const t = useT();
  const [rows, setRows] = useState<Contractor[]>([]);
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
    setRows(await listContractors(sb, m.companyId));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const set = (patch: Partial<typeof empty>) => setForm((f) => (f ? { ...f, ...patch } : f));

  function openEdit(r: Contractor) {
    setForm({
      id: r.id,
      name: r.name,
      taxId: r.tax_id ?? "",
      address: r.address ?? "",
      country: r.country ?? "",
    });
    setMsg(null);
  }

  async function save() {
    if (!form || !companyId || busy) return;
    if (!form.name.trim()) {
      warn();
      setMsg(t("m.mctr.needName"));
      return;
    }
    setBusy(true);
    try {
      const sb = getSupabase();
      const input = {
        name: form.name.trim(),
        taxId: form.taxId.trim() || null,
        address: form.address.trim() || null,
        country: form.country.trim() || null,
      };
      if (form.id) await updateContractor(sb, form.id, input);
      else await upsertContractor(sb, companyId, input);
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

  function confirmDelete(r: Contractor) {
    Alert.alert(t("m.manage.deleteTitle"), `${r.name} — ${t("m.manage.delete")}?`, [
      { text: t("m.manage.cancel"), style: "cancel" },
      {
        text: t("m.manage.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteContractor(getSupabase(), r.id);
            success();
            await load();
          } catch (e) {
            warn();
            setMsg(e instanceof Error ? e.message : t("m.manage.saveError"));
          }
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      keyboardShouldPersistTaps="handled"
    >
      {form ? (
        <Card style={{ gap: 10 }}>
          <SectionTitle>{form.id ? t("m.mctr.edit") : t("m.mctr.new")}</SectionTitle>
          <Text style={s.lbl}>{t("m.mctr.name")}</Text>
          <TextInput
            style={s.input}
            value={form.name}
            onChangeText={(v) => set({ name: v })}
            placeholder={t("m.mctr.namePh")}
            placeholderTextColor={palette.smoke}
          />
          <Text style={s.lbl}>{t("m.mctr.taxId")}</Text>
          <TextInput
            style={s.input}
            value={form.taxId}
            onChangeText={(v) => set({ taxId: v })}
            placeholder="PL0000000000"
            placeholderTextColor={palette.smoke}
            autoCapitalize="characters"
          />
          <Text style={s.lbl}>{t("m.mctr.address")}</Text>
          <TextInput
            style={s.input}
            value={form.address}
            onChangeText={(v) => set({ address: v })}
            placeholder="ul. …, 00-000 …"
            placeholderTextColor={palette.smoke}
          />
          <Text style={s.lbl}>{t("m.mctr.country")}</Text>
          <TextInput
            style={s.input}
            value={form.country}
            onChangeText={(v) => set({ country: v })}
            placeholder="PL / DE / GB…"
            placeholderTextColor={palette.smoke}
            autoCapitalize="characters"
          />
          {msg && <Text style={s.err}>{msg}</Text>}
          <PrimaryButton label={busy ? "…" : t("m.manage.save")} onPress={save} />
          <Pressable onPress={() => setForm(null)}>
            <Text style={s.cancel}>{t("m.manage.cancel")}</Text>
          </Pressable>
        </Card>
      ) : (
        <Pressable style={s.addBtn} onPress={() => setForm({ ...empty })}>
          <Text style={s.addText}>➕ {t("m.mctr.new")}</Text>
        </Pressable>
      )}

      {!form && (
        <>
          <SectionTitle>
            {t("m.mctr.contractors")} ({rows.length})
          </SectionTitle>
          {rows.length === 0 && <Text style={s.dim}>{t("m.mctr.empty")}</Text>}
          {rows.map((r) => (
            <Card key={r.id} style={{ gap: 6 }}>
              <View style={s.rowTop}>
                <Text style={s.name}>🏢 {r.name}</Text>
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
                {[r.tax_id, r.address, r.country].filter(Boolean).join(" · ") || "—"}
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
  err: { color: palette.red, fontSize: 13 },
  cancel: { color: palette.smoke, textAlign: "center", paddingVertical: 8 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { color: palette.offWhite, fontSize: 14.5, fontWeight: "800", flexShrink: 1 },
  editLink: { fontSize: 16 },
  delLink: { fontSize: 16 },
  dim: { color: palette.smoke, fontSize: 12.5 },
});
