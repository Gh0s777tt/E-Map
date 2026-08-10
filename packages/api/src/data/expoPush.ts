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
  _userId: string,
  input: ExpoPushTokenInput,
): Promise<void> {
  /*
   * [#390] Przez RPC, nie przez `upsert`.
   *
   * `expo_push_tokens.token` jest UNIQUE, a tabela NIE MA polityki UPDATE —
   * więc `upsert(onConflict: "token")` na istniejącym wierszu po prostu się nie
   * udawał. Znaczenie ma to przy firmowym telefonie przekazywanym między
   * kierowcami: token należy do URZĄDZENIA, więc gdy loguje się kolejna osoba,
   * wiersz zostawał przypisany do poprzedniej — i powiadomienia adresowane do
   * niej (przydziały zleceń, czat) lądowały na ekranie telefonu, którego używa
   * już ktoś inny.
   *
   * Funkcja `save_expo_push_token` (migracja 0107) przejmuje token na rzecz
   * zalogowanego użytkownika. Musi być `SECURITY DEFINER`, bo nowy użytkownik
   * z definicji nie ma prawa ruszyć cudzego wiersza.
   */
  const { error } = await client.rpc("save_expo_push_token", {
    p_token: input.token,
    p_platform: input.platform ?? null,
    p_company: input.companyId ?? null,
  });
  if (error) throw error;
}

/**
 * Usuwa token (np. przy wylogowaniu / cofnięciu zgody).
 *
 * [#390] Przez RPC z tego samego powodu co zapis: po zmianie użytkownika na
 * firmowym telefonie wiersz może już należeć do kogoś innego, a wtedy polityka
 * DELETE (`user_id = auth.uid()`) go nie obejmie. Funkcja kasuje token TEGO
 * użytkownika — a przejęcie przez kolejnego robi `save_expo_push_token`.
 */
export async function deleteExpoPushToken(client: SupabaseClient, token: string): Promise<void> {
  const { error } = await client.rpc("delete_expo_push_token", { p_token: token });
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
