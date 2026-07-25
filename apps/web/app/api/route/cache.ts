import { type RouteResult, TtlLruCache } from "@e-logistic/maps";

/**
 * #368: pamięć podręczna wyznaczonych tras.
 *
 * DLACZEGO TUTAJ, a nie w kliencie mapy (`apps/web/app/(app)/map/page.tsx`):
 *  1. pieniądze wydaje serwer — to on woła HERE/TomTom/GraphHopper; memoizacja
 *     w kliencie zakłada, że klient jest jeden i żyje długo, a żadne z tych
 *     założeń nie jest prawdziwe,
 *  2. z tego samego endpointu korzysta MOBILE (`apps/mobile/app/map.tsx`) —
 *     cache w web pominąłby połowę płatnego ruchu,
 *  3. tu body jest już zwalidowane Zodem, więc klucz budujemy z pewnych danych,
 *     a nie ze stanu formularza (gdzie „24" i "24.0" to dwa różne stringi),
 *  4. wpis może być współdzielony między użytkownikami, bo odpowiedź zależy
 *     WYŁĄCZNIE od punktów, profilu, opcji i waluty z body — zero danych
 *     użytkownika czy firmy. Uwierzytelnienie odbywa się PRZED sięgnięciem do
 *     cache, więc nie jest to obejście autoryzacji.
 *
 * Odpowiedni cache po stronie klienta byłby dodatkową warstwą (mniej latencji),
 * ale nie zastąpiłby tej — dlatego świadomie robimy tylko tę.
 */
export type RouteApiPayload = RouteResult & {
  durationEstimated: boolean;
  tollEstimated: boolean;
  avoidCountriesMode?: "full" | "partial" | "none";
};

/**
 * 3 minuty. Kompromis: HERE i TomTom zwracają ETA Z RUCHEM, więc długi TTL
 * kłamałby o czasie przejazdu; z drugiej strony auto-reroute (#309) i ponowne
 * „Wyznacz trasę" na tych samych przystankach mieszczą się w sekundach.
 */
const ROUTE_TTL_MS = 180_000;

/**
 * Mało wpisów CELOWO: `geometry` trasy międzynarodowej to tysiące punktów
 * (setki kB na wpis), a proces serverless ma skromną pamięć. Lepiej trzymać
 * garść świeżych tras niż ryzykować OOM.
 */
const ROUTE_MAX_ENTRIES = 25;

export const routeCache = new TtlLruCache<Promise<RouteApiPayload>>({
  ttlMs: ROUTE_TTL_MS,
  maxEntries: ROUTE_MAX_ENTRIES,
});
