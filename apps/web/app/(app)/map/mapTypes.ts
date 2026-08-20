import type { listVehicles } from "@e-logistic/api";
import type { ReportType } from "@e-logistic/core";
import type { AdrTunnelCode, EmissionClass, RouteResult } from "@e-logistic/maps";

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

/**
 * [#385] Pojazd z kartoteki w zakresie, który wchodzi do profilu routingu.
 *
 * `null` znaczy „kolumna w kartotece pusta" i MA tak zostać aż do ekranu — podstawienie
 * „typowej" wysokości 4 m czy pięciu osi byłoby zgadywaniem, a zgadywanie kończy się
 * zestawem pod niskim wiaduktem albo mytem policzonym dla cudzej klasy pojazdu.
 */
export interface RouteVehicle {
  /** [#406] Rejestracja podpiętej naczepy — do pokazania przy wyborze pojazdu. */
  trailerRegistration?: string | null;
  /** [#406] `true`, gdy długość zestawu nie jest policzalna z kartoteki. */
  rigLengthUnknown?: boolean;
  id: string;
  registration: string;
  heightCm: number | null;
  widthCm: number | null;
  lengthCm: number | null;
  curbWeightKg: number | null;
  maxPayloadKg: number | null;
  axleCount: number | null;
  adrTunnelCode: AdrTunnelCode | null;
  emissionClass: EmissionClass | null;
}

/** Wiersz kartoteki pojazdów tak, jak zwraca go `listVehicles` (select("*")). */
export type VehicleRow = Awaited<ReturnType<typeof listVehicles>>[number];

/**
 * Pola formularza gabarytów jako JEDEN stan.
 *
 * Trzymamy je razem, bo razem jadą do `/api/route` i razem są nadpisywane przy wyborze
 * pojazdu — siedem osobnych `useState` znaczyło siedem miejsc do zapomnienia przy
 * każdej kolejnej fali. Wartości są `string`, nie `number`, celowo: puste pole musi
 * zostać BRAKIEM parametru, a nie zerem (patrz `positiveNumber`).
 */
export interface DimsFields {
  weightT: string;
  axles: string;
  heightCm: string;
  widthCm: string;
  lengthCm: string;
  adrTunnelCode: string;
  emissionClass: string;
}
