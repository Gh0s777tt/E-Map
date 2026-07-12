/**
 * Warstwa danych: czat firmowy (#290, kanały #291) — kanał ogólny firmy
 * (thread_id NULL) + nazwane wątki z członkami (np. osobny per kierowca).
 * Zdjęcia w wiadomościach przez Storage (photo_path). Realtime INSERT.
 */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface ChatMessage {
  id: string;
  company_id: string;
  thread_id: string | null;
  sender_id: string;
  sender_label: string;
  body: string;
  photo_path: string | null;
  created_at: string;
}

export interface ChatThread {
  id: string;
  company_id: string;
  name: string;
  created_by: string;
  created_at: string;
}

const COLS = "id, company_id, thread_id, sender_id, sender_label, body, photo_path, created_at";

/** Wiadomości kanału (threadId null = kanał ogólny). Rosnąco, gotowe do renderu. */
export async function listMessages(
  client: SupabaseClient,
  companyId: string,
  opts: { threadId?: string | null; limit?: number } = {},
): Promise<ChatMessage[]> {
  let q = client.from("messages").select(COLS).eq("company_id", companyId);
  q = opts.threadId ? q.eq("thread_id", opts.threadId) : q.is("thread_id", null);
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (error) throw error;
  return ((data ?? []) as ChatMessage[]).reverse();
}

/** Wysyłka (tekst i/lub zdjęcie) we własnym imieniu. */
export async function sendMessage(
  client: SupabaseClient,
  companyId: string,
  body: string,
  senderLabel: string,
  opts: { threadId?: string | null; photoPath?: string | null } = {},
): Promise<ChatMessage> {
  const { data, error } = await client
    .from("messages")
    .insert({
      company_id: companyId,
      thread_id: opts.threadId ?? null,
      body,
      sender_label: senderLabel,
      photo_path: opts.photoPath ?? null,
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return data as ChatMessage;
}

/**
 * Subskrypcja nowych wiadomości firmy; filtrowanie po wątku robi wywołujący
 * (realtime nie wspiera filtrów złożonych). Zwraca funkcję sprzątającą.
 */
export function subscribeMessages(
  client: SupabaseClient,
  companyId: string,
  onMessage: (m: ChatMessage) => void,
): () => void {
  const channel = client
    .channel(`chat-${companyId}-${Math.random().toString(36).slice(2, 8)}`)
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

// ── Kanały (#291) ────────────────────────────────────────────────────────

/** Wątki widoczne dla zalogowanego (RLS: zarząd wszystkie, kierowca swoje). */
export async function listThreads(
  client: SupabaseClient,
  companyId: string,
): Promise<ChatThread[]> {
  const { data, error } = await client
    .from("chat_threads")
    .select("id, company_id, name, created_by, created_at")
    .eq("company_id", companyId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as ChatThread[];
}

/** Nowy kanał + członkowie (twórca dopisywany automatycznie). Zarząd. */
export async function createThread(
  client: SupabaseClient,
  companyId: string,
  name: string,
  memberIds: string[],
): Promise<ChatThread> {
  const { data, error } = await client
    .from("chat_threads")
    .insert({ company_id: companyId, name })
    .select("id, company_id, name, created_by, created_at")
    .single();
  if (error) throw error;
  const thread = data as ChatThread;
  const unique = [...new Set([thread.created_by, ...memberIds])];
  const { error: e2 } = await client
    .from("chat_members")
    .insert(unique.map((user_id) => ({ thread_id: thread.id, user_id })));
  if (e2) throw e2;
  return thread;
}

/** Zmiana nazwy kanału (zarząd lub twórca). */
export async function renameThread(
  client: SupabaseClient,
  threadId: string,
  name: string,
): Promise<void> {
  const { error } = await client.from("chat_threads").update({ name }).eq("id", threadId);
  if (error) throw error;
}

/** Usunięcie kanału wraz z wiadomościami (zarząd). */
export async function deleteThread(client: SupabaseClient, threadId: string): Promise<void> {
  const { error } = await client.from("chat_threads").delete().eq("id", threadId);
  if (error) throw error;
}

/** Identyfikatory członków kanału. */
export async function listThreadMembers(
  client: SupabaseClient,
  threadId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("chat_members")
    .select("user_id")
    .eq("thread_id", threadId);
  if (error) throw error;
  return (data ?? []).map((r) => r.user_id as string);
}

/** Dodanie członków (zarząd). Duplikaty ignorowane. */
export async function addThreadMembers(
  client: SupabaseClient,
  threadId: string,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) return;
  const { error } = await client.from("chat_members").upsert(
    userIds.map((user_id) => ({ thread_id: threadId, user_id })),
    { onConflict: "thread_id,user_id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

/** Usunięcie członka (zarząd) lub wyjście z kanału (samodzielnie). */
export async function removeThreadMember(
  client: SupabaseClient,
  threadId: string,
  userId: string,
): Promise<void> {
  const { error } = await client
    .from("chat_members")
    .delete()
    .eq("thread_id", threadId)
    .eq("user_id", userId);
  if (error) throw error;
}

// ── Zdjęcia w czacie ─────────────────────────────────────────────────────

const BUCKET = "cargo-photos";

/** Upload zdjęcia do czatu — zwraca ścieżkę do `photo_path`. */
export async function uploadChatPhotoBinary(
  client: SupabaseClient,
  companyId: string,
  bytes: ArrayBuffer,
  opts: { mime?: string } = {},
): Promise<string> {
  const ext = (opts.mime ?? "image/jpeg").split("/")[1] ?? "jpg";
  const path = `${companyId}/chat-${crypto.randomUUID()}.${ext}`;
  const { error } = await client.storage.from(BUCKET).upload(path, bytes, {
    contentType: opts.mime ?? "image/jpeg",
  });
  if (error) throw error;
  return path;
}

/** Podpisany URL zdjęcia z czatu (1 h). */
export async function chatPhotoUrl(client: SupabaseClient, path: string): Promise<string> {
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
