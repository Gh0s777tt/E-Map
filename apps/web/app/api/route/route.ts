import { round2 } from "@e-logistic/core";
import {
  createRoutingProvider,
  estimateTollEur,
  type RouteRequest,
  routeMultiLeg,
} from "@e-logistic/maps";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Serwerowe wytyczanie trasy przez przystanki. Klucz GraphHopper czytany z env
 * po stronie serwera (nigdy w bundlu). Bez klucza → provider mock. Trasa liczona
 * odcinkami (routeMultiLeg) → myto/dystans z podziałem na odcinki. GraphHopper free
 * nie zwraca myta, więc doszacowujemy je per odcinek (flaga `tollEstimated`).
 */
export async function POST(request: Request) {
  const body = (await request.json()) as RouteRequest;
  if (!Array.isArray(body.waypoints) || body.waypoints.length < 2) {
    return NextResponse.json({ error: "Wymagane min. 2 punkty trasy." }, { status: 400 });
  }

  const key = process.env.GRAPHHOPPER_API_KEY;
  const provider = key
    ? createRoutingProvider({ provider: "graphhopper", apiKey: key })
    : createRoutingProvider();

  try {
    const result = await routeMultiLeg(provider, body);

    let { segments, tollCost } = result;
    let tollEstimated = false;
    if (tollCost === 0 && !body.options?.avoidTolls && provider.name !== "mock") {
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
