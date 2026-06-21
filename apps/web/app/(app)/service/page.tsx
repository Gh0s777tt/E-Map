"use client";

import {
  deleteServiceTask,
  latestOdometers,
  listServiceTasks,
  markServiceDone,
  type ServiceTask,
  saveServiceTask,
} from "@e-logistic/api";
import { serviceStatus } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import { ListStatus } from "@/components/ListStatus";
import { Badge, Button, PageHeader, SetupNotice } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

const PRESETS = [
  "Wymiana oleju",
  "Opony (rotacja/wymiana)",
  "Filtry",
  "Klocki/tarcze",
  "Serwis ogólny",
];

export default function ServicePage() {
  const { vehicles, source } = useFleet();
  const confirm = useConfirm();
  const [tasks, setTasks] = useState<ServiceTask[]>([]);
  const [odo, setOdo] = useState<Record<string, number>>({});
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState("");
  const [name, setName] = useState("");
  const [intervalKm, setIntervalKm] = useState("");
  const [intervalMonths, setIntervalMonths] = useState("");
  const [lastDoneKm, setLastDoneKm] = useState("");
  const [lastDoneDate, setLastDoneDate] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        setTasks([]);
        return;
      }
      setCanManage(m.role === "owner" || m.role === "dispatcher");
      const [t, o] = await Promise.all([
        listServiceTasks(sb, m.companyId),
        latestOdometers(sb, m.companyId),
      ]);
      setTasks(t);
      setOdo(o);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Nie udało się pobrać planu serwisowego.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!vehicleId && vehicles[0]) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);

  const regOf = (id: string) => vehicles.find((v) => v.id === id)?.registration ?? id.slice(0, 8);

  function resetForm() {
    setEditingId(null);
    setName("");
    setIntervalKm("");
    setIntervalMonths("");
    setLastDoneKm("");
    setLastDoneDate("");
    setStatus(null);
  }

  function startEdit(tk: ServiceTask) {
    setEditingId(tk.id);
    setVehicleId(tk.vehicle_id);
    setName(tk.name);
    setIntervalKm(tk.interval_km != null ? String(tk.interval_km) : "");
    setIntervalMonths(tk.interval_months != null ? String(tk.interval_months) : "");
    setLastDoneKm(tk.last_done_km != null ? String(tk.last_done_km) : "");
    setLastDoneDate(tk.last_done_date ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    setStatus(null);
    if (!vehicleId || !name.trim()) {
      setStatus("Podaj pojazd i nazwę zadania.");
      return;
    }
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        setStatus("Brak firmy.");
        return;
      }
      await saveServiceTask(
        sb,
        m.companyId,
        {
          vehicleId,
          name: name.trim(),
          intervalKm: intervalKm ? Number(intervalKm) : null,
          intervalMonths: intervalMonths ? Number(intervalMonths) : null,
          lastDoneKm: lastDoneKm ? Number(lastDoneKm) : null,
          lastDoneDate: lastDoneDate || null,
        },
        editingId ?? undefined,
      );
      setStatus(editingId ? "✅ Zaktualizowano." : "✅ Dodano zadanie.");
      resetForm();
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Błąd zapisu.");
    }
  }

  async function done(tk: ServiceTask) {
    const km = odo[tk.vehicle_id] ?? null;
    if (!(await confirm(`Oznaczyć „${tk.name}" jako wykonane przy ${km ?? "—"} km?`))) return;
    try {
      await markServiceDone(getBrowserSupabase(), tk.id, km, new Date().toISOString().slice(0, 10));
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Błąd.");
    }
  }

  async function remove(id: string) {
    if (!(await confirm("Usunąć zadanie serwisowe?"))) return;
    try {
      await deleteServiceTask(getBrowserSupabase(), id);
      if (editingId === id) resetForm();
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Błąd usuwania.");
    }
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <PageHeader
        title="Plan serwisowy"
        subtitle="Interwały serwisowe wg przebiegu (i/lub czasu). Status liczony z bieżącego licznika pojazdu; przypomnienia trafiają do powiadomień."
      />

      <SetupNotice source={source} noVehicles="Dodaj pojazd, aby zaplanować serwis." />

      {canManage && (
        <div style={styles.form}>
          {editingId && <div style={{ color: palette.red, fontWeight: 700 }}>✏️ Edycja zadania</div>}
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>Pojazd</span>
              <select
                style={styles.input}
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Zadanie</span>
              <input
                style={styles.input}
                list="svc-presets"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Wymiana oleju"
              />
              <datalist id="svc-presets">
                {PRESETS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </label>
          </div>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>Interwał (km)</span>
              <input
                style={styles.input}
                type="number"
                value={intervalKm}
                onChange={(e) => setIntervalKm(e.target.value)}
                placeholder="np. 60000"
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Interwał (mies.)</span>
              <input
                style={styles.input}
                type="number"
                value={intervalMonths}
                onChange={(e) => setIntervalMonths(e.target.value)}
                placeholder="np. 12"
              />
            </label>
          </div>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>Ostatni serwis (km)</span>
              <input
                style={styles.input}
                type="number"
                value={lastDoneKm}
                onChange={(e) => setLastDoneKm(e.target.value)}
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Ostatni serwis (data)</span>
              <input
                style={styles.input}
                type="date"
                value={lastDoneDate}
                onChange={(e) => setLastDoneDate(e.target.value)}
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button onClick={save}>{editingId ? "Zapisz" : "Dodaj zadanie"}</Button>
            {editingId && (
              <Button variant="ghost" onClick={resetForm}>
                Anuluj
              </Button>
            )}
          </div>
          {status && <p style={{ color: palette.smoke, fontSize: 14 }}>{status}</p>}
        </div>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28 }}>Zadania</h2>
      <ListStatus
        loading={loading}
        error={loadErr}
        empty={tasks.length === 0}
        emptyText="Brak zaplanowanych zadań serwisowych."
        onRetry={load}
      />
      {!loading && !loadErr && tasks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {tasks.map((tk) => {
            const st = serviceStatus(odo[tk.vehicle_id] ?? null, tk.last_done_km, tk.interval_km);
            const color =
              st.level === "expired" ? palette.red : st.level === "soon" ? "#f59e0b" : "#22c55e";
            return (
              <div key={tk.id} style={styles.row}>
                <strong style={{ minWidth: 90 }}>{regOf(tk.vehicle_id)}</strong>
                <span style={{ flex: 1 }}>{tk.name}</span>
                {tk.interval_km != null && (
                  <Badge color={color}>
                    {st.kmLeft == null
                      ? `co ${tk.interval_km} km`
                      : st.kmLeft < 0
                        ? `po przebiegu o ${-st.kmLeft} km`
                        : `za ${st.kmLeft} km`}
                  </Badge>
                )}
                {tk.interval_months != null && (
                  <span style={styles.dim}>co {tk.interval_months} mies.</span>
                )}
                {canManage && (
                  <>
                    <Button variant="ghost" onClick={() => done(tk)}>
                      ✓ Wykonano
                    </Button>
                    <Button variant="ghost" onClick={() => startEdit(tk)}>
                      ✏️
                    </Button>
                    <Button variant="danger" onClick={() => remove(tk.id)}>
                      🗑️
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: 12, marginTop: 16, maxWidth: 620 },
  grid: { display: "flex", gap: 12, flexWrap: "wrap" },
  field: { display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 200 },
  label: { fontSize: 12, color: palette.smoke },
  input: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "10px 12px",
    color: palette.offWhite,
    width: "100%",
  },
  row: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    fontSize: 14,
  },
  dim: { color: palette.smoke, fontSize: 13 },
};
