"use client";

import {
  type ChecklistSubmission,
  type ChecklistTemplate,
  checklistPhotoUrl,
  listChecklistSubmissions,
  listChecklistTemplates,
  listVehicles,
  saveChecklistTemplate,
} from "@e-logistic/api";
import { type ChecklistItem, DEFAULT_CHECKLIST_TEMPLATES } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import * as f from "@/components/formStyles";
import { useToast } from "@/components/Toast";
import { Button, PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * #273: checklisty kierowców — panel firmy. Zarząd: szablony (seed „Wjazd do UK"
 * + „Tachograf" i własne pozycje) oraz przegląd zgłoszeń z filtrem po pojeździe.
 * Kierowca (web): widzi wyłącznie swoje zgłoszenia (RLS).
 */

type VehicleOpt = { id: string; registration: string };

export default function ChecklistsPage() {
  const toast = useToast();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [subs, setSubs] = useState<ChecklistSubmission[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOpt[]>([]);
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [editing, setEditing] = useState<ChecklistTemplate | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) return;
      setCompanyId(m.companyId);
      const manage = m.role === "owner" || m.role === "dispatcher";
      setCanManage(manage);
      const [tpls, list, veh] = await Promise.all([
        listChecklistTemplates(sb, m.companyId),
        listChecklistSubmissions(sb, m.companyId, {
          vehicleId: vehicleFilter || undefined,
        }),
        listVehicles(sb, m.companyId).catch(() => []),
      ]);
      setTemplates(tpls);
      setSubs(list);
      setVehicles(veh.map((v) => ({ id: v.id, registration: v.registration ?? "—" })));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nie udało się pobrać checklist.", "error");
    }
  }, [vehicleFilter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function addDefaults() {
    if (!companyId) return;
    setBusy(true);
    try {
      const existing = new Set(templates.map((t) => t.name));
      for (const tpl of DEFAULT_CHECKLIST_TEMPLATES) {
        if (!existing.has(tpl.name)) {
          await saveChecklistTemplate(getBrowserSupabase(), companyId, tpl);
        }
      }
      toast("Dodano domyślne szablony.", "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd zapisu szablonów.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveEditing() {
    if (!companyId || !editing) return;
    if (!editing.name.trim() || editing.items.length === 0) {
      toast("Szablon musi mieć nazwę i co najmniej jedną pozycję.", "error");
      return;
    }
    setBusy(true);
    try {
      await saveChecklistTemplate(getBrowserSupabase(), companyId, editing);
      toast("Szablon zapisany.", "success");
      setEditing(null);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd zapisu.", "error");
    } finally {
      setBusy(false);
    }
  }

  const setItem = (i: number, patch: Partial<ChecklistItem>) =>
    setEditing((t) =>
      t ? { ...t, items: t.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) } : t,
    );

  async function openPhoto(path: string) {
    const url = await checklistPhotoUrl(getBrowserSupabase(), path);
    if (url) window.open(url, "_blank");
  }

  const regOf = (id: string | null) =>
    id ? (vehicles.find((v) => v.id === id)?.registration ?? "—") : "—";

  return (
    <div style={{ maxWidth: 980 }}>
      <PageHeader
        title="Checklisty kierowców"
        subtitle="Procedury (np. wjazd do UK, tachograf) — kierowca wypełnia w aplikacji, zgłoszenie przypina się do niego i pojazdu."
      />

      {canManage && (
        <div style={styles.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <strong>Szablony firmy ({templates.length})</strong>
            <Button onClick={addDefaults} disabled={busy}>
              ➕ Dodaj domyślne (UK + Tachograf)
            </Button>
            <Button
              onClick={() =>
                setEditing({
                  id: undefined as unknown as string,
                  name: "",
                  items: [],
                  active: true,
                })
              }
            >
              🆕 Nowy szablon
            </Button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                style={{ ...styles.tplChip, opacity: t.active ? 1 : 0.5 }}
                onClick={() => setEditing({ ...t, items: t.items.map((i) => ({ ...i })) })}
              >
                📋 {t.name} ({t.items.length}){!t.active && " · wyłączony"}
              </button>
            ))}
          </div>

          {editing && (
            <div style={styles.editor}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  style={{ ...f.input, maxWidth: 320 }}
                  value={editing.name}
                  onChange={(e) => setEditing((t) => (t ? { ...t, name: e.target.value } : t))}
                  placeholder="Nazwa checklisty"
                />
                <label style={{ color: palette.smoke, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={editing.active}
                    onChange={(e) =>
                      setEditing((t) => (t ? { ...t, active: e.target.checked } : t))
                    }
                  />{" "}
                  aktywny
                </label>
              </div>
              {editing.items.map((it, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: pozycje edytora są czysto pozycyjne
                <div key={`it-${i * 1}`} style={styles.itemRow}>
                  <input
                    style={{ ...f.input, flex: 2 }}
                    value={it.label}
                    onChange={(e) => setItem(i, { label: e.target.value })}
                    placeholder="Pytanie"
                  />
                  <select
                    style={f.input}
                    value={it.type}
                    onChange={(e) => setItem(i, { type: e.target.value as ChecklistItem["type"] })}
                  >
                    <option value="yesno">Tak / Nie</option>
                    <option value="multi">Wielokrotny wybór</option>
                  </select>
                  {it.type === "multi" && (
                    <input
                      style={{ ...f.input, flex: 2 }}
                      value={(it.options ?? []).join(", ")}
                      onChange={(e) =>
                        setItem(i, {
                          options: e.target.value
                            .split(",")
                            .map((o) => o.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="Opcje po przecinku"
                    />
                  )}
                  <label style={styles.flag}>
                    <input
                      type="checkbox"
                      checked={!!it.photo}
                      onChange={(e) => setItem(i, { photo: e.target.checked })}
                    />
                    📷
                  </label>
                  <label style={styles.flag}>
                    <input
                      type="checkbox"
                      checked={!!it.time}
                      onChange={(e) => setItem(i, { time: e.target.checked })}
                    />
                    🕐
                  </label>
                  <Button
                    variant="danger"
                    onClick={() =>
                      setEditing((t) =>
                        t ? { ...t, items: t.items.filter((_, j) => j !== i) } : t,
                      )
                    }
                  >
                    🗑️
                  </Button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 10 }}>
                <Button
                  onClick={() =>
                    setEditing((t) =>
                      t
                        ? {
                            ...t,
                            items: [
                              ...t.items,
                              {
                                key: `q${t.items.length + 1}-${Date.now() % 10000}`,
                                label: "",
                                type: "yesno",
                              },
                            ],
                          }
                        : t,
                    )
                  }
                >
                  + pozycja
                </Button>
                <Button onClick={saveEditing} disabled={busy}>
                  {busy ? "Zapisuję…" : "💾 Zapisz szablon"}
                </Button>
                <Button variant="ghost" onClick={() => setEditing(null)}>
                  Anuluj
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={styles.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <strong>Zgłoszenia ({subs.length})</strong>
          <select
            style={{ ...f.input, maxWidth: 220 }}
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
          >
            <option value="">wszystkie pojazdy</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration}
              </option>
            ))}
          </select>
        </div>

        {subs.length === 0 && (
          <p style={{ color: palette.smoke, fontSize: 14 }}>
            Brak zgłoszeń — kierowcy wypełniają checklisty w aplikacji mobilnej (kafel „📋
            Checklisty").
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
          {subs.map((s) => (
            <div key={s.id} style={styles.subRow}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <strong>📋 {s.template_name}</strong>
                <span style={styles.dim}>{s.created_at.slice(0, 16).replace("T", " ")}</span>
                <span style={styles.dim}>👤 {s.driver_label || "—"}</span>
                <span style={styles.dim}>🚚 {regOf(s.vehicle_id)}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {Object.entries(s.answers).map(([key, a]) => (
                  <span key={key} style={styles.answer}>
                    {typeof a.value === "boolean"
                      ? `${a.value ? "✅" : "❌"} ${key}`
                      : `☑ ${key}: ${(a.value as string[]).join(" + ")}`}
                    {a.time ? ` · 🕐 ${a.time}` : ""}
                    {a.photo && (
                      <button
                        type="button"
                        style={styles.photoLink}
                        onClick={() => a.photo && openPhoto(a.photo)}
                      >
                        📷
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
  tplChip: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 999,
    padding: "8px 14px",
    color: palette.offWhite,
    cursor: "pointer",
    fontSize: 13,
  },
  editor: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: `1px solid ${palette.graphite}`,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  itemRow: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  flag: { color: palette.smoke, fontSize: 15, display: "flex", alignItems: "center", gap: 4 },
  subRow: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 10,
    padding: "10px 14px",
  },
  dim: { color: palette.smoke, fontSize: 13 },
  answer: {
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "4px 10px",
    color: palette.offWhite,
    fontSize: 13,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  photoLink: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    padding: 0,
  },
};
