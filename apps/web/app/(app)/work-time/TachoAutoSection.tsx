"use client";

import {
  type ChecklistSubmission,
  type DriverRow,
  insertWorkTimeEntry,
  listChecklistSubmissions,
} from "@e-logistic/api";
import {
  computeTachoDays,
  formatMinutes,
  round2,
  type TachoEntry,
  type TachoSummary,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useMemo, useState } from "react";
import * as f from "@/components/formStyles";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * #277: automatyczny czas pracy z checklisty „Tachograf" — wpisy kierowcy
 * (Rozpoczęcie/Zakończenie dnia + godzina) → dni pracy, odpoczynki dobowe
 * i tygodniowe (normalny/skrócony) + alerty naruszeń. Jednym klikiem dopisuje
 * brakujące dni do ewidencji czasu pracy.
 */

const REST_LABEL: Record<string, string> = {
  "daily-regular": "dobowy normalny",
  "daily-reduced": "dobowy SKRÓCONY",
  "weekly-regular": "tygodniowy normalny",
  "weekly-reduced": "tygodniowy SKRÓCONY",
};

function toTachoEntries(subs: ChecklistSubmission[]): TachoEntry[] {
  return subs.flatMap((s) => {
    const mode = s.answers.mode;
    if (!mode || !Array.isArray(mode.value) || !mode.time) return [];
    return [{ date: s.created_at.slice(0, 10), time: mode.time, modes: mode.value }];
  });
}

export function TachoAutoSection({
  companyId,
  roster,
  savedKeys,
  onImported,
}: {
  companyId: string;
  /** #271: kartoteka firmy — dopasowanie driver_id po nazwie (spójnie z ręcznym formularzem). */
  roster: DriverRow[];
  /** Zbiór `${driver_name}|${work_date}` istniejących wpisów (dedup importu). */
  savedKeys: Set<string>;
  onImported: () => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState<ChecklistSubmission[]>([]);
  const [driver, setDriver] = useState("");
  const [busy, setBusy] = useState(false);

  const loadSubs = useCallback(async () => {
    setBusy(true);
    try {
      const list = await listChecklistSubmissions(getBrowserSupabase(), companyId, {
        templateName: "Tachograf",
        limit: 500,
      });
      setSubs(list);
      if (list.length === 0) {
        toast("Brak zgłoszeń checklisty Tachograf — kierowcy wypełniają ją w aplikacji.", "info");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nie udało się pobrać checklist.", "error");
    } finally {
      setBusy(false);
    }
  }, [companyId, toast]);

  const drivers = useMemo(
    () => [...new Set(subs.map((s) => s.driver_label).filter(Boolean))].sort(),
    [subs],
  );

  const summary: TachoSummary | null = useMemo(() => {
    if (!driver) return null;
    const entries = toTachoEntries(subs.filter((s) => s.driver_label === driver));
    return entries.length > 0 ? computeTachoDays(entries) : null;
  }, [subs, driver]);

  const missing = useMemo(
    () =>
      (summary?.days ?? []).filter(
        (d) => d.workMinutes != null && !savedKeys.has(`${driver}|${d.date}`),
      ),
    [summary, savedKeys, driver],
  );

  async function importMissing() {
    if (!driver || missing.length === 0) return;
    setBusy(true);
    try {
      // #271 · B4: ustaw driver_id, żeby auto-import nie zostawiał wpisów z driver_id=null.
      // 1) preferuj FK z samego zgłoszenia (trigger checklisty wiąże je z kartoteką),
      // 2) fallback: dopasowanie po nazwie do kartoteki (spójnie z ręcznym formularzem).
      const driverId =
        subs.find((s) => s.driver_label === driver && s.driver_id)?.driver_id ??
        roster.find(
          (d) =>
            `${d.first_name} ${d.last_name}`.trim().toLowerCase() === driver.trim().toLowerCase(),
        )?.id ??
        null;
      for (const d of missing) {
        await insertWorkTimeEntry(
          getBrowserSupabase(),
          {
            driverName: driver,
            driverId,
            workDate: d.date,
            driving: round2((d.workMinutes ?? 0) / 60),
            otherWork: 0,
            rest: d.restBeforeMinutes != null ? round2(d.restBeforeMinutes / 60) : 0,
            note: `auto z checklisty Tachograf (${d.startTime}–${d.endTime})`,
          },
          companyId,
        );
      }
      toast(`Dopisano ${missing.length} dni do ewidencji.`, "success");
      onImported();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd zapisu.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <strong>⏱️ Auto z checklisty Tachograf</strong>
        <Button
          onClick={() => {
            setOpen((v) => !v);
            if (!open && subs.length === 0) void loadSubs();
          }}
        >
          {open ? "Zwiń" : "Wylicz z checklist"}
        </Button>
        {open && drivers.length > 0 && (
          <select
            style={{ ...f.input, maxWidth: 260 }}
            value={driver}
            onChange={(e) => setDriver(e.target.value)}
          >
            <option value="">— wybierz kierowcę —</option>
            {drivers.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
      </div>

      {open && summary && (
        <>
          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table style={styles.tbl}>
              <thead>
                <tr>
                  <th style={styles.th}>Data</th>
                  <th style={styles.th}>Start</th>
                  <th style={styles.th}>Koniec</th>
                  <th style={styles.th}>Służba</th>
                  <th style={styles.th}>Odpoczynek przed</th>
                  <th style={styles.th}>Uwagi</th>
                </tr>
              </thead>
              <tbody>
                {summary.days.map((d) => (
                  <tr key={d.date + (d.startTime ?? "")}>
                    <td style={styles.td}>{d.date}</td>
                    <td style={styles.td}>{d.startTime ?? "—"}</td>
                    <td style={styles.td}>{d.endTime ?? "—"}</td>
                    <td style={styles.td}>
                      {d.workMinutes != null ? formatMinutes(d.workMinutes) : "—"}
                    </td>
                    <td style={styles.td}>
                      {d.restBeforeMinutes != null ? formatMinutes(d.restBeforeMinutes) : "—"}
                      {d.restType ? ` (${REST_LABEL[d.restType]})` : ""}
                    </td>
                    <td
                      style={{ ...styles.td, color: d.alerts.length ? palette.red : palette.smoke }}
                    >
                      {d.alerts.join(" · ") || "✓"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginTop: 10,
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: palette.smoke, fontSize: 13 }}>
              Razem służby: <strong>{formatMinutes(summary.totalWorkMinutes)}</strong>
              {summary.alerts.length > 0 && (
                <span style={{ color: palette.red }}> · alertów: {summary.alerts.length}</span>
              )}
            </span>
            <Button onClick={importMissing} disabled={busy || missing.length === 0}>
              {busy
                ? "Zapisuję…"
                : missing.length > 0
                  ? `➕ Dopisz ${missing.length} brakujących dni do ewidencji`
                  : "Wszystkie dni już w ewidencji ✓"}
            </Button>
          </div>
        </>
      )}
      {open && driver && !summary && (
        <p style={{ color: palette.smoke, fontSize: 13, marginTop: 8 }}>
          Brak kompletnych wpisów Tachografu (tryb + godzina) dla tego kierowcy.
        </p>
      )}
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
  tbl: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left",
    color: palette.smoke,
    padding: "6px 10px",
    borderBottom: `1px solid ${palette.graphite}`,
  },
  td: {
    padding: "6px 10px",
    borderBottom: `1px solid ${palette.graphite}`,
    color: palette.offWhite,
  },
};
