/** Warstwa danych: trasy wysyłane kierowcy (#272, M3 fala 2). */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface RouteStopPoint {
  lat: number;
  lng: number;
  label: string;
}

export interface DriverRouteSummary {
  distanceKm?: number;
  durationMin?: number;
  tollCost?: number;
  currency?: string;
}

export interface DriverRoute {
  id: string;
  name: string;
  stops: RouteStopPoint[];
  /** Linia trasy policzona na web: [[lng,lat], …]. */
  geometry: [number, number][];
  summary: DriverRouteSummary;
  created_at: string;
}

/** Wysyłka trasy do kierowcy (RPC, owner/dispatcher). Zwraca id trasy. */
export async function sendDriverRoute(
  client: SupabaseClient,
  companyId: string,
  driverId: string,
  route: {
    name: string;
    stops: RouteStopPoint[];
    geometry: [number, number][];
    summary: DriverRouteSummary;
  },
): Promise<string> {
  const { data, error } = await client.rpc("send_driver_route", {
    p_company: companyId,
    p_driver: driverId,
    p_name: route.name,
    // JSON-serializowalne z definicji — rzut na Json wymagany przez wygenerowany typ RPC.
    p_stops: route.stops as unknown as import("../client").Json,
    p_geometry: route.geometry as unknown as import("../client").Json,
    p_summary: route.summary as unknown as import("../client").Json,
  });
  if (error) throw error;
  return data;
}

/** Trasy zalogowanego kierowcy (mobile) — najnowsze pierwsze. RLS: driver_user_id. */
export async function listMyDriverRoutes(
  client: SupabaseClient,
  limit = 10,
): Promise<DriverRoute[]> {
  const { data, error } = await client
    .from("driver_routes")
    .select("id, name, stops, geometry, summary, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    stops: (r.stops as unknown as RouteStopPoint[]) ?? [],
    geometry: (r.geometry as unknown as [number, number][]) ?? [],
    summary: (r.summary as unknown as DriverRouteSummary) ?? {},
    created_at: r.created_at,
  }));
}
