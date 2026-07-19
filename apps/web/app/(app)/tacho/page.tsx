"use client";

/**
 * #327: Tacho 2.0 — centrum wiedzy tachografowej:
 * • Rozporządzenie (WE) 561/2006 (pełny skonsolidowany PDF — public/tacho/),
 * • Licznik 561 (jak licznik VDO) na silniku `aetrStatus` z core,
 * • Poradnik „co pokazuje tachograf" — realne zdjęcia VDO (jazda i postój),
 * • Wpis manualny krok po kroku (własne opracowanie).
 * Uzupełnia automat czasu pracy (/work-time, #277).
 */
import { insertWorkTimeEntry } from "@e-logistic/api";
import {
  aetrStatus,
  type DddParseResult,
  formatTachoMin,
  type InfringementKind,
  type InfringementSeverity,
  inspectAetr,
  parseDddDriverCard,
  planWeeklyRest,
  round2,
} from "@e-logistic/core";
import type { MessageKey } from "@e-logistic/i18n";
import { cssPalette as palette } from "@e-logistic/ui";
import { useState } from "react";
import { useT } from "@/components/LocaleProvider";
import { Button, PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { TachoDownloadsSection } from "./TachoDownloadsSection";

const PDF = "/tacho/rozporzadzenie-561-2006.pdf";

// Wirtualny inspektor 561 — etykiety naruszeń i skala wagi (2006/22/WE zał. III).
const INFRINGEMENT_LABEL: Record<InfringementKind, MessageKey> = {
  "continuous-driving": "tacho.infr.continuousDriving",
  "daily-driving": "tacho.infr.dailyDriving",
  "weekly-driving": "tacho.infr.weeklyDriving",
  "two-week-driving": "tacho.infr.twoWeekDriving",
};
const SEVERITY_LABEL: Record<InfringementSeverity, MessageKey> = {
  minor: "tacho.severity.minor",
  serious: "tacho.severity.serious",
  very_serious: "tacho.severity.verySerious",
};
const SEVERITY_COLOR: Record<InfringementSeverity, string> = {
  minor: "#f59e0b",
  serious: "#f97316",
  very_serious: "#ef4444",
};

const DRIVING_SHOTS: { file: string; caption: MessageKey }[] = [
  { file: "jazda-ekran-glowny.jpg", caption: "tacho.shot.drivingMain" },
  { file: "jazda-do-przerwy.jpg", caption: "tacho.shot.drivingToBreak" },
  { file: "jazda-cykl-4h30.jpg", caption: "tacho.shot.drivingCycle4h30" },
];
const STOP_SHOTS: { file: string; caption: MessageKey }[] = [
  { file: "postoj-ekran-glowny.jpg", caption: "tacho.shot.stopMain" },
  { file: "postoj-czas-utc.jpg", caption: "tacho.shot.stopUtc" },
  { file: "postoj-kredyty-9h-10h.jpg", caption: "tacho.shot.stopCredits" },
  { file: "postoj-limity-tygodnia.jpg", caption: "tacho.shot.stopWeekLimits" },
  { file: "postoj-limity-doby.jpg", caption: "tacho.shot.stopDayLimits" },
  { file: "postoj-do-odpoczynku.jpg", caption: "tacho.shot.stopToRest" },
];

const MANUAL_STEPS: MessageKey[] = [
  "tacho.manual.step1",
  "tacho.manual.step2",
  "tacho.manual.step3",
  "tacho.manual.step4",
  "tacho.manual.step5",
  "tacho.manual.step6",
  "tacho.manual.step7",
];

const VIOLATION_LABEL: Record<string, MessageKey> = {
  "continuous-driving-over-4h30": "tacho.violation.continuousOver4h30",
  "daily-driving-over-10h": "tacho.violation.dailyOver10h",
};

/** #331: planer odpoczynku tygodniowego (144 h, warianty 45/24 h). */
function WeeklyRestPlanner() {
  const t = useT();
  const [end, setEnd] = useState("");
  const [type, setType] = useState<"regular" | "reduced">("regular");
  const endMs = Date.parse(end);
  const plan = Number.isFinite(endMs)
    ? planWeeklyRest({ lastWeeklyRestEndMs: endMs, lastType: type }, Date.now())
    : null;
  const fmt = (ms: number) =>
    new Date(ms).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" });
  return (
    <>
      <h3 style={st.h3}>🛏 {t("tacho.weeklyRest.heading")}</h3>
      <p style={{ color: palette.smoke, fontSize: 13.5, maxWidth: 760, lineHeight: 1.55 }}>
        {t("tacho.weeklyRest.intro")}
      </p>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          style={st.input}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "regular" | "reduced")}
          style={st.input}
        >
          <option value="regular">{t("tacho.weeklyRest.prevRegular")}</option>
          <option value="reduced">{t("tacho.weeklyRest.prevReduced")}</option>
        </select>
      </div>
      {plan && (
        <div style={{ display: "grid", gap: 6, marginTop: 12, fontSize: 14 }}>
          <div
            style={{
              color: plan.hoursUntilLatestStart < 0 ? "#ef4444" : "#22c55e",
              fontWeight: 700,
            }}
          >
            ⏳ {t("tacho.weeklyRest.latestStart")}: {fmt(plan.latestStartMs)}
            {plan.hoursUntilLatestStart >= 0
              ? ` (${plan.hoursUntilLatestStart.toFixed(0)} ${t("tacho.weeklyRest.remainingSuffix")})`
              : ` — ${t("tacho.weeklyRest.deadlinePassed")}`}
          </div>
          {plan.mustBeRegular && (
            <div style={{ color: "#f59e0b", fontWeight: 700 }}>
              ⚠️ {t("tacho.weeklyRest.mustBeRegular")}
            </div>
          )}
          <div>
            🛏 {t("tacho.weeklyRest.variant45")}: {fmt(plan.regularEndMs)}
          </div>
          {plan.reducedEndMs != null && plan.compensationDeadlineMs != null && (
            <div>
              💤 {t("tacho.weeklyRest.variant24")}: {fmt(plan.reducedEndMs)} (
              {t("tacho.weeklyRest.compensationUntil")} {fmt(plan.compensationDeadlineMs)})
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** #328: import odczytu karty kierowcy (.ddd) — parser w przeglądarce. */
function DddImportSection() {
  const t = useT();
  const [result, setResult] = useState<DddParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [driver, setDriver] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const violationLabel = (v: string): string => {
    const key = VIOLATION_LABEL[v];
    return key ? t(key) : v;
  };

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = parseDddDriverCard(bytes);
    setResult(parsed);
    setFileName(file.name);
    if (parsed.holderName) setDriver(parsed.holderName);
    if (parsed.days.length === 0) setMsg(t("tacho.ddd.noActivity"));
  }

  async function importDays() {
    if (!result || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) throw new Error(t("tacho.ddd.noCompany"));
      let n = 0;
      for (const d of result.days) {
        if (d.totals.driving === 0 && d.totals.work === 0) continue;
        await insertWorkTimeEntry(
          sb,
          {
            driverName: driver.trim() || result.holderName || null,
            workDate: d.date,
            driving: round2(d.totals.driving / 60),
            otherWork: round2(d.totals.work / 60),
            rest: round2(d.totals.rest / 60),
            note: `import .ddd (${d.distanceKm} km)`,
          },
          m.companyId,
        );
        n++;
      }
      setMsg(`✅ ${t("tacho.ddd.appendedPrefix")} ${n} ${t("tacho.ddd.appendedSuffix")}`);
    } catch (e) {
      setMsg(`⚠️ ${e instanceof Error ? e.message : t("tacho.ddd.importFailed")}`);
    } finally {
      setBusy(false);
    }
  }

  const violationsTotal = result?.days.reduce((a, d) => a + d.violations.length, 0) ?? 0;

  return (
    <>
      <h3 style={st.h3}>📥 {t("tacho.ddd.heading")}</h3>
      <p style={{ color: palette.smoke, fontSize: 13.5, maxWidth: 760, lineHeight: 1.55 }}>
        {t("tacho.ddd.intro")}
      </p>
      <input
        type="file"
        accept=".ddd,.esm,.tgd,.c1b"
        onChange={onFile}
        style={{ margin: "6px 0 12px", color: palette.smoke, fontSize: 13 }}
      />
      {result && (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 13.5 }}>
            <strong>{fileName}</strong>
            {result.holderName ? ` · ${result.holderName}` : ""}
            {result.generation ? ` · Gen${result.generation}` : ""} · {result.days.length}{" "}
            {t("tacho.daysSuffix")} ·{" "}
            <span style={{ color: violationsTotal ? "#ef4444" : "#22c55e", fontWeight: 700 }}>
              {violationsTotal
                ? `${violationsTotal} ${t("tacho.ddd.infringementsSuffix")}`
                : t("tacho.noInfringements")}
            </span>
          </div>
          {result.days.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
                <thead>
                  <tr>
                    {(
                      [
                        "common.date",
                        "tacho.col.driving",
                        "tacho.col.otherWork",
                        "tacho.col.availability",
                        "tacho.col.rest",
                        "tacho.col.km",
                        "tacho.col.infringements",
                      ] as const
                    ).map((h) => (
                      <th key={h} style={st.th}>
                        {t(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.days.map((d) => (
                    <tr key={d.date}>
                      <td style={st.td}>{d.date}</td>
                      <td style={st.td}>{formatTachoMin(d.totals.driving)}</td>
                      <td style={st.td}>{formatTachoMin(d.totals.work)}</td>
                      <td style={st.td}>{formatTachoMin(d.totals.availability)}</td>
                      <td style={st.td}>{formatTachoMin(d.totals.rest)}</td>
                      <td style={st.td}>{d.distanceKm}</td>
                      <td style={{ ...st.td, color: d.violations.length ? "#ef4444" : "#22c55e" }}>
                        {d.violations.length
                          ? d.violations.map((v) => violationLabel(v)).join(", ")
                          : "OK"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {result.days.length > 0 && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                placeholder={t("tacho.ddd.driverPlaceholder")}
                style={st.input}
              />
              <Button onClick={importDays} disabled={busy}>
                {busy ? t("tacho.ddd.importing") : `➕ ${t("tacho.ddd.appendDays")}`}
              </Button>
            </div>
          )}
        </div>
      )}
      {msg && <p style={{ fontSize: 13.5 }}>{msg}</p>}
    </>
  );
}

function Num({
  label,
  value,
  onChange,
  step,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  max: number;
}) {
  return (
    <label style={st.numRow}>
      <span style={{ flex: 1 }}>{label}</span>
      <button type="button" style={st.numBtn} onClick={() => onChange(Math.max(0, value - step))}>
        −
      </button>
      <span style={st.numValue}>{step >= 15 ? formatTachoMin(value) : value}</span>
      <button type="button" style={st.numBtn} onClick={() => onChange(Math.min(max, value + step))}>
        +
      </button>
    </label>
  );
}

export default function TachoPage() {
  const t = useT();
  const [continuous, setContinuous] = useState(0);
  const [breakTaken, setBreakTaken] = useState(0);
  const [daily, setDaily] = useState(0);
  const [weekly, setWeekly] = useState(0);
  const [prevWeek, setPrevWeek] = useState(0);
  const [extUsed, setExtUsed] = useState(0);
  const [redUsed, setRedUsed] = useState(0);

  const s = aetrStatus({
    continuousDrivingMin: continuous,
    breakTakenMin: breakTaken,
    dailyDrivingMin: daily,
    weeklyDrivingMin: weekly,
    prevWeekDrivingMin: prevWeek,
    extendedDrivesUsed: extUsed,
    reducedRestsUsed: redUsed,
  });
  const insp = inspectAetr({
    continuousDrivingMin: continuous,
    breakTakenMin: breakTaken,
    dailyDrivingMin: daily,
    weeklyDrivingMin: weekly,
    prevWeekDrivingMin: prevWeek,
    extendedDrivesUsed: extUsed,
    reducedRestsUsed: redUsed,
  });
  const colorFor = (min: number) => (min <= 0 ? "#ef4444" : min <= 30 ? "#f59e0b" : "#22c55e");
  const infrLabel = (k: InfringementKind) => t(INFRINGEMENT_LABEL[k]);
  const severityLabel = (sev: InfringementSeverity) => t(SEVERITY_LABEL[sev]);

  const results = [
    {
      label: t("tacho.calc.toBreak"),
      value: formatTachoMin(s.toBreakMin),
      color: colorFor(s.toBreakMin),
    },
    { label: t("tacho.calc.requiredBreak"), value: `${s.requiredBreakMin} min`, color: undefined },
    {
      label: t("tacho.calc.todayLeft"),
      value: formatTachoMin(s.dailyRemainingMin),
      color: colorFor(s.dailyRemainingMin),
    },
    {
      label: t("tacho.calc.withExtension"),
      value:
        s.dailyRemainingExtendedMin != null ? formatTachoMin(s.dailyRemainingExtendedMin) : "—",
      color: undefined,
    },
    {
      label: t("tacho.calc.week"),
      value: formatTachoMin(s.weeklyRemainingMin),
      color: colorFor(s.weeklyRemainingMin),
    },
    {
      label: t("tacho.calc.twoWeeks"),
      value: formatTachoMin(s.twoWeekRemainingMin),
      color: undefined,
    },
    { label: t("tacho.calc.drives10h"), value: `${s.extendedLeft} × 10h`, color: undefined },
    { label: t("tacho.calc.rests9h"), value: `${s.reducedRestsLeft} × 9h`, color: undefined },
  ];

  const gallery = (shots: { file: string; caption: MessageKey }[]) => (
    <div style={st.grid}>
      {shots.map(({ file, caption }) => (
        <figure key={file} style={st.fig}>
          {/* biome-ignore lint/performance/noImgElement: statyczne zdjęcia poradnika z public/ */}
          <img src={`/tacho/${file}`} alt={t(caption)} style={st.img} loading="lazy" />
          <figcaption style={st.cap}>{t(caption)}</figcaption>
        </figure>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 980 }}>
      <PageHeader title={t("tacho.title")} subtitle={t("tacho.subtitle")} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
        <Button onClick={() => window.open(PDF, "_blank", "noopener")}>
          📜 {t("tacho.openPdf")}
        </Button>
        <Button variant="ghost" onClick={() => window.location.assign("/work-time")}>
          📋 {t("tacho.workTimeLink")}
        </Button>
        <span style={{ color: palette.smoke, fontSize: 13, alignSelf: "center" }}>
          {t("tacho.pdfHint")}
        </span>
      </div>

      <DddImportSection />

      <h3 style={st.h3}>🧮 {t("tacho.calc.heading")}</h3>
      <div style={st.calc}>
        <div style={{ display: "grid", gap: 6 }}>
          <Num
            label={t("tacho.calc.inputContinuous")}
            value={continuous}
            onChange={setContinuous}
            step={15}
            max={360}
          />
          <Num
            label={t("tacho.calc.inputBreakTaken")}
            value={breakTaken}
            onChange={setBreakTaken}
            step={15}
            max={45}
          />
          <Num
            label={t("tacho.calc.inputDaily")}
            value={daily}
            onChange={setDaily}
            step={30}
            max={660}
          />
          <Num
            label={t("tacho.calc.inputWeekly")}
            value={weekly}
            onChange={setWeekly}
            step={60}
            max={3600}
          />
          <Num
            label={t("tacho.calc.inputPrevWeek")}
            value={prevWeek}
            onChange={setPrevWeek}
            step={60}
            max={3600}
          />
          <Num
            label={t("tacho.calc.inputExtUsed")}
            value={extUsed}
            onChange={setExtUsed}
            step={1}
            max={2}
          />
          <Num
            label={t("tacho.calc.inputRedUsed")}
            value={redUsed}
            onChange={setRedUsed}
            step={1}
            max={3}
          />
        </div>
        <div style={st.resultGrid}>
          {results.map((r) => (
            <div key={r.label} style={st.resultCard}>
              <div style={{ fontSize: 22, fontWeight: 800, color: r.color ?? "inherit" }}>
                {r.value}
              </div>
              <div style={{ color: palette.smoke, fontSize: 12 }}>{r.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          marginTop: 12,
          border: `1px solid ${insp.clean ? "#22c55e55" : `${SEVERITY_COLOR[insp.worst ?? "very_serious"]}88`}`,
          borderRadius: 10,
          padding: 12,
          background: "rgba(127,127,127,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <strong style={{ fontSize: 14 }}>🚔 {t("tacho.inspection.heading")}</strong>
          {insp.clean ? (
            <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 13 }}>
              ✅ {t("tacho.noInfringements")}
            </span>
          ) : (
            <span
              style={{
                color: SEVERITY_COLOR[insp.worst ?? "very_serious"],
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {insp.infringements.length}{" "}
              {insp.infringements.length === 1
                ? t("tacho.inspection.infringementSingular")
                : t("tacho.inspection.infringementPlural")}
            </span>
          )}
        </div>
        {!insp.clean && (
          <ul
            style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "grid", gap: 6 }}
          >
            {insp.infringements.map((i) => (
              <li
                key={i.kind}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    background: SEVERITY_COLOR[i.severity],
                    color: "#0a0a0a",
                    fontWeight: 700,
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 999,
                    textTransform: "uppercase",
                  }}
                >
                  {severityLabel(i.severity)}
                </span>
                <span style={{ flex: 1, minWidth: 160 }}>{infrLabel(i.kind)}</span>
                <span style={{ color: palette.smoke }}>
                  +{formatTachoMin(i.byMin)} ({t("tacho.inspection.limitLabel")}{" "}
                  {formatTachoMin(i.limitMin)})
                </span>
              </li>
            ))}
          </ul>
        )}
        <p style={{ color: palette.smoke, fontSize: 11, margin: "10px 0 0" }}>
          {t("tacho.inspection.disclaimer")}
        </p>
      </div>
      <p style={{ color: palette.smoke, fontSize: 13 }}>{t("tacho.calc.disclaimer")}</p>

      <WeeklyRestPlanner />

      <TachoDownloadsSection />

      <h3 style={st.h3}>🚛 {t("tacho.galleryDriving")}</h3>
      {gallery(DRIVING_SHOTS)}
      <h3 style={st.h3}>🅿️ {t("tacho.galleryStop")}</h3>
      {gallery(STOP_SHOTS)}

      <h3 style={st.h3}>✍️ {t("tacho.manual.heading")}</h3>
      <ol style={st.steps}>
        {MANUAL_STEPS.map((step) => (
          <li key={step} style={{ marginBottom: 8, lineHeight: 1.55 }}>
            {t(step)}
          </li>
        ))}
      </ol>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  h3: { fontSize: 17, fontWeight: 800, margin: "28px 0 12px" },
  calc: { display: "grid", gridTemplateColumns: "minmax(280px, 420px) 1fr", gap: 18 },
  numRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 },
  numBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: `1px solid ${palette.graphite}`,
    background: "transparent",
    color: palette.red,
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
  },
  numValue: { minWidth: 54, textAlign: "center", fontWeight: 800, fontSize: 14 },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 10,
  },
  resultCard: {
    border: `1px solid ${palette.graphite}`,
    borderRadius: 12,
    padding: "12px 10px",
    textAlign: "center",
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 },
  fig: {
    margin: 0,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 12,
    overflow: "hidden",
  },
  img: { width: "100%", display: "block" },
  cap: { padding: "10px 12px", fontSize: 13, color: palette.smoke, lineHeight: 1.5 },
  steps: { paddingLeft: 22, fontSize: 14, maxWidth: 760 },
  th: {
    textAlign: "left",
    padding: "6px 10px",
    borderBottom: `1px solid ${palette.graphite}`,
    color: palette.smoke,
    fontWeight: 600,
  },
  td: { padding: "6px 10px", borderBottom: `1px solid ${palette.graphite}` },
  input: {
    background: "transparent",
    border: `1px solid ${palette.graphite}`,
    borderRadius: 10,
    padding: "9px 12px",
    color: "inherit",
    fontSize: 13.5,
    minWidth: 220,
  },
};
