/**
 * Utrudnienia na trasie — wykrywanie zgłoszeń/punktów blisko wyznaczonej trasy.
 * Tania alternatywa dla płatnego API ruchu: korzysta ze zgłoszeń społeczności
 * (korki, wypadki, zamknięcia…) już zbieranych na mapie. Funkcje czyste.
 */
import { haversineKm } from "./geo";
import type { LatLng } from "./types";

/** Minimalna odległość punktu do trasy (po wierzchołkach geometrii), w km. */
export function pointToRouteKm(point: LatLng, route: LatLng[]): number {
  let min = Number.POSITIVE_INFINITY;
  for (const v of route) {
    const d = haversineKm(point, v);
    if (d < min) min = d;
  }
  return Number.isFinite(min) ? Math.round(min * 100) / 100 : min;
}

/**
 * Elementy (zgłoszenia/POI) w promieniu `maxKm` od trasy — posortowane rosnąco
 * wg odległości, z dołączonym polem `distanceKm`. Pusta trasa → pusto.
 */
export function itemsNearRoute<T extends LatLng>(
  items: T[],
  route: LatLng[],
  maxKm: number,
): (T & { distanceKm: number })[] {
  if (route.length === 0) return [];
  return items
    .map((it) => ({ ...it, distanceKm: pointToRouteKm(it, route) }))
    .filter((it) => it.distanceKm <= maxKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
