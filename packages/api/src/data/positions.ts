/**
 * #324: Pozycje kierowców live (telematyka, fala 1) — jedna aktualna pozycja
 * per kierowca (upsert po user_id). Kierowca udostępnia dobrowolnie
 * (przełącznik w aplikacji); mapa web pokazuje auta firmy na żywo.
 */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface DriverPosition {
  user_id: string;
  company_id: string;
  lat: number;
  lng: number;
  speed_kmh: number | null;
  heading: number | null;
  updated_at: string;
}

/** Zapisuje/aktualizuje pozycję zalogowanego kierowcy (RLS: własny wiersz). */
export async function upsertMyPosition(
  client: SupabaseClient,
  input: {
    companyId: string;
    lat: number;
    lng: number;
    speedKmh?: number | null;
    heading?: number | null;
  },
): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Brak sesji.");
  const { error } = await client.from("driver_positions").upsert(
    {
      user_id: user.id,
      company_id: input.companyId,
      lat: input.lat,
      lng: input.lng,
      speed_kmh: input.speedKmh ?? null,
      heading: input.heading ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

/** Usuwa własną pozycję (kierowca wyłączył udostępnianie). */
export async function deleteMyPosition(client: SupabaseClient): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return;
  const { error } = await client.from("driver_positions").delete().eq("user_id", user.id);
  if (error) throw error;
}

/**
 * Jeden wiersz na kierowcę (upsert po `user_id`), więc zbiór nie rośnie z czasem
 * — jego górną granicą jest załoga firmy. Sufit jest tu jednak istotny z innego
 * powodu niż gdzie indziej: mapa odpytuje tę funkcję CYKLICZNIE, więc każdy
 * wiersz ponad potrzebę mnoży się przez częstotliwość odświeżania.
 *
 * Sortowanie malejące po `updated_at` sprawia, że przy obcięciu w wyniku
 * zostają pozycje najświeższe — a to jedyne, które na mapie live coś znaczą.
 */
const DRIVER_POSITIONS_DEFAULT_LIMIT = 1000;

/** Aktualne pozycje kierowców firmy (RLS: członek czyta). */
export async function listDriverPositions(
  client: SupabaseClient,
  companyId: string,
  opts?: { limit?: number },
): Promise<DriverPosition[]> {
  const { data, error } = await client
    .from("driver_positions")
    .select("user_id, company_id, lat, lng, speed_kmh, heading, updated_at")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false })
    .limit(opts?.limit ?? DRIVER_POSITIONS_DEFAULT_LIMIT);
  if (error) throw error;
  return (data ?? []) as DriverPosition[];
}
