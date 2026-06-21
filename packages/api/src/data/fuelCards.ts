/** Warstwa danych: karty paliwowe. PIN szyfrowany; odczyt/zapis przez RPC. */
import type { FuelCardInput } from "@e-logistic/core";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Lista kart bez danych wrażliwych (PIN poza wynikiem — tylko przez `getFuelCardPin`). */
export async function listFuelCardsSafe(client: SupabaseClient, companyId: string) {
  const { data, error } = await client
    .from("fuel_cards")
    .select(
      "id, provider, card_number_masked, valid_until, discount_percent, vehicle_id, vehicles(registration)",
    )
    .eq("company_id", companyId)
    .order("provider");
  if (error) throw error;
  return data ?? [];
}

/**
 * Karty widoczne dla bieżącego użytkownika (RPC, RLS-aware):
 * owner/dispatcher → wszystkie karty firmy z rabatem; kierowca → tylko karty
 * przypisanego auta, BEZ rabatu (`discount_percent = null`).
 */
export async function listFuelCardsForUser(client: SupabaseClient) {
  const { data, error } = await client.rpc("list_fuel_cards_for_user");
  if (error) throw error;
  return data ?? [];
}

/** Karty przypisane do danego pojazdu (do panelu pojazdu). */
export async function listFuelCardsByVehicle(client: SupabaseClient, vehicleId: string) {
  const { data, error } = await client
    .from("fuel_cards")
    .select("id, provider, card_number_masked, valid_until, discount_percent")
    .eq("vehicle_id", vehicleId)
    .order("provider");
  if (error) throw error;
  return data ?? [];
}

/** Dodaje kartę (bez PIN-u — PIN ustawiany osobno przez `setFuelCardPin`). RLS: owner. */
export async function insertFuelCard(
  client: SupabaseClient,
  input: FuelCardInput,
  companyId: string,
) {
  const { data, error } = await client
    .from("fuel_cards")
    .insert({
      company_id: companyId,
      provider: input.provider,
      card_number_masked: input.cardNumberMasked,
      valid_until: input.validUntil ?? null,
      discount_percent: input.discountPercent,
      vehicle_id: input.vehicleId ?? null,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Edytuje kartę (pola jawne — PIN ustawiany osobno przez `setFuelCardPin`). RLS: owner. */
export async function updateFuelCard(client: SupabaseClient, cardId: string, input: FuelCardInput) {
  const { error } = await client
    .from("fuel_cards")
    .update({
      provider: input.provider,
      card_number_masked: input.cardNumberMasked,
      valid_until: input.validUntil ?? null,
      discount_percent: input.discountPercent,
      vehicle_id: input.vehicleId ?? null,
      notes: input.notes ?? null,
    })
    .eq("id", cardId);
  if (error) throw error;
}

/** Usuwa kartę (kaskadowo: przypisania). RLS: owner. */
export async function deleteFuelCard(client: SupabaseClient, cardId: string) {
  const { error } = await client.from("fuel_cards").delete().eq("id", cardId);
  if (error) throw error;
}

/** Ustawia (szyfruje) PIN karty — RPC, tylko owner. */
export async function setFuelCardPin(client: SupabaseClient, cardId: string, pin: string) {
  const { error } = await client.rpc("fuel_card_set_pin", { p_card: cardId, p_pin: pin });
  if (error) throw error;
}

/** Odczytuje (deszyfruje) PIN karty — RPC, członek firmy; audytowane. */
export async function getFuelCardPin(client: SupabaseClient, cardId: string): Promise<string> {
  const { data, error } = await client.rpc("fuel_card_pin", { p_card: cardId });
  if (error) throw error;
  return (data as string | null) ?? "";
}
