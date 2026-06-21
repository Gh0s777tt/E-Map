/** Warstwa danych: zgłoszenia społecznościowe na mapie (wypadek/policja/waga…). */
import type { MapReportInput } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export async function insertMapReport(client: SupabaseClient, input: MapReportInput) {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Brak sesji — zaloguj się, by zgłaszać.");
  const { data, error } = await client
    .from("map_reports")
    .insert({
      type: input.type,
      lat: input.lat,
      lng: input.lng,
      geo: `POINT(${input.lng} ${input.lat})`,
      reported_by: user.id,
      comment: input.comment ?? null,
    })
    .select("id, type, lat, lng, comment")
    .single();
  if (error) throw error;
  return data;
}

/** Aktywne (niewygasłe) zgłoszenia z współrzędnymi. */
export async function listActiveMapReports(client: SupabaseClient) {
  const { data, error } = await client
    .from("map_reports")
    .select("id, type, lat, lng, comment")
    .gt("expires_at", new Date().toISOString())
    .not("lat", "is", null);
  if (error) throw error;
  return data ?? [];
}
