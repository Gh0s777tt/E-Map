import { haversineKm } from "./geo";
import type { LatLng } from "./types";

/**
 * Kratowy indeks przestrzenny (#261) — zamiast O(n·m) „każdy POI × każdy punkt
 * trasy" robimy O(n) z małą stałą: punkty wpadają do komórek ~cellKm, zapytanie
 * sprawdza tylko sąsiedztwo komórki kandydata (3 wiersze × poszerzenie na
 * długości geograficznej wg cos(lat)), a dokładność domyka haversine.
 */
export interface GridIndex {
  cellKm: number;
  /** klucz "iy:ix" → punkty w komórce */
  cells: Map<string, LatLng[]>;
}

const KM_PER_DEG = 111.32;

export function buildGridIndex(points: LatLng[], cellKm: number): GridIndex {
  const step = cellKm / KM_PER_DEG;
  const cells = new Map<string, LatLng[]>();
  for (const p of points) {
    const key = `${Math.floor(p.lat / step)}:${Math.floor(p.lng / step)}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(p);
    else cells.set(key, [p]);
  }
  return { cellKm, cells };
}

/** Czy jakikolwiek punkt indeksu leży ≤ radiusKm od `p` (radius ≤ cellKm). */
export function anyWithinKm(index: GridIndex, p: LatLng, radiusKm: number): boolean {
  const step = index.cellKm / KM_PER_DEG;
  const iy = Math.floor(p.lat / step);
  const ix = Math.floor(p.lng / step);
  // Komórki mają stały rozmiar w STOPNIACH, więc na wysokich szerokościach są
  // węższe w kilometrach — poszerzamy przeszukiwane sąsiedztwo o 1/cos(lat).
  const widen = Math.min(6, Math.ceil(1 / Math.max(0.15, Math.cos((p.lat * Math.PI) / 180))));
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -widen; dx <= widen; dx++) {
      const bucket = index.cells.get(`${iy + dy}:${ix + dx}`);
      if (!bucket) continue;
      for (const q of bucket) {
        if (haversineKm(p, q) <= radiusKm) return true;
      }
    }
  }
  return false;
}
