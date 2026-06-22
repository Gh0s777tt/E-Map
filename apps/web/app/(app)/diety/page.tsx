"use client";

import { computePerDiem, type DietMode, type DietTrip, round2, sumPerDiem } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useEffect, useMemo, useState } from "react";
import * as f from "@/components/formStyles";
import { ListStatus } from "@/components/ListStatus";
import { Button, PageHeader } from "@/components/ui";
import { csvDateStamp, downloadCsv } from "@/lib/csv";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

interface Row extends DietTrip {
  id: string;
}

function emptyRow(): Row {
  return {
    id: crypto.randomUUID(),
    destination: "",
    mode: "foreign",
    hours: 0,
    dailyRate: 0,
    currency: "EUR",
  };
}

const MODE_LABEL: Record<DietMode, string> = {
  domestic: "krajowa",
  foreign: "zagraniczna",
};

export default function PerDiemPage() {
  const [driver, setDriver] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const m = await getCachedMembership(getBrowserSupabase());
        if (!m || !(m.role === "owner" || m.role === "dispatcher")) setDenied(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const results = useMemo(
    () => rows.filter((r) => r.hours > 0 && r.dailyRate > 0).map((r) => computePerDiem(r)),
    [rows],
  );
  const totals = useMemo(() => sumPerDiem(results), [results]);

  function patch(id: string, p: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  }

  function exportCsv() {
    const headers = ["Kierowca", "Cel", "Typ", "Czas (h)", "Doby", "Stawka", "Kwota", "Waluta"];
    const body: (string | number)[][] = results.map((r) => [
      driver,
      r.destination || "—",
      MODE_LABEL[r.mode],
      r.fullDays * 24 + r.remainderHours,
      r.days,
      round2(r.amount / (r.days || 1)),
      r.amount,
      r.currency,
    ]);
    body.push([]);
    body.push(["Podsumowanie wg waluty", "", "", "", "", "", "", ""]);
    for (const t of totals) body.push(["", "", "", "", t.days, "", t.amount, t.currency]);
    downloadCsv(`diety_${driver || "kierowca"}_${csvDateStamp()}.csv`, headers, body);
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 980 }}>
        <PageHeader title="Diety kierowcy" subtitle="Kalkulator diet z podróży służbowych." />
        <ListStatus loading error={null} />
      </div>
    );
  }

  if (denied) {
    return (
      <div style={{ maxWidth: 980 }}>
        <PageHeader title="Diety kierowcy" subtitle="Kalkulator diet z podróży służbowych." />
        <p style={{ color: palette.smoke }}>Dostęp tylko dla właściciela / spedytora.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <PageHeader
        title="Diety kierowcy"
        subtitle="Kalkulator diet (per diem) z podróży służbowych — krajowych i zagranicznych. Stawki dobowe ustalasz sam (urzędowe zmienia ustawodawca)."
      />

      <div style={{ ...f.field, maxWidth: 320, marginBottom: 14 }}>
        <span style={f.label}>Kierowca (do zestawienia)</span>
        <input
          style={f.input}
          value={driver}
          onChange={(e) => setDriver(e.target.value)}
          placeholder="Imię i nazwisko"
          list="drivers-dl"
        />
      </div>

      <div style={f.card}>
        <div style={{ ...f.listRow, color: palette.smoke, fontSize: 12, fontWeight: 700 }}>
          <span style={{ flex: 1, minWidth: 120 }}>Cel</span>
          <span style={{ width: 120 }}>Typ</span>
          <span style={{ width: 90 }}>Czas (h)</span>
          <span style={{ width: 100 }}>Stawka/dobę</span>
          <span style={{ width: 80 }}>Waluta</span>
          <span style={{ width: 70 }}>Doby</span>
          <span style={{ width: 100 }}>Kwota</span>
          <span style={{ width: 36 }} />
        </div>

        {rows.map((r) => {
          const res = r.hours > 0 && r.dailyRate > 0 ? computePerDiem(r) : null;
          return (
            <div key={r.id} style={f.listRow}>
              <input
                style={{ ...f.input, flex: 1, minWidth: 120 }}
                value={r.destination}
                onChange={(e) => patch(r.id, { destination: e.target.value })}
                placeholder="np. Niemcy / Warszawa"
              />
              <select
                style={{ ...f.input, width: 120 }}
                value={r.mode}
                onChange={(e) => patch(r.id, { mode: e.target.value as DietMode })}
              >
                <option value="foreign">zagraniczna</option>
                <option value="domestic">krajowa</option>
              </select>
              <input
                style={{ ...f.input, width: 90 }}
                type="number"
                min={0}
                step="0.5"
                value={r.hours || ""}
                onChange={(e) => patch(r.id, { hours: Number(e.target.value) || 0 })}
              />
              <input
                style={{ ...f.input, width: 100 }}
                type="number"
                min={0}
                step="0.01"
                value={r.dailyRate || ""}
                onChange={(e) => patch(r.id, { dailyRate: Number(e.target.value) || 0 })}
              />
              <input
                style={{ ...f.input, width: 80 }}
                value={r.currency}
                onChange={(e) => patch(r.id, { currency: e.target.value.toUpperCase() })}
              />
              <span style={{ width: 70, fontSize: 13 }}>{res ? res.days : "—"}</span>
              <span style={{ width: 100, fontWeight: 700, color: palette.red }}>
                {res ? `${res.amount} ${r.currency}` : "—"}
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
          ➕ Dodaj podróż
        </Button>
        <span style={{ flex: 1 }} />
        <Button onClick={exportCsv} disabled={results.length === 0}>
          ⬇️ CSV (zestawienie)
        </Button>
      </div>

      {totals.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Podsumowanie — należne diety</div>
          {totals.map((t) => (
            <div key={t.currency} style={{ ...f.listRow, ...styles.totalRow }}>
              <span style={{ flex: 1 }}>
                {t.count} {t.count === 1 ? "podróż" : "podróże/-y"} · {t.days} dób
              </span>
              <span style={{ fontWeight: 800, color: palette.red, fontSize: 16 }}>
                {t.amount} {t.currency}
              </span>
            </div>
          ))}
        </div>
      )}

      <p style={{ ...f.meta, marginTop: 16, maxWidth: 720 }}>
        Reguły czasu: <strong>krajowa</strong> — do doby: &lt;8h = 0, 8–12h = ½, &gt;12h = 1;
        powyżej doby: każda pełna doba = 1, niepełna ≤8h = ½, &gt;8h = 1.{" "}
        <strong>Zagraniczna</strong> — ≤8h = ⅓, 8–12h = ½, &gt;12h = 1; każda pełna doba = 1.
      </p>
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
  totalRow: {
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    marginBottom: 6,
  },
};
