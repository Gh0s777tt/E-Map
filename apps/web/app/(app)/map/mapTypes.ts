import type { ReportType } from "@e-logistic/core";
import type { RouteResult } from "@e-logistic/maps";

/** Moduł maplibre-gl ładowany dynamicznie (typ instancji). */
export type MaplibreModule = typeof import("maplibre-gl");

/** Wynik routingu + flagi z `/api/route` (szacowania/fallback). */
export type RouteResponse = RouteResult & {
  tollEstimated?: boolean;
  durationEstimated?: boolean;
  fallback?: boolean;
  /**
   * #367: na ile dostawca faktycznie zrealizował omijanie krajów, o które prosił użytkownik.
   * `full` — pełne wykluczenie (tylko HERE, `exclude[countries]`); `partial` — TomTom ominął
   * drogi winietowe, ale nie wyklucza kraju; `none` — nie zastosowano nic (GraphHopper/mock/
   * fallback). Brak pola = użytkownik o nic nie prosił. Jeden bit kłamałby o TomTomie.
   */
  avoidCountriesMode?: "full" | "partial" | "none";
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
