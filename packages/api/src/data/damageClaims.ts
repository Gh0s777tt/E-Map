/** Warstwa danych: rejestr szkód / OC (zgłoszenia szkód pojazdów). */
import type { DamageKind, DamageStatus } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface DamageClaim {
  id: string;
  vehicle_id: string | null;
  driver_name: string | null;
  claim_date: string;
  kind: DamageKind;
  status: DamageStatus;
  description: string | null;
  cost: number | null;
  currency: string;
  insurer: string | null;
  claim_number: string | null;
  note: string | null;
  created_at: string;
}

export interface DamageClaimInput {
  vehicleId?: string | null;
  driverName?: string | null;
  claimDate: string;
  kind: DamageKind;
  status: DamageStatus;
  description?: string | null;
  cost?: number | null;
  currency: string;
  insurer?: string | null;
  claimNumber?: string | null;
  note?: string | null;
}

const COLS =
  "id, vehicle_id, driver_name, claim_date, kind, status, description, cost, currency, insurer, claim_number, note, created_at";

/** Szkody firmy (wg daty malejąco). RLS: członek czyta. */
export async function listDamageClaims(
  client: SupabaseClient,
  companyId: string,
  opts: { limit?: number } = {},
): Promise<DamageClaim[]> {
  const { data, error } = await client
    .from("damage_claims")
    .select(COLS)
    .eq("company_id", companyId)
    .order("claim_date", { ascending: false })
    .limit(opts.limit ?? 1000);
  if (error) throw error;
  return (data ?? []) as DamageClaim[];
}

/** Dodaje szkodę. RLS: owner/dispatcher. Zwraca id. */
export async function insertDamageClaim(
  client: SupabaseClient,
  input: DamageClaimInput,
  companyId: string,
): Promise<string> {
  const { data, error } = await client
    .from("damage_claims")
    .insert({
      company_id: companyId,
      vehicle_id: input.vehicleId || null,
      driver_name: input.driverName?.trim() || null,
      claim_date: input.claimDate,
      kind: input.kind,
      status: input.status,
      description: input.description?.trim() || null,
      cost: input.cost ?? null,
      currency: input.currency,
      insurer: input.insurer?.trim() || null,
      claim_number: input.claimNumber?.trim() || null,
      note: input.note?.trim() || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/** Zmiana statusu szkody. RLS: owner/dispatcher. */
export async function setDamageClaimStatus(
  client: SupabaseClient,
  id: string,
  status: DamageStatus,
): Promise<void> {
  const { error } = await client.from("damage_claims").update({ status }).eq("id", id);
  if (error) throw error;
}

/** Usuwa szkodę. RLS: owner/dispatcher. */
export async function deleteDamageClaim(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("damage_claims").delete().eq("id", id);
  if (error) throw error;
}
