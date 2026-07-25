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
 *
 * #369: nieudany start sam się naprawia (powrót na kartę / odzyskanie sieci),
 * a zapis znacznika przeczytania przy strumieniu wiadomości jest zdławiony.
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
/** #369: trwa próba startu (żeby nie odpalić dwóch naraz) — zdejmowane w `finally`. */
let starting = false;
/** Ustawione dopiero po UDANYM starcie — jego brak znaczy „spróbuj jeszcze raz". */
let stopRealtime: (() => void) | null = null;
let epoch = 0;
/** Kanał otwarty na ekranie czatu — jego wiadomości nie są „nieprzeczytane". */
let openChannel: string | null = null;
/** #369: minimalny odstęp między zapisami znacznika przeczytania [ms]. */
const READ_WRITE_MIN_INTERVAL_MS = 5000;
let lastReadWriteAt = 0;
/** Zaległy znacznik do dopisania „na koniec" (wyjście z ekranu / ukrycie karty). */
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
 * #369: kanał otwarty na ekranie NIGDY nie zapala badge'a — czytamy go na bieżąco.
 * Baza może chwilowo twierdzić inaczej (zapis znacznika jest zdławiony, patrz
 * `markChannelReadThrottled`), więc odsiewamy ten kanał z wyniku RPC.
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
    const next = await chatUnreadCounts(getBrowserSupabase(), companyId);
    if (mine !== epoch) return;
    publish(withoutOpenChannel(next));
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
  lastReadWriteAt = Date.now();
  if (deferredRead && chatChannelKey(deferredRead.threadId) === key) deferredRead = null;
  markChatRead(getBrowserSupabase(), target, threadId).catch(() => {});
}

/**
 * #369: znacznik przeczytania dla ekranu, na którym wiadomości LECĄ STRUMIENIEM.
 * Bez dławienia każda przychodząca wiadomość = osobny zapis do bazy u każdego
 * patrzącego, a rosnąca `epoch` unieważniałaby odświeżenia w locie. RLS i tak
 * liczy `created_at > last_read_at`, więc pojedynczy zapis „na koniec" wystarcza:
 * rzadki zapis w trakcie + `flushDeferredRead()` przy zamknięciu kanału.
 * Badge otwartego kanału i tak się nie zapali (`openChannel` + `withoutOpenChannel`).
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
 * Zgłasza kanał aktualnie otwarty na ekranie czatu (`null` = ekran zamknięty).
 * Zamknięcie dopisuje zaległy znacznik — to jest ten jeden zapis „na koniec".
 */
export function setOpenChatChannel(threadId: string | null, open: boolean): void {
  openChannel = open ? chatChannelKey(threadId) : null;
  if (!open) flushDeferredRead();
}

/**
 * Uruchamia magazyn (idempotentnie): firma, pierwsze liczniki, realtime.
 *
 * #369: „wystartowane" znaczy `stopRealtime !== null`, a NIE „próbowaliśmy raz".
 * Wcześniej flaga zapalała się przed asynchroniczną inicjalizacją i nigdy nie
 * gasła: jeden nieudany `getUser`/`getCachedMembership` (brak sieci przy pierwszym
 * renderze) zostawiał martwy magazyn do końca życia karty — badge czatu pokazywał
 * 0 mimo nieprzeczytanych. Teraz nieudana próba zdejmuje `starting` w `finally`,
 * więc kolejny powrót na kartę (`visibilitychange`) / odzyskanie sieci startuje ponownie.
 */
function start(): void {
  if (stopRealtime || starting) return;
  starting = true;
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
      stopRealtime = subscribeMessages(sb, m.companyId, (msg) => {
        if (msg.sender_id === myId) return;
        const key = chatChannelKey(msg.thread_id ?? null);
        if (key === openChannel) return; // czytane na bieżąco na otwartym ekranie
        publish(withCount(key, (state.byChannel[key] ?? 0) + 1));
      });
    } catch {
      // brak sesji / offline — spróbujemy ponownie przy powrocie na kartę
    } finally {
      starting = false;
    }
  })();
}

/**
 * #369: twarde odcięcie magazynu — do wywołania przy WYLOGOWANIU. Bez tego stan
 * modułowy przeżywa `router.push("/login")` (miękka nawigacja SPA), więc po
 * zalogowaniu na inne konto w tej samej karcie `start()` wychodził od razu
 * (`stopRealtime !== null`), a badge pokazywał liczniki POPRZEDNIEJ firmy.
 * Odpowiednik mobilnego `resetChatUnread()`.
 */
export function resetChatUnread(): void {
  stopRealtime?.();
  stopRealtime = null;
  companyId = null;
  myId = null;
  starting = false;
  // Zaległy znacznik należał do poprzedniego konta — nie dopisujemy go.
  deferredRead = null;
  openChannel = null;
  // Okno dławienia też jest per konto (inaczej pierwszy zapis nowego użytkownika
  // trafiłby na resztkę okna poprzedniego).
  lastReadWriteAt = 0;
  epoch++;
  publish(emptyChatUnread());
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
      // Ukrycie karty = ostatnia okazja, by dopisać zaległy znacznik przeczytania.
      if (document.visibilityState !== "visible") {
        flushDeferredRead();
        return;
      }
      start(); // no-op gdy magazyn już działa; naprawa po nieudanym starcie
      refreshChatUnread();
    };
    // Odzyskanie sieci to najlepszy moment na powtórkę startu, który padł offline.
    const onOnline = () => {
      start();
      refreshChatUnread();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      listeners.delete(fn);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, []);
  return snapshot;
}
