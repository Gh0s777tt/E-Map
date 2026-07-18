/**
 * Faza 2 tacho #3: terminy obowiązkowych sczytań tachografu (rozp. (UE) 581/2010).
 * KARTA kierowcy ≤ 28 dni, JEDNOSTKA POJAZDOWA ≤ 90 dni. Owner/dyspozytor zarządza,
 * członkowie czytają (RLS 0081). Status liczy silnik core `checkDownloads`.
 */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export type TachoDownloadKind = "card" | "vu";

export interface TachoDownloadRow {
  id: string;
  company_id: string;
  kind: TachoDownloadKind;
  driver_id: string | null;
  vehicle_id: string | null;
  /** Data ostatniego sczytania (YYYY-MM-DD). */
  last_download: string;
  note: string | null;
}

const COLS = "id, company_id, kind, driver_id, vehicle_id, last_download, note";

export async function listTachoDownloads(
  client: SupabaseClient,
  companyId: string,
): Promise<TachoDownloadRow[]> {
  const { data, error } = await client
    .from("tacho_downloads")
    .select(COLS)
    .eq("company_id", companyId)
    .order("last_download", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TachoDownloadRow[];
}

export interface TachoDownloadInput {
  companyId: string;
  kind: TachoDownloadKind;
  driverId?: string | null;
  vehicleId?: string | null;
  /** YYYY-MM-DD. */
  lastDownload: string;
  note?: string | null;
}

/**
 * Ustawia/aktualizuje datę ostatniego sczytania dla podmiotu (karta→kierowca,
 * vu→pojazd). Select-then-insert/update — nie polega na upsercie po indeksie
 * częściowym (PostgREST tego nie obsługuje); indeks unikatowy 0081 jest siatką.
 */
export async function upsertTachoDownload(
  client: SupabaseClient,
  input: TachoDownloadInput,
): Promise<void> {
  const subjectCol = input.kind === "card" ? "driver_id" : "vehicle_id";
  const subjectId = input.kind === "card" ? input.driverId : input.vehicleId;
  if (!subjectId) throw new Error("Brak podmiotu sczytania (kierowca/pojazd).");

  const payload = {
    company_id: input.companyId,
    kind: input.kind,
    driver_id: input.kind === "card" ? subjectId : null,
    vehicle_id: input.kind === "vu" ? subjectId : null,
    last_download: input.lastDownload,
    note: input.note ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await client
    .from("tacho_downloads")
    .select("id")
    .eq("company_id", input.companyId)
    .eq("kind", input.kind)
    .eq(subjectCol, subjectId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await client
      .from("tacho_downloads")
      .update(payload)
      .eq("id", (existing as { id: string }).id);
    if (error) throw error;
  } else {
    const { error } = await client.from("tacho_downloads").insert(payload);
    if (error) throw error;
  }
}

export async function deleteTachoDownload(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("tacho_downloads").delete().eq("id", id);
  if (error) throw error;
}
