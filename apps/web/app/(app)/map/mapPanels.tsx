import type { SavedPlace } from "@e-logistic/api";
import {
  estimateRouteFuel,
  formatDuration,
  SAVED_PLACE_CATEGORIES,
  type SavedPlaceCategory,
} from "@e-logistic/core";
import type { FuelStationPrice, GeoHit } from "@e-logistic/maps";
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

/** Podsumowanie wytyczonej trasy (dystans/czas/myto/paliwo) + utrudnienia na trasie. */
export function RouteSummary({
  result,
  fuelTotal,
  grandTotal,
  disruptions,
}: {
  result: RouteResponse;
  fuelTotal: number;
  grandTotal: number;
  disruptions: (Report & { distanceKm: number })[];
}) {
  const t = useT();
  return (
    <>
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
