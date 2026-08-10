/** Wspólne typy warstwy map E-Logistic (niezależne od dostawcy) + drobne konstruktory. */

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

/**
 * #383: fragment trasy prowadzący drogą płatną — zakres indeksów w `RouteResult.geometry`,
 * obustronnie DOMKNIĘTY (punkty odcinka to `geometry.slice(startIndex, endIndex + 1)`).
 *
 * DLACZEGO INDEKSY, A NIE GOTOWE PODTABLICE WSPÓŁRZĘDNYCH:
 *  1. `geometry` trasy międzynarodowej to tysiące punktów i jedzie już raz w odpowiedzi
 *     `/api/route`, a do tego siedzi w pamięci podręcznej (apps/web/app/api/route/cache.ts,
 *     gdzie limit wpisów jest niski WŁAŚNIE z powodu rozmiaru geometrii). Kopia płatnych
 *     fragmentów potrafiłaby podwoić payload i zjeść ten sam budżet pamięci drugi raz.
 *  2. Warstwa MapLibre i tak składa `Feature<LineString>` ręcznie, więc `slice` przy
 *     renderze to jedna linijka — podtablica nie oszczędza tam żadnej pracy.
 *  3. Indeks da się zweryfikować (mieści się w `geometry` albo nie); zduplikowane
 *     współrzędne mogą się po cichu rozjechać z linią trasy i nikt tego nie zauważy.
 * Cena tego wyboru: KAŻDE przekształcenie `geometry` musi przeliczyć indeksy —
 * robi to `routeMultiLeg`, które skleja legi pomijając zdublowany punkt styku.
 */
export interface TollSection {
  /** Indeks pierwszego punktu odcinka w `RouteResult.geometry`. */
  startIndex: number;
  /** Indeks ostatniego punktu odcinka w `RouteResult.geometry` — WŁĄCZNIE. */
  endIndex: number;
}

/**
 * #383: „nie wiem, gdzie są drogi płatne" i „na tej trasie nie ma dróg płatnych" to
 * dwa RÓŻNE stany, a sama pusta lista skleja je w jeden i każe UI zgadywać. Dlatego
 * obok listy jedzie `known`. Bez tego mapa z dostawcą, który nie raportuje odcinków
 * (HERE, GraphHopper, mock), rysowałaby „trasa bez dróg płatnych" — czyli kłamała.
 */
export interface TollSections {
  /**
   * Czy dostawca w ogóle zwrócił informację o POŁOŻENIU odcinków płatnych.
   * `false` → `sections` jest puste z braku danych, nie z braku myta.
   * Uwaga: to nie to samo co `RouteResult.tollCost` — HERE zna koszt myta,
   * ale nie mówi, którędy ono biegnie.
   */
  known: boolean;
  sections: TollSection[];
}

/**
 * #383: stan „dostawca nie raportuje odcinków płatnych". Osobna funkcja (a nie
 * współdzielona stała), żeby żaden `RouteResult` nie trzymał tej samej tablicy —
 * przypadkowa mutacja jednej trasy nie może zmienić drugiej.
 */
export function unknownTollSections(): TollSections {
  return { known: false, sections: [] };
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
  /**
   * #383: gdzie na trasie leżą drogi płatne (indeksy w `geometry`). Pole jest WYMAGANE
   * celowo — każdy adapter musi się zadeklarować, zamiast po cichu pominąć temat.
   */
  tollSections: TollSections;
  provider: string;
}

/** Abstrakcja dostawcy routingu — adaptery: mock, GraphHopper, HERE. */
export interface RoutingProvider {
  readonly name: string;
  route(req: RouteRequest): Promise<RouteResult>;
}
