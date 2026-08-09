/**
 * Warstwa danych: czat firmowy (#290, kanały #291) — kanał ogólny firmy
 * (thread_id NULL) + nazwane wątki z członkami (np. osobny per kierowca).
 * Zdjęcia w wiadomościach przez Storage (photo_path). Realtime INSERT.
 * #368: znaczniki przeczytania (`chat_reads`) + liczniki nieprzeczytanych.
 */
import { newId } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";
import type { Json } from "../database.types";

export interface ChatMessage {
  id: string;
  company_id: string;
  thread_id: string | null;
  sender_id: string;
  sender_label: string;
  body: string;
  photo_path: string | null;
  created_at: string;
  /** [#374] Ustawiony po edycji treści — znacznik nadaje baza, nie klient. */
  edited_at: string | null;
  /** [#374] Moment zniknięcia. `null` = wiadomość zostaje na stałe. */
  expires_at: string | null;
  /** [#374] Cytowana wiadomość. `null` po skasowaniu oryginału — odpowiedź zostaje. */
  reply_to_id: string | null;
  kind: "text" | "photo" | "location";
  /** [#374] Dane zależne od `kind` — dla `location` współrzędne i etykieta. */
  meta: Json | null;
}

/** [#374] Reakcja emoji pod wiadomością. */
export interface MessageReaction {
  message_id: string;
  user_id: string;
  emoji: string;
}

export interface ChatThread {
  id: string;
  company_id: string;
  name: string;
  created_by: string;
  created_at: string;
  /** [#374] Znikanie wiadomości kanału w sekundach. `null` = wyłączone. */
  ephemeral_ttl_seconds: number | null;
}

// [#374] Kolumny stanu wiadomości: miękkie usunięcie, edycja, znikanie, cytat.
// Musi zostać POJEDYNCZYM literałem — klient Supabase parsuje listę kolumn na
// poziomie typów, a konkatenacja zamienia wynik w `GenericStringError`.
const COLS =
  "id, company_id, thread_id, sender_id, sender_label, body, photo_path, created_at, edited_at, expires_at, reply_to_id, kind, meta";

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
  opts: {
    threadId?: string | null;
    photoPath?: string | null;
    /** [#374] Cytowana wiadomość. */
    replyToId?: string | null;
    kind?: "text" | "photo" | "location";
    meta?: Json | null;
    /**
     * [#374] Znikanie ustawione dla POJEDYNCZEJ wiadomości, w sekundach.
     * Ma pierwszeństwo przed ustawieniem kanału. Termin wylicza baza —
     * zegar urządzenia bywa przestawiony, a od tego zależy, kiedy treść zniknie.
     */
    expiresInSeconds?: number | null;
  } = {},
): Promise<ChatMessage> {
  const { data, error } = await client
    .from("messages")
    .insert({
      company_id: companyId,
      thread_id: opts.threadId ?? null,
      body,
      sender_label: senderLabel,
      photo_path: opts.photoPath ?? null,
      reply_to_id: opts.replyToId ?? null,
      kind: opts.kind ?? (opts.photoPath ? "photo" : "text"),
      meta: opts.meta ?? null,
      ...(opts.expiresInSeconds
        ? { expires_at: new Date(Date.now() + opts.expiresInSeconds * 1000).toISOString() }
        : {}),
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return data as ChatMessage;
}

/**
 * [#374] Usunięcie wiadomości — MIĘKKIE.
 *
 * Twarde `DELETE` byłoby gorsze dla użytkownika: klient, który był offline,
 * nigdy nie zobaczy zdarzenia DELETE i zostanie z wiadomością na ekranie.
 * Przy `deleted_at` dostaje zwykły UPDATE i usuwa ją u siebie. Wiersz znika
 * fizycznie później, przy czyszczeniu cronem.
 *
 * RLS dopuszcza nadawcę oraz zarząd (moderacja).
 */
export async function deleteMessage(client: SupabaseClient, id: string): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser();
  const { error } = await client
    .from("messages")
    .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null })
    .eq("id", id);
  if (error) throw error;
}

/**
 * [#374] Edycja treści. Znacznik `edited_at` ustawia wyzwalacz w bazie —
 * klient nie może udawać, że wiadomość nie była zmieniana.
 */
export async function editMessage(
  client: SupabaseClient,
  id: string,
  body: string,
): Promise<ChatMessage> {
  const { data, error } = await client
    .from("messages")
    .update({ body })
    .eq("id", id)
    .select(COLS)
    .single();
  if (error) throw error;
  return data as ChatMessage;
}

/** [#374] Reakcje pod wskazanymi wiadomościami (jedno zapytanie na widok). */
export async function listReactions(
  client: SupabaseClient,
  messageIds: readonly string[],
): Promise<MessageReaction[]> {
  if (messageIds.length === 0) return [];
  const { data, error } = await client
    .from("message_reactions")
    .select("message_id, user_id, emoji")
    .in("message_id", messageIds as string[]);
  if (error) throw error;
  return (data ?? []) as MessageReaction[];
}

/**
 * [#374] Dodaje lub zdejmuje własną reakcję. `on` mówi, jaki ma być stan
 * docelowy — dzięki temu podwójne kliknięcie nie tworzy wyścigu, w którym
 * dwa żądania na przemian dodają i usuwają tę samą reakcję.
 */
export async function setReaction(
  client: SupabaseClient,
  messageId: string,
  emoji: string,
  on: boolean,
): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Brak sesji.");
  if (on) {
    const { error } = await client
      .from("message_reactions")
      .upsert(
        { message_id: messageId, user_id: user.id, emoji },
        { onConflict: "message_id,user_id,emoji", ignoreDuplicates: true },
      );
    if (error) throw error;
    return;
  }
  const { error } = await client
    .from("message_reactions")
    .delete()
    .eq("message_id", messageId)
    .eq("user_id", user.id)
    .eq("emoji", emoji);
  if (error) throw error;
}

/**
 * [#374] Znikanie wiadomości dla całego kanału. `null` wyłącza.
 *
 * Kanał ogólny firmy nie ma wiersza w `chat_threads` (thread_id IS NULL),
 * więc jego ustawienie mieszka przy firmie.
 *
 * UWAGA przy prezentacji tej funkcji użytkownikowi: filtr w polityce UKRYWA
 * wiadomość, fizycznie kasuje ją dopiero cron. Do czasu przebiegu treść żyje
 * w bazie, w kopiach zapasowych i w powiadomieniach push, które już poszły.
 */
export async function setChatTtl(
  client: SupabaseClient,
  target: { companyId: string; threadId?: string | null },
  ttlSeconds: number | null,
): Promise<void> {
  if (target.threadId) {
    const { error, count } = await client
      .from("chat_threads")
      .update({ ephemeral_ttl_seconds: ttlSeconds }, { count: "exact" })
      .eq("id", target.threadId);
    if (error) throw error;
    if (!count) throw new Error("Brak uprawnień do zmiany ustawień tego kanału.");
    return;
  }
  // [#376] `count: "exact"` jest tu KONIECZNE. Kanał ogólny zapisuje ustawienie
  // w `companies`, a `companies_update` (0013) dopuszcza wyłącznie właściciela.
  // Dyspozytorowi RLS nie zwraca błędu — po prostu żaden wiersz nie pasuje,
  // PostgREST odpowiada 204, `error` jest `null`, więc interfejs pokazywał
  // sukces i dyspozytor wychodził przekonany, że wiadomości zaczęły znikać.
  const { error, count } = await client
    .from("companies")
    .update({ chat_ephemeral_ttl_seconds: ttlSeconds }, { count: "exact" })
    .eq("id", target.companyId);
  if (error) throw error;
  if (!count) throw new Error("Znikanie na kanale ogólnym może ustawić tylko właściciel firmy.");
}

/** [#376] Bieżące ustawienie znikania dla kanału ogólnego firmy. */
export async function getCompanyChatTtl(
  client: SupabaseClient,
  companyId: string,
): Promise<number | null> {
  const { data, error } = await client
    .from("companies")
    .select("chat_ephemeral_ttl_seconds")
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw error;
  return data?.chat_ephemeral_ttl_seconds ?? null;
}

/**
 * #368: wysyłka **idempotentna** z identyfikatorem klienta (outbox mobile) —
 * dokładnie wzorzec `insertFuelLog`/`insertTripEvent`: `id` to UUID wygenerowany
 * na urządzeniu (PK tabeli), więc ponowna synchronizacja tego samego wpisu leci
 * jako `ON CONFLICT (id) DO NOTHING` — bez duplikatu i bez błędu PK.
 * `maybeSingle`: przy konflikcie baza nie zwraca wiersza → `null`.
 */
export async function upsertMessage(
  client: SupabaseClient,
  msg: {
    id: string;
    companyId: string;
    body: string;
    senderLabel: string;
    threadId?: string | null;
    photoPath?: string | null;
    /** [#374] Cytat. Stare wpisy w kolejce go nie mają — stąd opcjonalność. */
    replyToId?: string | null;
  },
): Promise<ChatMessage | null> {
  const { data, error } = await client
    .from("messages")
    .upsert(
      {
        id: msg.id,
        company_id: msg.companyId,
        thread_id: msg.threadId ?? null,
        body: msg.body,
        sender_label: msg.senderLabel,
        photo_path: msg.photoPath ?? null,
        reply_to_id: msg.replyToId ?? null,
      },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .select(COLS)
    .maybeSingle();
  if (error) throw error;
  return data as ChatMessage | null;
}

/**
 * Subskrypcja nowych wiadomości firmy; filtrowanie po wątku robi wywołujący
 * (realtime nie wspiera filtrów złożonych). Zwraca funkcję sprzątającą.
 */
export function subscribeMessages(
  client: SupabaseClient,
  companyId: string,
  onMessage: (m: ChatMessage) => void,
  /**
   * [#374] Wywoływane, gdy wiadomość została zmieniona (edycja, reakcja,
   * miękkie usunięcie). Osobne od `onMessage`, bo widok reaguje inaczej:
   * INSERT dopisuje na koniec i przewija, UPDATE podmienia w miejscu.
   */
  onChange?: (m: ChatMessage) => void,
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
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `company_id=eq.${companyId}`,
      },
      // Miękkie usunięcie przychodzi tą samą drogą co edycja — widok sam
      // decyduje, czy podmienić treść, czy usunąć dymek (`deleted_at`).
      (payload) => onChange?.(payload.new as ChatMessage),
    )
    .subscribe();
  return () => {
    channel.unsubscribe();
  };
}

/**
 * [#376] Subskrypcja reakcji firmy.
 *
 * `message_reactions` trafiła do publikacji realtime w migracji 0094, ale ŻADEN
 * klient jej nie subskrybował — reakcja innej osoby pojawiała się dopiero po
 * przeładowaniu rozmowy. Filtr po firmie nie jest możliwy (tabela nie ma
 * `company_id`), więc odsiewa wywołujący: i tak trzyma w pamięci tylko
 * wiadomości otwartego kanału.
 */
export function subscribeReactions(
  client: SupabaseClient,
  onChange: (r: MessageReaction, event: "INSERT" | "DELETE") => void,
): () => void {
  const channel = client
    .channel(`reactions-${Math.random().toString(36).slice(2, 8)}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "message_reactions" },
      (p) => onChange(p.new as MessageReaction, "INSERT"),
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "message_reactions" },
      // DELETE niesie stary wiersz dzięki `replica identity full` (0094).
      (p) => onChange(p.old as MessageReaction, "DELETE"),
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
    .select("id, company_id, name, created_by, created_at, ephemeral_ttl_seconds")
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
    .select("id, company_id, name, created_by, created_at, ephemeral_ttl_seconds")
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

/**
 * Upload zdjęcia do czatu — zwraca ścieżkę do `photo_path`.
 *
 * #369: ścieżka NIESIE KANAŁ (`{firma}/chat/{threadId|general}/{uuid}.{ext}`),
 * bo bramka odczytu w Storage działa po prefiksie folderu (migracja 0088).
 * Do #368 ścieżka była płaska (`{firma}/chat-{uuid}.{ext}`) i polityka nie miała
 * jak odróżnić załącznika prywatnej rozmowy od zdjęcia ładunku — skan dokumentu
 * z wątku 1:1 chroniła wtedy wyłącznie nieodgadywalność UUID-a.
 *
 * `threadId` musi odpowiadać wątkowi, do którego trafi wiadomość — inaczej
 * nadawca wgra plik, którego sam nie odczyta (RLS 0088 zawęża po tym folderze).
 */
export async function uploadChatPhotoBinary(
  client: SupabaseClient,
  companyId: string,
  bytes: ArrayBuffer,
  opts: { mime?: string; threadId?: string | null } = {},
): Promise<string> {
  const ext = (opts.mime ?? "image/jpeg").split("/")[1] ?? "jpg";
  const path = `${companyId}/chat/${opts.threadId ?? GENERAL_CHANNEL}/${newId()}.${ext}`;
  const { error } = await client.storage.from(BUCKET).upload(path, bytes, {
    contentType: opts.mime ?? "image/jpeg",
  });
  if (error) throw error;
  return path;
}

/**
 * [#376] Kopiuje załącznik do folderu wątku DOCELOWEGO — używane przy
 * przekazywaniu wiadomości.
 *
 * Dlaczego kopia, a nie ta sama ścieżka: polityka `cargo_photos_obj_select`
 * (migracja 0088) bramkuje dostęp po TRZECIM segmencie ścieżki, czyli po wątku
 * ZAPISANYM W NAZWIE PLIKU. Przekazanie z zachowaniem ścieżki dawało dwa złe
 * skutki naraz:
 *   • odbiorca w wątku docelowym nie mógł podpisać URL-a i widział wieczne
 *     „ładowanie…", bo prefiks nadal wskazywał wątek źródłowy,
 *   • przekazanie z kanału ogólnego do rozmowy prywatnej zostawiało prefiks
 *     `general`, więc plik pozostawał czytelny dla CAŁEJ firmy.
 *
 * `copy` wykonuje się po stronie Storage z tokenem użytkownika, więc skopiować
 * da się tylko to, co wywołujący i tak może odczytać.
 */
export async function copyChatPhotoToThread(
  client: SupabaseClient,
  sourcePath: string,
  companyId: string,
  targetThreadId: string | null,
): Promise<string> {
  const ext = sourcePath.split(".").pop() || "jpg";
  const target = `${companyId}/chat/${targetThreadId ?? GENERAL_CHANNEL}/${newId()}.${ext}`;
  if (sourcePath === target) return sourcePath;
  const { error } = await client.storage.from(BUCKET).copy(sourcePath, target);
  if (error) throw error;
  return target;
}

/**
 * Podpisany URL zdjęcia z czatu (1 h).
 *
 * #369: podpis powstaje po stronie Storage z tokenem użytkownika, więc bramką
 * jest polityka `cargo_photos_obj_select` (0088) — nie da się podpisać ścieżki
 * z wątku, do którego wywołujący nie należy. Tu świadomie NIE walidujemy
 * ścieżki po stronie klienta: pojedyncze źródło prawdy siedzi w RLS.
 */
export async function chatPhotoUrl(client: SupabaseClient, path: string): Promise<string> {
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// ── Nieprzeczytane (#368) ────────────────────────────────────────────────

/** Klucz kanału ogólnego w mapach liczników (thread_id NULL nie jest kluczem obiektu). */
export const GENERAL_CHANNEL = "general";

/** Liczniki nieprzeczytanych: klucz = id wątku albo `GENERAL_CHANNEL`. */
export interface ChatUnread {
  byChannel: Record<string, number>;
  total: number;
}

/** Klucz kanału w mapie liczników (null = kanał ogólny firmy). */
export function chatChannelKey(threadId: string | null): string {
  return threadId ?? GENERAL_CHANNEL;
}

/** Pusty zestaw liczników (stan początkowy / offline). */
export function emptyChatUnread(): ChatUnread {
  return { byChannel: {}, total: 0 };
}

/**
 * Nieprzeczytane per kanał + suma (RPC `chat_unread_counts`, migracja 0085).
 * Baza liczy tylko wiadomości cudze i nowsze niż znacznik `chat_reads`; RLS
 * zawęża do kanałów widocznych dla wywołującego.
 */
export async function chatUnreadCounts(
  client: SupabaseClient,
  companyId: string,
): Promise<ChatUnread> {
  const { data, error } = await client.rpc("chat_unread_counts", { p_company: companyId });
  if (error) throw error;
  const byChannel: Record<string, number> = {};
  let total = 0;
  for (const row of data ?? []) {
    const n = Number(row.unread) || 0;
    if (n <= 0) continue;
    byChannel[chatChannelKey(row.thread)] = n;
    total += n;
  }
  return { byChannel, total };
}

/** Oznacza kanał jako przeczytany „do teraz” (upsert; znacznik się nie cofa). */
export async function markChatRead(
  client: SupabaseClient,
  companyId: string,
  threadId: string | null = null,
): Promise<void> {
  const { error } = await client.rpc("chat_mark_read", {
    p_company: companyId,
    p_thread: threadId,
  });
  if (error) throw error;
}
