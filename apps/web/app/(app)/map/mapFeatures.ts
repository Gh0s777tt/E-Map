import type { SavedPlace } from "@e-logistic/api";
import { SAVED_PLACE_CATEGORIES, type SavedPlaceCategory } from "@e-logistic/core";
import type { MessageKey } from "@e-logistic/i18n";
import type { Poi, TrafficIncident } from "@e-logistic/maps";
import { REPORT_COLOR, REPORT_LABEL, SAVED_CAT_ICON } from "./mapTheme";
import type { Report } from "./mapTypes";

/** GeoJSON linii trasy z pary [lng, lat]. */
export function routeFeature(coords: [number, number][]) {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "LineString" as const, coordinates: coords },
      },
    ],
  };
}

/** GeoJSON punktów POI (nazwa + typ). */
export function poiFeatures(pois: Poi[]) {
  return {
    type: "FeatureCollection" as const,
    features: pois.map((p) => ({
      type: "Feature" as const,
      properties: { id: p.id, name: p.name ?? "", type: p.type },
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] as [number, number] },
    })),
  };
}

/**
 * #367: GeoJSON zapisanych miejsc firmy — ikona kategorii (SAVED_CAT_ICON) leci
 * w properties jako `icon` i trafia do `text-field` warstwy symbol. `category`
 * z bazy to zwykły string, więc nieznana wartość spada na „other" (jak w chipsach).
 */
export function savedFeatures(places: SavedPlace[]) {
  return {
    type: "FeatureCollection" as const,
    features: places.map((p) => {
      const cat: SavedPlaceCategory = (SAVED_PLACE_CATEGORIES as readonly string[]).includes(
        p.category,
      )
        ? (p.category as SavedPlaceCategory)
        : "other";
      return {
        type: "Feature" as const,
        properties: { id: p.id, name: p.name, icon: SAVED_CAT_ICON[cat] },
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] as [number, number] },
      };
    }),
  };
}

/** GeoJSON incydentów ruchu TomTom (punkty; kolor liczony w warstwie wg severity). */
export function incidentFeatures(incidents: TrafficIncident[]) {
  return {
    type: "FeatureCollection" as const,
    features: incidents.map((i) => ({
      type: "Feature" as const,
      properties: { id: i.id, severity: i.severity, description: i.description },
      geometry: {
        type: "Point" as const,
        coordinates: [i.point.lng, i.point.lat] as [number, number],
      },
    })),
  };
}

/** GeoJSON zgłoszeń na mapie (etykieta + kolor wg typu). `t` tłumaczy etykietę do popupu. */
export function reportFeatures(reports: Report[], t: (key: MessageKey) => string) {
  return {
    type: "FeatureCollection" as const,
    features: reports.map((r) => ({
      type: "Feature" as const,
      properties: {
        label: t(REPORT_LABEL[r.type]),
        color: REPORT_COLOR[r.type],
        comment: r.comment ?? "",
      },
      geometry: { type: "Point" as const, coordinates: [r.lng, r.lat] as [number, number] },
    })),
  };
}
