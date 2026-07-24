/**
 * Adapter TomTom (#356) — routing TIR przez TomTom Routing API v1.
 * Truck mode z wymiarami/tonażem/osiami, świadomy ruchu (traffic=true), z
 * geometrią trasy. TomTom Routing nie zwraca KOSZTU myta (tylko odcinki płatne),
 * więc `tollCost` = 0 (do estymacji osobnym warstwą). Klucz TomTom jest kluczem
 * klienta (jak MapTiler/Supabase anon) — dopuszczalny w EXPO_PUBLIC.
 */
import { round2 } from "@e-logistic/core";
import type { LatLng, RouteRequest, RouteResult, RoutingProvider, VehicleKind } from "./types";

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
interface TTRoute {
  summary?: {
    lengthInMeters?: number;
    travelTimeInSeconds?: number;
    trafficDelayInSeconds?: number;
  };
  legs?: TTLeg[];
}
interface TTRouteResponse {
  routes?: TTRoute[];
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
  for (const leg of r.legs ?? []) {
    for (const pt of leg.points ?? []) {
      if (typeof pt.latitude === "number" && typeof pt.longitude === "number") {
        geometry.push({ lat: pt.latitude, lng: pt.longitude });
      }
    }
  }
  return {
    distanceKm: round2((r.summary.lengthInMeters ?? 0) / 1000),
    durationMin: round2((r.summary.travelTimeInSeconds ?? 0) / 60),
    tollCost: 0,
    currency,
    segments: [],
    geometry,
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
