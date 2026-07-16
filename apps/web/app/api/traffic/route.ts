import { buildHereTrafficUrl, parseHereTraffic, tomtomTrafficIncidents } from "@e-logistic/maps";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/lib/apiAuth";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const bboxSchema = z.object({
  west: z.number().finite(),
  south: z.number().finite(),
  east: z.number().finite(),
  north: z.number().finite(),
});

/**
 * Ruch na żywo dla prostokąta mapy. Klucze czytane po stronie serwera (nigdy w bundlu).
 * Priorytet dostawcy:
 *  - HERE (`HERE_API_KEY`, plan z dodatkiem Traffic) → pole `flows` (linie natężenia, Traffic v7 flow).
 *  - TomTom (`TOMTOM_API_KEY`) gdy brak HERE → pole `incidents` (punkty: wypadki/roboty/zamknięcia).
 * Kształty NIE są mieszane: HERE dokłada `flows`, TomTom `incidents`.
 * Brak OBU kluczy → 501. Błąd dostawcy → 200 `{ unavailable: true }`,
 * żeby mapa zdegradowała się łagodnie zamiast krzyczeć błędem.
 */
export async function POST(request: Request) {
  if (!(await rateLimit(request, "traffic")).ok) {
    return NextResponse.json({ error: "Za dużo żądań — spróbuj za chwilę." }, { status: 429 });
  }
  // Płatne API ruchu (HERE/TomTom) — tylko dla zalogowanych (audyt Ś16).
  // Sesja: ciasteczko (web) lub Bearer access token (mobile). Brak → 401.
  if (!(await authenticateRequest(request))) {
    return NextResponse.json({ error: "Wymagane zalogowanie." }, { status: 401 });
  }
  const hereKey = process.env.HERE_API_KEY;
  const ttKey = process.env.TOMTOM_API_KEY;
  if (!hereKey && !ttKey) {
    return NextResponse.json(
      {
        configured: false,
        flows: [],
        error: "Ruch na żywo wymaga klucza HERE (plan z Traffic) lub TomTom.",
      },
      { status: 501 },
    );
  }
  const raw = await request.json().catch(() => null);
  const parsed = bboxSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowy bbox." }, { status: 400 });
  }
  // Zbyt duży obszar → dostawcy odrzucają; ograniczamy do rozsądnego okna (ok. 2°).
  const { west, south, east, north } = parsed.data;
  const tooLarge = Math.abs(east - west) > 2 || Math.abs(north - south) > 2;

  // HERE ma priorytet: `flows` (linie natężenia). Kształt bez zmian.
  if (hereKey) {
    if (tooLarge) {
      return NextResponse.json({ configured: true, flows: [], tooLarge: true });
    }
    try {
      const res = await fetch(buildHereTrafficUrl(parsed.data, hereKey), {
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

  // Brak HERE, jest TomTom: incydenty (punkty) w polu `incidents`.
  if (ttKey) {
    if (tooLarge) {
      return NextResponse.json({ configured: true, incidents: [], tooLarge: true });
    }
    try {
      // bbox TomTom: "minLng,minLat,maxLng,maxLat" (kolejność lng,lat!).
      const incidents = await tomtomTrafficIncidents(`${west},${south},${east},${north}`, ttKey);
      return NextResponse.json({ configured: true, incidents });
    } catch {
      return NextResponse.json({ configured: true, incidents: [], unavailable: true });
    }
  }

  // Nieosiągalne (bramka na górze gwarantuje hereKey||ttKey) — TS wymaga zwrotu.
  return NextResponse.json({ configured: false, flows: [], incidents: [] }, { status: 501 });
}
