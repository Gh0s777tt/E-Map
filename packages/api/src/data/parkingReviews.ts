/**
 * #308: Oceny i udogodnienia parkingów TIR — dane społecznościowe (Faza 3).
 * Jedna ocena na użytkownika i parking (upsert po user_id+poi_id, POI z OSM).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type DB = SupabaseClient<Database>;

export interface ParkingReview {
  id: string;
  user_id: string;
  poi_id: string;
  poi_name: string | null;
  rating: number;
  has_shower: boolean;
  has_wc: boolean;
  has_food: boolean;
  security: boolean;
  note: string | null;
  created_at: string;
}

export interface ParkingReviewInput {
  poiId: string;
  poiName?: string | null;
  lat?: number;
  lng?: number;
  rating: number; // 1-5
  hasShower?: boolean;
  hasWc?: boolean;
  hasFood?: boolean;
  security?: boolean;
  note?: string | null;
}

export interface ParkingSummary {
  poiId: string;
  count: number;
  avg: number; // średnia ocena 1-5 (1 miejsce po przecinku)
  shower: number; // ile ocen potwierdza prysznic itd.
  wc: number;
  food: number;
  security: number;
}

/** Oceny jednego parkingu (najnowsze pierwsze). */
export async function listParkingReviews(sb: DB, poiId: string): Promise<ParkingReview[]> {
  const { data, error } = await sb
    .from("parking_reviews")
    .select(
      "id, user_id, poi_id, poi_name, rating, has_shower, has_wc, has_food, security, note, created_at",
    )
    .eq("poi_id", poiId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as ParkingReview[];
}

/** Dodaje/aktualizuje ocenę zalogowanego użytkownika (unikat user+poi). */
export async function upsertParkingReview(sb: DB, input: ParkingReviewInput): Promise<void> {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Zaloguj się, aby ocenić parking.");
  const { error } = await sb.from("parking_reviews").upsert(
    {
      user_id: user.id,
      poi_id: input.poiId,
      poi_name: input.poiName ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      rating: input.rating,
      has_shower: input.hasShower ?? false,
      has_wc: input.hasWc ?? false,
      has_food: input.hasFood ?? false,
      security: input.security ?? false,
      note: input.note ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,poi_id" },
  );
  if (error) throw error;
}

/** Zbiorcze podsumowania dla widocznych POI (agregacja po stronie klienta —
 *  ocen na parking jest mało; unika RPC/widoku). */
export async function parkingSummaries(
  sb: DB,
  poiIds: string[],
): Promise<Map<string, ParkingSummary>> {
  const out = new Map<string, ParkingSummary>();
  if (poiIds.length === 0) return out;
  const { data, error } = await sb
    .from("parking_reviews")
    .select("poi_id, rating, has_shower, has_wc, has_food, security")
    .in("poi_id", poiIds.slice(0, 200));
  if (error) throw error;
  for (const r of data ?? []) {
    const cur = out.get(r.poi_id) ?? {
      poiId: r.poi_id,
      count: 0,
      avg: 0,
      shower: 0,
      wc: 0,
      food: 0,
      security: 0,
    };
    cur.avg = (cur.avg * cur.count + Number(r.rating)) / (cur.count + 1);
    cur.count += 1;
    if (r.has_shower) cur.shower += 1;
    if (r.has_wc) cur.wc += 1;
    if (r.has_food) cur.food += 1;
    if (r.security) cur.security += 1;
    out.set(r.poi_id, cur);
  }
  for (const s of out.values()) s.avg = Math.round(s.avg * 10) / 10;
  return out;
}
