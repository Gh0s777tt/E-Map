import { round2 } from "@e-logistic/core";
import {
  createRoutingProvider,
  estimateTollEur,
  type RouteRequest,
  routeMultiLeg,
} from "@e-logistic/maps";
import { NextResponse } from "next/server";
import { z } from "zod";

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
 * + prawdziwe myto + ruch) → GraphHopper (car; myto doszacowane) → mock (bez klucza).
 * Trasa liczona odcinkami (routeMultiLeg) → myto/dystans z podziałem na odcinki.
 */
export async function POST(request: Request) {
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
  const provider = hereKey
    ? createRoutingProvider({ provider: "here", apiKey: hereKey })
    : ghKey
      ? createRoutingProvider({ provider: "graphhopper", apiKey: ghKey })
      : createRoutingProvider();

  try {
    const result = await routeMultiLeg(provider, body);

    let { segments, tollCost } = result;
    let tollEstimated = false;
    // Tylko GraphHopper nie zwraca myta → doszacowujemy. HERE podaje realne myto.
    if (provider.name === "graphhopper" && tollCost === 0 && !body.options?.avoidTolls) {
      segments = result.segments.map((s) => ({
        ...s,
        tollCost: estimateTollEur(s.distanceKm, { weightKg: body.profile?.weightKg }),
      }));
      tollCost = round2(segments.reduce((acc, s) => acc + s.tollCost, 0));
      tollEstimated = true;
    }

    return NextResponse.json({ ...result, segments, tollCost, tollEstimated });
  } catch (e) {
    const mock = await routeMultiLeg(createRoutingProvider(), body);
    return NextResponse.json({
      ...mock,
      tollEstimated: false,
      fallback: true,
      error: e instanceof Error ? e.message : "Błąd routingu",
    });
  }
}
