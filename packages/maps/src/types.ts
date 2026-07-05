/** Wspólne typy warstwy map E-Logistic (niezależne od dostawcy). */

export interface LatLng {
  lat: number;
  lng: number;
}

export type VehicleKind = "truck" | "tractor" | "van" | "trailer" | "other";

/** Profil pojazdu wpływający na routing TIR. */
export interface VehicleProfile {
  kind?: VehicleKind;
  heightCm?: number;
  widthCm?: number;
  lengthCm?: number;
  weightKg?: number;
  /** Liczba osi (HERE: truck[axleCount]; domyślnie 5 dla zestawu). */
  axleCount?: number;
}

/** Opcje omijania (kraje, płatne drogi, promy, autokoszetki, drogi gruntowe). */
export interface RouteOptions {
  avoidCountries?: string[];
  avoidTolls?: boolean;
  avoidFerries?: boolean;
  avoidCarTrains?: boolean;
  avoidDirtRoads?: boolean;
}

export interface RouteRequest {
  /** Min. 2 punkty (start, ewentualne przystanki, cel). */
  waypoints: LatLng[];
  profile?: VehicleProfile;
  options?: RouteOptions;
  currency?: string;
}

export interface RouteSegment {
  from: LatLng;
  to: LatLng;
  distanceKm: number;
  tollCost: number;
  /** Czas jazdy odcinka [min] — #269: ETA per przystanek. */
  durationMin: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  tollCost: number;
  currency: string;
  /** Koszt myta z podziałem na odcinki (wymóg ze specyfikacji). */
  segments: RouteSegment[];
  /** Punkty linii trasy do narysowania na mapie. */
  geometry: LatLng[];
  provider: string;
}

/** Abstrakcja dostawcy routingu — adaptery: mock, GraphHopper, HERE. */
export interface RoutingProvider {
  readonly name: string;
  route(req: RouteRequest): Promise<RouteResult>;
}
