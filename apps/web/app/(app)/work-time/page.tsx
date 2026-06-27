"use client";

import {
  deleteWorkTimeEntry,
  insertWorkTimeEntry,
  listWorkTimeEntries,
  type WorkTimeRecord,
} from "@e-logistic/api";
import { summarizeWorkTime, type WorkTimeEntry } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import * as f from "@/components/formStyles";
import { ListStatus } from "@/components/ListStatus";
import { Button, PageHeader } from "@/components/ui";
import { csvDateStamp, downloadCsv } from "@/lib/csv";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

interface Row extends WorkTimeEntry {
  id: string;
}

function emptyRow(): Row {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    driving: 0,
    otherWork: 0,
    rest: 0,
  };
}

/** WorkTimeRecord (DB) → WorkTimeEntry (rdzeń). */
function toEntry(r: WorkTimeRecord): WorkTimeEntry {
  return { date: r.work_date, driving: r.driving, otherWork: r.other_work, rest: r.rest };
}

export default function WorkTimePage() {
  const confirm = useConfirm();
  const [driver, setDriver] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [saved, setSaved] = useState<WorkTimeRecord[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) return;
      const manage = m.role === "owner" || m.role === "dispatcher";
      setCanManage(manage);
      setCompanyId(m.companyId);
      if (manage) setSaved(await listWorkTimeEntries(sb, m.companyId));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nie udało się pobrać ewidencji.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const draft = useMemo(
    () => summarizeWorkTime(rows.filter((r) => r.driving > 0 || r.otherWork > 0 || r.rest > 0)),
    [rows],
  );
  const report = useMemo(() => summarizeWorkTime(saved.map(toEntry)), [saved]);

  function patch(id: string, p: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  }

  async function saveDrafts() {
    if (!companyId) return;
    const valid = rows.filter((r) => r.driving > 0 || r.otherWork > 0 || r.rest > 0);
    if (valid.length === 0) {
      setErr("Uzupełnij co najmniej jeden dzień.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const sb = getBrowserSupabase();
      for (const r of valid) {
        await insertWorkTimeEntry(
          sb,
          {
            driverName: driver,
            workDate: r.date,
            driving: r.driving,
            otherWork: r.otherWork,
            rest: r.rest,
          },
          companyId,
        );
      }
      setRows([emptyRow()]);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Błąd zapisu.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSaved(r: WorkTimeRecord) {
    if (!(await confirm("Usunąć ten dzień z ewidencji?"))) return;
    try {
      await deleteWorkTimeEntry(getBrowserSupabase(), r.id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Błąd usuwania.");
    }
  }

  function exportCsv() {
    const headers = [
      "Kierowca",
      "Data",
      "Jazda (h)",
      "Inna praca (h)",
      "Odpoczynek (h)",
      "Praca łącznie (h)",
      "Przekroczenie",
    ];
    const body: (string | number)[][] = [...saved]
      .sort((a, b) => a.work_date.localeCompare(b.work_date))
      .map((rec) => [
        rec.driver_name ?? "",
        rec.work_date,
        rec.driving,
        rec.other_work,
        rec.rest,
        Math.round((rec.driving + rec.other_work) * 100) / 100,
        rec.driving > 10 ? "TAK" : "",
      ]);
    const s = report.summary;
    body.push([]);
    body.push([
      "RAZEM",
      `${s.days} dni`,
      s.driving,
      s.otherWork,
      s.rest,
      s.workTotal,
      `${s.overDrivingDays} dni > limitu`,
    ]);
    downloadCsv(`czas_pracy_${csvDateStamp()}.csv`, headers, body);
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 980 }}>
        <PageHeader
          title="Czas pracy kierowcy"
          subtitle="Ewidencja godzin jazdy, innej pracy i odpoczynku."
        />
        <ListStatus loading error={null} />
      </div>
    );
  }
  if (!canManage) {
    return (
      <div style={{ maxWidth: 980 }}>
        <PageHeader
          title="Czas pracy kierowcy"
          subtitle="Ewidencja godzin jazdy, innej pracy i odpoczynku."
        />
        <p style={{ color: palette.smoke }}>Dostęp tylko dla właściciela / spedytora.</p>
      </div>
    );
  }

  const s = report.summary;

  return (
    <div style={{ maxWidth: 980 }}>
      <PageHeader
        title="Czas pracy kierowcy"
        subtitle="Ewidencja godzin jazdy / innej pracy / odpoczynku z podsumowaniem. Dzienny limit jazdy (10 h) tylko sygnalizuje przekroczenie — to nie interpretacja prawna."
      />

      <div style={{ ...f.field, maxWidth: 320, marginBottom: 14 }}>
        <span style={f.label}>Kierowca (do zestawienia)</span>
        <input
          style={f.input}
          value={driver}
          onChange={(e) => setDriver(e.target.value)}
          placeholder="Imię i nazwisko"
        />
      </div>

      <div style={f.card}>
        <div style={{ ...f.listRow, color: palette.smoke, fontSize: 12, fontWeight: 700 }}>
          <span style={{ width: 140 }}>Data</span>
          <span style={{ width: 90 }}>Jazda</span>
          <span style={{ width: 100 }}>Inna praca</span>
          <span style={{ width: 110 }}>Odpoczynek</span>
          <span style={{ width: 90 }}>Praca Σ</span>
          <span style={{ flex: 1 }} />
          <span style={{ width: 36 }} />
        </div>

        {rows.map((r) => {
          const over = r.driving > 10;
          return (
            <div key={r.id} style={f.listRow}>
              <input
                style={{ ...f.input, width: 140 }}
                type="date"
                value={r.date}
                onChange={(e) => patch(r.id, { date: e.target.value })}
              />
              <input
                style={{ ...f.input, width: 90, ...(over ? { borderColor: palette.red } : null) }}
                type="number"
                min={0}
                step="0.5"
                value={r.driving || ""}
                onChange={(e) => patch(r.id, { driving: Number(e.target.value) || 0 })}
              />
              <input
                style={{ ...f.input, width: 100 }}
                type="number"
                min={0}
                step="0.5"
                value={r.otherWork || ""}
                onChange={(e) => patch(r.id, { otherWork: Number(e.target.value) || 0 })}
              />
              <input
                style={{ ...f.input, width: 110 }}
                type="number"
                min={0}
                step="0.5"
                value={r.rest || ""}
                onChange={(e) => patch(r.id, { rest: Number(e.target.value) || 0 })}
              />
              <span style={{ width: 90, fontWeight: 700 }}>
                {r.driving + r.otherWork > 0
                  ? `${Math.round((r.driving + r.otherWork) * 100) / 100} h`
                  : "—"}
              </span>
              <span style={{ flex: 1 }}>
                {over && (
                  <span style={{ color: palette.red, fontSize: 12 }}>⚠️ jazda &gt; 10 h</span>
                )}
              </span>
              <button
                type="button"
                onClick={() =>
                  setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.id !== r.id) : rs))
                }
                style={styles.del}
                aria-label="Usuń wiersz"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {err && <p style={{ color: palette.red, fontSize: 13, marginTop: 8 }}>{err}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
        <Button variant="ghost" onClick={() => setRows((rs) => [...rs, emptyRow()])}>
          ➕ Dodaj dzień
        </Button>
        <span style={{ flex: 1 }} />
        <Button onClick={saveDrafts} disabled={busy || draft.summary.days === 0}>
          {busy ? "Zapisuję…" : "💾 Zapisz do ewidencji"}
        </Button>
      </div>

      <div style={{ display: "flex", alignItems: "center", marginTop: 28, marginBottom: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Ewidencja</h2>
        <span style={{ color: palette.smoke, fontSize: 13, marginLeft: 8 }}>
          {saved.length > 0 ? `${saved.length} dni` : "brak zapisanych"}
        </span>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" onClick={exportCsv} disabled={saved.length === 0}>
          ⬇️ CSV
        </Button>
      </div>

      {saved.length > 0 ? (
        <div style={f.card}>
          {saved.map((rec) => {
            const over = rec.driving > 10;
            return (
              <div key={rec.id} style={f.listRow}>
                <span style={{ width: 120, fontWeight: 700 }}>{rec.work_date}</span>
                <span style={{ ...f.cell, width: 130 }}>
                  {rec.driver_name || <span style={{ color: palette.smoke }}>—</span>}
                </span>
                <span style={{ ...f.cell, width: 80 }}>🚛 {rec.driving} h</span>
                <span style={{ ...f.cell, width: 90 }}>🛠️ {rec.other_work} h</span>
                <span style={{ ...f.cell, width: 90 }}>😴 {rec.rest} h</span>
                <span style={{ flex: 1 }}>
                  {over && <span style={{ color: palette.red, fontSize: 12 }}>⚠️ &gt; 10 h</span>}
                </span>
                <button
                  type="button"
                  onClick={() => removeSaved(rec)}
                  style={styles.del}
                  aria-label="Usuń"
                >
                  🗑️
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ color: palette.smoke }}>
          Brak zapisanych dni — dodaj powyżej i zapisz do ewidencji.
        </p>
      )}

      {s.days > 0 && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          <Stat label="Dni" value={String(s.days)} />
          <Stat label="Jazda Σ" value={`${s.driving} h`} />
          <Stat label="Inna praca Σ" value={`${s.otherWork} h`} />
          <Stat label="Odpoczynek Σ" value={`${s.rest} h`} />
          <Stat label="Praca łącznie" value={`${s.workTotal} h`} accent={palette.red} />
          <Stat
            label="Śr. jazda/dzień"
            value={s.avgDrivingPerDay != null ? `${s.avgDrivingPerDay} h` : "—"}
          />
          <Stat
            label="Dni > limitu jazdy"
            value={String(s.overDrivingDays)}
            accent={s.overDrivingDays > 0 ? palette.red : "#22c55e"}
          />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={styles.stat}>
      <div style={{ fontSize: 12, color: palette.smoke }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: accent ?? palette.offWhite }}>
        {value}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  del: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: "transparent",
    color: palette.smoke,
    border: `1px solid ${palette.graphite}`,
    cursor: "pointer",
  },
  stat: {
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 10,
    padding: "10px 16px",
    minWidth: 110,
  },
};
