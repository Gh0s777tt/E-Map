import type { ReportType } from "@e-logistic/core";
import type { RouteResult } from "@e-logistic/maps";

/** Moduł maplibre-gl ładowany dynamicznie (typ instancji). */
export type MaplibreModule = typeof import("maplibre-gl");

/** Wynik routingu + flagi z `/api/route` (szacowania/fallback). */
export type RouteResponse = RouteResult & {
  tollEstimated?: boolean;
  durationEstimated?: boolean;
  fallback?: boolean;
};

export type Stop = { key: string; label: string; lat: number; lng: number };
export type Report = {
  id: string;
  type: ReportType;
  lat: number;
  lng: number;
  comment: string | null;
};
export type BasemapKey = "tomtom" | "dark" | "satellite" | "terrain" | "osm";
