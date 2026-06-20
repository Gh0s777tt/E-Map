import { createRoutingProvider, estimateTollEur, type RouteRequest } from "@e-logistic/maps";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Serwerowe wytyczanie trasy. Klucz GraphHopper czytany z env po stronie serwera
 * (nigdy w bundlu klienta). Bez klucza → provider mock. GraphHopper free nie zwraca
 * myta, więc doszacowujemy je z dystansu (flaga `tollEstimated`).
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
    const result = await provider.route(body);

    let { tollCost } = result;
    let tollEstimated = false;
    if (tollCost === 0 && !body.options?.avoidTolls && provider.name !== "mock") {
      tollCost = estimateTollEur(result.distanceKm, { weightKg: body.profile?.weightKg });
      tollEstimated = true;
    }

    return NextResponse.json({ ...result, tollCost, tollEstimated });
  } catch (e) {
    // Fallback na mock, gdy dostawca zawiedzie (np. limit/sieć).
    const mock = await createRoutingProvider().route(body);
    return NextResponse.json({
      ...mock,
      tollEstimated: false,
      fallback: true,
      error: e instanceof Error ? e.message : "Błąd routingu",
    });
  }
}
