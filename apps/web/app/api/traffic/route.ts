import {
  buildHereTrafficUrl,
  cachedCall,
  parseHereTraffic,
  snapBboxOut,
  tomtomTrafficIncidents,
  trafficCacheKey,
} from "@e-logistic/maps";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/lib/apiAuth";
import { rateLimit } from "@/lib/ratelimit";
import { hereFlowCache, tomtomIncidentCache } from "./cache";

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
 * #368: odpowiedź pamiętana przez 45 s po przyciągniętym prostokącie (`./cache`) —
 * krótko, bo dane o ruchu starzeją się szybko i użytkownik oczekuje świeżości.
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
  // #368: prostokąt przyciągnięty do siatki NA ZEWNĄTRZ. Klient przysyła surowe
  // `map.getBounds()`, które zmienia się przy każdym drgnięciu mapy — bez przyciągania
  // każde przesunięcie o piksel byłoby osobnym płatnym zapytaniem. Przyciągnięty
  // prostokąt ZAWIERA oryginał, więc użytkownik nie zobaczy mniej, niż widzi na ekranie.
  // Do dostawcy leci ta sama (przyciągnięta) ramka, którą pamiętamy — inaczej wpis
  // opisywałby inny obszar niż jego klucz.
  const rawBbox = parsed.data;
  const bbox = snapBboxOut(rawBbox);
  const { west, south, east, north } = bbox;
  // Zbyt duży obszar → dostawcy odrzucają; ograniczamy do rozsądnego okna (ok. 2°).
  // #369: limit liczymy na SUROWYM prostokącie z żądania, nie na przyciągniętym.
  // `snapBboxOut` celowo rozszerza ramkę (do jednej komórki siatki na każdą stronę),
  // więc widok mieszczący się w limicie potrafił zostać odrzucony dopiero PO
  // przyciągnięciu — użytkownik dostawał `tooLarge` dla okna, które limit spełnia.
  // Do dostawcy leci wtedy ramka szersza o co najwyżej 2 × TRAFFIC_BBOX_STEP_DEG
  // (0,1°) — mieści się to w tolerancji HERE/TomTom.
  const tooLarge =
    Math.abs(rawBbox.east - rawBbox.west) > 2 || Math.abs(rawBbox.north - rawBbox.south) > 2;

  // HERE ma priorytet: `flows` (linie natężenia). Kształt bez zmian.
  if (hereKey) {
    if (tooLarge) {
      return NextResponse.json({ configured: true, flows: [], tooLarge: true });
    }
    try {
      const flows = await cachedCall(hereFlowCache, trafficCacheKey(bbox, "here"), async () => {
        const res = await fetch(buildHereTrafficUrl(bbox, hereKey), {
          headers: { Accept: "application/json" },
        });
        // Rzucamy zamiast zwracać puste: dzięki temu awaria (najczęściej plan bez
        // dodatku Traffic → 403) NIE zostaje w pamięci i po naprawie planu warstwa
        // wraca od razu, a nie po wygaśnięciu TTL.
        if (!res.ok) throw new Error(`HERE Traffic ${res.status}`);
        return parseHereTraffic(await res.json());
      });
      return NextResponse.json({ configured: true, flows });
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
      const incidents = await cachedCall(
        tomtomIncidentCache,
        trafficCacheKey(bbox, "tomtom"),
        // bbox TomTom: "minLng,minLat,maxLng,maxLat" (kolejność lng,lat!).
        () => tomtomTrafficIncidents(`${west},${south},${east},${north}`, ttKey),
      );
      return NextResponse.json({ configured: true, incidents });
    } catch {
      return NextResponse.json({ configured: true, incidents: [], unavailable: true });
    }
  }

  // Nieosiągalne (bramka na górze gwarantuje hereKey||ttKey) — TS wymaga zwrotu.
  return NextResponse.json({ configured: false, flows: [], incidents: [] }, { status: 501 });
}
