/**
 * Ceny paliwa na stacjach — adapter Tankerkönig (Niemcy, darmowy klucz API).
 * Klucz czytany po stronie serwera; tu jest tylko logika zapytania + normalizacja.
 * Inne kraje wymagają osobnych dostawców (brak jednego darmowego źródła EU).
 */

export interface FuelStationPrice {
  id: string;
  name: string;
  brand: string;
  lat: number;
  lng: number;
  diesel: number | null;
  e5: number | null;
  e10: number | null;
  isOpen: boolean;
  distKm: number | null;
}

export interface FuelPriceQuery {
  lat: number;
  lng: number;
  /** Promień w km (Tankerkönig: maks. 25). */
  radiusKm?: number;
}

const TANKERKONIG_URL = "https://creativecommons.tankerkoenig.de/json/list.php";

/** Buduje URL zapytania Tankerkönig (czyste, testowalne). */
export function buildTankerkonigUrl(q: FuelPriceQuery, apiKey: string): string {
  const rad = Math.min(Math.max(q.radiusKm ?? 10, 1), 25);
  const p = new URLSearchParams({
    lat: String(q.lat),
    lng: String(q.lng),
    rad: String(rad),
    sort: "dist",
    type: "all",
    apikey: apiKey,
  });
  return `${TANKERKONIG_URL}?${p.toString()}`;
}

interface TkStation {
  id: string;
  name?: string;
  brand?: string;
  lat: number;
  lng: number;
  diesel?: number | null;
  e5?: number | null;
  e10?: number | null;
  isOpen?: boolean;
  dist?: number;
}
interface TkResponse {
  ok?: boolean;
  stations?: TkStation[];
  message?: string;
}

/** Normalizuje odpowiedź Tankerkönig do wspólnego typu (ceny < 0 → null). */
export function parseTankerkonig(data: TkResponse): FuelStationPrice[] {
  if (!data.ok || !Array.isArray(data.stations)) return [];
  const price = (v: number | null | undefined) => (typeof v === "number" && v > 0 ? v : null);
  return data.stations.map((s) => ({
    id: s.id,
    name: s.name ?? "Stacja",
    brand: s.brand ?? s.name ?? "",
    lat: s.lat,
    lng: s.lng,
    diesel: price(s.diesel),
    e5: price(s.e5),
    e10: price(s.e10),
    isOpen: Boolean(s.isOpen),
    distKm: typeof s.dist === "number" ? s.dist : null,
  }));
}

/** Pobiera ceny paliwa z Tankerkönig dla okolicy punktu (wymaga klucza API). */
export async function fetchFuelPrices(
  q: FuelPriceQuery,
  apiKey: string,
): Promise<FuelStationPrice[]> {
  const res = await fetch(buildTankerkonigUrl(q, apiKey));
  if (!res.ok) throw new Error(`Tankerkönig: ${res.status}`);
  return parseTankerkonig((await res.json()) as TkResponse);
}
