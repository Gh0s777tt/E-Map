/**
 * Adapter TomTom (#356) — routing TIR przez TomTom Routing API v1.
 * Truck mode z wymiarami/tonażem/osiami, świadomy ruchu (traffic=true), z
 * geometrią trasy. TomTom Routing nie zwraca KOSZTU myta (tylko odcinki płatne),
 * więc `tollCost` = 0 (do estymacji osobnym warstwą). Klucz TomTom jest kluczem
 * klienta (jak MapTiler/Supabase anon) — dopuszczalny w EXPO_PUBLIC.
 *
 * #383: PRZEBIEG dróg płatnych (`sectionType=tollRoad`) leciał w każdym zapytaniu,
 * ale typ odpowiedzi nie miał pola `sections`, więc parser wyrzucał go do kosza —
 * płaciliśmy za dane, których nikt nigdy nie zobaczył. Teraz wracają jako
 * `RouteResult.tollSections` (indeksy w `geometry`).
 */
import { round2 } from "@e-logistic/core";
import {
  type LatLng,
  type RouteRequest,
  type RouteResult,
  type RoutingProvider,
  type TollSection,
  type TollSections,
  unknownTollSections,
  type VehicleKind,
} from "./types";

export const TOMTOM_BASE = "https://api.tomtom.com";

function isTruck(kind?: VehicleKind): boolean {
  return kind === "truck" || kind === "tractor" || kind === "trailer";
}

/** fetch z twardym timeoutem — API mapowe bywa wolne; nie wieszamy UI (#354). */
export async function tomtomFetch(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init?.timeoutMs ?? 15_000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * #367: kraje winietowe rozpoznawane przez TomTom `avoidVignette` (ISO 3166-1 alpha-3).
 * TomTom Routing v1 NIE ma odpowiednika HERE `exclude[countries]` — nie potrafi
 * wykluczyć kraju z trasy. Jedyne, co realnie umie, to ominąć drogi objęte winietą
 * we wskazanych krajach (`avoidVignette`). Dla CH/AT/CZ/SK/HU/SI/BG/RO/MD realizuje
 * to intencję „nie płacę tam za winietę", ale to NIE jest pełne wykluczenie kraju —
 * dlatego `/api/route` raportuje `avoidCountriesMode: "partial"`, a UI mówi wprost,
 * co dostawca zrobił (pełne wykluczenie = tylko HERE).
 */
const VIGNETTE_ISO3: Record<string, string> = {
  CH: "CHE",
  AT: "AUT",
  CZ: "CZE",
  SK: "SVK",
  HU: "HUN",
  SI: "SVN",
  BG: "BGR",
  RO: "ROU",
  MD: "MDA",
};

/**
 * #367: mapuje `options.avoidCountries` (ISO2) na kody ISO3 obsługiwane przez
 * `avoidVignette`. Kraje bez winiety (np. DE, PL, FR) są pomijane — TomTom nie
 * przyjmuje ich w tym parametrze. Kolejność zachowana, bez duplikatów.
 */
export function tomtomVignetteCodes(avoidCountries?: string[]): string[] {
  const out: string[] = [];
  for (const c of avoidCountries ?? []) {
    const iso3 = VIGNETTE_ISO3[c.trim().toUpperCase()];
    if (iso3 && !out.includes(iso3)) out.push(iso3);
  }
  return out;
}

/** Buduje URL TomTom Routing (czyste/testowalne). Lokalizacje literalne w ścieżce. */
export function buildTomTomRouteUrl(req: RouteRequest, apiKey: string): string {
  const pts = req.waypoints;
  if (pts.length < 2) throw new RangeError("Trasa wymaga co najmniej 2 punktów.");
  const locations = pts.map((p) => `${p.lat},${p.lng}`).join(":");

  const p: string[] = [
    `key=${apiKey}`,
    "routeType=fastest",
    "traffic=true",
    "computeTravelTimeFor=all",
    "sectionType=tollRoad",
  ];

  if (isTruck(req.profile?.kind)) {
    const pr = req.profile ?? {};
    p.push("travelMode=truck", "vehicleCommercial=true");
    p.push(`vehicleWeight=${pr.weightKg ?? 24000}`);
    if (pr.heightCm) p.push(`vehicleHeight=${(pr.heightCm / 100).toFixed(2)}`);
    if (pr.widthCm) p.push(`vehicleWidth=${(pr.widthCm / 100).toFixed(2)}`);
    if (pr.lengthCm) p.push(`vehicleLength=${(pr.lengthCm / 100).toFixed(2)}`);
    if (pr.axleCount) p.push(`vehicleNumberOfAxles=${pr.axleCount}`);
    // [#384] ADR — patrz komentarz w adapterze HERE. TomTom nazywa to inaczej,
    // ale znaczy to samo: `vehicleLoadType` mówi CO wieziemy, a kategoria tunelowa
    // KTÓRE tunele wolno pokonać.
    if (pr.adrTunnelCode) {
      p.push("vehicleLoadType=USHazmatClass1");
      p.push(`vehicleAdrTunnelRestrictionCode=${pr.adrTunnelCode}`);
    }
  } else {
    p.push("travelMode=car");
  }

  // TomTom: `avoid` to parametr powtarzalny (nie CSV).
  if (req.options?.avoidTolls) p.push("avoid=tollRoads");
  if (req.options?.avoidFerries) p.push("avoid=ferries");
  if (req.options?.avoidDirtRoads) p.push("avoid=unpavedRoads");

  // #367: częściowa obsługa `avoidCountries` — TomTom umie tylko omijać drogi
  // winietowe wskazanych krajów (CSV kodów ISO3, jak HERE `exclude[countries]`).
  // Pełnego wykluczenia kraju TomTom nie ma — komunikat o tym idzie z `/api/route`.
  const vignette = tomtomVignetteCodes(req.options?.avoidCountries);
  if (vignette.length) p.push(`avoidVignette=${vignette.join(",")}`);

  return `${TOMTOM_BASE}/routing/1/calculateRoute/${locations}/json?${p.join("&")}`;
}

interface TTPoint {
  latitude?: number;
  longitude?: number;
}
interface TTLeg {
  points?: TTPoint[];
}
/**
 * #383: sekcja trasy z TomTom Routing. `startPointIndex`/`endPointIndex` NIE liczą się
 * w obrębie legu — indeksują SPŁASZCZONĄ listę punktów całej trasy, czyli `legs[].points`
 * sklejone po kolei. Dokładnie taką listę buduje niżej `parseTomTomRoute` jako `geometry`
 * (jedna pętla po legach, jedna po punktach — bez pomijania punktu styku legów), więc
 * mapowanie sekcja→geometria jest 1:1. Zakres jest obustronnie DOMKNIĘTY.
 *
 * W praktyce ten adapter dostaje z `routeMultiLeg` zawsze dwa waypointy naraz, czyli
 * odpowiedź z jednym legiem — wielolegowa sklejka i przeliczanie indeksów dzieją się
 * poziom wyżej (`multileg.ts`). Mimo to indeksy są tu przycinane do długości `geometry`:
 * konwencji dostawcy nie sprawdzimy typem, a przycięty odcinek to najwyżej odrobinę
 * krótsze podświetlenie, podczas gdy indeks poza tablicą to błąd w warstwie mapy.
 */
interface TTSection {
  startPointIndex?: number;
  endPointIndex?: number;
  sectionType?: string;
}
interface TTRoute {
  summary?: {
    lengthInMeters?: number;
    travelTimeInSeconds?: number;
    trafficDelayInSeconds?: number;
  };
  legs?: TTLeg[];
  /**
   * Zwracane, bo `buildTomTomRouteUrl` wysyła `sectionType=tollRoad` w KAŻDYM zapytaniu.
   * TomTom dokłada do tego zawsze sekcję `TRAVEL_MODE` — stąd filtr po typie niżej.
   */
  sections?: TTSection[];
}
interface TTRouteResponse {
  routes?: TTRoute[];
}

/**
 * #383: TomTom w ODPOWIEDZI używa UPPER_SNAKE (`TOLL_ROAD`), a w ZAPYTANIU camelCase
 * (`tollRoad`) — normalizujemy obie formy, żeby zmiana konwencji po stronie dostawcy
 * nie wygasiła po cichu całej warstwy myta.
 */
function isTollRoadSection(type?: string): boolean {
  return type?.toUpperCase().replace(/_/g, "") === "TOLLROAD";
}

/**
 * Indeks w `geometry` dla pierwszego punktu o indeksie surowym >= `from` (albo -1).
 * Potrzebne, bo punkt bez współrzędnych nie trafia do `geometry` — patrz `parseTomTomRoute`.
 */
function firstGeomAtOrAfter(geomIndexByRaw: number[], from: number): number {
  for (let i = Math.max(0, from); i < geomIndexByRaw.length; i++) {
    const g = geomIndexByRaw[i] ?? -1;
    if (g >= 0) return g;
  }
  return -1;
}

/** Indeks w `geometry` dla ostatniego punktu o indeksie surowym <= `to` (albo -1). */
function lastGeomAtOrBefore(geomIndexByRaw: number[], to: number): number {
  for (let i = Math.min(geomIndexByRaw.length - 1, to); i >= 0; i--) {
    const g = geomIndexByRaw[i] ?? -1;
    if (g >= 0) return g;
  }
  return -1;
}

/**
 * #383: sekcje `TOLL_ROAD` → zakresy indeksów w `geometry`.
 * Indeksy przechodzą przez `geomIndexByRaw`, a nie prosto do wyniku: strażnik typów
 * w `parseTomTomRoute` potrafi odrzucić punkt bez `latitude`/`longitude`, a wtedy
 * `geometry` jest krótsza od listy punktów TomToma i każdy surowy indeks za dziurą
 * wskazywałby inne miejsce na mapie. Odcinki krótsze niż dwa punkty odrzucamy —
 * z jednego punktu nie da się narysować linii w MapLibre.
 */
function tomtomTollSections(sections: TTSection[], geomIndexByRaw: number[]): TollSection[] {
  const out: TollSection[] = [];
  for (const s of sections) {
    if (!isTollRoadSection(s.sectionType)) continue;
    const rawStart = s.startPointIndex;
    const rawEnd = s.endPointIndex;
    if (typeof rawStart !== "number" || typeof rawEnd !== "number") continue;
    const startIndex = firstGeomAtOrAfter(geomIndexByRaw, Math.min(rawStart, rawEnd));
    const endIndex = lastGeomAtOrBefore(geomIndexByRaw, Math.max(rawStart, rawEnd));
    if (startIndex < 0 || endIndex <= startIndex) continue;
    out.push({ startIndex, endIndex });
  }
  return out;
}

/** Parsuje odpowiedź TomTom Routing do wspólnego `RouteResult`. */
export function parseTomTomRoute(
  data: TTRouteResponse,
  provider: string,
  currency: string,
): RouteResult {
  const r = data.routes?.[0];
  if (!r?.summary) throw new Error("TomTom: brak trasy w odpowiedzi.");
  const geometry: LatLng[] = [];
  // #383: surowy indeks punktu TomToma → indeks w `geometry`. Zwykle 1:1, ale musi być
  // jawne, bo od tego zależy, czy odcinek płatny podświetli właściwy kawałek trasy.
  const geomIndexByRaw: number[] = [];
  for (const leg of r.legs ?? []) {
    for (const pt of leg.points ?? []) {
      if (typeof pt.latitude === "number" && typeof pt.longitude === "number") {
        geomIndexByRaw.push(geometry.length);
        geometry.push({ lat: pt.latitude, lng: pt.longitude });
      } else {
        geomIndexByRaw.push(-1);
      }
    }
  }

  // Brak pola `sections` = odpowiedź nic nie mówi o odcinkach płatnych. To NIE znaczy
  // „nie ma dróg płatnych" — dlatego `known: false`, a nie pusta lista jako fakt.
  const tollSections: TollSections = r.sections
    ? { known: true, sections: tomtomTollSections(r.sections, geomIndexByRaw) }
    : unknownTollSections();

  return {
    // [#384] TomTom nie zwraca uwag do trasy w tym endpointcie — pusta lista
    // znaczy „nic nie zgłosił", a nie „nie sprawdziliśmy".
    notices: [],
    distanceKm: round2((r.summary.lengthInMeters ?? 0) / 1000),
    durationMin: round2((r.summary.travelTimeInSeconds ?? 0) / 60),
    // TomTom Routing podaje PRZEBIEG dróg płatnych, ale nie ich cenę — koszt dolicza
    // osobno `/api/route` (estymata), stąd 0 mimo niepustych `tollSections`.
    tollCost: 0,
    currency,
    segments: [],
    geometry,
    tollSections,
    provider,
  };
}

/** Adapter TomTom Routing — TIR (wymiary/tonaż/osie), ruch na żywo, geometria. */
export class TomTomRoutingProvider implements RoutingProvider {
  readonly name = "tomtom";

  constructor(private readonly apiKey: string) {}

  async route(req: RouteRequest): Promise<RouteResult> {
    if (req.waypoints.length < 2) throw new RangeError("Trasa wymaga co najmniej 2 punktów.");
    const res = await tomtomFetch(buildTomTomRouteUrl(req, this.apiKey));
    if (!res.ok) throw new Error(`TomTom Routing: ${res.status}`);
    const data = (await res.json()) as TTRouteResponse;
    return parseTomTomRoute(data, this.name, req.currency ?? "EUR");
  }
}
