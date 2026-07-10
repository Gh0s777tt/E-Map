import {
  type ChecklistSubmissionInput,
  type ChecklistTemplate,
  getActiveMembership,
  listChecklistTemplates,
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
import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { VehiclePicker } from "../components/VehiclePicker";
import { enqueue, flushQueued, listOutbox, type OutboxItem } from "../lib/outbox";
import { getSupabase, supabaseConfigured } from "../lib/supabase";
import { useFleet } from "../lib/useFleet";
import { usePermission } from "../lib/usePermission";

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
        setTemplates(await listChecklistTemplates(sb, m.companyId, { activeOnly: true }));
      } catch {
        setMsg("Nie udało się pobrać szablonów — spróbuj przy zasięgu.");
      }
    })();
  }, [refresh]);

  useEffect(() => {
    if (!vehicleId && vehicles[0]) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);

  function openTemplate(t: ChecklistTemplate) {
    setTpl(t);
    const init: ChecklistAnswers = {};
    for (const it of t.items) {
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
      setMsg("📷 Zdjęcie dołączone.");
    } catch {
      setMsg("Zdjęcie wymaga zasięgu — odpowiedź możesz zapisać bez niego.");
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
          ? `✅ Zapisano: ${tpl.name}.`
          : `📥 Zapisano lokalnie: ${tpl.name} — sync w tle.`,
      );
      setTpl(null);
      setAnswers({});
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Checklisty" }} />

      {!tpl && (
        <>
          <Text style={styles.label}>Pojazd</Text>
          <VehiclePicker
            vehicles={vehicles}
            loading={loading}
            selectedId={vehicleId}
            onSelect={setVehicleId}
          />

          <Text style={styles.label}>Wybierz checklistę</Text>
          {templates.length === 0 && (
            <Text style={styles.hint}>
              Brak szablonów — właściciel dodaje je w panelu web (Checklisty → „Dodaj domyślne").
            </Text>
          )}
          {templates.map((t) => (
            <Pressable key={t.id} style={styles.tplBtn} onPress={() => openTemplate(t)}>
              <Text style={styles.tplText}>📋 {t.name}</Text>
              <Text style={styles.tplSub}>{t.items.length} pozycji</Text>
            </Pressable>
          ))}
        </>
      )}

      {tpl && (
        <>
          <Text style={styles.header}>📋 {tpl.name}</Text>
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
                          {v ? "✅ Tak" : "❌ Nie"}
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
                    <Text style={styles.timeLabel}>Godzina (data automatycznie):</Text>
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
                        ? "Wgrywam…"
                        : a?.photo
                          ? "📷 Zdjęcie dołączone ✓ (zmień)"
                          : "📷 Zrób / dodaj zdjęcie"}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          {perm === "view" ? (
            <Text style={styles.viewOnly}>👁 Masz uprawnienia tylko do podglądu checklist.</Text>
          ) : (
            <Pressable
              style={[styles.btn, busy && styles.btnBusy]}
              onPress={submit}
              disabled={busy}
            >
              <Text style={styles.btnText}>{busy ? "Zapisuję…" : "Zapisz checklistę"}</Text>
            </Pressable>
          )}
          <Pressable style={styles.cancelBtn} onPress={() => setTpl(null)}>
            <Text style={styles.cancelText}>← Wróć do listy</Text>
          </Pressable>
        </>
      )}

      {msg && <Text style={styles.msg}>{msg}</Text>}

      {!tpl && items.length > 0 && (
        <View style={styles.queue}>
          <Text style={styles.queueHead}>Ostatnie checklisty ({items.length})</Text>
          {items.slice(0, 10).map((it) => {
            const input = it.input as { templateName?: string };
            return (
              <Text key={it.id} style={styles.queueRow}>
                {STATUS_ICON[it.status]} {input.templateName ?? "checklista"} ·{" "}
                {it.createdAt.slice(0, 16).replace("T", " ")}
                {it.status === "error" && it.error ? ` — ${it.error}` : ""}
              </Text>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 20, gap: 8 },
  label: { color: palette.smoke, fontSize: 12, marginTop: 8 },
  hint: { color: palette.smoke, fontSize: 13, lineHeight: 18 },
  header: { color: palette.offWhite, fontSize: 20, fontWeight: "800", marginBottom: 6 },
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
