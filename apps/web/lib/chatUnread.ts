"use client";

/**
 * #368: wspólny licznik nieprzeczytanych wiadomości czatu dla panelu.
 * Jeden magazyn na kartę przeglądarki (module-level) + jedna subskrypcja
 * realtime — sidebar (badge przy „Czat") i strona czatu (badge per kanał)
 * czytają dokładnie ten sam stan, więc nic się nie rozjeżdża.
 *
 * Antymigotanie: prawdę zna baza (RPC `chat_unread_counts`), ale odświeżamy ją
 * rzadko (start, powrót do karty). Między odświeżeniami stan zmieniamy lokalnie:
 * +1 przy zdarzeniu realtime (cudza wiadomość spoza otwartego kanału), 0 przy
 * oznaczeniu kanału jako przeczytany. Wynik RPC z „poprzedniej epoki" (sprzed
 * oznaczenia przeczytania) jest odrzucany — inaczej badge wracałby na moment.
 */
import {
  type ChatUnread,
  chatChannelKey,
  chatUnreadCounts,
  emptyChatUnread,
  markChatRead,
  subscribeMessages,
} from "@e-logistic/api";
import { useEffect, useState } from "react";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

let state: ChatUnread = emptyChatUnread();
let companyId: string | null = null;
let myId: string | null = null;
let started = false;
let epoch = 0;
/** Kanał otwarty na ekranie czatu — jego wiadomości nie są „nieprzeczytane". */
let openChannel: string | null = null;

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

/** Pobiera liczniki z bazy (odrzuca wynik, jeśli w międzyczasie coś przeczytano). */
export async function refreshChatUnread(): Promise<void> {
  if (!companyId) return;
  const mine = epoch;
  try {
    const next = await chatUnreadCounts(getBrowserSupabase(), companyId);
    if (mine !== epoch) return;
    publish(next);
  } catch {
    // offline / brak uprawnień — zostawiamy ostatni znany stan
  }
}

/**
 * Oznacza kanał jako przeczytany: natychmiast lokalnie, w tle w bazie.
 * `companyIdHint` podaje ekran czatu, który zna firmę wcześniej niż magazyn
 * (start jest asynchroniczny) — bez tego pierwsze wejście na czat nie zapisałoby
 * znacznika i badge wróciłby po odświeżeniu.
 */
export function markChannelRead(threadId: string | null, companyIdHint?: string | null): void {
  const key = chatChannelKey(threadId);
  epoch++;
  if (state.byChannel[key]) publish(withCount(key, 0));
  const target = companyId ?? companyIdHint ?? null;
  if (!target) return;
  markChatRead(getBrowserSupabase(), target, threadId).catch(() => {});
}

/** Zgłasza kanał aktualnie otwarty na ekranie czatu (`null` = ekran zamknięty). */
export function setOpenChatChannel(threadId: string | null, open: boolean): void {
  openChannel = open ? chatChannelKey(threadId) : null;
}

/** Uruchamia magazyn (idempotentnie): firma, pierwsze liczniki, realtime. */
function start(): void {
  if (started) return;
  started = true;
  (async () => {
    try {
      const sb = getBrowserSupabase();
      const [{ data: userData }, m] = await Promise.all([
        sb.auth.getUser(),
        getCachedMembership(sb),
      ]);
      if (!m || !userData.user) return;
      myId = userData.user.id;
      companyId = m.companyId;
      await refreshChatUnread();
      subscribeMessages(sb, m.companyId, (msg) => {
        if (msg.sender_id === myId) return;
        const key = chatChannelKey(msg.thread_id ?? null);
        if (key === openChannel) return; // czytane na bieżąco na otwartym ekranie
        publish(withCount(key, (state.byChannel[key] ?? 0) + 1));
      });
    } catch {
      // brak sesji / offline — licznik zostaje zerowy
    }
  })();
}

/** Liczniki nieprzeczytanych (suma + per kanał). Bezpieczne w SSR (stan pusty). */
export function useChatUnread(): ChatUnread {
  const [snapshot, setSnapshot] = useState<ChatUnread>(state);
  useEffect(() => {
    start();
    const fn = () => setSnapshot(state);
    listeners.add(fn);
    fn();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshChatUnread();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      listeners.delete(fn);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return snapshot;
}
