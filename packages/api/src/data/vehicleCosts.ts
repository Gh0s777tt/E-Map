/** Warstwa danych: koszty pojazdu inne niż paliwo (naprawy, leasing, ubezpieczenie…). */
import type { VehicleCostInput } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface VehicleCost {
  id: string;
  vehicle_id: string;
  category: string;
  amount: number;
  currency: string;
  cost_date: string;
  description: string | null;
}

const COLS = "id, vehicle_id, category, amount, currency, cost_date, description";

/** Koszty firmy (najnowsze pierwsze). Filtry: pojazd, data od. RLS: członek czyta. */
export async function listVehicleCosts(
  client: SupabaseClient,
  companyId: string,
  opts: { vehicleId?: string; from?: string; limit?: number } = {},
): Promise<VehicleCost[]> {
  let q = client.from("vehicle_costs").select(COLS).eq("company_id", companyId);
  if (opts.vehicleId) q = q.eq("vehicle_id", opts.vehicleId);
  if (opts.from) q = q.gte("cost_date", opts.from);
  q = q.order("cost_date", { ascending: false }).limit(opts.limit ?? 1000);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as VehicleCost[];
}

/** Dodaje koszt pojazdu. RLS: owner/dispatcher. Zwraca id. */
export async function insertVehicleCost(
  client: SupabaseClient,
  input: VehicleCostInput,
  companyId: string,
): Promise<string> {
  const { data, error } = await client
    .from("vehicle_costs")
    .insert({
      company_id: companyId,
      vehicle_id: input.vehicleId,
      category: input.category,
      amount: input.amount,
      currency: input.currency,
      cost_date: input.costDate,
      description: input.description?.trim() || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/** Usuwa koszt pojazdu. RLS: owner/dispatcher. */
export async function deleteVehicleCost(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("vehicle_costs").delete().eq("id", id);
  if (error) throw error;
}
