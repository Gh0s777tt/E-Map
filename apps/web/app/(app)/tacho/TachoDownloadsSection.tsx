"use client";

/**
 * Faza 2 tacho #3: terminy sczytań tachografu — karta kierowcy ≤ 28 dni,
 * jednostka pojazdowa ≤ 90 dni (581/2010). Owner/dyspozytor wpisuje datę
 * ostatniego pobrania, silnik `checkDownload` z core liczy status.
 */
import {
  type DriverRow,
  deleteTachoDownload,
  listDrivers,
  listTachoDownloads,
  type TachoDownloadRow,
  upsertTachoDownload,
} from "@e-logistic/api";
import { checkDownload, DOWNLOAD_LIMITS, type DownloadStatus } from "@e-logistic/core";
import type { MessageKey } from "@e-logistic/i18n";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as f from "@/components/formStyles";
import { useT } from "@/components/LocaleProvider";
import { Button } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

const STATUS_COLOR: Record<DownloadStatus, string> = {
  ok: "#22c55e",
  soon: "#f59e0b",
  overdue: "#ef4444",
};
const STATUS_LABEL: Record<DownloadStatus, MessageKey> = {
  ok: "tacho.downloadStatus.ok",
  soon: "tacho.downloadStatus.soon",
  overdue: "tacho.downloadStatus.overdue",
};

const st: Record<string, React.CSSProperties> = {
  h3: { fontSize: 18, fontWeight: 800, marginTop: 28 },
  box: {
    border: `1px solid ${palette.graphite}`,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    background: "rgba(127,127,127,0.05)",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 0",
    borderBottom: `1px solid ${palette.graphite}`,
    flexWrap: "wrap",
  },
  badge: {
    color: "#0a0a0a",
    fontWeight: 700,
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 999,
    textTransform: "uppercase",
  },
};

export function TachoDownloadsSection() {
  const t = useT();
  const { vehicles } = useFleet();
  const statusLabel = (s: DownloadStatus) => t(STATUS_LABEL[s]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [rows, setRows] = useState<TachoDownloadRow[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [ready, setReady] = useState(false);
  // false dopóki migracja 0081 nie nałożona (tabela nie odpowiada) → sekcja ukryta zamiast błędu.
  const [available, setAvailable] = useState(false);
  const [kind, setKind] = useState<"card" | "vu">("card");
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) return;
      const manage = m.role === "owner" || m.role === "dispatcher";
      setCanManage(manage);
      setCompanyId(m.companyId);
      if (manage) {
        listDrivers(sb, m.companyId)
          .then(setDrivers)
          .catch(() => {});
        try {
          setRows(await listTachoDownloads(sb, m.companyId));
          setAvailable(true);
        } catch {
          setAvailable(false); // tabela jeszcze nie nałożona (migracja 0081)
        }
      }
    } catch {
      // offline — sekcja po prostu się nie pokaże
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const dName = (id: string | null) => {
      const d = drivers.find((x) => x.id === id);
      return d ? `${d.first_name} ${d.last_name}`.trim() || "—" : "—";
    };
    const vReg = (id: string | null) => vehicles.find((v) => v.id === id)?.registration ?? "—";
    return rows
      .map((r) => ({
        row: r,
        check: checkDownload(r.kind, r.last_download, today),
        label: r.kind === "card" ? dName(r.driver_id) : vReg(r.vehicle_id),
      }))
      .sort((a, b) => a.check.daysLeft - b.check.daysLeft);
  }, [rows, drivers, vehicles]);

  const overdue = items.filter((i) => i.check.status === "overdue").length;
  const soon = items.filter((i) => i.check.status === "soon").length;

  async function save() {
    if (!companyId || !subjectId) return;
    setBusy(true);
    setErr(null);
    try {
      await upsertTachoDownload(getBrowserSupabase(), {
        companyId,
        kind,
        lastDownload: date,
        driverId: kind === "card" ? subjectId : null,
        vehicleId: kind === "vu" ? subjectId : null,
      });
      setSubjectId("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("tacho.dl.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteTachoDownload(getBrowserSupabase(), id);
      await load();
    } catch {
      // brak dostępu / offline
    }
  }

  if (!ready || !canManage || !available) return null;

  return (
    <>
      <h3 style={st.h3}>🗓️ {t("tacho.dl.heading")}</h3>
      <p style={{ color: palette.smoke, fontSize: 13.5, maxWidth: 760, lineHeight: 1.55 }}>
        {t("tacho.dl.introCardPrefix")} {DOWNLOAD_LIMITS.cardDays} {t("tacho.dl.introVuMid")}{" "}
        {DOWNLOAD_LIMITS.vuDays} {t("tacho.dl.introSuffix")}
        {(overdue > 0 || soon > 0) && (
          <span style={{ fontWeight: 700, color: overdue ? palette.red : "#f59e0b" }}>
            {" "}
            {overdue > 0 && `${overdue} ${t("tacho.downloadStatus.overdue")}`}
            {overdue > 0 && soon > 0 && " · "}
            {soon > 0 && `${soon} ${t("tacho.downloadStatus.soon")}`}.
          </span>
        )}
      </p>

      <div style={st.box}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ ...f.field, minWidth: 150 }}>
            <span style={f.label}>{t("tacho.dl.kind")}</span>
            <select
              style={f.input}
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as "card" | "vu");
                setSubjectId("");
              }}
            >
              <option value="card">{t("tacho.dl.optCard")}</option>
              <option value="vu">{t("tacho.dl.optVu")}</option>
            </select>
          </label>
          <label style={{ ...f.field, minWidth: 180 }}>
            <span style={f.label}>
              {kind === "card" ? t("tacho.dl.driver") : t("common.vehicle")}
            </span>
            <select
              style={f.input}
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">{t("tacho.dl.select")}</option>
              {kind === "card"
                ? drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {`${d.first_name} ${d.last_name}`.trim() || d.id.slice(0, 8)}
                    </option>
                  ))
                : vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration}
                    </option>
                  ))}
            </select>
          </label>
          <label style={{ ...f.field, minWidth: 150 }}>
            <span style={f.label}>{t("tacho.dl.downloadDate")}</span>
            <input
              type="date"
              style={f.input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <Button onClick={save} disabled={busy || !subjectId}>
            {busy ? t("common.saving") : t("common.save")}
          </Button>
        </div>
        {err && <p style={{ color: palette.red, fontSize: 13, marginTop: 8 }}>{err}</p>}

        {items.length > 0 ? (
          <div style={{ marginTop: 12 }}>
            {items.map(({ row, check, label }) => (
              <div key={row.id} style={st.row}>
                <span style={{ ...st.badge, background: STATUS_COLOR[check.status] }}>
                  {statusLabel(check.status)}
                </span>
                <span style={{ fontWeight: 700, minWidth: 120 }}>{label}</span>
                <span style={{ color: palette.smoke, fontSize: 13 }}>
                  {row.kind === "card" ? t("tacho.dl.card") : t("tacho.dl.tacho")}
                </span>
                <span style={{ flex: 1, color: palette.smoke, fontSize: 13 }}>
                  {t("tacho.dl.last")} {check.lastISO} · {t("tacho.dl.due")} {check.dueISO} (
                  {check.daysLeft < 0
                    ? `${-check.daysLeft} ${t("tacho.dl.daysOver")}`
                    : `${t("tacho.dl.inPrefix")} ${check.daysLeft} ${t("tacho.daysSuffix")}`}
                  )
                </span>
                <button
                  type="button"
                  onClick={() => remove(row.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
                  aria-label={t("common.delete")}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: palette.smoke, fontSize: 13, marginTop: 12 }}>{t("tacho.dl.empty")}</p>
        )}
        <p style={{ color: palette.smoke, fontSize: 11, marginTop: 10 }}>
          {t("tacho.dl.disclaimer")}
        </p>
      </div>
    </>
  );
}
