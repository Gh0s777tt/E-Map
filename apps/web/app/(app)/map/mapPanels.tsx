import type { SavedPlace } from "@e-logistic/api";
import { formatDuration, SAVED_PLACE_CATEGORIES, type SavedPlaceCategory } from "@e-logistic/core";
import type { FuelStationPrice, GeoHit } from "@e-logistic/maps";
import { cssPalette } from "@e-logistic/ui";
import { DISRUPTION_RADIUS_KM, REPORT_COLOR, REPORT_LABEL, SAVED_CAT_ICON } from "./mapTheme";
import type { Report, RouteResponse, Stop } from "./mapTypes";
import { Row, styles } from "./mapUi";

/**
 * Prezentacyjne fragmenty panelu mapy wydzielone z `page.tsx` (dekompozycja) —
 * czyste, bezstanowe, przyjmują tylko dane + callbacki. Stan i logika zostają w stronie.
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
  return (
    <>
      <div style={styles.result}>
        <Row k="Dystans" v={`${result.distanceKm} km`} />
        <Row
          k="Czas jazdy"
          v={`${formatDuration(result.durationMin)}${result.durationEstimated ? " (szac.)" : ""}`}
        />
        <Row
          k="Myto"
          v={`${result.tollCost} ${result.currency}${result.tollEstimated ? " (szac.)" : ""}`}
        />
        <Row k="Paliwo (szac.)" v={`${fuelTotal} ${result.currency}`} />
        <div style={{ height: 1, background: cssPalette.graphite, margin: "2px 0" }} />
        <Row k="Razem (myto+paliwo)" v={`${grandTotal} ${result.currency}`} />
        <Row k="Dostawca" v={result.provider} />
      </div>

      <div style={styles.disruptions}>
        <span style={styles.label}>
          🚧 Utrudnienia na trasie{" "}
          <span style={{ color: cssPalette.smoke }}>
            (≤ {DISRUPTION_RADIUS_KM} km · zgłoszenia kierowców)
          </span>
        </span>
        {disruptions.length === 0 ? (
          <div style={{ fontSize: 12, color: cssPalette.smoke, marginTop: 4 }}>
            Brak zgłoszeń przy trasie. 👍
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
            {disruptions.slice(0, 12).map((d) => (
              <div key={d.id} style={styles.disruptionRow}>
                <span style={{ color: REPORT_COLOR[d.type], fontWeight: 700 }}>
                  ● {REPORT_LABEL[d.type]}
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
  if (saved.length === 0) return null;
  return (
    <div>
      <span style={styles.label}>Zapisane miejsca ({saved.length})</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
        {saved.map((p) => (
          <span key={p.id} style={styles.savedChip}>
            <button
              type="button"
              style={styles.savedAdd}
              onClick={() => onAdd(p)}
              title={`Dodaj „${p.name}" do trasy`}
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
            <button type="button" style={styles.savedDel} onClick={() => onRemove(p.id)}>
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
  return (
    <>
      {stops.map((st, i) => {
        const role = i === 0 ? "Start" : i === stops.length - 1 ? "Cel" : `Przystanek ${i}`;
        const removable = i > 0 && i < stops.length - 1;
        const list = hits[st.key] ?? [];
        return (
          <div key={st.key} style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
              <div style={{ ...styles.field, flex: 1 }}>
                <span style={styles.label}>{role}</span>
                <input
                  style={styles.input}
                  value={queries[st.key] ?? ""}
                  onChange={(e) => onQueryChange(st.key, e.target.value)}
                  placeholder="Miasto, adres lub miejsce…"
                />
              </div>
              {removable && (
                <button type="button" style={styles.remove} onClick={() => removeStop(st.key)}>
                  ✕
                </button>
              )}
            </div>
            {list.length > 0 && (
              <div style={styles.suggest}>
                {list.map((h) => (
                  <button
                    key={`${h.lat},${h.lng}`}
                    type="button"
                    style={styles.suggestItem}
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
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {prices.map((s) => (
        <button
          key={s.id}
          type="button"
          style={styles.priceRow}
          onClick={() => onFly(s)}
          title={s.name}
        >
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
            {s.brand || s.name}
            {s.isOpen ? "" : " (zamkn.)"}
          </span>
          <strong style={{ color: cssPalette.red }}>{s.diesel?.toFixed(3)} €</strong>
        </button>
      ))}
    </div>
  );
}
