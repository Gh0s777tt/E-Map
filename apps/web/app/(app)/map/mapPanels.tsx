import type { SavedPlace } from "@e-logistic/api";
import {
  estimateRouteFuel,
  formatDuration,
  SAVED_PLACE_CATEGORIES,
  type SavedPlaceCategory,
} from "@e-logistic/core";
import type { MessageKey } from "@e-logistic/i18n";
import type { FuelStationPrice, GeoHit, RouteNotice, VehicleProfile } from "@e-logistic/maps";
import { cssPalette } from "@e-logistic/ui";
import { useT } from "@/components/LocaleProvider";
import { DISRUPTION_RADIUS_KM, REPORT_COLOR, REPORT_LABEL, SAVED_CAT_ICON } from "./mapTheme";
import type { Report, RouteResponse, Stop } from "./mapTypes";
import { Row, styles } from "./mapUi";

/**
 * Prezentacyjne fragmenty panelu mapy wydzielone z `page.tsx` (dekompozycja) —
 * czyste, bezstanowe, przyjmują tylko dane + callbacki. Stan i logika zostają w stronie.
 * Style panelu przez CSS Module (`styles.*` = nazwy klas), dynamiczne/one-off inline.
 */

/* ── [#385] Profil pojazdu: braki i opis ─────────────────────────────────────
 *
 * Te funkcje są czyste i potrzebuje ich zarówno panel wyniku (niżej), jak i sam
 * formularz na stronie. Mieszkają TUTAJ, a nie w `page.tsx`, bo import ze strony
 * do jej własnego dziecka zamknąłby cykl modułów.
 *
 * Wzorzec komunikatu (kolejność pól, „?" zamiast wartości typowej) jest jeden do
 * jednego z `apps/mobile/lib/vehicleProfile.ts`: kierowca w kabinie i spedytor przy
 * biurku mają czytać dokładnie to samo zdanie o tej samej trasie.
 */

/** Gabaryt, którego brakuje w profilu — klucz komunikatu (tekst siedzi w i18n). */
export type MissingDimension = "height" | "width" | "length" | "weight";

/** Klucze i18n nazw brakujących gabarytów — tłumaczone w miejscu renderu. */
export const MISSING_DIM_LABEL: Record<MissingDimension, MessageKey> = {
  height: "mapPage.dimHeight",
  width: "mapPage.dimWidth",
  length: "mapPage.dimLength",
  weight: "mapPage.dimWeight",
};

/**
 * [#385] Czego NIE MA w profilu, który poleci do `/api/route`.
 *
 * Liczymy z profilu EFEKTYWNEGO (kartoteka + ręczne nadpisania), bo to on decyduje
 * o trasie: wysokość wpisana ręcznie jest wysokością, choćby kolumna w kartotece
 * była pusta — i odwrotnie, pusta kolumna bez nadpisania to realny brak parametru.
 */
export function missingDimensions(profile: VehicleProfile): MissingDimension[] {
  const out: MissingDimension[] = [];
  if (profile.heightCm == null) out.push("height");
  if (profile.widthCm == null) out.push("width");
  if (profile.lengthCm == null) out.push("length");
  if (profile.weightKg == null) out.push("weight");
  return out;
}

function meters(cm: number | undefined): string {
  return cm == null ? "?" : (cm / 100).toFixed(2).replace(".", ",");
}

/**
 * [#385] „4,00 × 2,55 × 16,50 m · 40,0 t" — brak pokazujemy jako `?`, NIGDY jako
 * wartość typową. Spedytor ma jednym rzutem oka widzieć, czego routing nie
 * uwzględnił: trasa bez wysokości nie może wyglądać tak samo jak trasa z wysokością.
 */
export function formatProfileDims(profile: VehicleProfile): string {
  const size = `${meters(profile.heightCm)} × ${meters(profile.widthCm)} × ${meters(profile.lengthCm)} m`;
  const mass =
    profile.weightKg == null
      ? "? t"
      : `${(profile.weightKg / 1000).toFixed(1).replace(".", ",")} t`;
  return `${size} · ${mass}`;
}

/** [#385] Czym policzono pokazaną trasę — komplet danych przekazany do `RouteSummary`. */
export interface PlannedProfile {
  /** Rejestracja wybranego pojazdu; `null` = wymiary wpisane ręcznie, bez kartoteki. */
  registration: string | null;
  profile: VehicleProfile;
  /** Braki w profilu wysłanym do dostawcy (pusto przy trasie osobowej — patrz `heavy`). */
  missing: MissingDimension[];
  /** Czy w ogóle proszono o routing ciężarowy (odznaczony checkbox = trasa osobowa). */
  heavy: boolean;
}

/** Ramka komunikatu w panelu — czerwona dla rzeczy krytycznych, żółta dla ostrzeżeń. */
function noticeBox(color: string): React.CSSProperties {
  return {
    fontSize: 12,
    lineHeight: 1.4,
    color: cssPalette.offWhite,
    background: cssPalette.black,
    border: `1px solid ${color}`,
    borderRadius: 8,
    padding: "8px 10px",
  };
}

/**
 * [#385] Uwagi dostawcy do policzonej trasy (`RouteResult.notices`).
 *
 * To jedyny kanał, którym dostawca mówi „zignorowałem twój parametr pojazdu" albo
 * „policzyłem trasę profilem osobowym". Dotąd pole jechało w odpowiedzi i nikt go
 * nie renderował, więc trasa z pominiętym gabarytem wyglądała identycznie jak trasa
 * z uwzględnionym — a różnica jest taka, że jedna z nich prowadzi pod wiadukt.
 *
 * `severity: "critical"` (np. `profileDowngradedToCar` z GraphHoppera) dostaje
 * czerwień marki i inny znak, żeby nie zlało się z resztą ostrzeżeń panelu.
 */
export function RouteNotices({ notices }: { notices: RouteNotice[] }) {
  const t = useT();
  if (notices.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
      {notices.map((n) => {
        const critical = (n.severity ?? "").toLowerCase() === "critical";
        const color = critical ? cssPalette.red : "#eab308";
        return (
          <div key={n.code} style={noticeBox(color)}>
            <strong style={{ color }}>
              {critical ? "⛔" : "⚠️"} {t("mapPage.providerNotice")}
              {critical ? ` · ${t("mapPage.providerNoticeCritical")}` : ""}
            </strong>
            {/* Treść od dostawcy bywa pusta — wtedy zostaje sam kod, bo to i tak
                więcej niż milczenie (da się go wyszukać w dokumentacji API). */}
            <div style={{ marginTop: 2 }}>{n.title ?? n.code}</div>
            {n.title ? (
              <div style={{ color: cssPalette.smoke, fontSize: 11, marginTop: 2 }}>{n.code}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * [#385] Pasek „czym policzono tę trasę". Trasa bez gabarytów NIE MOŻE wyglądać
 * tak samo jak trasa z gabarytami, więc wynik zawsze niesie profil, którym poszedł
 * do dostawcy — z brakami wypisanymi wprost.
 */
export function PlanProfileBar({ plan }: { plan: PlannedProfile }) {
  const t = useT();
  if (!plan.heavy) {
    return (
      <div style={{ fontSize: 12, color: cssPalette.smoke }}>🚐 {t("mapPage.vehicleVanRoute")}</div>
    );
  }
  const head = `${plan.registration ? `${plan.registration} · ` : ""}${formatProfileDims(plan.profile)}`;
  if (plan.missing.length > 0) {
    return (
      <div style={noticeBox(cssPalette.red)}>
        <strong style={{ color: cssPalette.red }}>⚠️ {head}</strong>
        <div style={{ marginTop: 2 }}>
          {t("mapPage.vehicleMissing")}{" "}
          {plan.missing.map((d) => t(MISSING_DIM_LABEL[d])).join(", ")} —{" "}
          {t("mapPage.vehicleMissingTail")}
        </div>
      </div>
    );
  }
  return (
    <div style={{ fontSize: 12, color: cssPalette.smoke }}>
      🚛 {head} ·{" "}
      {plan.registration ? t("mapPage.vehicleDimsFromRecord") : t("mapPage.vehicleDimsManual")}
    </div>
  );
}

/** Podsumowanie wytyczonej trasy (dystans/czas/myto/paliwo) + utrudnienia na trasie. */
export function RouteSummary({
  result,
  fuelTotal,
  grandTotal,
  disruptions,
  plan,
}: {
  result: RouteResponse;
  fuelTotal: number;
  grandTotal: number;
  disruptions: (Report & { distanceKm: number })[];
  /** [#385] Profil, którym policzono TĘ trasę (`null` — trasa sprzed wyboru pojazdu). */
  plan: PlannedProfile | null;
}) {
  const t = useT();
  return (
    <>
      {/*
        [#385] Uwagi dostawcy i profil pojazdu NAD liczbami: dystans i myto policzone
        z pominiętym gabarytem są tak samo okrągłe jak policzone poprawnie, więc
        zastrzeżenie musi paść zanim wzrok trafi na wynik.
      */}
      <RouteNotices notices={Array.isArray(result.notices) ? result.notices : []} />
      {plan && <PlanProfileBar plan={plan} />}
      <div className={styles.result}>
        <Row k={t("mapPage.distance")} v={`${result.distanceKm} km`} />
        <Row
          k={t("mapPage.drivingTime")}
          v={`${formatDuration(result.durationMin)}${result.durationEstimated ? ` ${t("mapPage.estShort")}` : ""}`}
        />
        <Row
          k={t("mapPage.tollLabel")}
          v={`${result.tollCost} ${result.currency}${result.tollEstimated ? ` ${t("mapPage.estShort")}` : ""}`}
        />
        <Row k={t("mapPage.fuelEstimate")} v={`${fuelTotal} ${result.currency}`} />
        {(() => {
          // #337 Eco: litry i emisja CO₂ dla trasy (spalanie modelowe 30 l/100 km).
          const eco = estimateRouteFuel({ distanceKm: result.distanceKm, fuelPricePerL: 0 });
          return (
            <>
              <Row k={t("mapPage.consumptionEstimate")} v={`${eco.fuelLiters} l · ~30 l/100`} />
              <Row k={`🌿 ${t("mapPage.co2Estimate")}`} v={`${eco.co2Kg} kg`} />
            </>
          );
        })()}
        <div style={{ height: 1, background: cssPalette.graphite, margin: "2px 0" }} />
        <Row k={t("mapPage.totalTollFuel")} v={`${grandTotal} ${result.currency}`} />
        {result.segments.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ color: cssPalette.smoke, fontSize: 12, marginBottom: 2 }}>
              {t("mapPage.stopsEtaNow")}
            </div>
            {(() => {
              let cum = 0;
              const start = Date.now();
              return result.segments.map((seg, i) => {
                cum += seg.durationMin ?? 0;
                const eta = new Date(start + cum * 60_000);
                const hh = String(eta.getHours()).padStart(2, "0");
                const mm = String(eta.getMinutes()).padStart(2, "0");
                return (
                  <Row
                    // biome-ignore lint/suspicious/noArrayIndexKey: segmenty są pozycyjne
                    key={`eta-${i * 1}`}
                    k={`→ ${t("mapPage.etaStopWord")} ${i + 1}`}
                    v={`${hh}:${mm} (${t("mapPage.afterWord")} ${formatDuration(cum)})`}
                  />
                );
              });
            })()}
          </div>
        )}
        <Row k={t("mapPage.provider")} v={result.provider} />
        {/*
          #367: uczciwy komunikat o omijaniu krajów. Rozróżniamy „nie zastosowano nic"
          od „TomTom ominął winiety, ale kraju nie wyklucza" — jeden wspólny tekst
          kłamałby o trasie liczonej TomTomem (dziś domyślnym dostawcą).
        */}
        {(result.avoidCountriesMode === "none" || result.avoidCountriesMode === "partial") && (
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              lineHeight: 1.4,
              color: cssPalette.offWhite,
              background: cssPalette.black,
              border: `1px solid ${result.avoidCountriesMode === "none" ? cssPalette.red : "#eab308"}`,
              borderRadius: 8,
              padding: "8px 10px",
            }}
          >
            ⚠️{" "}
            {result.avoidCountriesMode === "none"
              ? t("mapPage.avoidCountriesUnsupported")
              : t("mapPage.avoidCountriesVignetteOnly")}
          </div>
        )}
      </div>

      <div className={styles.disruptions}>
        <span className={styles.label}>
          🚧 {t("mapPage.disruptionsOnRoute")}{" "}
          <span style={{ color: cssPalette.smoke }}>
            (≤ {DISRUPTION_RADIUS_KM} km · {t("mapPage.driverReports")})
          </span>
        </span>
        {disruptions.length === 0 ? (
          <div style={{ fontSize: 12, color: cssPalette.smoke, marginTop: 4 }}>
            {t("mapPage.noReportsNearRoute")} 👍
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
            {disruptions.slice(0, 12).map((d) => (
              <div key={d.id} className={styles.disruptionRow}>
                <span style={{ color: REPORT_COLOR[d.type], fontWeight: 700 }}>
                  ● {t(REPORT_LABEL[d.type])}
                </span>
                <span style={{ color: cssPalette.smoke, fontSize: 12 }}>{d.distanceKm} km</span>
                {d.comment && (
                  <span style={{ color: cssPalette.smoke, fontSize: 12 }}>· {d.comment}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/** Chipsy zapisanych miejsc firmy — klik dodaje do trasy, ✕ usuwa. */
export function SavedPlacesChips({
  saved,
  onAdd,
  onRemove,
}: {
  saved: SavedPlace[];
  onAdd: (p: SavedPlace) => void;
  onRemove: (id: string) => void;
}) {
  const t = useT();
  if (saved.length === 0) return null;
  return (
    <div>
      <span className={styles.label}>
        {t("mapPage.savedPlaces")} ({saved.length})
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
        {saved.map((p) => (
          <span key={p.id} className={styles.savedChip}>
            <button
              type="button"
              className={styles.savedAdd}
              onClick={() => onAdd(p)}
              title={`${t("mapPage.addWord")} „${p.name}" ${t("mapPage.toRoute")}`}
            >
              {
                SAVED_CAT_ICON[
                  (SAVED_PLACE_CATEGORIES as readonly string[]).includes(p.category)
                    ? (p.category as SavedPlaceCategory)
                    : "other"
                ]
              }{" "}
              {p.name}
            </button>
            <button type="button" className={styles.savedDel} onClick={() => onRemove(p.id)}>
              ✕
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Edytor przystanków trasy (Start/Cel/pośrednie) z podpowiedziami geokodera. */
export function StopsEditor({
  stops,
  queries,
  hits,
  onQueryChange,
  removeStop,
  pickHit,
}: {
  stops: Stop[];
  queries: Record<string, string>;
  hits: Record<string, GeoHit[]>;
  onQueryChange: (key: string, value: string) => void;
  removeStop: (key: string) => void;
  pickHit: (key: string, hit: GeoHit) => void;
}) {
  const t = useT();
  return (
    <>
      {stops.map((st, i) => {
        const role =
          i === 0
            ? t("mapPage.start")
            : i === stops.length - 1
              ? t("mapPage.destination")
              : `${t("mapPage.stop")} ${i}`;
        const removable = i > 0 && i < stops.length - 1;
        const list = hits[st.key] ?? [];
        return (
          <div key={st.key} style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
              <div className={styles.field} style={{ flex: 1 }}>
                <span className={styles.label}>{role}</span>
                <input
                  className={styles.input}
                  value={queries[st.key] ?? ""}
                  onChange={(e) => onQueryChange(st.key, e.target.value)}
                  placeholder={t("mapPage.searchPlaceholder")}
                />
              </div>
              {removable && (
                <button type="button" className={styles.remove} onClick={() => removeStop(st.key)}>
                  ✕
                </button>
              )}
            </div>
            {list.length > 0 && (
              <div className={styles.suggest}>
                {list.map((h) => (
                  <button
                    key={`${h.lat},${h.lng}`}
                    type="button"
                    className={styles.suggestItem}
                    onClick={() => pickHit(st.key, h)}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/** Lista stacji paliw z cenami diesla — klik = przelot mapy do stacji. */
export function FuelPricesPanel({
  prices,
  onFly,
}: {
  prices: FuelStationPrice[];
  onFly: (s: FuelStationPrice) => void;
}) {
  const t = useT();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {prices.map((s) => (
        <button
          key={s.id}
          type="button"
          className={styles.priceRow}
          onClick={() => onFly(s)}
          title={s.name}
        >
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
            {s.brand || s.name}
            {s.isOpen ? "" : ` ${t("mapPage.closedShort")}`}
          </span>
          <strong style={{ color: cssPalette.red }}>{s.diesel?.toFixed(3)} €</strong>
        </button>
      ))}
    </div>
  );
}
