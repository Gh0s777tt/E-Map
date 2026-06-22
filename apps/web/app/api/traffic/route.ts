import { buildHereTrafficUrl, parseHereTraffic } from "@e-logistic/maps";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const bboxSchema = z.object({
  west: z.number().finite(),
  south: z.number().finite(),
  east: z.number().finite(),
  north: z.number().finite(),
});

/**
 * Natężenie ruchu (HERE Traffic v7 flow) dla prostokąta mapy. Klucz `HERE_API_KEY`
 * czytany po stronie serwera (nigdy w bundlu). Wymaga planu HERE z dodatkiem Traffic.
 * Brak klucza → 501. Błąd HERE (np. plan bez Traffic) → 200 `{ unavailable: true }`,
 * żeby mapa zdegradowała się łagodnie zamiast krzyczeć błędem.
 */
export async function POST(request: Request) {
  if (!(await rateLimit(request, "traffic")).ok) {
    return NextResponse.json({ error: "Za dużo żądań — spróbuj za chwilę." }, { status: 429 });
  }
  const key = process.env.HERE_API_KEY;
  if (!key) {
    return NextResponse.json(
      { configured: false, flows: [], error: "Ruch na żywo wymaga klucza HERE (plan z Traffic)." },
      { status: 501 },
    );
  }
  const raw = await request.json().catch(() => null);
  const parsed = bboxSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowy bbox." }, { status: 400 });
  }
  // Zbyt duży obszar → HERE odrzuca; ograniczamy do rozsądnego okna (ok. 2°).
  const { west, south, east, north } = parsed.data;
  if (Math.abs(east - west) > 2 || Math.abs(north - south) > 2) {
    return NextResponse.json({ configured: true, flows: [], tooLarge: true });
  }
  try {
    const res = await fetch(buildHereTrafficUrl(parsed.data, key), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      // Najczęściej: plan bez dodatku Traffic (403) — degradujemy łagodnie.
      return NextResponse.json({ configured: true, flows: [], unavailable: true });
    }
    const json = await res.json();
    return NextResponse.json({ configured: true, flows: parseHereTraffic(json) });
  } catch {
    return NextResponse.json({ configured: true, flows: [], unavailable: true });
  }
}
