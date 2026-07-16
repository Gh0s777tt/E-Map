import type { ReportType, SavedPlaceCategory } from "@e-logistic/core";
import type { jamSeverity, TrafficSeverity } from "@e-logistic/maps";
import { palette } from "@e-logistic/ui";
import type { StyleSpecification } from "maplibre-gl";
import type { BasemapKey } from "./mapTypes";

export const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";
export const TOMTOM_KEY = process.env.NEXT_PUBLIC_TOMTOM_KEY ?? "";

/** Promień (km) uznania zgłoszenia za „utrudnienie na trasie". */
export const DISRUPTION_RADIUS_KM = 5;

export const SAVED_CAT_ICON: Record<SavedPlaceCategory, string> = {
  fuel_station: "⛽",
  port: "⚓",
  customs: "🛃",
  company: "🏢",
  parking: "🅿️",
  other: "📍",
};

/** Kolor warstwy ruchu HERE wg natężenia (jamFactor → severity). */
export const TRAFFIC_COLOR: Record<ReturnType<typeof jamSeverity>, string> = {
  free: "#22c55e",
  moderate: "#eab308",
  heavy: "#f97316",
  blocked: "#ef4444",
};

/** Kolor incydentu ruchu TomTom wg severity (zamknięcie = czerwień marki). */
export const INCIDENT_COLOR: Record<TrafficSeverity, string> = {
  closure: "#E50914",
  major: "#f97316",
  moderate: "#eab308",
  minor: "#3b82f6",
  unknown: "#9ca3af",
};

/** Etykiety PL severity incydentu TomTom (popup + legenda). */
export const INCIDENT_LABEL: Record<TrafficSeverity, string> = {
  closure: "Zamknięcie",
  major: "Duże utrudnienie",
  moderate: "Umiarkowane",
  minor: "Drobne",
  unknown: "Nieznane",
};

export const REPORT_LABEL: Record<ReportType, string> = {
  accident: "Wypadek",
  police: "Policja",
  closure: "Zamknięcie",
  traffic: "Korek",
  weigh: "Waga",
  hazard: "Zagrożenie",
};
export const REPORT_COLOR: Record<ReportType, string> = {
  accident: palette.red,
  police: "#3b82f6",
  closure: "#f59e0b",
  traffic: "#f97316",
  weigh: "#a855f7",
  hazard: "#eab308",
};

export const POI_LABEL: Record<string, string> = {
  fuel_station: "Stacja paliw",
  parking: "Parking",
  company: "Firma",
  wash: "Myjnia",
  weigh: "Waga",
};

export const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap",
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": palette.black } },
    { id: "osm", type: "raster", source: "osm", paint: { "raster-brightness-max": 0.85 } },
  ],
};

const mtStyle = (name: string) =>
  `https://api.maptiler.com/maps/${name}/style.json?key=${MAPTILER_KEY}`;

/** Dostępne podkłady (gdy jest klucz MapTiler — wektorowe/satelita/teren; inaczej tylko OSM). */
export const BASEMAPS: { key: BasemapKey; label: string }[] = MAPTILER_KEY
  ? [
      { key: "dark", label: "Ciemna" },
      { key: "satellite", label: "Satelita" },
      { key: "terrain", label: "Teren" },
    ]
  : [{ key: "osm", label: "Mapa (OSM)" }];

export function basemapStyle(key: BasemapKey): string | StyleSpecification {
  if (!MAPTILER_KEY) return OSM_STYLE;
  if (key === "satellite") return mtStyle("hybrid");
  if (key === "terrain") return mtStyle("outdoor-v2");
  return mtStyle("streets-v2-dark");
}
