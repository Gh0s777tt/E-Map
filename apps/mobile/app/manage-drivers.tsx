/**
 * Parytet zarządzania (fala 5, #349): kartoteka kierowców z telefonu — właściciel/
 * dyspozytor dodaje, edytuje i usuwa kierowców: tożsamość (imię/nazwisko/data ur.,
 * szyfrowane at-rest przez RPC), kategorie prawa jazdy, uprawnienia, terminy
 * ważności (prawo jazdy, kod 95, badania lekarskie/psychotechniczne, ADR, paszport,
 * dowód) i notatki. Odpowiednik panelu web „Kierowcy".
 *
 * Świadomie poza tą falą (kolejna): numery dokumentów (osobne szyfrowane RPC),
 * szczegóły uprawnień UDT/HDS (numer+data) i powiązanie z kontem aplikacji.
 * `qualificationDetails` są ZACHOWYWANE przy edycji (przekazywane bez zmian), by
 * nie skasować danych wprowadzonych na webie.
 */
import {
  type DriverRow,
  deleteDriver,
  getActiveMembership,
  insertDriver,
  listDrivers,
  updateDriver,
} from "@e-logistic/api";
import {
  DRIVER_QUALIFICATIONS,
  driverSchema,
  firstZodError,
  LICENSE_CATEGORIES,
} from "@e-logistic/core";
import type { MobileMessageKey } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, PrimaryButton, SectionTitle, wide } from "../components/ui";
import { success, warn } from "../lib/haptics";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

type QualDetail = { name: string; docNumber?: string; expiry?: string };

const EXPIRY_FIELDS: { key: keyof typeof empty & string; label: MobileMessageKey }[] = [
  { key: "licenseExpiry", label: "m.mdrv.exp.license" },
  { key: "code95Expiry", label: "m.mdrv.exp.code95" },
  { key: "medicalExpiry", label: "m.mdrv.exp.medical" },
  { key: "psychotechExpiry", label: "m.mdrv.exp.psychotech" },
  { key: "adrExpiry", label: "m.mdrv.exp.adr" },
  { key: "passportExpiry", label: "m.mdrv.exp.passport" },
  { key: "idCardExpiry", label: "m.mdrv.exp.idCard" },
];

const empty = {
  id: null as string | null,
  firstName: "",
  lastName: "",
  birthDate: "",
  licenseCategories: [] as string[],
  qualifications: [] as string[],
  notes: "",
  licenseExpiry: "",
  code95Expiry: "",
  medicalExpiry: "",
  psychotechExpiry: "",
  adrExpiry: "",
  passportExpiry: "",
  idCardExpiry: "",
  // Zachowywane bez zmian (edytowane tylko na webie w tej fali).
  qualDetails: [] as QualDetail[],
};

/** Najbliższy termin ważności (do ostrzeżenia na liście). */
function soonestExpiry(r: DriverRow): { date: string; days: number } | null {
  const dates = [
    r.license_expiry,
    r.code95_expiry,
    r.medical_expiry,
    r.psychotech_expiry,
    r.adr_expiry,
    r.passport_expiry,
    r.id_card_expiry,
  ].filter((d): d is string => !!d);
  if (dates.length === 0) return null;
  // Data lokalna (nie UTC) — inaczej okołopółnocny off-by-one dla stref ≠ UTC.
  const n = new Date();
  const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  const soonest = dates.reduce((a, b) => (a < b ? a : b));
  const days = Math.round((new Date(soonest).getTime() - new Date(today).getTime()) / 86_400_000);
  return { date: soonest, days };
}

export default function ManageDriversScreen() {
  const t = useT();
  const [rows, setRows] = useState<DriverRow[]>([]);
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
      setRows(await listDrivers(sb, m.companyId));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("m.mdrv.loadError"));
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  const set = (patch: Partial<typeof empty>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const toggle = (field: "licenseCategories" | "qualifications", v: string) =>
    setForm((f) =>
      f
        ? {
            ...f,
            [field]: f[field].includes(v) ? f[field].filter((x) => x !== v) : [...f[field], v],
          }
        : f,
    );

  const openNew = () => {
    setMsg(null);
    setForm({ ...empty, licenseCategories: [], qualifications: [], qualDetails: [] });
  };
  const openEdit = (r: DriverRow) => {
    setMsg(null);
    setForm({
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      birthDate: r.birth_date ?? "",
      licenseCategories: [...r.license_categories],
      qualifications: [...r.qualifications],
      notes: r.notes ?? "",
      licenseExpiry: r.license_expiry ?? "",
      code95Expiry: r.code95_expiry ?? "",
      medicalExpiry: r.medical_expiry ?? "",
      psychotechExpiry: r.psychotech_expiry ?? "",
      adrExpiry: r.adr_expiry ?? "",
      passportExpiry: r.passport_expiry ?? "",
      idCardExpiry: r.id_card_expiry ?? "",
      qualDetails: r.qualification_details.map((q) => ({
        name: q.name,
        docNumber: q.doc_number ?? undefined,
        expiry: q.expiry ?? undefined,
      })),
    });
  };
  const closeForm = () => {
    setMsg(null);
    setForm(null);
  };

  async function save() {
    if (!form || !companyId || busy) return;
    const clean = (v: string) => v.trim() || undefined;
    const parsed = driverSchema.safeParse({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      birthDate: clean(form.birthDate),
      licenseCategories: form.licenseCategories,
      qualifications: form.qualifications,
      notes: clean(form.notes),
      licenseExpiry: clean(form.licenseExpiry),
      code95Expiry: clean(form.code95Expiry),
      medicalExpiry: clean(form.medicalExpiry),
      psychotechExpiry: clean(form.psychotechExpiry),
      adrExpiry: clean(form.adrExpiry),
      passportExpiry: clean(form.passportExpiry),
      idCardExpiry: clean(form.idCardExpiry),
      // Odznaczenie chipa uprawnienia musi usunąć też jego szczegóły (numer/data),
      // inaczej osierocony wpis w qualification_details generuje fałszywe alerty
      // compliance. Zachowujemy szczegóły tylko dla nadal wybranych uprawnień (web-parytet).
      qualificationDetails: form.qualDetails.filter((q) => form.qualifications.includes(q.name)),
    });
    if (!parsed.success) {
      warn();
      setMsg(firstZodError(parsed.error));
      return;
    }
    setBusy(true);
    try {
      const sb = getSupabase();
      if (form.id) await updateDriver(sb, form.id, parsed.data, companyId);
      else await insertDriver(sb, parsed.data, companyId);
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

  function confirmDelete(r: DriverRow) {
    Alert.alert(
      t("m.manage.deleteTitle"),
      `${r.first_name} ${r.last_name} — ${t("m.manage.delete")}?`,
      [
        { text: t("m.manage.cancel"), style: "cancel" },
        {
          text: t("m.manage.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDriver(getSupabase(), r.id);
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
    return (
      <ScrollView
        style={s.screen}
        contentContainerStyle={[s.content, wide]}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ gap: 10 }}>
          <SectionTitle>{form.id ? t("m.mdrv.edit") : t("m.mdrv.new")}</SectionTitle>

          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Text style={s.lbl}>{t("m.mdrv.firstName")}</Text>
              <TextInput
                style={s.input}
                value={form.firstName}
                onChangeText={(v) => set({ firstName: v })}
                placeholder="Jan"
                placeholderTextColor={palette.smoke}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.lbl}>{t("m.mdrv.lastName")}</Text>
              <TextInput
                style={s.input}
                value={form.lastName}
                onChangeText={(v) => set({ lastName: v })}
                placeholder="Kowalski"
                placeholderTextColor={palette.smoke}
              />
            </View>
          </View>

          <Text style={s.lbl}>{t("m.mdrv.birthDate")}</Text>
          <TextInput
            style={s.input}
            value={form.birthDate}
            onChangeText={(v) => set({ birthDate: v })}
            placeholder="1985-06-15"
            placeholderTextColor={palette.smoke}
            autoCapitalize="none"
          />

          <Text style={s.lbl}>{t("m.mdrv.categories")}</Text>
          <View style={s.chips}>
            {LICENSE_CATEGORIES.map((c) => {
              const on = form.licenseCategories.includes(c);
              return (
                <Pressable
                  key={c}
                  style={[s.chip, on && s.chipOn]}
                  onPress={() => toggle("licenseCategories", c)}
                >
                  <Text style={[s.chipText, on && { color: palette.white }]}>{c}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={s.lbl}>{t("m.mdrv.qualifications")}</Text>
          <View style={s.chips}>
            {DRIVER_QUALIFICATIONS.map((q) => {
              const on = form.qualifications.includes(q);
              return (
                <Pressable
                  key={q}
                  style={[s.chip, on && s.chipOn]}
                  onPress={() => toggle("qualifications", q)}
                >
                  <Text style={[s.chipText, on && { color: palette.white }]}>{q}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={s.section}>{t("m.mdrv.expiries")}</Text>
          {EXPIRY_FIELDS.map((f) => (
            <View key={f.key}>
              <Text style={s.lbl}>{t(f.label)}</Text>
              <TextInput
                style={s.input}
                value={form[f.key] as string}
                onChangeText={(v) => set({ [f.key]: v })}
                placeholder="2027-12-31"
                placeholderTextColor={palette.smoke}
                autoCapitalize="none"
              />
            </View>
          ))}

          <Text style={s.lbl}>{t("m.mdrv.notes")}</Text>
          <TextInput
            style={[s.input, { minHeight: 60 }]}
            value={form.notes}
            onChangeText={(v) => set({ notes: v })}
            placeholder="—"
            placeholderTextColor={palette.smoke}
            multiline
          />

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
        <Text style={s.addText}>➕ {t("m.mdrv.new")}</Text>
      </Pressable>

      {msg && <Text style={s.err}>{msg}</Text>}

      <SectionTitle>
        {t("m.mdrv.drivers")} ({rows.length})
      </SectionTitle>
      {rows.length === 0 && <Text style={s.dim}>{t("m.mdrv.empty")}</Text>}
      {rows.map((r) => {
        const exp = soonestExpiry(r);
        const warnExp = exp && exp.days <= 30;
        return (
          <Card key={r.id} style={{ gap: 6 }}>
            <View style={s.rowTop}>
              <Text style={s.name}>
                👤 {r.first_name} {r.last_name}
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
                r.license_categories.length > 0 && r.license_categories.join(" · "),
                r.qualifications.length > 0 && `⭐ ${r.qualifications.length}`,
              ]
                .filter(Boolean)
                .join("   ") || "—"}
            </Text>
            {exp && (
              <Text style={[s.exp, warnExp && { color: exp.days < 0 ? "#ef4444" : "#f59e0b" }]}>
                ⏱{" "}
                {exp.days < 0
                  ? t("m.mdrv.expired", { d: exp.date })
                  : t("m.mdrv.nextExpiry", { d: exp.date })}
              </Text>
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
  addBtn: {
    backgroundColor: palette.red,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  addText: { color: palette.white, fontWeight: "800", fontSize: 15 },
  lbl: { color: palette.smoke, fontSize: 12.5, marginBottom: 2 },
  section: {
    color: palette.offWhite,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 6,
    borderTopColor: palette.graphite,
    borderTopWidth: 1,
    paddingTop: 10,
  },
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
  editLink: { fontSize: 16 },
  delLink: { fontSize: 16 },
  dim: { color: palette.smoke, fontSize: 12.5 },
  exp: { color: palette.smoke, fontSize: 12 },
});
