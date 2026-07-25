/**
 * #368: wspólny licznik nieprzeczytanych wiadomości czatu (mobile).
 * Jeden magazyn na proces + jedna subskrypcja realtime — z niego czyta badge na
 * zakładce „Czat" (tabBarBadge) i lista kanałów. Odpowiednik webowego
 * `apps/web/lib/chatUnread.ts`.
 *
 * Antymigotanie: prawdę zna baza (RPC `chat_unread_counts`), ale odpytujemy ją
 * rzadko (start, powrót aplikacji na pierwszy plan). Pomiędzy tym stan zmieniamy
 * lokalnie: +1 przy zdarzeniu realtime (cudza wiadomość spoza otwartego wątku),
 * 0 przy oznaczeniu wątku jako przeczytany. Wynik RPC z „poprzedniej epoki"
 * (sprzed oznaczenia) jest odrzucany — inaczej badge wracałby na moment.
 *
 * #369: zapis znacznika przeczytania przy strumieniu wiadomości jest zdławiony
 * (jeden zapis „na koniec" zamiast zapisu na każdą wiadomość).
 */
import {
  type ChatUnread,
  chatChannelKey,
  chatUnreadCounts,
  emptyChatUnread,
  getActiveMembership,
  markChatRead,
  subscribeMessages,
} from "@e-logistic/api";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { getSupabase, supabaseConfigured } from "./supabase";

let state: ChatUnread = emptyChatUnread();
let companyId: string | null = null;
let myId: string | null = null;
let starting = false;
let stopRealtime: (() => void) | null = null;
let epoch = 0;
/** Wątek otwarty na ekranie rozmowy — jego wiadomości nie są „nieprzeczytane". */
let openChannel: string | null = null;
/** #369: minimalny odstęp między zapisami znacznika przeczytania [ms]. */
const READ_WRITE_MIN_INTERVAL_MS = 5000;
let lastReadWriteAt = 0;
/** Zaległy znacznik do dopisania „na koniec" (wyjście z ekranu / tło aplikacji). */
let deferredRead: { threadId: string | null; companyIdHint: string | null } | null = null;

const listeners = new Set<() => void>();

function publish(next: ChatUnread): void {
  state = next;
  for (const fn of listeners) fn();
}

function withCount(key: string, count: number): ChatUnread {
  const byChannel = { ...state.byChannel };
  if (count <= 0) delete byChannel[key];
  else byChannel[key] = count;
  const total = Object.values(byChannel).reduce((a, b) => a + b, 0);
  return { byChannel, total };
}

/**
 * #369: wątek otwarty na ekranie NIGDY nie zapala badge'a — czytamy go na bieżąco.
 * Baza może chwilowo twierdzić inaczej (zapis znacznika jest zdławiony, patrz
 * `markChannelReadThrottled`), więc odsiewamy ten wątek z wyniku RPC.
 */
function withoutOpenChannel(next: ChatUnread): ChatUnread {
  if (!openChannel || !next.byChannel[openChannel]) return next;
  const byChannel = { ...next.byChannel };
  delete byChannel[openChannel];
  return { byChannel, total: Object.values(byChannel).reduce((a, b) => a + b, 0) };
}

/** Pobiera liczniki z bazy (odrzuca wynik, jeśli w międzyczasie coś przeczytano). */
export async function refreshChatUnread(): Promise<void> {
  if (!companyId) return;
  const mine = epoch;
  try {
    const next = await chatUnreadCounts(getSupabase(), companyId);
    if (mine !== epoch) return;
    publish(withoutOpenChannel(next));
  } catch {
    // brak zasięgu — zostawiamy ostatni znany stan
  }
}

/**
 * Oznacza wątek jako przeczytany: natychmiast lokalnie, w tle w bazie.
 * `companyIdHint` podaje ekran rozmowy, który zna firmę wcześniej niż magazyn
 * (start jest asynchroniczny) — bez tego pierwsze wejście w wątek nie zapisałoby
 * znacznika i badge wróciłby po odświeżeniu.
 */
export function markChannelRead(threadId: string | null, companyIdHint?: string | null): void {
  const key = chatChannelKey(threadId);
  epoch++;
  if (state.byChannel[key]) publish(withCount(key, 0));
  const target = companyId ?? companyIdHint ?? null;
  if (!target) return;
  lastReadWriteAt = Date.now();
  if (deferredRead && chatChannelKey(deferredRead.threadId) === key) deferredRead = null;
  markChatRead(getSupabase(), target, threadId).catch(() => {});
}

/**
 * #369: znacznik przeczytania dla ekranu, na którym wiadomości LECĄ STRUMIENIEM.
 * Bez dławienia każda przychodząca wiadomość = osobny zapis do bazy u każdego
 * patrzącego, a rosnąca `epoch` unieważniałaby odświeżenia w locie. RLS i tak
 * liczy `created_at > last_read_at`, więc pojedynczy zapis „na koniec" wystarcza:
 * rzadki zapis w trakcie + `flushDeferredRead()` przy zamknięciu wątku.
 * Badge otwartego wątku i tak się nie zapali (`openChannel` + `withoutOpenChannel`).
 */
export function markChannelReadThrottled(
  threadId: string | null,
  companyIdHint?: string | null,
): void {
  if (Date.now() - lastReadWriteAt >= READ_WRITE_MIN_INTERVAL_MS) {
    markChannelRead(threadId, companyIdHint);
    return;
  }
  deferredRead = { threadId, companyIdHint: companyIdHint ?? null };
}

/** Dopisuje zaległy znacznik z `markChannelReadThrottled` (jeśli jakiś czeka). */
function flushDeferredRead(): void {
  const pending = deferredRead;
  deferredRead = null;
  if (pending) markChannelRead(pending.threadId, pending.companyIdHint);
}

/**
 * Zgłasza wątek otwarty na ekranie rozmowy (`open=false` przy wyjściu).
 * Wyjście dopisuje zaległy znacznik — to jest ten jeden zapis „na koniec".
 */
export function setOpenChatChannel(threadId: string | null, open: boolean): void {
  openChannel = open ? chatChannelKey(threadId) : null;
  if (!open) flushDeferredRead();
}

/** Czyści licznik i subskrypcję (wylogowanie / zmiana konta na tym telefonie). */
export function resetChatUnread(): void {
  stopRealtime?.();
  stopRealtime = null;
  companyId = null;
  myId = null;
  starting = false;
  // #369: zaległy znacznik należał do POPRZEDNIEGO konta — nie dopisujemy go.
  deferredRead = null;
  openChannel = null;
  epoch++;
  publish(emptyChatUnread());
}

/** Uruchamia magazyn (idempotentnie): firma, pierwsze liczniki, realtime. */
async function start(): Promise<void> {
  if (!supabaseConfigured || stopRealtime || starting) return;
  starting = true;
  try {
    const sb = getSupabase();
    const [{ data: userData }, m] = await Promise.all([sb.auth.getUser(), getActiveMembership(sb)]);
    if (!m || !userData.user) return;
    myId = userData.user.id;
    companyId = m.companyId;
    await refreshChatUnread();
    stopRealtime = subscribeMessages(sb, m.companyId, (msg) => {
      if (msg.sender_id === myId) return;
      const key = chatChannelKey(msg.thread_id ?? null);
      if (key === openChannel) return; // czytane na bieżąco na otwartym ekranie
      publish(withCount(key, (state.byChannel[key] ?? 0) + 1));
    });
  } catch {
    // brak sesji / zasięgu — spróbujemy ponownie przy powrocie na pierwszy plan
  } finally {
    starting = false;
  }
}

/** Liczniki nieprzeczytanych (suma + per kanał). */
export function useChatUnread(): ChatUnread {
  const [snapshot, setSnapshot] = useState<ChatUnread>(state);
  useEffect(() => {
    void start();
    const fn = () => setSnapshot(state);
    listeners.add(fn);
    fn();
    const sub = AppState.addEventListener("change", (st) => {
      // #369: zejście w tło = ostatnia okazja, by dopisać zaległy znacznik.
      if (st !== "active") {
        flushDeferredRead();
        return;
      }
      void start(); // no-op gdy już wystartowane
      void refreshChatUnread();
    });
    return () => {
      listeners.delete(fn);
      sub.remove();
    };
  }, []);
  return snapshot;
}
