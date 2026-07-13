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
  parseDddDriverCard,
  planWeeklyRest,
  round2,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useState } from "react";
import { Button, PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

const PDF = "/tacho/rozporzadzenie-561-2006.pdf";

const DRIVING_SHOTS = [
  {
    file: "jazda-ekran-glowny.jpg",
    caption:
      "Ekran główny w trasie: aktualna godzina, prędkość, czynność rejestrowana (jazda) i przebieg pojazdu.",
  },
  {
    file: "jazda-do-przerwy.jpg",
    caption:
      "Licznik w trasie: u góry czas jazdy pozostały do następnej wymaganej przerwy, u dołu minimalna wymagana przerwa (45 min albo 30, jeśli wcześniej była 15).",
  },
  {
    file: "jazda-cykl-4h30.jpg",
    caption:
      "Cykl 4 h 30: po lewej wykorzystany czas jazdy (kierowca 1 i 2), po prawej odpoczynek wykonany w bieżącym cyklu.",
  },
];
const STOP_SHOTS = [
  {
    file: "postoj-ekran-glowny.jpg",
    caption:
      "Ekran główny na postoju: godzina, prędkość 0 km/h, aktualna czynność (odpoczynek) i przebieg pojazdu.",
  },
  {
    file: "postoj-czas-utc.jpg",
    caption:
      "Czas UTC — tachograf rejestruje wszystko w UTC: w Polsce latem −2 h, zimą −1 h względem czasu lokalnego.",
  },
  {
    file: "postoj-kredyty-9h-10h.jpg",
    caption:
      "Kredyty tygodnia: pozostałe skrócone odpoczynki dobowe 9 h (max 3) i wydłużone czasy jazdy do 10 h (max 2).",
  },
  {
    file: "postoj-limity-tygodnia.jpg",
    caption:
      "Limity tygodnia: pozostały czas jazdy w tygodniu (56 h; w dwóch tygodniach 90 h), czas do rozpoczęcia odpoczynku tygodniowego (max 144 h) i czas do jego wykonania.",
  },
  {
    file: "postoj-limity-doby.jpg",
    caption:
      "Limity doby: pozostały czas jazdy i pracy w bieżącej dobie oraz czas do wykonania minimalnego odpoczynku dobowego (11 h regularny / 9 h skrócony).",
  },
  {
    file: "postoj-do-odpoczynku.jpg",
    caption:
      "Odpoczynek: pozostały czas do wykonania minimalnego wymaganego odpoczynku i czas jazdy dostępny po jego zakończeniu.",
  },
];

const MANUAL_STEPS = [
  "Zatrzymaj pojazd i włącz zapłon. Włóż kartę chipem do góry — tachograf przywita Cię i pokaże datę ostatniego wyjęcia karty.",
  "Na pytanie o wpis manualny wybierz strzałkami TAK i zatwierdź OK. (NIE = okres bez karty pozostanie nieudokumentowany.)",
  "Górny wiersz to moment wyjęcia karty, dolny edytujesz Ty. Strzałkami wybierz rodzaj czynności: młotki = inna praca, łóżko = odpoczynek, ukośnik = dyspozycja, ? = okres nieznany.",
  "Ustaw kolejno dzień, miesiąc, rok, godzinę i minutę końca danej czynności — OK po każdym polu. Możesz dodać wiele okresów, aż do chwili obecnej.",
  "Dojazd do pojazdu poza bazą i powrót zapisuj jako dyspozycję, odpoczynek w domu jako łóżko.",
  "Na końcu zatwierdź akceptację (TAK). Uwaga: po zatwierdzeniu wpisu nie można go już poprawić.",
  "Ustaw kraj rozpoczęcia pracy (MENU → wpisz kierowca 1 → kraj rozpocz.). Nie ruszaj, dopóki symbol karty nie zapisze się w całości — ruszenie przerywa wpis.",
];

const VIOLATION_LABEL: Record<string, string> = {
  "continuous-driving-over-4h30": "jazda ciągła > 4 h 30",
  "daily-driving-over-10h": "jazda dobowa > 10 h",
};

/** #331: planer odpoczynku tygodniowego (144 h, warianty 45/24 h). */
function WeeklyRestPlanner() {
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
      <h3 style={st.h3}>🛏 Planer odpoczynku tygodniowego</h3>
      <p style={{ color: palette.smoke, fontSize: 13.5, maxWidth: 760, lineHeight: 1.55 }}>
        Podaj koniec ostatniego odpoczynku tygodniowego — policzymy najpóźniejszy start następnego
        (144 h) i warianty 45 h / 24 h z rekompensatą.
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
          <option value="regular">poprzedni: 45 h (regularny)</option>
          <option value="reduced">poprzedni: 24 h (skrócony)</option>
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
            ⏳ Najpóźniejszy start: {fmt(plan.latestStartMs)}
            {plan.hoursUntilLatestStart >= 0
              ? ` (pozostało ${plan.hoursUntilLatestStart.toFixed(0)} h)`
              : " — TERMIN MINĄŁ, odpoczynek powinien już trwać!"}
          </div>
          {plan.mustBeRegular && (
            <div style={{ color: "#f59e0b", fontWeight: 700 }}>
              ⚠️ Poprzedni był skrócony — ten musi być regularny (45 h).
            </div>
          )}
          <div>🛏 Wariant 45 h — koniec: {fmt(plan.regularEndMs)}</div>
          {plan.reducedEndMs != null && plan.compensationDeadlineMs != null && (
            <div>
              💤 Wariant 24 h — koniec: {fmt(plan.reducedEndMs)} (rekompensata 21 h do{" "}
              {fmt(plan.compensationDeadlineMs)})
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** #328: import odczytu karty kierowcy (.ddd) — parser w przeglądarce. */
function DddImportSection() {
  const [result, setResult] = useState<DddParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [driver, setDriver] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = parseDddDriverCard(bytes);
    setResult(parsed);
    setFileName(file.name);
    if (parsed.holderName) setDriver(parsed.holderName);
    if (parsed.days.length === 0)
      setMsg(
        "Nie znaleziono rejestrów aktywności — czy to odczyt KARTY kierowcy (nie tachografu)?",
      );
  }

  async function importDays() {
    if (!result || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) throw new Error("Brak aktywnej firmy.");
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
      setMsg(`✅ Dopisano ${n} dni do ewidencji czasu pracy.`);
    } catch (e) {
      setMsg(`⚠️ ${e instanceof Error ? e.message : "Import nieudany."}`);
    } finally {
      setBusy(false);
    }
  }

  const violationsTotal = result?.days.reduce((a, d) => a + d.violations.length, 0) ?? 0;

  return (
    <>
      <h3 style={st.h3}>📥 Odczyt karty kierowcy (.ddd)</h3>
      <p style={{ color: palette.smoke, fontSize: 13.5, maxWidth: 760, lineHeight: 1.55 }}>
        Wgraj plik pobrania karty kierowcy (np. z czytnika lub programu do sczytywania) — dni,
        minuty jazdy/pracy/odpoczynku i naruszenia 561 policzą się same, bez ręcznego wpisywania.
        Plik jest analizowany w przeglądarce i nigdzie nie jest wysyłany.
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
            {result.generation ? ` · Gen${result.generation}` : ""} · {result.days.length} dni ·{" "}
            <span style={{ color: violationsTotal ? "#ef4444" : "#22c55e", fontWeight: 700 }}>
              {violationsTotal ? `${violationsTotal} naruszeń` : "bez naruszeń"}
            </span>
          </div>
          {result.days.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
                <thead>
                  <tr>
                    {[
                      "Data",
                      "Jazda",
                      "Inna praca",
                      "Dyspozycja",
                      "Odpoczynek",
                      "km",
                      "Naruszenia",
                    ].map((h) => (
                      <th key={h} style={st.th}>
                        {h}
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
                          ? d.violations.map((v) => VIOLATION_LABEL[v] ?? v).join(", ")
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
                placeholder="Kierowca (do ewidencji)"
                style={st.input}
              />
              <Button onClick={importDays} disabled={busy}>
                {busy ? "Import…" : "➕ Dopisz dni do ewidencji czasu pracy"}
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
  const colorFor = (min: number) => (min <= 0 ? "#ef4444" : min <= 30 ? "#f59e0b" : "#22c55e");

  const results = [
    { label: "Do przerwy", value: formatTachoMin(s.toBreakMin), color: colorFor(s.toBreakMin) },
    { label: "Wymagana przerwa", value: `${s.requiredBreakMin} min`, color: undefined },
    {
      label: "Dziś zostało (9 h)",
      value: formatTachoMin(s.dailyRemainingMin),
      color: colorFor(s.dailyRemainingMin),
    },
    {
      label: "Z wydłużeniem (10 h)",
      value:
        s.dailyRemainingExtendedMin != null ? formatTachoMin(s.dailyRemainingExtendedMin) : "—",
      color: undefined,
    },
    {
      label: "Tydzień (56 h)",
      value: formatTachoMin(s.weeklyRemainingMin),
      color: colorFor(s.weeklyRemainingMin),
    },
    {
      label: "Dwa tygodnie (90 h)",
      value: formatTachoMin(s.twoWeekRemainingMin),
      color: undefined,
    },
    { label: "Jazdy 10 h", value: `${s.extendedLeft} × 10h`, color: undefined },
    { label: "Odpoczynki 9 h", value: `${s.reducedRestsLeft} × 9h`, color: undefined },
  ];

  const gallery = (shots: { file: string; caption: string }[]) => (
    <div style={st.grid}>
      {shots.map(({ file, caption }) => (
        <figure key={file} style={st.fig}>
          {/* biome-ignore lint/performance/noImgElement: statyczne zdjęcia poradnika z public/ */}
          <img src={`/tacho/${file}`} alt={caption} style={st.img} loading="lazy" />
          <figcaption style={st.cap}>{caption}</figcaption>
        </figure>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 980 }}>
      <PageHeader
        title="Tacho — poradnik i przepisy"
        subtitle="Licznik 561, realne ekrany tachografu VDO z objaśnieniami, wpis manualny krok po kroku i pełny tekst rozporządzenia 561/2006."
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
        <Button onClick={() => window.open(PDF, "_blank", "noopener")}>
          📜 Rozporządzenie 561/2006 (PDF)
        </Button>
        <Button variant="ghost" onClick={() => window.location.assign("/work-time")}>
          📋 Ewidencja czasu pracy
        </Button>
        <span style={{ color: palette.smoke, fontSize: 13, alignSelf: "center" }}>
          Pełny skonsolidowany tekst — także do pokazania na kontroli.
        </span>
      </div>

      <DddImportSection />

      <h3 style={st.h3}>🧮 Licznik 561</h3>
      <div style={st.calc}>
        <div style={{ display: "grid", gap: 6 }}>
          <Num
            label="Jazda ciągła od przerwy"
            value={continuous}
            onChange={setContinuous}
            step={15}
            max={360}
          />
          <Num
            label="Wykorzystana część przerwy (min)"
            value={breakTaken}
            onChange={setBreakTaken}
            step={15}
            max={45}
          />
          <Num label="Jazda w tej dobie" value={daily} onChange={setDaily} step={30} max={660} />
          <Num
            label="Jazda w tym tygodniu"
            value={weekly}
            onChange={setWeekly}
            step={60}
            max={3600}
          />
          <Num
            label="Jazda w zeszłym tygodniu"
            value={prevWeek}
            onChange={setPrevWeek}
            step={60}
            max={3600}
          />
          <Num
            label="Wykorzystane jazdy 10 h"
            value={extUsed}
            onChange={setExtUsed}
            step={1}
            max={2}
          />
          <Num
            label="Wykorzystane odpoczynki 9 h"
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
      {s.alerts.length > 0 && (
        <p style={{ color: "#ef4444", fontWeight: 700 }}>
          ⚠️ Przekroczony limit — wymagana przerwa/odpoczynek!
        </p>
      )}
      <p style={{ color: palette.smoke, fontSize: 13 }}>
        Pomoc orientacyjna na wzór licznika VDO — wiążący jest zapis tachografu i karty kierowcy.
      </p>

      <WeeklyRestPlanner />

      <h3 style={st.h3}>🚛 Co pokazuje tachograf — podczas jazdy</h3>
      {gallery(DRIVING_SHOTS)}
      <h3 style={st.h3}>🅿️ Co pokazuje tachograf — podczas postoju</h3>
      {gallery(STOP_SHOTS)}

      <h3 style={st.h3}>✍️ Wpis manualny — krok po kroku</h3>
      <ol style={st.steps}>
        {MANUAL_STEPS.map((step) => (
          <li key={step.slice(0, 24)} style={{ marginBottom: 8, lineHeight: 1.55 }}>
            {step}
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
