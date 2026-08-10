/**
 * #368: pamięć podręczna wywołań PŁATNYCH API map — routing (HERE/TomTom/GraphHopper),
 * ruch i geokoder. Każde powtórzone identyczne zapytanie to realny rachunek i dodatkowa
 * latencja; geokoder leci praktycznie na każde naciśnięcie klawisza, a auto-reroute (#309)
 * potrafi wygenerować serię identycznych zapytań o tę samą trasę.
 *
 * Moduł jest współdzielony web ↔ mobile, więc świadomie ZERO API przeglądarki
 * (bez `localStorage`, `caches`, `performance`) — tylko `Map` i `Date.now()`,
 * które działają tak samo w React Native.
 *
 * Zasada nadrzędna: klucz musi objąć KOMPLET parametrów wpływających na wynik
 * (profil pojazdu, `avoid*`, język, dostawca). Cichy błąd z niepełnego klucza jest
 * dużo droższy niż powtórzone zapytanie.
 */
import type { BBoxLngLat } from "./heretraffic";
import type { RouteRequest } from "./types";

interface Entry<V> {
  value: V;
  /** Znacznik wygaśnięcia [ms epoch]. */
  expiresAt: number;
}

export interface TtlLruOptions {
  /** Czas życia wpisu [ms]. */
  ttlMs: number;
  /** Maksymalna liczba wpisów — po przekroczeniu wypada najdawniej używany (LRU). */
  maxEntries: number;
  /** Zegar — wstrzykiwany w testach; domyślnie `Date.now`. */
  now?: () => number;
}

/**
 * Mapa z TTL i twardym limitem wpisów. Limit jest tu obowiązkowy, nie ozdobny:
 * bez niego cache geokodera rósłby z każdą wpisaną literą aż do końca sesji.
 */
export class TtlLruCache<V> {
  private readonly entries = new Map<string, Entry<V>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly clock: () => number;

  constructor(opts: TtlLruOptions) {
    this.ttlMs = Math.max(0, opts.ttlMs);
    this.maxEntries = Math.max(1, Math.floor(opts.maxEntries));
    this.clock = opts.now ?? Date.now;
  }

  get(key: string): V | undefined {
    const e = this.entries.get(key);
    if (!e) return undefined;
    if (e.expiresAt <= this.clock()) {
      this.entries.delete(key);
      return undefined;
    }
    // LRU: dotknięty wpis wędruje na koniec kolejki (Map trzyma kolejność wstawiania).
    this.entries.delete(key);
    this.entries.set(key, e);
    return e.value;
  }

  set(key: string, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.clock() + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
  }

  /** Usuwa wpis. Z `expected` — tylko gdy pod kluczem leży wciąż ta sama wartość. */
  delete(key: string, expected?: V): void {
    if (expected !== undefined) {
      const e = this.entries.get(key);
      if (!e || e.value !== expected) return;
    }
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}

/**
 * Woła `produce()` co najwyżej RAZ na klucz w oknie TTL.
 *
 * W pamięci trzymamy *obietnicę*, nie gotowy wynik — dzięki temu równoległe zapytania
 * (auto-reroute #309 potrafi wystartować drugi identyczny przelicz, zanim pierwszy wróci;
 * geokoder — kolejne naciśnięcia klawisza) dzielą JEDNO wywołanie płatnego API,
 * zamiast płacić dwa razy.
 *
 * TTL liczy się od ROZPOCZĘCIA wywołania, nie od jego zakończenia — świadomie:
 * wpis ma opisywać „jak stare są dane", a te powstają w chwili zapytania do dostawcy.
 *
 * Odrzucenie obietnicy ZAWSZE usuwa wpis — błąd nigdy nie zostaje w pamięci.
 * `keep` pozwala dodatkowo nie utrwalać odpowiedzi, których nie chcemy zamrażać.
 */
export function cachedCall<V>(
  cache: TtlLruCache<Promise<V>>,
  key: string,
  produce: () => Promise<V>,
  keep?: (value: V) => boolean,
): Promise<V> {
  const hit = cache.get(key);
  if (hit) return hit;
  // Opakowanie w IIFE łapie też wyjątek rzucony synchronicznie przez `produce`.
  const pending = (async () => produce())();
  cache.set(key, pending);
  // Sprzątanie w OSOBNEJ gałęzi obietnicy: jest obsłużona, więc błąd nie wypływa
  // jako „unhandled rejection" (właściwą obietnicę obsługuje wołający), a
  // `delete(key, pending)` nie skasuje wpisu założonego już przez inne wywołanie.
  // Gałąź rejestrujemy przed wołającym, więc wpis jest sprzątnięty, zanim ten
  // zobaczy wynik.
  pending.then(
    (value) => {
      if (keep && !keep(value)) cache.delete(key, pending);
    },
    () => cache.delete(key, pending),
  );
  return pending;
}

/** Stabilny zapis liczby w kluczu (ucina szum zmiennoprzecinkowy, normalizuje `-0`). */
function fixed(n: number, digits: number): string {
  return String(Number(n.toFixed(digits)));
}

/** Znormalizowana fraza geokodera: bez skrajnych spacji, pojedyncze odstępy, małe litery. */
export function normalizeGeoQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

/** ~1 m — więcej cyfr nie zmienia trasy, a psuje trafienia w cache. */
const ROUTE_COORD_DIGITS = 5;

/**
 * Klucz wyniku routingu. Obejmuje WSZYSTKO, co zmienia trasę: dostawcę, kolejność
 * punktów, profil pojazdu, opcje omijania i walutę. Pola wypisane w ustalonej
 * kolejności, żeby ten sam zestaw wartości dawał ten sam klucz niezależnie od
 * porządku właściwości w obiekcie.
 */
export function routeCacheKey(req: RouteRequest, providerName: string): string {
  const waypoints = req.waypoints
    .map((p) => `${fixed(p.lat, ROUTE_COORD_DIGITS)},${fixed(p.lng, ROUTE_COORD_DIGITS)}`)
    .join("|");
  const pr = req.profile;
  /*
   * [#390] Klucz MUSI obejmować KAŻDE pole profilu, które zmienia trasę.
   *
   * Brakowało `adrTunnelCode` — a to nie jest preferencja, tylko warunek
   * legalności przejazdu: litera z pomarańczowej tablicy decyduje, przez które
   * tunele zestaw MOŻE przejechać. Skutek pominięcia: kierowca bez ADR liczy
   * trasę, wpis ląduje w cache, a chwilę później kierowca z cysterną kategorii C
   * dostaje z cache DOKŁADNIE TĘ SAMĄ trasę — policzoną bez ograniczeń
   * tunelowych, bo klucz obu zapytań był identyczny. Kontrola przy wjeździe do
   * tunelu kończy się zawróceniem i mandatem, a w gorszym wariancie zestaw
   * z materiałem niebezpiecznym wjeżdża tam, gdzie nie wolno.
   *
   * `emissionClass` dołożona z tego samego powodu z wyprzedzeniem: gdy wejdzie
   * omijanie stref niskiej emisji, klucz będzie już poprawny, zamiast czekać
   * na powtórzenie tego samego błędu.
   *
   * Zasada dla następnego pola profilu: jeśli wpływa na trasę, wchodzi tutaj.
   */
  const profile = pr
    ? [
        pr.kind ?? "",
        pr.weightKg ?? "",
        pr.heightCm ?? "",
        pr.widthCm ?? "",
        pr.lengthCm ?? "",
        pr.axleCount ?? "",
        pr.adrTunnelCode ?? "",
        pr.emissionClass ?? "",
      ].join(",")
    : "";
  const o = req.options;
  const avoid =
    (o?.avoidTolls ? "T" : "") +
    (o?.avoidFerries ? "F" : "") +
    (o?.avoidCarTrains ? "C" : "") +
    (o?.avoidDirtRoads ? "D" : "");
  // Kraje: wielkość liter ani kolejność nie zmieniają wyniku → normalizujemy,
  // żeby ["ch","AT"] i ["AT","CH"] trafiały w ten sam wpis.
  const countries = [...(o?.avoidCountries ?? [])]
    .map((c) => c.trim().toUpperCase())
    .filter((c) => c.length > 0)
    .sort()
    .join("+");
  return `${providerName}|${waypoints}|${profile}|${avoid}|${countries}|${req.currency ?? "EUR"}`;
}

/** Siatka przyciągania prostokąta ruchu [°] — ~5 km; drobne przesunięcia mapy trafiają w ten sam wpis. */
export const TRAFFIC_BBOX_STEP_DEG = 0.05;

/**
 * Przyciąga prostokąt do siatki NA ZEWNĄTRZ. Wynik zawsze ZAWIERA oryginał, więc
 * użytkownik nigdy nie dostanie danych z mniejszego obszaru niż faktycznie widzi
 * (zwykłe zaokrąglenie mogłoby uciąć pas przy krawędzi ekranu).
 */
export function snapBboxOut(bbox: BBoxLngLat, stepDeg: number = TRAFFIC_BBOX_STEP_DEG): BBoxLngLat {
  const step = stepDeg > 0 ? stepDeg : TRAFFIC_BBOX_STEP_DEG;
  const down = (v: number) => Number((Math.floor(v / step) * step).toFixed(6));
  const up = (v: number) => Number((Math.ceil(v / step) * step).toFixed(6));
  return {
    west: down(bbox.west),
    south: down(bbox.south),
    east: up(bbox.east),
    north: up(bbox.north),
  };
}

/** Klucz warstwy ruchu: dostawca + przyciągnięty prostokąt. */
export function trafficCacheKey(bbox: BBoxLngLat, providerName: string): string {
  const box = [bbox.west, bbox.south, bbox.east, bbox.north].map((v) => fixed(v, 6)).join(",");
  return `${providerName}|${box}`;
}
