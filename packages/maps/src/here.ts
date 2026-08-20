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

/** HERE: tryb transportu wg typu pojazdu (truck → routing TIR z wymiarami/tonażem). */
function hereTransportMode(kind?: VehicleKind): "truck" | "car" {
  return kind === "truck" || kind === "tractor" || kind === "trailer" ? "truck" : "car";
}

/** Przybliżone kursy do EUR (myto bywa w walutach lokalnych: PLN, CZK, HUF…). */
const FX_TO_EUR: Record<string, number> = {
  EUR: 1,
  PLN: 0.23,
  CZK: 0.04,
  HUF: 0.0025,
  CHF: 1.05,
  GBP: 1.17,
  DKK: 0.134,
  SEK: 0.088,
  NOK: 0.086,
  RON: 0.2,
  BGN: 0.51,
  HRK: 0.133,
  TRY: 0.028,
};

const COUNTRY_ISO3: Record<string, string> = {
  CH: "CHE",
  AT: "AUT",
  DE: "DEU",
  FR: "FRA",
  IT: "ITA",
  PL: "POL",
  CZ: "CZE",
  SK: "SVK",
  NL: "NLD",
  BE: "BEL",
};

/** Buduje URL HERE Routing v8 (czyste, testowalne). Brackets zostają literalne. */
export function buildHereUrl(req: RouteRequest, apiKey: string, departureTime?: string): string {
  const pts = req.waypoints;
  const origin = pts[0];
  const destination = pts[pts.length - 1];
  if (!origin || !destination) throw new RangeError("Trasa wymaga co najmniej 2 punktów.");

  const mode = hereTransportMode(req.profile?.kind);
  const p: string[] = [
    `transportMode=${mode}`,
    `origin=${origin.lat},${origin.lng}`,
    `destination=${destination.lat},${destination.lng}`,
    "return=summary,polyline,tolls",
    `apikey=${apiKey}`,
  ];
  // Routing świadomy ruchu (ETA z korkami) — HERE wymaga ISO 8601 (nie „now").
  if (departureTime) p.push(`departureTime=${encodeURIComponent(departureTime)}`);

  for (const v of pts.slice(1, -1)) p.push(`via=${v.lat},${v.lng}`);

  if (mode === "truck") {
    const pr = req.profile ?? {};
    p.push(`truck[grossWeight]=${pr.weightKg ?? 24000}`);
    if (pr.heightCm) p.push(`truck[height]=${pr.heightCm}`);
    if (pr.widthCm) p.push(`truck[width]=${pr.widthCm}`);
    if (pr.lengthCm) p.push(`truck[length]=${pr.lengthCm}`);
    p.push(`truck[axleCount]=${pr.axleCount ?? 5}`);
    // [#384] ADR: kategoria tunelowa decyduje, przez które tunele zestaw
    // z materiałem niebezpiecznym MOŻE przejechać. Bez tego parametru dostawca
    // liczy trasę tak, jakby ładunek był zwykły — a kontrola przy wjeździe
    // do tunelu kończy się zawróceniem, nie ostrzeżeniem.
    if (pr.adrTunnelCode) {
      p.push("truck[shippedHazardousGoods]=explosive");
      p.push(`truck[tunnelCategory]=${pr.adrTunnelCode}`);
    }
  }

  const avoidFeatures: string[] = [];
  if (req.options?.avoidTolls) avoidFeatures.push("tollRoad");
  if (req.options?.avoidFerries) avoidFeatures.push("ferry");
  if (avoidFeatures.length) p.push(`avoid[features]=${avoidFeatures.join(",")}`);

  const iso3 = (req.options?.avoidCountries ?? [])
    .map((c) => COUNTRY_ISO3[c.toUpperCase()] ?? "")
    .filter(Boolean);
  if (iso3.length) p.push(`exclude[countries]=${iso3.join(",")}`);

  return `https://router.hereapi.com/v8/routes?${p.join("&")}`;
}

// ── Dekoder HERE Flexible Polyline (alfabet URL-safe base64) ────────
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function decodeUnsigned(encoded: string): number[] {
  let result = 0;
  let shift = 0;
  const out: number[] = [];
  for (const ch of encoded) {
    const value = ALPHABET.indexOf(ch);
    if (value < 0) continue;
    result |= (value & 0x1f) << shift;
    if ((value & 0x20) === 0) {
      out.push(result);
      result = 0;
      shift = 0;
    } else {
      shift += 5;
    }
  }
  return out;
}

function toSigned(v: number): number {
  let res = v;
  if (res & 1) res = ~res;
  res >>= 1;
  return res;
}

/** Dekoduje HERE flexible polyline do listy punktów (ignoruje 3. wymiar). */
export function decodeFlexiblePolyline(encoded: string): LatLng[] {
  const nums = decodeUnsigned(encoded);
  const version = nums[0] ?? 1;
  if (version !== 1) return [];
  let header = nums[1] ?? 0;
  const precision = header & 15;
  header >>= 4;
  const thirdDim = header & 7;
  const factor = 10 ** precision;

  const out: LatLng[] = [];
  let lat = 0;
  let lng = 0;
  const stride = thirdDim ? 3 : 2;
  for (let i = 2; i + 1 < nums.length; i += stride) {
    lat += toSigned(nums[i] ?? 0);
    lng += toSigned(nums[i + 1] ?? 0);
    out.push({ lat: lat / factor, lng: lng / factor });
  }
  return out;
}

interface HereFare {
  price?: { value?: number; currency?: string };
}
interface HereToll {
  fares?: HereFare[];
}
interface HereSection {
  summary?: { length?: number; duration?: number };
  polyline?: string;
  tolls?: HereToll[];
  notices?: HereNotice[];
}
interface HereNotice {
  code?: string;
  title?: string;
  severity?: string;
}
interface HereResponse {
  // Uwagi bywają na poziomie trasy i sekcji — czytamy oba, bo ostrzeżenie
  // o zignorowanym gabarycie potrafi przyjść przy konkretnym odcinku.
  routes?: { sections?: HereSection[]; notices?: HereNotice[] }[];
  notices?: HereNotice[];
}

/**
 * [#384] Uwagi HERE → wspólny kształt. Pole było zadeklarowane i nigdy nieczytane,
 * a to jedyny kanał, którym dostawca mówi „nie dało się uwzględnić twojego parametru
 * i policzyłem trasę bez niego".
 */
function readHereNotices(data: HereResponse): RouteNotice[] {
  const raw = [
    ...(data.notices ?? []),
    ...(data.routes?.[0]?.notices ?? []),
    ...(data.routes?.[0]?.sections ?? []).flatMap((s) => s.notices ?? []),
  ];
  const out: RouteNotice[] = [];
  const seen = new Set<string>();
  for (const n of raw) {
    const code = (n?.code ?? "").trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push({ code, title: n?.title, severity: n?.severity });
  }
  return out;
}

/** Ten sam parser co w adapterze — wystawiony do testu, bo odpowiedź HERE
 *  przychodzi z sieci i nie da się jej podać inaczej bez atrapy fetch. */
export const readHereNoticesForTest = readHereNotices;

/** Adapter HERE Routing v8 — TIR (wymiary/tonaż), realne myto, ruch (departureTime=now). */
export class HereRoutingProvider implements RoutingProvider {
  readonly name = "here";

  constructor(private readonly apiKey: string) {}

  async route(req: RouteRequest): Promise<RouteResult> {
    if (req.waypoints.length < 2) throw new RangeError("Trasa wymaga co najmniej 2 punktów.");

    const res = await fetch(buildHereUrl(req, this.apiKey, new Date().toISOString()));
    if (!res.ok) throw new Error(`HERE API: ${res.status}`);
    const data = (await res.json()) as HereResponse;

    const sections = data.routes?.[0]?.sections;
    if (!sections || sections.length === 0) throw new Error("HERE: brak trasy w odpowiedzi.");

    let lengthM = 0;
    let durationS = 0;
    let tollEur = 0;
    // [#390] Ile bramek pominięto z powodu nieznanej waluty — trafia do uwag,
    // żeby niepełne myto było widoczne, a nie ciche.
    let tollSkipped = 0;
    let geometry: LatLng[] = [];

    for (const s of sections) {
      lengthM += s.summary?.length ?? 0;
      durationS += s.summary?.duration ?? 0;
      if (s.polyline) geometry = geometry.concat(decodeFlexiblePolyline(s.polyline));
      /*
       * Każda bramka ma jedną stawkę; waluty bywają lokalne (PLN/CZK/…) → normalizujemy do EUR.
       *
       * [#390] Waluta spoza tabeli była wcześniej mnożona przez `?? 1`, czyli
       * traktowana jak euro. Dla waluty słabszej od euro zawyżało to myto
       * wielokrotnie (100 jednostek lokalnych wchodziło jako 100 €), a wynik
       * nie różnił się niczym od kwoty prawdziwej — ani na ekranie, ani w
       * rachunku wyjazdu. Trasa droższa „na papierze" bywa odrzucana przez
       * spedytora na rzecz gorszej, więc błąd nie kończył się na liczbie.
       *
       * Teraz taka pozycja jest POMIJANA i zliczana osobno. Myto niepełne,
       * o którym wiadomo, jest uczciwsze niż myto zawyżone, o którym nie wiadomo.
       */
      for (const t of s.tolls ?? []) {
        const f = t.fares?.[0];
        const v = f?.price?.value;
        if (typeof v !== "number") continue;
        const cur = f?.price?.currency ?? "EUR";
        const kurs = FX_TO_EUR[cur];
        if (kurs === undefined) {
          tollSkipped += 1;
          continue;
        }
        tollEur += v * kurs;
      }
    }

    return {
      notices: [
        ...readHereNotices(data),
        // Uwaga dołączana tylko wtedy, gdy realnie coś pominięto. Kod własny
        // (`toll.currencyUnknown`) odróżnia ją od uwag przysłanych przez HERE.
        ...(tollSkipped > 0
          ? [
              {
                code: "toll.currencyUnknown",
                title: `Myto niepełne: ${tollSkipped} ${tollSkipped === 1 ? "bramka" : "bramek"} w walucie bez kursu`,
                severity: "warning",
              },
            ]
          : []),
      ],
      distanceKm: round2(lengthM / 1000),
      durationMin: round2(durationS / 60),
      tollCost: round2(tollEur),
      currency: "EUR",
      segments: [],
      geometry,
      // #383: HERE zna KOSZT myta (`tolls`), ale nie mówi, KTÓRĘDY ono biegnie —
      // przebieg wymagałby `return=...,spans` i `spans=tollSystems`, czego tu nie
      // zamawiamy. Więc „brak danych o odcinkach", a nie „brak dróg płatnych":
      // przy `tollCost > 0` to drugie byłoby jawną nieprawdą.
      tollSections: unknownTollSections(),
      provider: this.name,
    };
  }
}
