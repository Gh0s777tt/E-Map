"use client";

import { deleteDefect, insertDefect, listDefects, updateDefectStatus } from "@e-logistic/api";
import {
  DEFECT_PARTS,
  DEFECT_SEVERITIES,
  DEFECT_SIDES,
  type DefectStatus,
  defectSchema,
  guessDefectPart,
  toCsv,
} from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import * as f from "@/components/formStyles";
import { ListStatus } from "@/components/ListStatus";
import { Badge, Button, PageHeader } from "@/components/ui";
import { VehicleDiagram } from "@/components/VehicleDiagram";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

type Defect = Awaited<ReturnType<typeof listDefects>>[number];

const SEV_LABEL: Record<string, string> = { low: "niska", medium: "średnia", high: "wysoka" };
const SEV_COLOR: Record<string, string> = {
  low: palette.smoke,
  medium: "#f59e0b",
  high: palette.red,
};
const STATUS_LABEL: Record<string, string> = {
  open: "Zgłoszone",
  in_progress: "W naprawie",
  resolved: "Naprawione",
};
const STATUS_COLOR: Record<string, string> = {
  open: palette.red,
  in_progress: "#f59e0b",
  resolved: "#22c55e",
};
const STATUS_FILTERS: { value: "all" | DefectStatus; label: string }[] = [
  { value: "all", label: "Wszystkie" },
  { value: "open", label: "Zgłoszone" },
  { value: "in_progress", label: "W naprawie" },
  { value: "resolved", label: "Naprawione" },
];

function download(filename: string, text: string) {
  const blob = new Blob([`﻿${text}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { vehicles, source } = useFleet();
  const confirm = useConfirm();
  const [canManage, setCanManage] = useState(false);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [vehicleId, setVehicleId] = useState("");
  const [part, setPart] = useState<string>(DEFECT_PARTS[0]);
  const [partTouched, setPartTouched] = useState(false);
  const [side, setSide] = useState<string>("—");
  const [severity, setSeverity] = useState<(typeof DEFECT_SEVERITIES)[number]>("medium");
  const [dashboardLight, setDashboardLight] = useState(false);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | DefectStatus>("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");

  const setupMsg =
    source === "no-company"
      ? "Najpierw utwórz firmę na Pulpicie."
      : source === "no-vehicles"
        ? "Dodaj pojazd w zakładce Pojazdy, aby zgłosić usterkę."
        : null;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      setCanManage(m?.role === "owner" || m?.role === "dispatcher");
      if (m) setDefects(await listDefects(sb, { limit: 500 }));
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Nie udało się pobrać zgłoszeń.");
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

  function onDescription(v: string) {
    setDescription(v);
    if (!partTouched) {
      const g = guessDefectPart(v);
      if (g) setPart(g);
    }
  }

  function onZone(zone: "front" | "left" | "right" | "rear" | "wheels") {
    if (zone === "left") setSide("lewa");
    else if (zone === "right") setSide("prawa");
    else if (zone === "front") setSide("przód");
    else if (zone === "rear") setSide("tył");
    else if (zone === "wheels") {
      setPart("Opony / koła");
      setPartTouched(true);
    }
  }

  const regOf = (id: string) => vehicles.find((v) => v.id === id)?.registration ?? id.slice(0, 8);

  const vehicleOpts = useMemo(
    () => Array.from(new Set(defects.map((d) => d.vehicle_id))),
    [defects],
  );
  const filtered = useMemo(
    () =>
      defects.filter(
        (d) =>
          (statusFilter === "all" || d.status === statusFilter) &&
          (vehicleFilter === "all" || d.vehicle_id === vehicleFilter),
      ),
    [defects, statusFilter, vehicleFilter],
  );

  function exportCsv() {
    const headers = ["Pojazd", "Część", "Strona", "Pilność", "Status", "Kontrolka", "Opis", "Data"];
    const rows = filtered.map((d) => [
      regOf(d.vehicle_id),
      d.part,
      d.side ?? "",
      SEV_LABEL[d.severity] ?? d.severity,
      STATUS_LABEL[d.status] ?? d.status,
      d.dashboard_light ? "tak" : "",
      d.description,
      d.created_at?.slice(0, 10) ?? "",
    ]);
    download(`usterki_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows));
  }

  async function submit() {
    setErrors({});
    setStatus(null);
    if (setupMsg) {
      setStatus(`⚠️ ${setupMsg}`);
      return;
    }
    const parsed = defectSchema.safeParse({
      vehicleId,
      part,
      side: side === "—" ? undefined : side,
      severity,
      dashboardLight,
      description,
    });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const i of parsed.error.issues) map[i.path.join(".")] = i.message;
      setErrors(map);
      return;
    }
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!m || !user) {
        setStatus("Brak sesji/firmy.");
        return;
      }
      await insertDefect(sb, parsed.data, { companyId: m.companyId, reportedBy: user.id });
      setStatus("✅ Usterka zgłoszona.");
      setDescription("");
      setDashboardLight(false);
      setPartTouched(false);
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Błąd zgłoszenia.");
    }
  }

  async function changeStatus(id: string, s: DefectStatus) {
    try {
      const sb = getBrowserSupabase();
      const {
        data: { user },
      } = await sb.auth.getUser();
      await updateDefectStatus(sb, id, s, user?.id);
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Błąd zmiany statusu.");
    }
  }

  async function remove(id: string) {
    if (!(await confirm("Usunąć zgłoszenie?"))) return;
    try {
      await deleteDefect(getBrowserSupabase(), id);
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Błąd usuwania.");
    }
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <PageHeader
        title="Usterki pojazdu"
        subtitle="Zgłaszaj uszkodzenia i to, co wymaga kontroli. Schemat auta zaznacza miejsce wg opisu; właściciel/mechanik zmienia status."
      />

      {setupMsg && <p style={{ color: palette.red, marginTop: 12 }}>⚠️ {setupMsg}</p>}

      <div style={{ display: "flex", gap: 24, marginTop: 20, flexWrap: "wrap" }}>
        <div
          style={{
            background: palette.nearBlack,
            border: `1px solid ${palette.graphite}`,
            borderRadius: 12,
            padding: 16,
          }}
        >
          <VehicleDiagram part={part} side={side} onZone={onZone} />
          <div style={{ fontSize: 11, color: palette.smoke, textAlign: "center", marginTop: 6 }}>
            kliknij stronę / koła
          </div>
        </div>

        <div style={styles.form}>
          <label style={styles.field}>
            <span style={f.label}>Pojazd</span>
            <select
              style={f.input}
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

          <div style={{ display: "flex", gap: 12 }}>
            <label style={styles.field}>
              <span style={f.label}>Układ / część</span>
              <select
                style={f.input}
                value={part}
                onChange={(e) => {
                  setPart(e.target.value);
                  setPartTouched(true);
                }}
              >
                {DEFECT_PARTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.field}>
              <span style={f.label}>Strona</span>
              <select style={f.input} value={side} onChange={(e) => setSide(e.target.value)}>
                {DEFECT_SIDES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <label style={styles.field}>
              <span style={f.label}>Pilność</span>
              <select
                style={f.input}
                value={severity}
                onChange={(e) => setSeverity(e.target.value as (typeof DEFECT_SEVERITIES)[number])}
              >
                {DEFECT_SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {SEV_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ ...styles.check, flex: 1 }}>
              <input
                type="checkbox"
                checked={dashboardLight}
                onChange={(e) => setDashboardLight(e.target.checked)}
              />{" "}
              Kontrolka na desce rozdzielczej
            </label>
          </div>

          <label style={styles.field}>
            <span style={f.label}>Opis *</span>
            <textarea
              style={{ ...f.input, minHeight: 80 }}
              value={description}
              onChange={(e) => onDescription(e.target.value)}
              placeholder="np. klocki hamulcowe do wymiany, piszczą z lewej; zapaliła się kontrolka"
            />
            {errors.description && <span style={styles.err}>{errors.description}</span>}
          </label>

          <Button onClick={submit} style={{ alignSelf: "flex-start", minWidth: 160 }}>
            Zgłoś usterkę
          </Button>
          {status && <p style={{ color: palette.smoke, fontSize: 14 }}>{status}</p>}
        </div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 36 }}>Zgłoszenia</h2>
      <ListStatus
        loading={loading}
        error={loadErr}
        empty={defects.length === 0}
        emptyText="Brak zgłoszeń."
        onRetry={load}
      />
      {!loading && !loadErr && defects.length > 0 && (
        <>
          <div style={styles.filters}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatusFilter(s.value)}
                  style={statusFilter === s.value ? styles.chipActive : styles.chip}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {vehicleOpts.length > 1 && (
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                style={styles.select}
              >
                <option value="all">Wszystkie pojazdy</option>
                {vehicleOpts.map((id) => (
                  <option key={id} value={id}>
                    {regOf(id)}
                  </option>
                ))}
              </select>
            )}
            <span style={{ flex: 1 }} />
            <Button variant="ghost" onClick={exportCsv}>
              ⬇️ CSV
            </Button>
            <span style={{ color: palette.smoke, fontSize: 13, whiteSpace: "nowrap" }}>
              {filtered.length} z {defects.length}
            </span>
          </div>
          {filtered.length === 0 ? (
            <p style={{ color: palette.smoke, marginTop: 16 }}>
              Brak wyników dla wybranych filtrów.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {filtered.map((d) => (
                <div key={d.id} style={styles.row}>
                  <strong style={{ minWidth: 90 }}>{regOf(d.vehicle_id)}</strong>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>
                      {d.part}
                      {d.side ? ` · ${d.side}` : ""} {d.dashboard_light ? "💡" : ""}
                    </div>
                    <div style={{ color: palette.smoke, fontSize: 13 }}>{d.description}</div>
                  </div>
                  <Badge color={SEV_COLOR[d.severity]}>{SEV_LABEL[d.severity] ?? d.severity}</Badge>
                  <Badge color={STATUS_COLOR[d.status]}>{STATUS_LABEL[d.status] ?? d.status}</Badge>
                  {canManage && (
                    <>
                      {d.status !== "in_progress" && d.status !== "resolved" && (
                        <Button variant="ghost" onClick={() => changeStatus(d.id, "in_progress")}>
                          W naprawie
                        </Button>
                      )}
                      {d.status !== "resolved" && (
                        <Button variant="ghost" onClick={() => changeStatus(d.id, "resolved")}>
                          Naprawione
                        </Button>
                      )}
                      {d.status === "resolved" && (
                        <Button variant="ghost" onClick={() => changeStatus(d.id, "open")}>
                          Otwórz
                        </Button>
                      )}
                      <Button variant="danger" onClick={() => remove(d.id)}>
                        🗑️
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  filters: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 16,
  },
  chip: {
    background: "transparent",
    color: palette.smoke,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
  chipActive: {
    background: palette.red,
    color: palette.white,
    border: `1px solid ${palette.red}`,
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  select: {
    background: palette.black,
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 13,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    flex: 1,
    minWidth: 300,
    maxWidth: 480,
  },
  field: { display: "flex", flexDirection: "column", gap: 4, flex: 1 },
  err: { color: palette.red, fontSize: 12 },
  check: { color: palette.offWhite, fontSize: 14, display: "flex", alignItems: "center", gap: 6 },
  row: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
};
