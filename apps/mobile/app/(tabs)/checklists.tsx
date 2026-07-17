import {
  type ChecklistSubmissionInput,
  type ChecklistTemplate,
  getActiveMembership,
  listVisibleChecklistTemplates,
  uploadChecklistPhotoBinary,
} from "@e-logistic/api";
import {
  type ChecklistAnswers,
  type ChecklistItem,
  validateChecklistAnswers,
} from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppHeader } from "../../components/AppHeader";
import { VehiclePicker } from "../../components/VehiclePicker";
import { useT } from "../../lib/i18n";
import { enqueue, flushQueued, listOutbox, type OutboxItem } from "../../lib/outbox";
import { getSupabase, supabaseConfigured } from "../../lib/supabase";
import { useFleet } from "../../lib/useFleet";
import { usePermission } from "../../lib/usePermission";

/**
 * #273: checklisty kierowcy (np. „Wjazd do UK", „Tachograf") — offline-first:
 * odpowiedzi idą przez outbox, zdjęcia best-effort (wymagają sieci).
 * Zgłoszenie przypina się automatycznie do kierowcy (trigger) i pojazdu.
 */
const STATUS_ICON: Record<OutboxItem["status"], string> = {
  queued: "⏳",
  synced: "✅",
  error: "⚠️",
};

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ChecklistsScreen() {
  const t = useT();
  const { vehicles, loading } = useFleet();
  const perm = usePermission("checklists"); // #278: view = tylko podgląd
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [tpl, setTpl] = useState<ChecklistTemplate | null>(null);
  const [answers, setAnswers] = useState<ChecklistAnswers>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState<string | null>(null);
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const refresh = useCallback(async () => {
    setItems(await listOutbox("checklist"));
  }, []);

  useEffect(() => {
    flushQueued().then(refresh);
    if (!supabaseConfigured) return;
    (async () => {
      try {
        const sb = getSupabase();
        const m = await getActiveMembership(sb);
        if (!m) return;
        setCompanyId(m.companyId);
        const {
          data: { user },
        } = await sb.auth.getUser();
        setEmail(user?.email ?? "");
        // #338: tylko checklisty przypisane do tego kierowcy (lub dla wszystkich)
        setTemplates(await listVisibleChecklistTemplates(sb));
      } catch {
        setMsg(t("m.chk.loadError"));
      }
    })();
  }, [refresh, t]);

  useEffect(() => {
    if (!vehicleId && vehicles[0]) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);

  function openTemplate(template: ChecklistTemplate) {
    setTpl(template);
    const init: ChecklistAnswers = {};
    for (const it of template.items) {
      if (it.type === "multi")
        init[it.key] = { value: [], ...(it.time ? { time: nowHHMM() } : {}) };
    }
    setAnswers(init);
    setMsg(null);
  }

  const setAns = (key: string, patch: Partial<ChecklistAnswers[string]>) =>
    setAnswers((a) => ({ ...a, [key]: { value: a[key]?.value ?? false, ...a[key], ...patch } }));

  async function attachPhoto(it: ChecklistItem) {
    if (!companyId) return;
    setPhotoBusy(it.key);
    try {
      const res = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
      const asset = res.assets?.[0];
      if (res.canceled || !asset?.base64) return;
      const path = await uploadChecklistPhotoBinary(
        getSupabase(),
        companyId,
        decode(asset.base64),
        {
          mime: asset.mimeType ?? "image/jpeg",
        },
      );
      setAns(it.key, { photo: path });
      setMsg(t("m.chk.photoAttached"));
    } catch {
      setMsg(t("m.chk.photoOffline"));
    } finally {
      setPhotoBusy(null);
    }
  }

  async function submit() {
    if (!tpl || busy) return;
    const err = validateChecklistAnswers(tpl.items, answers);
    if (err) {
      setMsg(err);
      return;
    }
    setBusy(true);
    try {
      const input: ChecklistSubmissionInput = {
        templateId: tpl.id,
        templateName: tpl.name,
        vehicleId,
        driverLabel: email,
        answers,
      };
      const item = await enqueue("checklist", input, new Date().toISOString());
      setMsg(
        item.status === "synced"
          ? t("m.chk.savedSynced", { name: tpl.name })
          : t("m.chk.savedLocal", { name: tpl.name }),
      );
      setTpl(null);
      setAnswers({});
      await refresh();
    } catch (e) {
      // #355: błąd zapisu musi być widoczny (wcześniej ginął bez komunikatu).
      setMsg(`⚠️ ${e instanceof Error ? e.message : t("m.manage.saveError")}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader subtitle={t("m.screen.checklists")} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {!tpl && (
          <>
            <Text style={styles.label}>{t("m.fuel.vehicle")}</Text>
            <VehiclePicker
              vehicles={vehicles}
              loading={loading}
              selectedId={vehicleId}
              onSelect={setVehicleId}
            />

            <Text style={styles.label}>{t("m.chk.pickTemplate")}</Text>
            {templates.length === 0 && <Text style={styles.hint}>{t("m.chk.none")}</Text>}
            {templates.map((template) => (
              <Pressable
                key={template.id}
                style={styles.tplBtn}
                onPress={() => openTemplate(template)}
              >
                <Text style={styles.tplText}>📋 {template.name}</Text>
                <Text style={styles.tplSub}>
                  {t("m.chk.itemsCount", { n: template.items.length })}
                </Text>
              </Pressable>
            ))}
          </>
        )}

        {tpl && (
          <>
            <Text style={styles.header}>
              📋 {tpl.name}
              {vehicleId
                ? ` — ${vehicles.find((v) => v.id === vehicleId)?.registration ?? ""}`
                : ""}
            </Text>
            {(() => {
              // Postęp: pozycja „odpowiedziana" = yesno z decyzją lub multi z ≥1 wyborem.
              const done = tpl.items.filter((it) => {
                const v = answers[it.key]?.value;
                return it.type === "yesno"
                  ? typeof v === "boolean"
                  : Array.isArray(v) && v.length > 0;
              }).length;
              const pct = tpl.items.length ? done / tpl.items.length : 0;
              return (
                <View style={styles.progressWrap}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` }]} />
                  </View>
                  <Text style={styles.progressText}>
                    {done}/{tpl.items.length} · {Math.round(pct * 100)}%
                  </Text>
                </View>
              );
            })()}
            {tpl.items.map((it) => {
              const a = answers[it.key];
              return (
                <View key={it.key} style={styles.item}>
                  <Text style={styles.itemLabel}>{it.label}</Text>

                  {it.type === "yesno" && (
                    <View style={styles.row}>
                      {[true, false].map((v) => (
                        <Pressable
                          key={String(v)}
                          style={[styles.chip, a?.value === v && styles.chipActive]}
                          onPress={() => setAns(it.key, { value: v })}
                        >
                          <Text style={a?.value === v ? styles.chipTextActive : styles.chipText}>
                            {v ? t("m.chk.yes") : t("m.chk.no")}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {it.type === "multi" && (
                    <View style={styles.rowWrap}>
                      {(it.options ?? []).map((opt) => {
                        const sel = Array.isArray(a?.value) && a.value.includes(opt);
                        return (
                          <Pressable
                            key={opt}
                            style={[styles.chip, sel && styles.chipActive]}
                            onPress={() => {
                              const cur = Array.isArray(a?.value) ? a.value : [];
                              setAns(it.key, {
                                value: sel ? cur.filter((o) => o !== opt) : [...cur, opt],
                              });
                            }}
                          >
                            <Text style={sel ? styles.chipTextActive : styles.chipText}>{opt}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  {it.time && (
                    <View style={styles.row}>
                      <Text style={styles.timeLabel}>{t("m.chk.timeLabel")}</Text>
                      <TextInput
                        style={styles.timeInput}
                        value={a?.time ?? nowHHMM()}
                        onChangeText={(v) => setAns(it.key, { time: v })}
                        placeholder="HH:MM"
                        placeholderTextColor={palette.smoke}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />
                    </View>
                  )}

                  {it.photo && (
                    <Pressable
                      style={styles.photoBtn}
                      onPress={() => attachPhoto(it)}
                      disabled={photoBusy === it.key}
                    >
                      <Text style={styles.photoText}>
                        {photoBusy === it.key
                          ? t("m.exp.photoBusy")
                          : a?.photo
                            ? t("m.chk.photoChange")
                            : t("m.chk.photoAdd")}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}

            {perm === "view" ? (
              <Text style={styles.viewOnly}>{t("m.chk.viewOnly")}</Text>
            ) : (
              <Pressable
                style={[styles.btn, busy && styles.btnBusy]}
                onPress={submit}
                disabled={busy}
              >
                <Text style={styles.btnText}>{busy ? t("m.fuel.saving") : t("m.chk.submit")}</Text>
              </Pressable>
            )}
            <Pressable style={styles.cancelBtn} onPress={() => setTpl(null)}>
              <Text style={styles.cancelText}>← {t("m.minv.backToList")}</Text>
            </Pressable>
          </>
        )}

        {msg && <Text style={styles.msg}>{msg}</Text>}

        {!tpl && items.length > 0 && (
          <View style={styles.queue}>
            <Text style={styles.queueHead}>
              {t("m.chk.recent")} ({items.length})
            </Text>
            {items.slice(0, 10).map((it) => {
              const input = it.input as { templateName?: string };
              return (
                <Text key={it.id} style={styles.queueRow}>
                  {STATUS_ICON[it.status]} {input.templateName ?? t("m.chk.fallback")} ·{" "}
                  {it.createdAt.slice(0, 16).replace("T", " ")}
                  {it.status === "error" && it.error ? ` — ${it.error}` : ""}
                </Text>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 20, gap: 8 },
  label: { color: palette.smoke, fontSize: 12, marginTop: 8 },
  hint: { color: palette.smoke, fontSize: 13, lineHeight: 18 },
  header: { color: palette.offWhite, fontSize: 20, fontWeight: "800", marginBottom: 6 },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.graphite,
    overflow: "hidden",
  },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: palette.red },
  progressText: {
    color: palette.smoke,
    fontSize: 12,
    fontWeight: "700",
    width: 84,
    textAlign: "right",
  },
  tplBtn: {
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
  },
  tplText: { color: palette.offWhite, fontSize: 16, fontWeight: "700" },
  tplSub: { color: palette.smoke, fontSize: 12, marginTop: 2 },
  item: {
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  itemLabel: { color: palette.offWhite, fontSize: 15, fontWeight: "600" },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  rowWrap: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: palette.red, borderColor: palette.red },
  chipText: { color: palette.offWhite },
  chipTextActive: { color: palette.white, fontWeight: "700" },
  timeLabel: { color: palette.smoke, fontSize: 13 },
  timeInput: {
    backgroundColor: palette.black,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: palette.offWhite,
    width: 84,
    textAlign: "center",
  },
  photoBtn: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center",
  },
  photoText: { color: palette.offWhite, fontSize: 13 },
  btn: {
    marginTop: 14,
    backgroundColor: palette.red,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnBusy: { opacity: 0.5 },
  btnText: { color: palette.white, fontWeight: "700", fontSize: 16 },
  cancelBtn: { marginTop: 8, alignItems: "center", paddingVertical: 8 },
  cancelText: { color: palette.smoke },
  msg: { color: palette.smoke, marginTop: 10 },
  viewOnly: { color: palette.smoke, marginTop: 14, fontSize: 13, textAlign: "center" },
  queue: {
    marginTop: 16,
    borderTopColor: palette.graphite,
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 4,
  },
  queueHead: { color: palette.offWhite, fontWeight: "700", fontSize: 13 },
  queueRow: { color: palette.smoke, fontSize: 13 },
});
