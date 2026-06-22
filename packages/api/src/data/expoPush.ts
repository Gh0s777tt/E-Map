/** Warstwa danych: tokeny push Expo (aplikacja mobilna). */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface ExpoPushTokenInput {
  token: string;
  platform?: string | null;
  companyId?: string | null;
}

/**
 * Zapisuje token push Expo bieżącego użytkownika (idempotentnie po `token`).
 * RLS: `user_id = auth.uid()` (ustawiany triggerem/domyślnie? — podajemy jawnie).
 */
export async function saveExpoPushToken(
  client: SupabaseClient,
  userId: string,
  input: ExpoPushTokenInput,
): Promise<void> {
  const { error } = await client.from("expo_push_tokens").upsert(
    {
      user_id: userId,
      token: input.token,
      platform: input.platform ?? null,
      company_id: input.companyId ?? null,
    },
    { onConflict: "token" },
  );
  if (error) throw error;
}

/** Usuwa token (np. przy wylogowaniu / cofnięciu zgody). RLS: właściciel. */
export async function deleteExpoPushToken(client: SupabaseClient, token: string): Promise<void> {
  const { error } = await client.from("expo_push_tokens").delete().eq("token", token);
  if (error) throw error;
}

/**
 * Tokeny Expo wskazanych użytkowników — do wysyłki serwerowej (klient service-role
 * omija RLS). Pusta lista użytkowników → pusto.
 */
export async function listExpoPushTokensForUsers(
  client: SupabaseClient,
  userIds: string[],
): Promise<string[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await client
    .from("expo_push_tokens")
    .select("token")
    .in("user_id", userIds);
  if (error) throw error;
  return (data ?? []).map((r) => (r as { token: string }).token);
}
