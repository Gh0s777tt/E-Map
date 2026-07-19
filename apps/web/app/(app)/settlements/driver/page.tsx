"use client";

import {
  type DriverRow,
  getSettlementSettings,
  insertDriverPayout,
  listDrivers,
  listWorkTimeEntries,
  saveSettlementSettings,
} from "@e-logistic/api";
import {
  computeDriverSettlement,
  DEFAULT_SETTLEMENT_SETTINGS,
  type SettlementSettings,
  type SettlementWeek,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as f from "@/components/formStyles";
import { useT } from "@/components/LocaleProvider";
import { useToast } from "@/components/Toast";
import { Button, PageHeader, PrintButton } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * #265: Rozliczenie miesięczne kierowcy wg formularza właściciela.
 * Normy i stawki są PER FIRMA (edytuje owner) — silnik: core/driverSettlement.
 * Dni i km wciągane z danych (czas pracy + trip_events), każdy wiersz edytowalny.
 */

const zl = (n: number) =>
  `${n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;

/** Poniedziałek tygodnia ISO danej daty (yyyy-mm-dd) — klucz grupowania. */
function isoWeekStart(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // pn=0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function DriverSettlementPage() {
  const t = useT();
  const toast = useToast();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [driverId, setDriverId] = useState("");
  const [from, setFrom] = useState(daysAgoIso(28));
  const [to, setTo] = useState(daysAgoIso(0));
  const [settings, setSettings] = useState<SettlementSettings>(DEFAULT_SETTLEMENT_SETTINGS);
  const [days, setDays] = useState(0);
  const [weeks, setWeeks] = useState<SettlementWeek[]>([]);
  const [normBonus, setNormBonus] = useState("0");
  const [docOverride, setDocOverride] = useState<string>("");
  const [hotels, setHotels] = useState("0");
  const [deductions, setDeductions] = useState("0");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const driver = drivers.find((d) => d.id === driverId) ?? null;
  const driverName = driver ? `${driver.first_name} ${driver.last_name}`.trim() : "";

  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const m = await getCachedMembership(sb);
        if (!m) return;
        setCompanyId(m.companyId);
        setCanManage(m.role === "owner" || m.role === "dispatcher");
        setIsOwner(m.role === "owner");
        setSettings(await getSettlementSettings(sb, m.companyId));
        setDrivers(await listDrivers(sb, m.companyId));
      } catch {
        // brak dostępu — komunikat niżej
      }
    })();
  }, []);

  /** Wciąga dni pracy i km per tydzień ISO z danych okresu. */
  const loadData = useCallback(async () => {
    if (!companyId || !driver) return;
    setBusy(true);
    try {
      const sb = getBrowserSupabase();
      const work = (await listWorkTimeEntries(sb, companyId, { driverName })).filter(
        (w) => w.work_date >= from && w.work_date <= to,
      );
      const workDates = new Set(work.map((w) => w.work_date));

      const { data: trips, error } = await sb
        .from("trip_events")
        .select("created_at, odometer_km")
        .eq("driver_id", driver.id)
        .gte("created_at", `${from}T00:00:00Z`)
        .lte("created_at", `${to}T23:59:59Z`)
        .order("created_at");
      if (error) throw error;

      const byWeek = new Map<string, { min: number; max: number; dates: Set<string> }>();
      for (const tr of trips ?? []) {
        const day = tr.created_at.slice(0, 10);
        const wk = isoWeekStart(day);
        const cur = byWeek.get(wk) ?? {
          min: tr.odometer_km,
          max: tr.odometer_km,
          dates: new Set<string>(),
        };
        cur.min = Math.min(cur.min, tr.odometer_km);
        cur.max = Math.max(cur.max, tr.odometer_km);
        cur.dates.add(day);
        byWeek.set(wk, cur);
      }
      const wk: SettlementWeek[] = [...byWeek.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([start, v]) => ({
          days: [...workDates].filter((d) => isoWeekStart(d) === start).length || v.dates.size,
          km: Math.max(0, v.max - v.min),
        }));

      setDays(workDates.size || wk.reduce((a, w) => a + w.days, 0));
      setWeeks(wk.length > 0 ? wk : [{ days: 0, km: 0 }]);
      setDocOverride("");
      setLoaded(true);
      if (workDates.size === 0 && (trips ?? []).length === 0) {
        toast(t("settlementsDriver.noDataInfo"), "info");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : t("settlementsDriver.loadError"), "error");
    } finally {
      setBusy(false);
    }
  }, [companyId, driver, driverName, from, to, toast, t]);

  const result = useMemo(
    () =>
      computeDriverSettlement({
        days,
        weeks,
        settings,
        normBonus: Number(normBonus) || 0,
        docBonusOverride: docOverride.trim() === "" ? null : Number(docOverride) || 0,
        hotels: Number(hotels) || 0,
        deductions: Number(deductions) || 0,
      }),
    [days, weeks, settings, normBonus, docOverride, hotels, deductions],
  );

  async function saveSettings() {
    if (!companyId) return;
    try {
      await saveSettlementSettings(getBrowserSupabase(), companyId, settings);
      toast(t("settlementsDriver.ratesSaved"), "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : t("settlementsDriver.ratesSaveError"), "error");
    }
  }

  async function saveAsPayout() {
    if (!companyId || !driverName) return;
    setBusy(true);
    try {
      await insertDriverPayout(
        getBrowserSupabase(),
        {
          driverName,
          kind: "due",
          amount: result.balance,
          currency: "PLN",
          entryDate: to,
          note: `${t("settlementsDriver.settlement")} ${from} → ${to} (${t("settlementsDriver.days")}: ${days}, km: ${result.kmTotal})`,
        },
        companyId,
      );
      toast(t("settlementsDriver.payoutAdded"), "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : t("settlementsDriver.payoutSaveError"), "error");
    } finally {
      setBusy(false);
    }
  }

  const setW = (i: number, patch: Partial<SettlementWeek>) =>
    setWeeks((ws) => ws.map((w, j) => (j === i ? { ...w, ...patch } : w)));

  if (!canManage) {
    return (
      <div>
        <PageHeader title={t("settlementsDriver.title")} />
        <p style={{ color: palette.smoke }}>{t("settlementsDriver.noAccess")}</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t("settlementsDriver.title")} subtitle={t("settlementsDriver.subtitle")} />

      <div style={styles.controls} className="no-print">
        <label style={styles.field}>
          <span style={styles.lbl}>{t("settlementsDriver.driver")}</span>
          <select style={f.input} value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">{t("settlementsDriver.selectPlaceholder")}</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.first_name} {d.last_name}
              </option>
            ))}
          </select>
        </label>
        <label style={styles.field}>
          <span style={styles.lbl}>{t("settlementsDriver.from")}</span>
          <input
            style={f.input}
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label style={styles.field}>
          <span style={styles.lbl}>{t("settlementsDriver.to")}</span>
          <input style={f.input} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <Button onClick={loadData} disabled={!driver || busy}>
          {busy ? t("settlementsDriver.fetching") : t("settlementsDriver.fetchDaysKm")}
        </Button>
      </div>

      <details style={styles.card} className="no-print">
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          {t("settlementsDriver.companyRates")}{" "}
          {isOwner ? t("settlementsDriver.editingAsOwner") : t("settlementsDriver.preview")}
        </summary>
        <div style={styles.grid6}>
          {(
            [
              [t("settlementsDriver.dailyRate"), "dailyRate"],
              [t("settlementsDriver.kmNorm"), "kmNormPerDay"],
              [t("settlementsDriver.kmRate"), "kmRate"],
              [t("settlementsDriver.insurance"), "insurancePerDay"],
              [t("settlementsDriver.phone"), "phoneMonthly"],
              [t("settlementsDriver.docBonus"), "docBonusMonthly"],
            ] as const
          ).map(([label, key]) => (
            <label key={key} style={styles.field}>
              <span style={styles.lbl}>{label}</span>
              <input
                style={f.input}
                type="number"
                step="0.01"
                value={settings[key]}
                disabled={!isOwner}
                onChange={(e) => setSettings((s) => ({ ...s, [key]: Number(e.target.value) || 0 }))}
              />
            </label>
          ))}
        </div>
        {isOwner && (
          <div style={{ marginTop: 10 }}>
            <Button onClick={saveSettings}>{t("settlementsDriver.saveCompanyRates")}</Button>
          </div>
        )}
      </details>

      {loaded && driver && (
        <>
          <div style={styles.card} className="no-print">
            <strong>{t("settlementsDriver.corrections")}</strong>
            <div style={styles.grid6}>
              <label style={styles.field}>
                <span style={styles.lbl}>{t("settlementsDriver.daysTotal")}</span>
                <input
                  style={f.input}
                  type="number"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value) || 0)}
                />
              </label>
              <label style={styles.field}>
                <span style={styles.lbl}>{t("settlementsDriver.normBonus")}</span>
                <input
                  style={f.input}
                  type="number"
                  step="0.01"
                  value={normBonus}
                  onChange={(e) => setNormBonus(e.target.value)}
                />
              </label>
              <label style={styles.field}>
                <span style={styles.lbl}>{t("settlementsDriver.docBonusAdjust")}</span>
                <input
                  style={f.input}
                  placeholder={`${t("settlementsDriver.autoPrefix")} ${zl(result.docBonus)}`}
                  value={docOverride}
                  onChange={(e) => setDocOverride(e.target.value)}
                />
              </label>
              <label style={styles.field}>
                <span style={styles.lbl}>{t("settlementsDriver.hotels")}</span>
                <input
                  style={f.input}
                  type="number"
                  step="0.01"
                  value={hotels}
                  onChange={(e) => setHotels(e.target.value)}
                />
              </label>
              <label style={styles.field}>
                <span style={styles.lbl}>{t("settlementsDriver.deductions")}</span>
                <input
                  style={f.input}
                  type="number"
                  step="0.01"
                  value={deductions}
                  onChange={(e) => setDeductions(e.target.value)}
                />
              </label>
            </div>
            {weeks.map((w, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: tygodnie są czysto pozycyjne (Tydzień 1..N)
              <div key={`w-${i * 1}`} style={styles.weekRow}>
                <span style={{ width: 90, color: palette.smoke }}>
                  {t("settlementsDriver.week")} {i + 1}
                </span>
                <input
                  style={{ ...f.input, width: 90 }}
                  type="number"
                  value={w.days}
                  onChange={(e) => setW(i, { days: Number(e.target.value) || 0 })}
                />
                <input
                  style={{ ...f.input, width: 120 }}
                  type="number"
                  value={w.km}
                  onChange={(e) => setW(i, { km: Number(e.target.value) || 0 })}
                />
                <span style={{ color: palette.smoke }}>→ {zl(result.weekBonuses[i] ?? 0)}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <Button onClick={() => setWeeks((ws) => [...ws, { days: 0, km: 0 }])}>
                {t("settlementsDriver.addWeek")}
              </Button>
              <Button
                onClick={() => setWeeks((ws) => ws.slice(0, -1))}
                disabled={weeks.length <= 1}
              >
                {t("settlementsDriver.removeWeek")}
              </Button>
            </div>
          </div>

          {/* ── Formularz do wydruku — układ 1:1 z arkuszem właściciela ── */}
          <style>{`#print-area td{border:1px solid #333;padding:4px 8px}
@media print{.no-print{display:none!important}body{background:#fff!important}}`}</style>
          <div style={styles.sheet} id="print-area">
            <table style={styles.tbl}>
              <tbody>
                <tr style={styles.rowB}>
                  <td>
                    {t("settlementsDriver.settlement")} {driverName}
                  </td>
                  <td style={styles.num}>{from}</td>
                  <td style={styles.num}>{t("settlementsDriver.rangeTo")}</td>
                  <td style={styles.num} colSpan={2}>
                    {to}
                  </td>
                </tr>
                <tr>
                  <td>{t("settlementsDriver.kmTotalRow")}</td>
                  <td style={styles.num} colSpan={3}>
                    {result.kmTotal}
                  </td>
                  <td style={styles.num} />
                </tr>
                <tr style={{ background: "#f2d7e0", color: "#111" }}>
                  <td>{t("settlementsDriver.days")}</td>
                  <td style={styles.num}>{days}</td>
                  <td style={styles.num}>{t("settlementsDriver.rate")}</td>
                  <td style={styles.num}>{zl(settings.dailyRate)}</td>
                  <td style={styles.num}>{zl(result.base)}</td>
                </tr>
                <tr style={{ background: "#d5a6bd", color: "#111", fontWeight: 700 }}>
                  <td colSpan={4} style={styles.num}>
                    {t("settlementsDriver.baseAmount")}
                  </td>
                  <td style={styles.num}>{zl(result.base)}</td>
                </tr>
                <tr style={styles.blueL}>
                  <td colSpan={4} style={{ fontSize: 11 }}>
                    {t("settlementsDriver.docBonusDesc")} ({zl(settings.docBonusMonthly)}{" "}
                    {t("settlementsDriver.per30days")})
                  </td>
                  <td style={styles.num}>{zl(result.docBonus)}</td>
                </tr>
                <tr style={styles.blueL}>
                  <td colSpan={4}>
                    <strong>{t("settlementsDriver.normBonusRow")}</strong>
                  </td>
                  <td style={styles.num}>{zl(result.normBonus)}</td>
                </tr>
                {weeks.map((w, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: wiersze pozycyjne (Tydzień 1..N)
                  <tr key={`p-${i * 1}`} style={styles.blue}>
                    <td>
                      <strong>
                        {t("settlementsDriver.week")} {i + 1}
                      </strong>{" "}
                      | {t("settlementsDriver.days")} | km | {t("settlementsDriver.rate")}
                    </td>
                    <td style={styles.num}>{w.days}</td>
                    <td style={styles.num}>{w.km}</td>
                    <td style={styles.num}>{settings.kmRate.toFixed(2)}</td>
                    <td style={styles.num}>{zl(result.weekBonuses[i] ?? 0)}</td>
                  </tr>
                ))}
                <tr style={styles.blue}>
                  <td>
                    <strong>{t("settlementsDriver.insuranceSupplement")}</strong>
                  </td>
                  <td style={styles.num} colSpan={2}>
                    {t("settlementsDriver.ratePerDay")}
                  </td>
                  <td style={styles.num}>{settings.insurancePerDay}</td>
                  <td style={styles.num}>{zl(result.insurance)}</td>
                </tr>
                <tr style={{ ...styles.blue, fontWeight: 700 }}>
                  <td colSpan={4} style={styles.num}>
                    {t("settlementsDriver.bonusTotal")}
                  </td>
                  <td style={styles.num}>{zl(result.bonusTotal)}</td>
                </tr>
                <tr>
                  <td colSpan={4} style={styles.num}>
                    {t("settlementsDriver.phoneRow")} ({zl(settings.phoneMonthly)}{" "}
                    {t("settlementsDriver.per30days")})
                  </td>
                  <td style={styles.num}>{zl(result.phone)}</td>
                </tr>
                <tr>
                  <td colSpan={4} style={styles.num}>
                    {t("settlementsDriver.hotelsRow")}
                  </td>
                  <td style={styles.num}>{result.hotels ? zl(result.hotels) : ""}</td>
                </tr>
                <tr style={{ background: "#ffe599", color: "#111", fontWeight: 700 }}>
                  <td colSpan={4} style={styles.num}>
                    {t("common.total")}
                  </td>
                  <td style={styles.num}>{zl(result.total)}</td>
                </tr>
                <tr>
                  <td colSpan={4} style={styles.num}>
                    {t("settlementsDriver.deductionsRow")}
                  </td>
                  <td style={styles.num}>{result.deductions ? `−${zl(result.deductions)}` : ""}</td>
                </tr>
                <tr style={{ background: "#b6d7a8", color: "#111", fontWeight: 700 }}>
                  <td colSpan={4} style={styles.num}>
                    {t("settlementsDriver.balance")}
                  </td>
                  <td style={styles.num}>{zl(result.balance)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }} className="no-print">
            <PrintButton />
            <Button onClick={saveAsPayout} disabled={busy}>
              {t("settlementsDriver.saveAsDue")} ({zl(result.balance)})
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  controls: {
    display: "flex",
    gap: 12,
    alignItems: "flex-end",
    flexWrap: "wrap",
    marginBottom: 14,
  },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  lbl: { fontSize: 12, color: palette.smoke },
  card: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 12,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
  grid6: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
    gap: 10,
    marginTop: 10,
  },
  weekRow: { display: "flex", gap: 10, alignItems: "center", marginTop: 8 },
  sheet: { background: "#ffffff", color: "#111", padding: 24, borderRadius: 8, maxWidth: 720 },
  tbl: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  num: { textAlign: "right" },
  rowB: { fontWeight: 700 },
  blue: { background: "#bdd7ee", color: "#111" },
  blueL: { background: "#deebf7", color: "#111" },
};
