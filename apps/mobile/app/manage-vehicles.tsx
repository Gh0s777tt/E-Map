/**
 * Parytet zarządzania (fala 2): CRUD pojazdów z telefonu — właściciel/dyspozytor
 * dodaje, edytuje i usuwa pojazdy oraz terminy (przegląd/OC/leasing/licencja),
 * tak jak w panelu web. Wspólna warstwa `@e-logistic/api` + walidacja `vehicleSchema`.
 */
import {
  deleteVehicle,
  getActiveMembership,
  insertVehicle,
  listVehicles,
  updateVehicle,
} from "@e-logistic/api";
import { firstZodError, VEHICLE_TYPES, type VehicleType, vehicleSchema } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, PrimaryButton, SectionTitle, wide } from "../components/ui";
import { success, warn } from "../lib/haptics";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

interface Row {
  id: string;
  registration: string;
  make: string | null;
  model: string | null;
  year: number | null;
  vehicle_type: VehicleType;
  inspection_expiry: string | null;
  insurance_expiry: string | null;
  license_expiry: string | null;
  leasing_end: string | null;
}

const TYPE_LABEL: Record<VehicleType, string> = {
  truck: "Ciężarówka",
  tractor: "Ciągnik",
  van: "Bus",
  trailer: "Naczepa",
  other: "Inny",
};

const empty = {
  id: null as string | null,
  registration: "",
  make: "",
  model: "",
  year: String(new Date().getFullYear()),
  vehicleType: "truck" as VehicleType,
  inspectionExpiry: "",
  insuranceExpiry: "",
  licenseExpiry: "",
  leasingEnd: "",
};

export default function ManageVehiclesScreen() {
  const t = useT();
  const [rows, setRows] = useState<Row[]>([]);
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
    setRows((await listVehicles(sb, m.companyId)) as unknown as Row[]);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const set = (patch: Partial<typeof empty>) => setForm((f) => (f ? { ...f, ...patch } : f));

  function openEdit(r: Row) {
    setForm({
      id: r.id,
      registration: r.registration,
      make: r.make ?? "",
      model: r.model ?? "",
      year: String(r.year ?? new Date().getFullYear()),
      vehicleType: r.vehicle_type,
      inspectionExpiry: r.inspection_expiry ?? "",
      insuranceExpiry: r.insurance_expiry ?? "",
      licenseExpiry: r.license_expiry ?? "",
      leasingEnd: r.leasing_end ?? "",
    });
    setMsg(null);
  }

  async function save() {
    if (!form || !companyId || busy) return;
    const parsed = vehicleSchema.safeParse({
      registration: form.registration.trim(),
      make: form.make.trim() || undefined,
      model: form.model.trim() || "—",
      year: Number(form.year) || new Date().getFullYear(),
      vehicleType: form.vehicleType,
      inspectionExpiry: form.inspectionExpiry.trim() || undefined,
      insuranceExpiry: form.insuranceExpiry.trim() || undefined,
      licenseExpiry: form.licenseExpiry.trim() || undefined,
      leasingEnd: form.leasingEnd.trim() || undefined,
    });
    if (!parsed.success) {
      warn();
      setMsg(firstZodError(parsed.error));
      return;
    }
    setBusy(true);
    try {
      const sb = getSupabase();
      if (form.id) await updateVehicle(sb, form.id, parsed.data, companyId);
      else await insertVehicle(sb, parsed.data, companyId);
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
    Alert.alert(t("m.manage.deleteTitle"), `${r.registration} — ${t("m.manage.deleteVehicle")}`, [
      { text: t("m.manage.cancel"), style: "cancel" },
      {
        text: t("m.manage.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteVehicle(getSupabase(), r.id);
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

  const field = (
    label: string,
    key: keyof typeof empty,
    placeholder: string,
    numeric?: boolean,
  ) => (
    <View style={{ gap: 4 }}>
      <Text style={s.lbl}>{label}</Text>
      <TextInput
        style={s.input}
        value={String(form?.[key] ?? "")}
        onChangeText={(v) => set({ [key]: v } as Partial<typeof empty>)}
        placeholder={placeholder}
        placeholderTextColor={palette.smoke}
        keyboardType={numeric ? "numeric" : "default"}
        autoCapitalize={key === "registration" ? "characters" : "none"}
      />
    </View>
  );

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      keyboardShouldPersistTaps="handled"
    >
      {form ? (
        <Card style={{ gap: 10 }}>
          <SectionTitle>
            {form.id ? t("m.manage.editVehicle") : t("m.manage.newVehicle")}
          </SectionTitle>
          {field(t("m.manage.registration"), "registration", "WA 12345")}
          {field(t("m.manage.make"), "make", "Volvo / Scania…")}
          {field(t("m.manage.model"), "model", "FH 500")}
          {field(t("m.manage.year"), "year", "2021", true)}
          <Text style={s.lbl}>{t("m.manage.type")}</Text>
          <View style={s.typeRow}>
            {VEHICLE_TYPES.map((vt) => (
              <Pressable
                key={vt}
                style={[s.typeChip, form.vehicleType === vt && s.typeChipOn]}
                onPress={() => set({ vehicleType: vt })}
              >
                <Text style={[s.typeText, form.vehicleType === vt && { color: palette.white }]}>
                  {TYPE_LABEL[vt]}
                </Text>
              </Pressable>
            ))}
          </View>
          {field(t("m.manage.inspection"), "inspectionExpiry", "2027-03-15")}
          {field(t("m.manage.insurance"), "insuranceExpiry", "2027-01-01")}
          {field(t("m.manage.license"), "licenseExpiry", "2028-06-30")}
          {field(t("m.manage.leasing"), "leasingEnd", "2029-12-31")}
          {msg && <Text style={s.err}>{msg}</Text>}
          <PrimaryButton label={busy ? "…" : t("m.manage.save")} onPress={save} />
          <Pressable onPress={() => setForm(null)}>
            <Text style={s.cancel}>{t("m.manage.cancel")}</Text>
          </Pressable>
        </Card>
      ) : (
        <Pressable style={s.addBtn} onPress={() => setForm({ ...empty })}>
          <Text style={s.addText}>➕ {t("m.manage.newVehicle")}</Text>
        </Pressable>
      )}

      {!form && (
        <>
          <SectionTitle>
            {t("m.manage.fleet")} ({rows.length})
          </SectionTitle>
          {rows.map((r) => (
            <Card key={r.id} style={{ gap: 6 }}>
              <View style={s.rowTop}>
                <Text style={s.reg}>{r.registration}</Text>
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
                {[TYPE_LABEL[r.vehicle_type], [r.make, r.model].filter(Boolean).join(" "), r.year]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <Text style={s.dim}>
                {[
                  r.inspection_expiry && `${t("m.manage.inspection")}: ${r.inspection_expiry}`,
                  r.insurance_expiry && `OC: ${r.insurance_expiry}`,
                ]
                  .filter(Boolean)
                  .join(" · ") || t("m.manage.noDates")}
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
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  typeChipOn: { backgroundColor: palette.red, borderColor: palette.red },
  typeText: { color: palette.smoke, fontSize: 13, fontWeight: "600" },
  err: { color: palette.red, fontSize: 13 },
  cancel: { color: palette.smoke, textAlign: "center", paddingVertical: 8 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reg: { color: palette.offWhite, fontSize: 16, fontWeight: "800" },
  editLink: { fontSize: 16 },
  delLink: { fontSize: 16 },
  dim: { color: palette.smoke, fontSize: 12.5 },
});
