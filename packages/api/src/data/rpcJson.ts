/**
 * Zwrot RPC to `Json`, gdy funkcja SQL faktycznie zwraca json/jsonb (json_agg /
 * json_build_object): list_drivers, create_invoice, create_blank_invoice,
 * duplicate_invoice, driver_documents, list_invites, dev_stats, company_wipe_data.
 * Kształt gwarantują definicje w `supabase/migrations/` — rzutowanie trzymamy
 * w JEDNYM miejscu. Funkcje TABLE/skalarne mają od #260 precyzyjne typy
 * (gen:types introspektuje pg_proc) i tego helpera NIE potrzebują; zniknie
 * całkiem dopiero po przepisaniu powyższych funkcji SQL na RETURNS TABLE.
 */
export function rpcJson<T>(data: unknown): T {
  return data as T;
}
