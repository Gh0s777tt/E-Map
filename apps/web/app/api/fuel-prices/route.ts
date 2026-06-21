import { fetchFuelPrices } from "@e-logistic/maps";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Ceny paliwa w okolicy punktu (Tankerkönig, Niemcy). Klucz `FUEL_PRICE_API_KEY`
 * czytany wyłącznie po stronie serwera. Bez klucza zwraca `configured:false`.
 * Query: ?lat=..&lng=..&radius=.. (km).
 */
export async function GET(request: Request) {
  const key = process.env.FUEL_PRICE_API_KEY;
  if (!key) {
    return NextResponse.json({ configured: false, stations: [] });
  }
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radiusKm = Number(searchParams.get("radius")) || 10;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Wymagane lat/lng." }, { status: 400 });
  }
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
