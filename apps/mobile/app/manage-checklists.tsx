/**
 * Parytet zarządzania (fala 3, #346): edytor checklist właściciela z telefonu —
 * tworzenie/edycja szablonów, włącz/wyłącz, przypisanie do kierowców (puste =
 * dla wszystkich) oraz edycja pozycji (Tak/Nie · wielokrotny wybór · zdjęcie ·
 * godzina). Odpowiednik panelu web „Checklisty". Wspólna warstwa `@e-logistic/api`.
 */
import {
  type ChecklistTemplate,
  getActiveMembership,
  listChecklistTemplates,
  listDrivers,
  saveChecklistTemplate,
  setChecklistActive,
} from "@e-logistic/api";
import { type ChecklistItem, DEFAULT_CHECKLIST_TEMPLATES } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Card, PrimaryButton, SectionTitle, wide } from "../components/ui";
import { success, warn } from "../lib/haptics";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

type Draft = Omit<ChecklistTemplate, "id"> & { id?: string };
type DriverOpt = { id: string; label: string };

const newItem = (n: number): ChecklistItem => ({
  key: `q${n}-${Date.now() % 100000}`,
  label: "",
  type: "yesno",
});

export default function ManageChecklistsScreen() {
  const t = useT();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [drivers, setDrivers] = useState<DriverOpt[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabaseConfigured) return;
    const sb = getSupabase();
    const m = await getActiveMembership(sb);
    if (!m) return;
    setCompanyId(m.companyId);
    const [tpls, drv] = await Promise.all([
      listChecklistTemplates(sb, m.companyId),
      listDrivers(sb, m.companyId).catch(() => []),
    ]);
    setTemplates(tpls);
    setDrivers(
      drv.map((d) => ({ id: d.id, label: `${d.first_name} ${d.last_name}`.trim() || "—" })),
    );
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const patch = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const setItem = (i: number, p: Partial<ChecklistItem>) =>
    setDraft((d) =>
      d ? { ...d, items: d.items.map((it, j) => (j === i ? { ...it, ...p } : it)) } : d,
    );
  const toggleDriver = (id: string) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            assignedDrivers: d.assignedDrivers.includes(id)
              ? d.assignedDrivers.filter((x) => x !== id)
              : [...d.assignedDrivers, id],
          }
        : d,
    );

  async function addDefaults() {
    if (!companyId || busy) return;
    setBusy(true);
    try {
      const existing = new Set(templates.map((x) => x.name));
      for (const tpl of DEFAULT_CHECKLIST_TEMPLATES) {
        if (!existing.has(tpl.name)) await saveChecklistTemplate(getSupabase(), companyId, tpl);
      }
      success();
      await load();
    } catch (e) {
      warn();
      setMsg(e instanceof Error ? e.message : t("m.mchk.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(tpl: ChecklistTemplate) {
    try {
      await setChecklistActive(getSupabase(), tpl.id, !tpl.active);
      success();
      await load();
    } catch {
      warn();
    }
  }

  async function save() {
    if (!draft || !companyId || busy) return;
    if (!draft.name.trim() || draft.items.length === 0) {
      warn();
      setMsg(t("m.mchk.needNameItems"));
      return;
    }
    setBusy(true);
    try {
      await saveChecklistTemplate(getSupabase(), companyId, {
        id: draft.id,
        name: draft.name.trim(),
        items: draft.items,
        active: draft.active,
        assignedDrivers: draft.assignedDrivers,
      });
      success();
      setDraft(null);
      setMsg(null);
      await load();
    } catch (e) {
      warn();
      setMsg(e instanceof Error ? e.message : t("m.mchk.saveError"));
    } finally {
      setBusy(false);
    }
  }

  // ── Edytor ──────────────────────────────────────────────────────────────
  if (draft) {
    return (
      <ScrollView
        style={s.screen}
        contentContainerStyle={[s.content, wide]}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ gap: 12 }}>
          <SectionTitle>{draft.id ? t("m.mchk.editTitle") : t("m.mchk.newTemplate")}</SectionTitle>

          <Text style={s.lbl}>{t("m.mchk.name")}</Text>
          <TextInput
            style={s.input}
            value={draft.name}
            onChangeText={(v) => patch({ name: v })}
            placeholder={t("m.mchk.namePh")}
            placeholderTextColor={palette.smoke}
          />

          <View style={s.rowBetween}>
            <Text style={s.lbl}>{t("m.mchk.active")}</Text>
            <Switch
              value={draft.active}
              onValueChange={(v) => patch({ active: v })}
              trackColor={{ true: palette.red, false: palette.graphite }}
            />
          </View>

          {/* Przypisanie do kierowców — puste = dla wszystkich */}
          <View style={s.assign}>
            <Text style={s.lbl}>
              {t("m.mchk.assignTo")}{" "}
              <Text style={s.assignHint}>
                {draft.assignedDrivers.length === 0
                  ? t("m.mchk.assignAll")
                  : `(${draft.assignedDrivers.length})`}
              </Text>
            </Text>
            {drivers.length === 0 ? (
              <Text style={s.dim}>{t("m.mchk.noDrivers")}</Text>
            ) : (
              <View style={s.chips}>
                {drivers.map((d) => {
                  const on = draft.assignedDrivers.includes(d.id);
                  return (
                    <Pressable
                      key={d.id}
                      style={[s.chip, on && s.chipOn]}
                      onPress={() => toggleDriver(d.id)}
                    >
                      <Text style={[s.chipText, on && { color: palette.white }]}>
                        {on ? "✓ " : ""}
                        {d.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Pozycje */}
          <Text style={s.lbl}>
            {t("m.mchk.items")} ({draft.items.length})
          </Text>
          {draft.items.map((it, i) => (
            <View key={it.key} style={s.item}>
              <TextInput
                style={s.input}
                value={it.label}
                onChangeText={(v) => setItem(i, { label: v })}
                placeholder={t("m.mchk.question")}
                placeholderTextColor={palette.smoke}
              />
              <View style={s.chips}>
                {(["yesno", "multi"] as const).map((ty) => (
                  <Pressable
                    key={ty}
                    style={[s.chip, it.type === ty && s.chipOn]}
                    onPress={() => setItem(i, { type: ty })}
                  >
                    <Text style={[s.chipText, it.type === ty && { color: palette.white }]}>
                      {ty === "yesno" ? t("m.mchk.typeYesno") : t("m.mchk.typeMulti")}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {it.type === "multi" && (
                <TextInput
                  style={s.input}
                  value={(it.options ?? []).join(", ")}
                  onChangeText={(v) =>
                    setItem(i, {
                      options: v
                        .split(",")
                        .map((o) => o.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder={t("m.mchk.optionsPh")}
                  placeholderTextColor={palette.smoke}
                />
              )}
              <View style={s.flags}>
                <Pressable
                  style={[s.flag, it.photo && s.chipOn]}
                  onPress={() => setItem(i, { photo: !it.photo })}
                >
                  <Text style={[s.chipText, it.photo && { color: palette.white }]}>
                    📷 {t("m.mchk.photo")}
                  </Text>
                </Pressable>
                <Pressable
                  style={[s.flag, it.time && s.chipOn]}
                  onPress={() => setItem(i, { time: !it.time })}
                >
                  <Text style={[s.chipText, it.time && { color: palette.white }]}>
                    🕐 {t("m.mchk.time")}
                  </Text>
                </Pressable>
                <Pressable
                  style={s.del}
                  onPress={() => patch({ items: draft.items.filter((_, j) => j !== i) })}
                  hitSlop={8}
                >
                  <Text style={s.delText}>🗑</Text>
                </Pressable>
              </View>
            </View>
          ))}

          <Pressable
            style={s.addItem}
            onPress={() => patch({ items: [...draft.items, newItem(draft.items.length + 1)] })}
          >
            <Text style={s.addItemText}>＋ {t("m.mchk.addItem")}</Text>
          </Pressable>

          {msg && <Text style={s.err}>{msg}</Text>}
          <PrimaryButton label={busy ? "…" : t("m.mchk.save")} onPress={save} />
          <Pressable onPress={() => setDraft(null)}>
            <Text style={s.cancel}>{t("m.mchk.cancel")}</Text>
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
      <View style={s.topRow}>
        <Pressable
          style={s.addBtn}
          onPress={() =>
            setDraft({ id: undefined, name: "", items: [], active: true, assignedDrivers: [] })
          }
        >
          <Text style={s.addText}>➕ {t("m.mchk.newTemplate")}</Text>
        </Pressable>
        <Pressable style={s.ghostBtn} onPress={addDefaults} disabled={busy}>
          <Text style={s.ghostText}>📋 {t("m.mchk.addDefaults")}</Text>
        </Pressable>
      </View>

      <SectionTitle>
        {t("m.mchk.templates")} ({templates.length})
      </SectionTitle>
      {templates.length === 0 && <Text style={s.dim}>{t("m.mchk.empty")}</Text>}
      {templates.map((tpl) => (
        <Card key={tpl.id} style={{ gap: 8, opacity: tpl.active ? 1 : 0.6 }}>
          <View style={s.rowTop}>
            <Text style={s.name}>📋 {tpl.name}</Text>
            <Pressable
              onPress={() => setDraft({ ...tpl, items: tpl.items.map((x) => ({ ...x })) })}
              hitSlop={8}
            >
              <Text style={s.editLink}>✏️</Text>
            </Pressable>
          </View>
          <Text style={s.dim}>
            {[
              `${tpl.items.length} ${t("m.mchk.itemsShort")}`,
              tpl.assignedDrivers.length > 0
                ? `👤 ${tpl.assignedDrivers.length}`
                : t("m.mchk.assignAll"),
            ].join(" · ")}
          </Text>
          <View style={s.rowBetween}>
            <Text style={s.lbl}>{tpl.active ? t("m.mchk.on") : t("m.mchk.off")}</Text>
            <Switch
              value={tpl.active}
              onValueChange={() => toggleActive(tpl)}
              trackColor={{ true: palette.red, false: palette.graphite }}
            />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  topRow: { flexDirection: "row", gap: 8 },
  addBtn: {
    flex: 1,
    backgroundColor: palette.red,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  addText: { color: palette.white, fontWeight: "800", fontSize: 14 },
  ghostBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostText: { color: palette.offWhite, fontWeight: "700", fontSize: 13 },
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
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  assign: {
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 10,
    padding: 10,
    gap: 8,
    backgroundColor: palette.nearBlack,
  },
  assignHint: { color: palette.offWhite, fontWeight: "700" },
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
  item: {
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 10,
    padding: 10,
    gap: 8,
    backgroundColor: palette.nearBlack,
  },
  flags: { flexDirection: "row", gap: 8, alignItems: "center" },
  flag: {
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  del: { marginLeft: "auto", paddingHorizontal: 6, paddingVertical: 4 },
  delText: { fontSize: 16 },
  addItem: {
    borderWidth: 1,
    borderColor: palette.graphite,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  addItemText: { color: palette.offWhite, fontWeight: "700", fontSize: 13.5 },
  err: { color: palette.red, fontSize: 13 },
  cancel: { color: palette.smoke, textAlign: "center", paddingVertical: 8 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { color: palette.offWhite, fontSize: 15, fontWeight: "800", flexShrink: 1 },
  editLink: { fontSize: 16 },
  dim: { color: palette.smoke, fontSize: 12.5 },
});
