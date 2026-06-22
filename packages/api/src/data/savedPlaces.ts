/** Warstwa danych: zapisane miejsca (ulubione POI floty) per firma. */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface SavedPlace {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
}

export interface SavedPlaceInput {
  name: string;
  category: string;
  lat: number;
  lng: number;
}

const COLS = "id, name, category, lat, lng";

/** Zapisane miejsca firmy (alfabetycznie). RLS: członek czyta. */
export async function listSavedPlaces(
  client: SupabaseClient,
  companyId: string,
): Promise<SavedPlace[]> {
  const { data, error } = await client
    .from("saved_places")
    .select(COLS)
    .eq("company_id", companyId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as SavedPlace[];
}

/** Dodaje zapisane miejsce. RLS: aktywny członek. Zwraca wpis. */
export async function insertSavedPlace(
  client: SupabaseClient,
  companyId: string,
  input: SavedPlaceInput,
): Promise<SavedPlace> {
  const { data, error } = await client
    .from("saved_places")
    .insert({
      company_id: companyId,
      name: input.name.trim() || "Bez nazwy",
      category: input.category,
      lat: input.lat,
      lng: input.lng,
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return data as SavedPlace;
}

/** Usuwa zapisane miejsce. RLS: autor lub owner/dispatcher. */
export async function deleteSavedPlace(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("saved_places").delete().eq("id", id);
  if (error) throw error;
}
