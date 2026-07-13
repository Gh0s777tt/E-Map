"use client";

/**
 * #327: Tacho 2.0 — centrum wiedzy tachografowej:
 * • Rozporządzenie (WE) 561/2006 (pełny skonsolidowany PDF — public/tacho/),
 * • Licznik 561 (jak licznik VDO) na silniku `aetrStatus` z core,
 * • Poradnik „co pokazuje tachograf" — realne zdjęcia VDO (jazda i postój),
 * • Wpis manualny krok po kroku (własne opracowanie).
 * Uzupełnia automat czasu pracy (/work-time, #277).
 */
import { aetrStatus, formatTachoMin } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useState } from "react";
import { Button, PageHeader } from "@/components/ui";

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
        <span style={{ color: palette.smoke, fontSize: 13, alignSelf: "center" }}>
          Pełny skonsolidowany tekst — także do pokazania na kontroli.
        </span>
      </div>

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
};
