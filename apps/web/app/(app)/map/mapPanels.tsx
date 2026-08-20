import type { SavedPlace } from "@e-logistic/api";
import {
  estimateRouteFuel,
  FUEL_CARD_PROVIDER_LABELS,
  type FuelCardProvider,
  formatDuration,
  REPORT_TYPES,
  type ReportType,
  SAVED_PLACE_CATEGORIES,
  type SavedPlaceCategory,
} from "@e-logistic/core";
import type { MessageKey } from "@e-logistic/i18n";
import {
  ADR_TUNNEL_CODES,
  EMISSION_CLASSES,
  type FuelStationPrice,
  type GeoHit,
  type RouteNotice,
  type VehicleProfile,
} from "@e-logistic/maps";
import { cssPalette } from "@e-logistic/ui";
import { useT } from "@/components/LocaleProvider";
import {
  BASEMAPS,
  DISRUPTION_RADIUS_KM,
  INCIDENT_COLOR,
  INCIDENT_LABEL,
  MAPTILER_KEY,
  REPORT_COLOR,
  REPORT_LABEL,
  SAVED_CAT_ICON,
  TOMTOM_KEY,
  TRAFFIC_COLOR,
} from "./mapTheme";
import type { BasemapKey, DimsFields, Report, RouteResponse, RouteVehicle, Stop } from "./mapTypes";
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

/**
 * [#385] Formularz profilu ZESTAWU: wybór pojazdu z kartoteki + gabaryty do nadpisania.
 *
 * Prezentacyjny — stan (pola, rozwinięcie panelu, wybrany pojazd) trzyma strona, bo to
 * ona wysyła profil do `/api/route`. Tutaj mieszka wyłącznie układ i te decyzje
 * o czytelności, które są sednem tego ekranu: brak gabarytu pokazujemy jako „?", a nie
 * jako wartość typową — trasa policzona bez wysokości nie może wyglądać tak samo jak
 * trasa z wysokością.
 */
export function TruckProfileForm({
  fleet,
  vehicleId,
  onPickVehicle,
  selectedVehicle,
  profileOverridden,
  dimsOpen,
  onToggleDims,
  fields,
  onFieldChange,
  profile,
  missing,
}: {
  fleet: RouteVehicle[];
  vehicleId: string;
  onPickVehicle: (id: string) => void;
  /** `null` = wymiary wpisane ręcznie, bez kartoteki. */
  selectedVehicle: RouteVehicle | null;
  profileOverridden: boolean;
  dimsOpen: boolean;
  onToggleDims: () => void;
  fields: DimsFields;
  onFieldChange: (key: keyof DimsFields, value: string) => void;
  /** Profil zbudowany z `fields` — to on poleci do dostawcy. */
  profile: VehicleProfile;
  missing: MissingDimension[];
}) {
  const t = useT();
  return (
    <>
      {/*
        [#385] Wybór pojazdu z kartoteki. Bez niego jedynym źródłem gabarytów były
        stałe w kodzie, a panel poniżej — domyślnie zwinięty; typowy użytkownik
        wysyłał więc zestaw domyślny, nie swój.
      */}
      <label className={styles.field}>
        <span className={styles.label}>🚛 {t("mapPage.vehicleFromFleet")}</span>
        <select
          className={styles.input}
          value={vehicleId}
          onChange={(e) => onPickVehicle(e.target.value)}
        >
          <option value="">{t("mapPage.vehicleManual")}</option>
          {fleet.map((v) => (
            <option key={v.id} value={v.id}>
              {v.registration}
            </option>
          ))}
        </select>
      </label>
      {fleet.length === 0 ? (
        <div style={{ fontSize: 12, color: cssPalette.smoke }}>
          {t("mapPage.vehicleFleetEmpty")}
        </div>
      ) : !selectedVehicle ? (
        <div style={{ fontSize: 12, color: cssPalette.smoke }}>
          ⚠️ {t("mapPage.vehicleManualHint")}
        </div>
      ) : profileOverridden ? (
        <div style={{ fontSize: 12, color: cssPalette.smoke }}>
          ✎ {t("mapPage.vehicleOverridden")}
        </div>
      ) : null}
      <button
        type="button"
        className={styles.ghost}
        style={{ textAlign: "left", padding: "8px 10px" }}
        onClick={() => onToggleDims()}
      >
        {/*
          [#385] Podsumowanie na zwiniętym panelu pokazuje to, co POLECI do dostawcy
          — z „?" w miejscu braków. Dotąd było tu „{weightT} t · {axles} osie", więc
          puste pola dawały napis „( t ·  osie)", a brak wymiarów nie był widoczny wcale.
        */}
        {dimsOpen ? "▾" : "▸"} {t("mapPage.dimsAndTonnage")} ({formatProfileDims(profile)} ·{" "}
        {profile.axleCount ?? "?"} {t("mapPage.axlesSuffix")})
      </button>
      {dimsOpen && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <label className={styles.field}>
            <span className={styles.label}>{t("mapPage.grossWeightT")}</span>
            <input
              className={styles.input}
              type="number"
              value={fields.weightT}
              onChange={(e) => onFieldChange("weightT", e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t("mapPage.axles")}</span>
            <input
              className={styles.input}
              type="number"
              value={fields.axles}
              onChange={(e) => onFieldChange("axles", e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t("mapPage.heightCm")}</span>
            <input
              className={styles.input}
              type="number"
              value={fields.heightCm}
              onChange={(e) => onFieldChange("heightCm", e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t("mapPage.widthCm")}</span>
            <input
              className={styles.input}
              type="number"
              value={fields.widthCm}
              onChange={(e) => onFieldChange("widthCm", e.target.value)}
            />
          </label>
          <label className={styles.field} style={{ gridColumn: "1 / -1" }}>
            <span className={styles.label}>{t("mapPage.lengthCm")}</span>
            <input
              className={styles.input}
              type="number"
              value={fields.lengthCm}
              onChange={(e) => onFieldChange("lengthCm", e.target.value)}
            />
          </label>
          {/*
            [#385] ADR i klasa emisji też są nadpisywalne — spedytor bywa proszony
            o trasę dla zestawu, którego nie ma jeszcze w kartotece. PUSTE ADR znaczy
            „ładunek zwykły", nie „nie wiemy", dlatego opcja pusta ma własny podpis
            (ten sam co w kartotece pojazdów) i nie ostrzegamy o niej.
          */}
          <label className={styles.field}>
            <span className={styles.label}>{t("vehicles.fieldAdrTunnel")}</span>
            <select
              className={styles.input}
              value={fields.adrTunnelCode}
              onChange={(e) => onFieldChange("adrTunnelCode", e.target.value)}
            >
              <option value="">{t("vehicles.adrTunnelNone")}</option>
              {ADR_TUNNEL_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t("vehicles.fieldEmissionClass")}</span>
            <select
              className={styles.input}
              value={fields.emissionClass}
              onChange={(e) => onFieldChange("emissionClass", e.target.value)}
            >
              <option value="">{t("vehicles.selectPlaceholder")}</option>
              {EMISSION_CLASSES.map((c) => (
                <option key={c} value={c}>
                  Euro {c.slice(4)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {/*
        [#385] Braki gabarytów WPROST, jeszcze przed liczeniem trasy — tam, gdzie da
        się je naprawić. Trasa policzona bez wysokości wygląda identycznie jak trasa
        z wysokością, a różnica jest taka, że jedna z nich prowadzi pod wiadukt.
      */}
      {missing.length > 0 && (
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.4,
            color: cssPalette.offWhite,
            background: cssPalette.black,
            border: `1px solid ${cssPalette.red}`,
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          ⚠️ {selectedVehicle ? `${selectedVehicle.registration} · ` : ""}
          {t("mapPage.vehicleMissing")} {missing.map((d) => t(MISSING_DIM_LABEL[d])).join(", ")} —{" "}
          {t("mapPage.vehicleMissingTail")}
          <div style={{ marginTop: 2, color: cssPalette.smoke }}>
            {t("mapPage.vehicleMissingHint")}
          </div>
        </div>
      )}
      {selectedVehicle && missing.length === 0 && (
        <div style={{ fontSize: 12, color: cssPalette.smoke }}>
          ✔ {selectedVehicle.registration} · {formatProfileDims(profile)}
        </div>
      )}
    </>
  );
}

/**
 * Wybór podkładu mapy + przełączniki 3D. Teren i glob pokazujemy WYŁĄCZNIE przy kluczu
 * MapTiler — bez niego podkład jest rastrowy i oba przełączniki nie miałyby czego zmienić.
 */
export function BasemapPicker({
  current,
  onSwitch,
  terrain,
  onTerrain,
  globe,
  onGlobe,
}: {
  current: BasemapKey;
  onSwitch: (key: BasemapKey) => void;
  terrain: boolean;
  onTerrain: (on: boolean) => void;
  globe: boolean;
  onGlobe: (on: boolean) => void;
}) {
  const t = useT();
  return (
    <>
      <span className={styles.label}>{t("mapPage.basemap")}</span>
      <div style={{ display: "flex", gap: 6 }}>
        {BASEMAPS.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => onSwitch(b.key)}
            className={`${styles.segment} ${current === b.key ? styles.segmentActive : ""}`}
          >
            {t(b.label)}
          </button>
        ))}
      </div>
      {MAPTILER_KEY && (
        <>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={terrain}
              onChange={(e) => onTerrain(e.target.checked)}
            />{" "}
            {t("mapPage.terrain3d")}
          </label>
          <label className={styles.check}>
            <input type="checkbox" checked={globe} onChange={(e) => onGlobe(e.target.checked)} />{" "}
            {t("mapPage.globe3d")}
          </label>
        </>
      )}
    </>
  );
}

/** Opcje trasy: auto-objazd (#309) i wykluczenia (opłaty, promy, Szwajcaria). */
export function RouteOptions({
  autoReroute,
  onAutoReroute,
  avoidTolls,
  onAvoidTolls,
  avoidFerries,
  onAvoidFerries,
  avoidCH,
  onAvoidCH,
}: {
  autoReroute: boolean;
  onAutoReroute: (on: boolean) => void;
  avoidTolls: boolean;
  onAvoidTolls: (on: boolean) => void;
  avoidFerries: boolean;
  onAvoidFerries: (on: boolean) => void;
  avoidCH: boolean;
  onAvoidCH: (on: boolean) => void;
}) {
  const t = useT();
  return (
    <>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={autoReroute}
          onChange={(e) => onAutoReroute(e.target.checked)}
        />{" "}
        🔁 {t("mapPage.autoDetour")}
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={avoidTolls}
          onChange={(e) => onAvoidTolls(e.target.checked)}
        />{" "}
        {t("mapPage.avoidTolls")}
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={avoidFerries}
          onChange={(e) => onAvoidFerries(e.target.checked)}
        />{" "}
        {t("mapPage.avoidFerries")}
      </label>
      <label className={styles.check}>
        <input type="checkbox" checked={avoidCH} onChange={(e) => onAvoidCH(e.target.checked)} />{" "}
        {t("mapPage.avoidSwitzerland")}
      </label>
    </>
  );
}

/** Wsad do szacunku kosztu paliwa: spalanie, cena za litr i rabat karty. */
export function FuelCostInputs({
  consumption,
  onConsumption,
  fuelPrice,
  onFuelPrice,
  fuelDiscount,
  onDiscount,
}: {
  consumption: string;
  onConsumption: (v: string) => void;
  fuelPrice: string;
  onFuelPrice: (v: string) => void;
  fuelDiscount: string;
  onDiscount: (v: string) => void;
}) {
  const t = useT();
  return (
    <>
      <span className={styles.label}>{t("mapPage.fuelCostEstimate")}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          className={styles.input}
          type="number"
          value={consumption}
          onChange={(e) => onConsumption(e.target.value)}
          placeholder="l/100km"
          title={t("mapPage.consumptionTitle")}
        />
        <input
          className={styles.input}
          type="number"
          step="0.01"
          value={fuelPrice}
          onChange={(e) => onFuelPrice(e.target.value)}
          placeholder="€/l"
          title={t("mapPage.pricePerLiterTitle")}
        />
        <input
          className={styles.input}
          type="number"
          value={fuelDiscount}
          onChange={(e) => onDiscount(e.target.value)}
          placeholder={t("mapPage.discountPlaceholder")}
          title={t("mapPage.cardDiscountTitle")}
        />
      </div>
    </>
  );
}

/** Przyciski wczytania POI (widok / korytarz trasy / TomTom) + legenda z licznikami. */
export function PoiTools({
  busy,
  onInView,
  onAlongRoute,
  onTomtom,
  count,
  kinds,
}: {
  busy: boolean;
  onInView: () => void;
  onAlongRoute: () => void;
  onTomtom: (query: "fuel" | "parking", type: "fuel_station" | "parking") => void;
  /** `null` = jeszcze nic nie wczytano; 0 to co innego niż „nie pytaliśmy". */
  count: number | null;
  kinds: { fuel: number; parking: number };
}) {
  const t = useT();
  return (
    <>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          className={styles.ghost}
          style={{ flex: 1 }}
          onClick={onInView}
          disabled={busy}
        >
          {busy ? t("mapPage.searching") : `📍 ${t("mapPage.poiInView")}`}
        </button>
        <button
          type="button"
          className={styles.ghost}
          style={{ flex: 1 }}
          onClick={onAlongRoute}
          disabled={busy}
        >
          🛣️ {t("mapPage.poiAlongRoute")}
        </button>
      </div>
      {TOMTOM_KEY && (
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            className={styles.ghost}
            style={{ flex: 1 }}
            onClick={() => onTomtom("fuel", "fuel_station")}
            disabled={busy}
          >
            ⛽ {t("mapPage.fuelAlongRoute")}
          </button>
          <button
            type="button"
            className={styles.ghost}
            style={{ flex: 1 }}
            onClick={() => onTomtom("parking", "parking")}
            disabled={busy}
          >
            🅿️ {t("mapPage.parkingAlongRoute")}
          </button>
        </div>
      )}
      {/*
        [#383] Legenda wymieniała „firmy" (niebieska kropka), a `OsmPoiType` zna
        wyłącznie `parking | fuel_station` — takiego punktu nie dało się wczytać
        ŻADNYM przyciskiem powyżej, więc pozycja kłamała przy każdym imporcie.
        Zostają dwa typy, które mapa rzeczywiście rysuje, z liczbami.
      */}
      {count != null && (
        <div style={{ fontSize: 12, color: cssPalette.smoke }}>
          {t("mapPage.found")} <strong>{count}</strong> ·{" "}
          <span style={{ color: cssPalette.red }}>
            ● {t("mapPage.legendStations")} ({kinds.fuel})
          </span>{" "}
          <span style={{ color: "#22c55e" }}>
            ● {t("mapPage.legendParkings")} ({kinds.parking})
          </span>
        </div>
      )}
    </>
  );
}

/** Filtr stacji wg marek kart flotowych użytkownika (poglądowy). */
export function CardFilter({
  on,
  onToggle,
  options,
  providers,
  onToggleProvider,
}: {
  on: boolean;
  onToggle: (on: boolean) => void;
  options: FuelCardProvider[];
  providers: Set<FuelCardProvider>;
  onToggleProvider: (provider: FuelCardProvider) => void;
}) {
  const t = useT();
  return (
    <>
      <label className={styles.check}>
        <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} />{" "}
        {t("mapPage.onlyMyCardStations")}
      </label>
      {on &&
        (options.length === 0 ? (
          <div style={{ fontSize: 12, color: cssPalette.smoke }}>{t("mapPage.noCardsInFleet")}</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {options.map((p) => {
              const active = providers.has(p);
              return (
                <button
                  key={p}
                  type="button"
                  className={`${styles.segment} ${active ? styles.segmentActive : ""}`}
                  style={{ flex: "0 0 auto" }}
                  onClick={() => onToggleProvider(p)}
                >
                  {FUEL_CARD_PROVIDER_LABELS[p]}
                </button>
              );
            })}
          </div>
        ))}
    </>
  );
}

/** Tryb zgłoszeń: klik w mapę zakłada wpis wybranego typu we wspólnej tabeli. */
export function ReportModePanel({
  on,
  onToggle,
  type,
  onType,
  msg,
}: {
  on: boolean;
  onToggle: (on: boolean) => void;
  type: ReportType;
  onType: (type: ReportType) => void;
  msg: string | null;
}) {
  const t = useT();
  return (
    <>
      <label className={styles.check}>
        <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} />{" "}
        {t("mapPage.reportMode")}
      </label>
      {on && (
        <select
          className={styles.input}
          value={type}
          onChange={(e) => onType(e.target.value as ReportType)}
        >
          {REPORT_TYPES.map((rt) => (
            <option key={rt} value={rt}>
              {t(REPORT_LABEL[rt])}
            </option>
          ))}
        </select>
      )}
      {msg && <div style={{ fontSize: 12, color: cssPalette.red }}>{msg}</div>}
    </>
  );
}

/** Warstwa natężenia ruchu (HERE) z legendą kolorów. */
export function TrafficToggle({
  on,
  onToggle,
  msg,
}: {
  on: boolean;
  onToggle: (on: boolean) => void;
  msg: string | null;
}) {
  const t = useT();
  return (
    <>
      <label className={styles.check}>
        <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} /> 🚦{" "}
        {t("mapPage.liveTrafficHere")}
      </label>
      {on && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11 }}>
          <span style={{ color: TRAFFIC_COLOR.free }}>● {t("mapPage.trafficFree")}</span>
          <span style={{ color: TRAFFIC_COLOR.moderate }}>● {t("mapPage.trafficModerate")}</span>
          <span style={{ color: TRAFFIC_COLOR.heavy }}>● {t("mapPage.trafficHeavy")}</span>
          <span style={{ color: TRAFFIC_COLOR.blocked }}>● {t("mapPage.trafficBlocked")}</span>
        </div>
      )}
      {msg && <div style={{ fontSize: 12, color: cssPalette.smoke }}>{msg}</div>}
    </>
  );
}

/** #358: warstwa incydentów TomTom — sam przełącznik istnieje tylko przy kluczu klienta. */
export function IncidentsToggle({
  on,
  onToggle,
  msg,
}: {
  on: boolean;
  onToggle: (on: boolean) => void;
  msg: string | null;
}) {
  const t = useT();
  return (
    <>
      {TOMTOM_KEY && (
        <>
          <label className={styles.check}>
            <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} /> 🚧{" "}
            {t("mapPage.incidentsTomtom")}
          </label>
          {on && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11 }}>
              <span style={{ color: INCIDENT_COLOR.closure }}>● {t(INCIDENT_LABEL.closure)}</span>
              <span style={{ color: INCIDENT_COLOR.major }}>● {t(INCIDENT_LABEL.major)}</span>
              <span style={{ color: INCIDENT_COLOR.moderate }}>● {t(INCIDENT_LABEL.moderate)}</span>
              <span style={{ color: INCIDENT_COLOR.minor }}>● {t(INCIDENT_LABEL.minor)}</span>
              <span style={{ color: INCIDENT_COLOR.unknown }}>● {t(INCIDENT_LABEL.unknown)}</span>
            </div>
          )}
          {msg && <div style={{ fontSize: 12, color: cssPalette.smoke }}>{msg}</div>}
        </>
      )}
    </>
  );
}

/** [#383] Warstwa odcinków płatnych + uczciwy komunikat, gdy dostawca ich NIE raportuje. */
export function TollLayerToggle({
  on,
  onToggle,
  result,
}: {
  on: boolean;
  onToggle: (on: boolean) => void;
  /** `null` = brak policzonej trasy, więc nie ma czego kolorować. */
  result: RouteResponse | null;
}) {
  const t = useT();
  return (
    <>
      {/*
        [#383] Warstwa odcinków płatnych. `sectionType=tollRoad` leciał do TomTom
        w każdym zapytaniu o trasę, a odpowiedź szła do kosza. Kluczowe: gdy dostawca
        NIE raportuje położenia opłat (`tollSections.known === false`), mówimy to
        wprost — pusta warstwa nie może udawać „trasy bez opłat", zwłaszcza że
        `tollCost` powyżej potrafi być wtedy większy od zera.
      */}
      <label className={styles.check}>
        <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} /> 🛣️{" "}
        {t("mapPage.tollLayer")}
      </label>
      {on &&
        (!result ? (
          <div style={{ fontSize: 12, color: cssPalette.smoke }}>{t("mapPage.planRouteFirst")}</div>
        ) : !result.tollSections.known ? (
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.4,
              color: cssPalette.offWhite,
              background: cssPalette.black,
              border: `1px solid ${cssPalette.red}`,
              borderRadius: 8,
              padding: "8px 10px",
            }}
          >
            ⚠️ {t("mapPage.tollSectionsUnknown")} ({result.provider})
          </div>
        ) : result.tollSections.sections.length === 0 ? (
          <div style={{ fontSize: 12, color: cssPalette.smoke }}>{t("mapPage.tollNoSections")}</div>
        ) : (
          <div style={{ fontSize: 11, color: cssPalette.smoke }}>
            <span style={{ color: cssPalette.red }}>▬</span> {t("mapPage.tollLegend")} (
            {result.tollSections.sections.length})
          </div>
        ))}
    </>
  );
}

/** [#383] Filtr świeżości pozycji aut live + licznik ukrytych pinezek. */
export function LiveTrucksPanel({
  total,
  freshOnly,
  onToggle,
  staleHidden,
  staleAfterMin,
}: {
  total: number;
  freshOnly: boolean;
  onToggle: (on: boolean) => void;
  staleHidden: number;
  staleAfterMin: number;
}) {
  const t = useT();
  return (
    <>
      {/*
        [#383] Auta live: `heading` z bazy obraca strzałkę, a filtr świeżości chowa
        pozycje starsze niż staleAfterMin. Blok pokazujemy tylko wtedy, gdy
        jakiekolwiek pozycje w ogóle przyszły.
      */}
      {total > 0 && (
        <>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={freshOnly}
              onChange={(e) => onToggle(e.target.checked)}
            />{" "}
            🚛 {t("mapPage.freshPositionsOnly")} (≤ {staleAfterMin} min)
          </label>
          {staleHidden > 0 && (
            <div style={{ fontSize: 12, color: cssPalette.smoke }}>
              {t("mapPage.stalePositionsHidden")} {staleAfterMin} min:{" "}
              <strong>{staleHidden}</strong>
            </div>
          )}
        </>
      )}
    </>
  );
}
