import { fetchFuelPrices } from "@e-logistic/maps";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// Walidacja query (P2 #8) — współrzędne w zakresie, promień ograniczony (anty-abuse zewnętrznego API).
const querySchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lng: z.coerce.number().finite().min(-180).max(180),
  radius: z.coerce.number().finite().min(1).max(25).default(10),
});

/**
 * Ceny paliwa w okolicy punktu (Tankerkönig, Niemcy). Klucz `FUEL_PRICE_API_KEY`
 * czytany wyłącznie po stronie serwera. Bez klucza zwraca `configured:false`.
 * Query: ?lat=..&lng=..&radius=.. (km).
 */
export async function GET(request: Request) {
  if (!(await rateLimit(request, "fuel-prices")).ok) {
    return NextResponse.json({ error: "Za dużo żądań." }, { status: 429 });
  }
  const key = process.env.FUEL_PRICE_API_KEY;
  if (!key) {
    return NextResponse.json({ configured: false, stations: [] });
  }
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    lat: searchParams.get("lat") ?? undefined,
    lng: searchParams.get("lng") ?? undefined,
    radius: searchParams.get("radius") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Wymagane poprawne lat/lng (radius 1–25 km)." },
      { status: 400 },
    );
  }
  const { lat, lng, radius: radiusKm } = parsed.data;
  try {
    const stations = await fetchFuelPrices({ lat, lng, radiusKm }, key);
    return NextResponse.json({ configured: true, stations });
  } catch (e) {
    return NextResponse.json(
      { configured: true, stations: [], error: e instanceof Error ? e.message : "Błąd cen paliwa" },
      { status: 502 },
    );
  }
}
