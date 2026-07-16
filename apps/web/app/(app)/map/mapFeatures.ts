import type { Poi, TrafficIncident } from "@e-logistic/maps";
import { REPORT_COLOR, REPORT_LABEL } from "./mapTheme";
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

/** GeoJSON zgłoszeń na mapie (etykieta + kolor wg typu). */
export function reportFeatures(reports: Report[]) {
  return {
    type: "FeatureCollection" as const,
    features: reports.map((r) => ({
      type: "Feature" as const,
      properties: {
        label: REPORT_LABEL[r.type],
        color: REPORT_COLOR[r.type],
        comment: r.comment ?? "",
      },
      geometry: { type: "Point" as const, coordinates: [r.lng, r.lat] as [number, number] },
    })),
  };
}
