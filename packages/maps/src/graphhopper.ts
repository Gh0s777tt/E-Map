import { round2 } from "@e-logistic/core";
import {
  type LatLng,
  type RouteNotice,
  type RouteRequest,
  type RouteResult,
  type RoutingProvider,
  unknownTollSections,
  type VehicleKind,
} from "./types";

/**
 * [#385] Uwaga o degradacji do trasy osobowej.
 *
 * Zwraca coś tylko wtedy, gdy proszono o pojazd wymagający profilu ciężarowego,
 * a profil jest wyłączony — czyli dokładnie w sytuacji, w której wynik jest inny,
 * niż wywołujący sądzi.
 */
export function downgradeNotices(req: RouteRequest, opts: GraphHopperOptions): RouteNotice[] {
  const kind = req.profile?.kind;
  const needsTruck = kind === "truck" || kind === "tractor" || kind === "trailer";
  if (!needsTruck || opts.truckProfile) return [];
  return [
    {
      code: "profileDowngradedToCar",
      title:
        "GraphHopper policzył trasę profilem osobowym — profil ciężarowy jest wyłączony, " +
        "więc wiadukty, tonaż i zakazy dla ciężarówek NIE zostały uwzględnione.",
      severity: "critical",
    },
  ];
}

/** Mapuje typ pojazdu E-Logistic na profil GraphHopper. */
export function graphHopperProfile(kind?: VehicleKind): string {
  switch (kind) {
    case "van":
      return "small_truck";
    case "truck":
    case "tractor":
    case "trailer":
      return "truck";
    default:
      return "car";
  }
}

export interface GraphHopperOptions {
  /** Włącz profile TIR (truck/small_truck) — wymaga planu płatnego GraphHopper. */
  truckProfile?: boolean;
}

/** Buduje ciało żądania GraphHopper Routing API (czyste, testowalne). */
export function buildGraphHopperBody(
  req: RouteRequest,
  opts: GraphHopperOptions = {},
): Record<string, unknown> {
  return {
    profile: opts.truckProfile ? graphHopperProfile(req.profile?.kind) : "car",
    points: req.waypoints.map((p) => [p.lng, p.lat]),
    points_encoded: false,
    locale: "pl",
    instructions: false,
  };
}

interface GhPath {
  distance: number; // metry
  time: number; // ms
  points?: { coordinates?: [number, number][] };
}

/**
 * Adapter GraphHopper (hosted). Wymaga klucza API.
 * UWAGA: implementacja sieciowa nie jest testowana wobec żywego API —
 * domyślnym dostawcą pozostaje mock; tu jest gotowy szkielet do włączenia.
 */
export class GraphHopperRoutingProvider implements RoutingProvider {
  readonly name = "graphhopper";

  constructor(
    private readonly apiKey: string,
    private readonly opts: GraphHopperOptions = {},
  ) {}

  async route(req: RouteRequest): Promise<RouteResult> {
    if (req.waypoints.length < 2) throw new RangeError("Trasa wymaga co najmniej 2 punktów.");

    const res = await fetch(`https://graphhopper.com/api/1/route?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildGraphHopperBody(req, this.opts)),
    });
    if (!res.ok) throw new Error(`GraphHopper API: ${res.status}`);

    const data = (await res.json()) as { paths?: GhPath[] };
    const path = data.paths?.[0];
    if (!path) throw new Error("GraphHopper: brak trasy w odpowiedzi.");

    const distanceKm = round2(path.distance / 1000);
    // Odporność: trasa może wrócić bez geometrii (brak `points`) — dystans/czas
    // pozostają poprawne, geometria pusta (zamiast TypeError na `.coordinates`).
    const coords = path.points?.coordinates ?? [];
    const geometry: LatLng[] = coords.map(([lng, lat]) => ({ lat, lng }));

    return {
      distanceKm,
      durationMin: round2(path.time / 60000),
      tollCost: 0, // GraphHopper podstawowy nie zwraca myta — do uzupełnienia (custom_model/PTV)
      currency: req.currency ?? "EUR",
      segments: [],
      geometry,
      // #383: `instructions: false` i brak `details=toll` — GraphHopper w tej konfiguracji
      // nie mówi nic o drogach płatnych. Pusta lista z `known: false`, żeby mapa nie
      // twierdziła, że trasa jest bezpłatna.
      // [#385] GraphHopper sam uwag nie zwraca, ale JEDNĄ musimy zgłosić my.
      //
      // Profil TIR jest tu domyślnie wyłączony (`truckProfile: false`), bo wymaga
      // płatnego planu GraphHoppera. Przy wyłączonym profilu trasa liczy się jak
      // dla samochodu osobowego — bez wiaduktów, tonażu i zakazów dla ciężarówek —
      // i dotąd nic o tym nie mówiło. Trasa osobowa wyglądała identycznie jak trasa TIR.
      //
      // Nie włączamy profilu domyślnie, bo bez odpowiedniego planu żądanie po prostu
      // padnie. Zamiast tego degradacja przestaje być niewidoczna.
      notices: downgradeNotices(req, this.opts),
      tollSections: unknownTollSections(),
      provider: this.name,
    };
  }
}
