import { type TrafficFlow, type TrafficIncident, TtlLruCache } from "@e-logistic/maps";

/**
 * #368: pamięć podręczna warstwy ruchu.
 *
 * TTL jest KRÓTKI z premedytacją: korek, wypadek czy zamknięcie pasa starzeją się
 * w minutach, a kierowca patrzy na tę warstwę właśnie po to, żeby wiedzieć, co jest
 * TERAZ. 45 s wystarcza, by przeciągnięcie/przybliżenie mapy (a takich zdarzeń jest
 * kilka na sekundę) nie zamieniało się w serię płatnych zapytań, a jednocześnie
 * nikt nie zobaczy nieaktualnego obrazu dłużej niż przez chwilę.
 *
 * Prostokąt jest wcześniej przyciągany do siatki (`snapBboxOut`) NA ZEWNĄTRZ —
 * dzięki temu drobne ruchy mapy trafiają w ten sam wpis, a widok użytkownika
 * zawsze mieści się w pobranym obszarze.
 *
 * Dwa osobne wiadra, bo kształty danych są rozłączne: HERE zwraca `flows`
 * (linie natężenia), TomTom `incidents` (punkty zdarzeń).
 */
const TRAFFIC_TTL_MS = 45_000;

/** Kilka ekranów mapy na użytkownika; kształty odcinków ruchu też ważą. */
const TRAFFIC_MAX_ENTRIES = 40;

export const hereFlowCache = new TtlLruCache<Promise<TrafficFlow[]>>({
  ttlMs: TRAFFIC_TTL_MS,
  maxEntries: TRAFFIC_MAX_ENTRIES,
});

export const tomtomIncidentCache = new TtlLruCache<Promise<TrafficIncident[]>>({
  ttlMs: TRAFFIC_TTL_MS,
  maxEntries: TRAFFIC_MAX_ENTRIES,
});
