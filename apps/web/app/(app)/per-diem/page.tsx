"use client";

import {
  deletePerDiemTrip,
  insertPerDiemTrip,
  listPerDiemTrips,
  type PerDiemTrip,
} from "@e-logistic/api";
import { computePerDiem, type DietMode, type DietTrip, sumPerDiem } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
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

const MODE_LABEL: Record<DietMode, string> = { domestic: "krajowa", foreign: "zagraniczna" };

/** PerDiemTrip (DB) → DietTrip (rdzeń) do policzenia należnej diety. */
function toTrip(t: PerDiemTrip): DietTrip {
  return {
    destination: t.destination ?? "",
    mode: t.mode,
    hours: t.hours,
    dailyRate: t.daily_rate,
    currency: t.currency,
  };
}

export default function PerDiemPage() {
  const confirm = useConfirm();
  const [driver, setDriver] = useState("");
  const [tripDate, setTripDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [saved, setSaved] = useState<PerDiemTrip[]>([]);
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
      if (manage) setSaved(await listPerDiemTrips(sb, m.companyId));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nie udało się pobrać diet.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const draftResults = useMemo(
    () => rows.filter((r) => r.hours > 0 && r.dailyRate > 0).map((r) => computePerDiem(r)),
    [rows],
  );
  const savedResults = useMemo(() => saved.map((s) => computePerDiem(toTrip(s))), [saved]);
  const savedTotals = useMemo(() => sumPerDiem(savedResults), [savedResults]);

  function patch(id: string, p: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  }

  async function saveDrafts() {
    if (!companyId) return;
    const valid = rows.filter((r) => r.hours > 0 && r.dailyRate > 0);
    if (valid.length === 0) {
      setErr("Uzupełnij czas i stawkę co najmniej jednej podróży.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const sb = getBrowserSupabase();
      for (const r of valid) {
        await insertPerDiemTrip(
          sb,
          {
            driverName: driver,
            destination: r.destination,
            mode: r.mode,
            hours: r.hours,
            dailyRate: r.dailyRate,
            currency: r.currency,
            tripDate,
          },
          companyId,
        );
      }
      setRows([emptyRow()]);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Błąd zapisu diet.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSaved(t: PerDiemTrip) {
    if (!(await confirm("Usunąć zapisaną podróż?"))) return;
    try {
      await deletePerDiemTrip(getBrowserSupabase(), t.id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Błąd usuwania.");
    }
  }

  function exportCsv() {
    const headers = [
      "Kierowca",
      "Data",
      "Cel",
      "Typ",
      "Czas (h)",
      "Doby",
      "Stawka",
      "Kwota",
      "Waluta",
    ];
    const body: (string | number)[][] = saved.map((s) => {
      const r = computePerDiem(toTrip(s));
      return [
        s.driver_name ?? "",
        s.trip_date ?? "",
        s.destination ?? "—",
        MODE_LABEL[s.mode],
        s.hours,
        r.days,
        s.daily_rate,
        r.amount,
        s.currency,
      ];
    });
    body.push([]);
    body.push(["Podsumowanie wg waluty", "", "", "", "", "", "", "", ""]);
    for (const t of savedTotals) body.push(["", "", "", "", "", t.days, "", t.amount, t.currency]);
    downloadCsv(`diety_${csvDateStamp()}.csv`, headers, body);
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 1000 }}>
        <PageHeader
          title="Diety kierowcy"
          subtitle="Kalkulator i ewidencja diet z podróży służbowych."
        />
        <ListStatus loading error={null} />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div style={{ maxWidth: 1000 }}>
        <PageHeader
          title="Diety kierowcy"
          subtitle="Kalkulator i ewidencja diet z podróży służbowych."
        />
        <p style={{ color: palette.smoke }}>Dostęp tylko dla właściciela / spedytora.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <PageHeader
        title="Diety kierowcy"
        subtitle="Kalkulator i ewidencja diet (per diem) — krajowych i zagranicznych. Stawki dobowe ustalasz sam (urzędowe zmienia ustawodawca)."
      />

      <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ ...f.field, maxWidth: 320 }}>
          <span style={f.label}>Kierowca (do zestawienia)</span>
          <input
            style={f.input}
            value={driver}
            onChange={(e) => setDriver(e.target.value)}
            placeholder="Imię i nazwisko"
          />
        </div>
        <div style={{ ...f.field, maxWidth: 180 }}>
          <span style={f.label}>Data podróży</span>
          <input
            style={f.input}
            type="date"
            value={tripDate}
            onChange={(e) => setTripDate(e.target.value)}
          />
        </div>
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

      {err && <p style={{ color: palette.red, fontSize: 13, marginTop: 8 }}>{err}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
        <Button variant="ghost" onClick={() => setRows((rs) => [...rs, emptyRow()])}>
          ➕ Dodaj podróż
        </Button>
        <span style={{ flex: 1 }} />
        <Button onClick={saveDrafts} disabled={busy || draftResults.length === 0}>
          {busy ? "Zapisuję…" : "💾 Zapisz do ewidencji"}
        </Button>
      </div>

      <div style={{ display: "flex", alignItems: "center", marginTop: 28, marginBottom: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Ewidencja diet</h2>
        <span style={{ color: palette.smoke, fontSize: 13, marginLeft: 8 }}>
          {saved.length > 0 ? `${saved.length} podróży` : "brak zapisanych"}
        </span>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" onClick={exportCsv} disabled={saved.length === 0}>
          ⬇️ CSV
        </Button>
      </div>

      {saved.length > 0 ? (
        <div style={f.card}>
          {saved.map((s) => {
            const r = computePerDiem(toTrip(s));
            return (
              <div key={s.id} style={f.listRow}>
                <span style={{ flex: 1, minWidth: 120 }}>
                  <strong>{s.destination || "—"}</strong>
                  <span style={{ color: palette.smoke, fontSize: 12 }}>
                    {" "}
                    · {MODE_LABEL[s.mode]}
                    {s.driver_name ? ` · ${s.driver_name}` : ""}
                    {s.trip_date ? ` · ${s.trip_date}` : ""}
                  </span>
                </span>
                <span style={{ ...f.cell, width: 90 }}>{s.hours} h</span>
                <span style={{ ...f.cell, width: 70 }}>{r.days} dób</span>
                <span style={{ width: 130, fontWeight: 700, color: palette.red }}>
                  {r.amount} {s.currency}
                </span>
                <button
                  type="button"
                  onClick={() => removeSaved(s)}
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
          Brak zapisanych diet — dodaj podróże powyżej i zapisz do ewidencji.
        </p>
      )}

      {savedTotals.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Podsumowanie — należne diety</div>
          {savedTotals.map((t) => (
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
