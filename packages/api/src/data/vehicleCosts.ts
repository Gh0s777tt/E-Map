/** Warstwa danych: koszty pojazdu inne niż paliwo (naprawy, leasing, ubezpieczenie…). */
import type { VehicleCostInput } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";
import { fetchAllByKeyset, type PagedRows } from "./pagination";

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

/** Zawężenie zbioru kosztów — jedno miejsce na filtry, bez sortowania (patrz `orders.ts`). */
function companyCostsFilter(client: SupabaseClient, companyId: string, opts: VehicleCostFilter) {
  let q = client.from("vehicle_costs").select(COLS).eq("company_id", companyId);
  if (opts.vehicleId) q = q.eq("vehicle_id", opts.vehicleId);
  if (opts.from) q = q.gte("cost_date", opts.from);
  // Granica GÓRNA wyłączna: wywołujący podaje 1. dzień kolejnego miesiąca, więc przy
  // `lte` koszt z tego dnia wpadałby do dwóch sąsiednich okien naraz.
  if (opts.to) q = q.lt("cost_date", opts.to);
  return q;
}

/** Filtry wspólne dla obu trybów pobrania. `to` jest granicą WYŁĄCZNĄ. */
export interface VehicleCostFilter {
  vehicleId?: string;
  from?: string;
  to?: string;
}

/**
 * Koszty firmy (najnowsze pierwsze) — JEDNO zapytanie.
 *
 * Domyślny `limit` 1000 nie jest ochroną, tylko powtórzeniem sufitu serwera:
 * `api.max_rows` i tak przycina odpowiedź bez błędu, więc podanie tu `limit: 5000`
 * nigdy niczego nie zmieniało. Ta funkcja nadaje się do widoków, gdzie wycinek
 * wystarcza; gdzie liczy się suma — `listVehicleCostsAll`.
 */
export async function listVehicleCosts(
  client: SupabaseClient,
  companyId: string,
  opts: VehicleCostFilter & { limit?: number } = {},
): Promise<VehicleCost[]> {
  const { data, error } = await companyCostsFilter(client, companyId, opts)
    .order("cost_date", { ascending: false })
    .limit(opts.limit ?? 1000);
  if (error) throw error;
  return (data ?? []) as VehicleCost[];
}

/**
 * Koszty firmy pobrane STRONAMI — komplet albo `complete: false`.
 *
 * Rejestr kosztów dla księgowości stoi na TEJ funkcji. Wariant jednorazowy sortuje
 * malejąco po `cost_date` i przy przekroczeniu sufitu ucina wiersze NAJSTARSZE —
 * czyli, przy oknie „od 1. dnia wybranego miesiąca", dokładnie te, o które chodziło.
 * Efekt był bezgłośny: sekcja kosztów w CSV wychodziła pusta jak u firmy, która nic
 * nie wydała. Strony schodzą po `id` rosnąco, porządek prezentacyjny wraca po złożeniu.
 */
export async function listVehicleCostsAll(
  client: SupabaseClient,
  companyId: string,
  opts: VehicleCostFilter & { pageSize?: number; maxPages?: number } = {},
): Promise<PagedRows<VehicleCost>> {
  const paged = await fetchAllByKeyset<VehicleCost>(
    async (afterId, pageSize) => {
      let q = companyCostsFilter(client, companyId, opts);
      if (afterId) q = q.gt("id", afterId);
      const { data, error } = await q.order("id", { ascending: true }).limit(pageSize);
      if (error) throw error;
      return (data ?? []) as VehicleCost[];
    },
    { pageSize: opts.pageSize, maxPages: opts.maxPages },
  );
  return {
    ...paged,
    rows: [...paged.rows].sort(
      (a, b) => b.cost_date.localeCompare(a.cost_date) || b.id.localeCompare(a.id),
    ),
  };
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
