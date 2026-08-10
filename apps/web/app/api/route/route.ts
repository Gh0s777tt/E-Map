import { round2 } from "@e-logistic/core";
import {
  cachedCall,
  createRoutingProvider,
  estimateTollEur,
  estimateTruckDurationMin,
  type RouteRequest,
  type RoutingProvider,
  routeCacheKey,
  routeMultiLeg,
  tomtomVignetteCodes,
} from "@e-logistic/maps";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/lib/apiAuth";
import { rateLimit } from "@/lib/ratelimit";
import { type RouteApiPayload, routeCache } from "./cache";

export const dynamic = "force-dynamic";

// Walidacja wejścia (P2 z audytu) — chroni płatne API (HERE/GraphHopper) przed nadużyciem.
const waypointSchema = z.object({ lat: z.number().finite(), lng: z.number().finite() });
const routeBodySchema = z.object({
  waypoints: z.array(waypointSchema).min(2).max(25),
  /**
   * [#384] Profil pojazdu walidowany ostro, bo dwa błędy przechodziły tu bez śladu.
   *
   * `kind` był `z.string()`, więc „TRUCK" wielkimi literami przechodziło walidację,
   * a `isTruck()` zwracało `false` — trasa po cichu stawała się osobowa i cały
   * komplet gabarytów był wyrzucany. Odpowiedź nie zawierała niczego, co by o tym
   * mówiło. Teraz to enum: literówka jest błędem 400, a nie cichą podmianą trasy.
   *
   * Liczby nie miały zakresów, więc `heightCm: -5` albo `weightKg: 1e9` szły prosto
   * do płatnego API dostawcy. Górne granice są hojne (60 t, 6 m wysokości, 30 m
   * długości, 12 osi) — mają odsiewać bzdury i nadużycia, nie realne zestawy.
   */
  profile: z
    .object({
      kind: z.enum(["truck", "tractor", "van", "trailer", "other"]).optional(),
      weightKg: z.number().int().positive().max(60_000).optional(),
      heightCm: z.number().int().positive().max(600).optional(),
      widthCm: z.number().int().positive().max(400).optional(),
      lengthCm: z.number().int().positive().max(3000).optional(),
      axleCount: z.number().int().positive().max(12).optional(),
      adrTunnelCode: z.enum(["B", "C", "D", "E"]).optional(),
      emissionClass: z.enum(["euro3", "euro4", "euro5", "euro6"]).optional(),
    })
    .optional(),
  options: z
    .object({
      avoidTolls: z.boolean().optional(),
      avoidFerries: z.boolean().optional(),
      avoidCarTrains: z.boolean().optional(),
      avoidDirtRoads: z.boolean().optional(),
      avoidCountries: z.array(z.string()).optional(),
    })
    .optional(),
  currency: z.string().optional(),
});

/**
 * Wyznaczenie trasy u dostawcy + doszacowania (myto/czas). Wydzielone z handlera,
 * bo to właśnie ta część kosztuje i to ona idzie do pamięci podręcznej (#368).
 * Wynik zależy wyłącznie od `body` i dostawcy — czyli od tego, co składa się na
 * klucz cache (`routeCacheKey`).
 */
async function computeRoute(
  provider: RoutingProvider,
  body: RouteRequest,
  avoidCountriesMode: "full" | "partial" | "none" | undefined,
): Promise<RouteApiPayload> {
  const result = await routeMultiLeg(provider, body);

  let { segments, tollCost } = result;
  let tollEstimated = false;
  // GraphHopper i TomTom nie zwracają myta (TomTom tollCost:0) → doszacowujemy.
  // HERE podaje realne myto.
  if (
    (provider.name === "graphhopper" || provider.name === "tomtom") &&
    tollCost === 0 &&
    !body.options?.avoidTolls
  ) {
    segments = result.segments.map((s) => ({
      ...s,
      tollCost: estimateTollEur(s.distanceKm, { weightKg: body.profile?.weightKg }),
    }));
    tollCost = round2(segments.reduce((acc, s) => acc + s.tollCost, 0));
    tollEstimated = true;
  }

  // HERE i TomTom zwracają realny ETA z ruchem; mock/GraphHopper(car) — szacujemy
  // czas jazdy ciężarówki z dystansu (realna średnia TIR), bo profil „car" jest zbyt szybki.
  const durationMin =
    provider.name === "here" || provider.name === "tomtom"
      ? result.durationMin
      : estimateTruckDurationMin(result.distanceKm);
  const durationEstimated = provider.name !== "here" && provider.name !== "tomtom";

  return {
    ...result,
    durationMin,
    durationEstimated,
    segments,
    tollCost,
    tollEstimated,
    avoidCountriesMode,
  };
}

/**
 * Serwerowe wytyczanie trasy przez przystanki. Klucze czytane z env po stronie
 * serwera (nigdy w bundlu). Priorytet dostawcy: HERE (realny routing TIR z wymiarami
 * + prawdziwe myto + ruch) → TomTom (TIR + ruch; myto doszacowane, tollCost:0) →
 * GraphHopper (car; myto doszacowane) → mock (bez klucza).
 * Trasa liczona odcinkami (routeMultiLeg) → myto/dystans z podziałem na odcinki.
 * #368: wynik dostawcy trafia do pamięci podręcznej (`./cache`) — powtórzone
 * zapytanie o tę samą trasę nie płaci drugi raz. Ścieżka awaryjna (mock) NIE jest
 * pamiętana, żeby usterka dostawcy nie przykleiła się do trasy na całe TTL.
 */
export async function POST(request: Request) {
  if (!(await rateLimit(request, "route")).ok) {
    return NextResponse.json({ error: "Za dużo żądań — spróbuj za chwilę." }, { status: 429 });
  }
  // Płatne API routingu (HERE/TomTom/GraphHopper) — tylko dla zalogowanych (audyt Ś16).
  // Sesja: ciasteczko (web) lub Bearer access token (mobile). Brak → 401.
  if (!(await authenticateRequest(request))) {
    return NextResponse.json({ error: "Wymagane zalogowanie." }, { status: 401 });
  }
  const raw = await request.json().catch(() => null);
  const parsed = routeBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane trasy (min. 2 punkty, poprawne współrzędne)." },
      { status: 400 },
    );
  }
  const body = parsed.data as RouteRequest;

  const hereKey = process.env.HERE_API_KEY;
  const ghKey = process.env.GRAPHHOPPER_API_KEY;
  const ttKey = process.env.TOMTOM_API_KEY;
  const provider = hereKey
    ? createRoutingProvider({ provider: "here", apiKey: hereKey })
    : ttKey
      ? createRoutingProvider({ provider: "tomtom", apiKey: ttKey })
      : ghKey
        ? createRoutingProvider({ provider: "graphhopper", apiKey: ghKey })
        : createRoutingProvider();

  // #367: wykluczanie krajów (`options.avoidCountries`) realizuje w pełni tylko HERE
  // (`exclude[countries]`). TomTom potrafi ominąć wyłącznie drogi winietowe we wskazanych
  // krajach (`avoidVignette`), GraphHopper i mock — nic. Bez tej informacji checkbox
  // „Omijaj Szwajcarię" bywał po cichu ignorowany.
  //
  // Rozróżniamy TRZY stany zamiast jednego bitu — inaczej komunikat kłamałby o TomTomie,
  // który realnie omija winiety: `full` (HERE), `partial` (TomTom, gdy któryś z krajów
  // jest winietowy), `none` (nic nie zastosowano). `undefined` = użytkownik nic nie prosił.
  const requestedCountries = body.options?.avoidCountries ?? [];
  const avoidCountriesMode: "full" | "partial" | "none" | undefined =
    requestedCountries.length === 0
      ? undefined
      : provider.name === "here"
        ? "full"
        : provider.name === "tomtom" && tomtomVignetteCodes(requestedCountries).length > 0
          ? "partial"
          : "none";

  // #368: klucz obejmuje dostawcę, punkty, profil, opcje `avoid*` i walutę —
  // czyli komplet danych wpływających na odpowiedź. Trasa policzona przed chwilą
  // z tymi samymi parametrami (auto-reroute #309, ponowne „Wyznacz trasę")
  // nie płaci drugi raz.
  //
  // Trafienia NIE zdradzamy w treści odpowiedzi: cache jest współdzielony przez wszystkich
  // zalogowanych, więc `cached: true` mówiłoby użytkownikowi firmy A, że ktoś inny liczył
  // przed chwilą dokładnie tę trasę (klucz to konkretne współrzędne i profil pojazdu) —
  // czyli działałoby jak oracle o aktywności innych najemców. Podgląd „czy cache działa"
  // zostaje, ale jako nagłówek techniczny i tylko poza produkcją.
  const key = routeCacheKey(body, provider.name);
  const fromCache = routeCache.get(key) !== undefined;
  try {
    const payload = await cachedCall(routeCache, key, () =>
      computeRoute(provider, body, avoidCountriesMode),
    );
    const res = NextResponse.json(payload);
    if (process.env.NODE_ENV !== "production") {
      res.headers.set("x-route-cache", fromCache ? "hit" : "miss");
    }
    return res;
  } catch (e) {
    const mock = await routeMultiLeg(createRoutingProvider(), body);
    return NextResponse.json({
      ...mock,
      durationMin: estimateTruckDurationMin(mock.distanceKm),
      durationEstimated: true,
      tollEstimated: false,
      // Fallback to mock — na pewno nie wyklucza krajów.
      avoidCountriesMode: requestedCountries.length > 0 ? ("none" as const) : undefined,
      fallback: true,
      error: e instanceof Error ? e.message : "Błąd routingu",
    });
  }
}
