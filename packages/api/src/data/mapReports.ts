/** Warstwa danych: zgłoszenia społecznościowe na mapie (wypadek/policja/waga…). */
import { type MapReportInput, mapReportSchema } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export async function insertMapReport(client: SupabaseClient, input: MapReportInput) {
  // Twarda walidacja runtime kontraktu (typ znika w kompilacji): zakres lat/lng,
  // dozwolony typ i długość komentarza. Bez tego dane spoza kontraktu trafiały wprost do bazy.
  const report = mapReportSchema.parse(input);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Brak sesji — zaloguj się, by zgłaszać.");
  const { data, error } = await client
    .from("map_reports")
    .insert({
      type: report.type,
      lat: report.lat,
      lng: report.lng,
      geo: `POINT(${report.lng} ${report.lat})`,
      reported_by: user.id,
      comment: report.comment ?? null,
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
