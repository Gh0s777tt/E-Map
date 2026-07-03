/**
 * Zwrot RPC w wygenerowanym typie `Functions` to dziś zawsze `Json` —
 * `scripts/gen-types.mjs` nie introspektuje jeszcze sygnatur funkcji SQL.
 * Kształt danych gwarantują definicje funkcji w `supabase/migrations/`
 * (SECURITY DEFINER, `json_agg`/`json_build_object`), więc rzutowanie jest
 * bezpieczne — ale trzymamy je w JEDNYM miejscu zamiast `as unknown` po
 * warstwie danych. Gdy gen:types nauczy się emitować precyzyjne typy RPC,
 * helper zniknie mechanicznie (dług: docs/BACKLOG.md → P3 „as unknown").
 */
export function rpcJson<T>(data: unknown): T {
  return data as T;
}
