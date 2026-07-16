import { round2 } from "@e-logistic/core";
import {
  createRoutingProvider,
  estimateTollEur,
  estimateTruckDurationMin,
  type RouteRequest,
  routeMultiLeg,
} from "@e-logistic/maps";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// Walidacja wejścia (P2 z audytu) — chroni płatne API (HERE/GraphHopper) przed nadużyciem.
const waypointSchema = z.object({ lat: z.number().finite(), lng: z.number().finite() });
const routeBodySchema = z.object({
  waypoints: z.array(waypointSchema).min(2).max(25),
  profile: z
    .object({
      kind: z.string().optional(),
      weightKg: z.number().optional(),
      heightCm: z.number().optional(),
      widthCm: z.number().optional(),
      lengthCm: z.number().optional(),
      axleCount: z.number().optional(),
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
 * Serwerowe wytyczanie trasy przez przystanki. Klucze czytane z env po stronie
 * serwera (nigdy w bundlu). Priorytet dostawcy: HERE (realny routing TIR z wymiarami
 * + prawdziwe myto + ruch) → TomTom (TIR + ruch; myto doszacowane, tollCost:0) →
 * GraphHopper (car; myto doszacowane) → mock (bez klucza).
 * Trasa liczona odcinkami (routeMultiLeg) → myto/dystans z podziałem na odcinki.
 */
export async function POST(request: Request) {
  if (!(await rateLimit(request, "route")).ok) {
    return NextResponse.json({ error: "Za dużo żądań — spróbuj za chwilę." }, { status: 429 });
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

  try {
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

    return NextResponse.json({
      ...result,
      durationMin,
      durationEstimated,
      segments,
      tollCost,
      tollEstimated,
    });
  } catch (e) {
    const mock = await routeMultiLeg(createRoutingProvider(), body);
    return NextResponse.json({
      ...mock,
      durationMin: estimateTruckDurationMin(mock.distanceKm),
      durationEstimated: true,
      tollEstimated: false,
      fallback: true,
      error: e instanceof Error ? e.message : "Błąd routingu",
    });
  }
}
