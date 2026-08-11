/**
 * Warstwa danych: naczepy (#405).
 *
 * Naczepa należy do FIRMY, nie do ciągnika — ciągnik wskazuje aktualnie podpiętą
 * przez `vehicles.trailer_id`. Dzięki temu naczepa odstawiona nadal istnieje
 * w systemie, a jej przegląd nadal się liczy.
 */
import type { TrailerInput } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface Trailer {
  id: string;
  registration: string;
  trailer_type: string | null;
  vin: string | null;
  year: number | null;
  inspection_expiry: string | null;
  insurance_expiry: string | null;
  leasing_end: string | null;
  insurer: string | null;
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
  curb_weight_kg: number | null;
  max_payload_kg: number | null;
  axle_count: number | null;
  note: string | null;
}

const COLS =
  "id, registration, trailer_type, vin, year, inspection_expiry, insurance_expiry, leasing_end, insurer, height_cm, width_cm, length_cm, curb_weight_kg, max_payload_kg, axle_count, note";

export async function listTrailers(client: SupabaseClient, companyId: string): Promise<Trailer[]> {
  const { data, error } = await client
    .from("trailers")
    .select(COLS)
    .eq("company_id", companyId)
    .order("registration");
  if (error) throw error;
  return (data ?? []) as Trailer[];
}

function toRow(input: TrailerInput) {
  return {
    registration: input.registration,
    trailer_type: input.trailerType ?? null,
    vin: input.vin ?? null,
    year: input.year ?? null,
    inspection_expiry: input.inspectionExpiry ?? null,
    insurance_expiry: input.insuranceExpiry ?? null,
    leasing_end: input.leasingEnd ?? null,
    insurer: input.insurer ?? null,
    height_cm: input.heightCm ?? null,
    width_cm: input.widthCm ?? null,
    length_cm: input.lengthCm ?? null,
    curb_weight_kg: input.curbWeightKg ?? null,
    max_payload_kg: input.maxPayloadKg ?? null,
    axle_count: input.axleCount ?? null,
    note: input.note ?? null,
  };
}

export async function insertTrailer(
  client: SupabaseClient,
  input: TrailerInput,
  companyId: string,
): Promise<string> {
  const { data, error } = await client
    .from("trailers")
    .insert({ company_id: companyId, ...toRow(input) })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateTrailer(
  client: SupabaseClient,
  id: string,
  input: TrailerInput,
): Promise<void> {
  // `company_id` poza aktualizacją: edycja naczepy nie może jej przenieść
  // do innej firmy. Ta sama zasada co przy pojazdach ([#389]).
  const { error } = await client.from("trailers").update(toRow(input)).eq("id", id);
  if (error) throw error;
}

export async function deleteTrailer(client: SupabaseClient, id: string): Promise<void> {
  // `vehicles.trailer_id` ma `on delete set null` — zestaw się rozpina,
  // ciągnik zostaje. Kasowanie naczepy nie może unieruchomić auta.
  const { error } = await client.from("trailers").delete().eq("id", id);
  if (error) throw error;
}

/** Podpina/odpina naczepę do ciągnika. `null` = zestaw rozpięty. */
export async function setVehicleTrailer(
  client: SupabaseClient,
  vehicleId: string,
  trailerId: string | null,
): Promise<void> {
  const { error } = await client
    .from("vehicles")
    .update({ trailer_id: trailerId })
    .eq("id", vehicleId);
  if (error) throw error;
}
