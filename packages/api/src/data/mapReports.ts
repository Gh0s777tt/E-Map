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

/**
 * Jedyny zbiór w tym module, którego NIE zawęża firma — zgłoszenia są
 * społecznościowe, więc rośnie z liczbą wszystkich użytkowników produktu,
 * a nie z wielkością konkretnego przewoźnika. Rozsądny sufit jest tu więc
 * ważniejszy niż gdziekolwiek indziej: pojedyncza firma nie ma jak go
 * „przerosnąć", ale sam produkt owszem.
 *
 * Docelowo ta lista powinna być zawężona do widocznego wycinka mapy (bbox);
 * 500 to próg, przy którym ta zmiana staje się konieczna.
 */
const MAP_REPORTS_DEFAULT_LIMIT = 500;

/** Aktywne (niewygasłe) zgłoszenia z współrzędnymi. */
export async function listActiveMapReports(client: SupabaseClient, opts?: { limit?: number }) {
  const { data, error } = await client
    .from("map_reports")
    .select("id, type, lat, lng, comment")
    .gt("expires_at", new Date().toISOString())
    .not("lat", "is", null)
    // Bez jawnej kolejności obcięcie wybierało wiersze przypadkowe. Malejąco po
    // dacie zgłoszenia w wyniku zostaje to, co świeże — a wypadek sprzed godziny
    // jest dla kierowcy wart więcej niż zgłoszenie dogorywające przed wygaśnięciem.
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? MAP_REPORTS_DEFAULT_LIMIT);
  if (error) throw error;
  return data ?? [];
}
