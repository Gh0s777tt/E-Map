/**
 * Warstwa danych: czat firmowy (#290) — jeden kanał firmy, realtime INSERT.
 * Etykieta nadawcy trafia do wiersza przy wysyłce (profile PII są szyfrowane).
 */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface ChatMessage {
  id: string;
  company_id: string;
  sender_id: string;
  sender_label: string;
  body: string;
  created_at: string;
}

const COLS = "id, company_id, sender_id, sender_label, body, created_at";

/** Ostatnie wiadomości firmy (rosnąco — gotowe do renderu od góry). */
export async function listMessages(
  client: SupabaseClient,
  companyId: string,
  opts: { limit?: number } = {},
): Promise<ChatMessage[]> {
  const { data, error } = await client
    .from("messages")
    .select(COLS)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (error) throw error;
  return ((data ?? []) as ChatMessage[]).reverse();
}

/** Wysyłka we własnym imieniu (RLS wymusza sender_id = auth.uid()). */
export async function sendMessage(
  client: SupabaseClient,
  companyId: string,
  body: string,
  senderLabel: string,
): Promise<ChatMessage> {
  const { data, error } = await client
    .from("messages")
    .insert({ company_id: companyId, body, sender_label: senderLabel })
    .select(COLS)
    .single();
  if (error) throw error;
  return data as ChatMessage;
}

/**
 * Subskrypcja nowych wiadomości firmy (postgres_changes INSERT).
 * Zwraca funkcję sprzątającą.
 */
export function subscribeMessages(
  client: SupabaseClient,
  companyId: string,
  onMessage: (m: ChatMessage) => void,
): () => void {
  const channel = client
    .channel(`chat-${companyId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `company_id=eq.${companyId}`,
      },
      (payload) => onMessage(payload.new as ChatMessage),
    )
    .subscribe();
  return () => {
    channel.unsubscribe();
  };
}
