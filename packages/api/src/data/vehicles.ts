/** Warstwa danych: pojazdy. */
import type { SupabaseClient } from "@supabase/supabase-js";

export async function listVehicles(client: SupabaseClient, companyId: string) {
  const { data, error } = await client
    .from("vehicles")
    .select("id, registration, model, vehicle_type")
    .eq("company_id", companyId)
    .order("registration");
  if (error) throw error;
  return data ?? [];
}
