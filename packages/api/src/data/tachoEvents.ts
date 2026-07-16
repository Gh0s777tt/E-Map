/**
 * #345: Dziennik Tacho kierowcy — zdarzenia czasu pracy/odpoczynku zapisywane
 * w profilu (DB), widoczne dla kierowcy i zarządu. Podstawa liczenia terminu
 * kolejnego odpoczynku tygodniowego i powiadomień.
 */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export type TachoEventKind =
  | "work_start"
  | "work_end"
  | "weekly_rest_start"
  | "weekly_rest_end"
  | "daily_rest_start"
  | "daily_rest_end";

export type TachoRestType = "regular" | "reduced";

export interface TachoEvent {
  id: string;
  driver_user_id: string;
  kind: TachoEventKind;
  rest_type: TachoRestType | null;
  at: string;
  note: string | null;
}

const COLS = "id, driver_user_id, kind, rest_type, at, note";

/** Zapisuje zdarzenie dziennika (RLS: własny wiersz kierowcy). */
export async function insertTachoEvent(
  client: SupabaseClient,
  input: {
    companyId: string;
    kind: TachoEventKind;
    restType?: TachoRestType | null;
    at?: string;
    note?: string | null;
  },
): Promise<string> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Brak sesji.");
  const { data, error } = await client
    .from("driver_tacho_events")
    .insert({
      company_id: input.companyId,
      driver_user_id: user.id,
      kind: input.kind,
      rest_type: input.restType ?? null,
      at: input.at ?? new Date().toISOString(),
      note: input.note ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/** Dziennik zalogowanego kierowcy (najnowsze pierwsze). */
export async function listMyTachoEvents(
  client: SupabaseClient,
  opts: { from?: string; limit?: number } = {},
): Promise<TachoEvent[]> {
  let q = client.from("driver_tacho_events").select(COLS).order("at", { ascending: false });
  if (opts.from) q = q.gte("at", opts.from);
  q = q.limit(opts.limit ?? 100);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TachoEvent[];
}
