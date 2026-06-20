/** Warstwa danych: karty paliwowe (kolumny bezpieczne — bez PIN-u). */
import type { SupabaseClient } from "@supabase/supabase-js";

/** Lista kart bez danych wrażliwych. PIN dostępny wyłącznie przez RPC `fuel_card_pin`. */
export async function listFuelCardsSafe(client: SupabaseClient, companyId: string) {
  const { data, error } = await client
    .from("fuel_cards")
    .select("id, provider, card_number_masked, valid_until, discount_percent")
    .eq("company_id", companyId)
    .order("provider");
  if (error) throw error;
  return data ?? [];
}
