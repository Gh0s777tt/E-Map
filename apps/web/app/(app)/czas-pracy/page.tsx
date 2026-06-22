"use client";

import { summarizeWorkTime, type WorkTimeEntry } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useEffect, useMemo, useState } from "react";
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

export default function WorkTimePage() {
  const [driver, setDriver] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const m = await getCachedMembership(getBrowserSupabase());
        setCanManage(!!m && (m.role === "owner" || m.role === "dispatcher"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const report = useMemo(
    () => summarizeWorkTime(rows.filter((r) => r.driving > 0 || r.otherWork > 0 || r.rest > 0)),
    [rows],
  );

  function patch(id: string, p: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
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
    const body: (string | number)[][] = report.rows.map((r) => [
      driver,
      r.date,
      r.driving,
      r.otherWork,
      r.rest,
      r.workTotal,
      r.overDriving ? "TAK" : "",
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
    downloadCsv(`czas_pracy_${driver || "kierowca"}_${csvDateStamp()}.csv`, headers, body);
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

      <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
        <Button variant="ghost" onClick={() => setRows((rs) => [...rs, emptyRow()])}>
          ➕ Dodaj dzień
        </Button>
        <span style={{ flex: 1 }} />
        <Button onClick={exportCsv} disabled={s.days === 0}>
          ⬇️ CSV (zestawienie)
        </Button>
      </div>

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
