import {
  type ChecklistSubmissionInput,
  type DriverExpenseInput,
  getActiveMembership,
  insertChecklistSubmission,
  insertDriverExpense,
  insertFuelLog,
  insertTripEvent,
  upsertMessage,
} from "@e-logistic/api";
import {
  type AsyncOutboxStorage,
  type OutboxItem as CoreOutboxItem,
  createAsyncOutboxQueue,
  createOutboxSync,
  type FuelLogInput,
  isOutboxItemForeign,
  newOutboxItem,
  type OutboxSendResult,
  type TripEventInput,
  withOccurredAt,
} from "@e-logistic/core";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { notifyChat } from "./chatNotify";
import { getSupabase, supabaseConfigured } from "./supabase";

/**
 * Outbox offline-first (AsyncStorage) — odpowiednik webowego `lib/outbox.ts`.
 * Zapis trafia najpierw lokalnie (status `queued`), potem best-effort sync do
 * Supabase. Obsługuje formularze: paliwo, AdBlue, Trip, checklisty, wydatki
 * oraz wiadomości czatu (#368). Fundament pod PowerSync.
 *
 * Kształt kolejki, kolejność, deduplikacja, mutex read-modify-write (#audyt Ś4),
 * dedup synchronizacji i przycinanie mieszkają w `@e-logistic/core/outbox` —
 * wspólnie z webem, bo dwie kopie tej samej logiki już raz się rozjechały.
 * Tutaj zostaje adapter `AsyncStorage`, stempel właściciela wpisu i wysyłka.
 */
const KEY = "el-outbox";

export type OutboxKind = "fuel" | "adblue" | "trip" | "checklist" | "expense" | "chat";

/**
 * #368: wiadomość czatu zakolejkowana lokalnie. `id` wpisu outboxu jest
 * jednocześnie `messages.id` — dokładnie jak przy paliwie/Tripie — więc ponowny
 * sync leci jako `ON CONFLICT (id) DO NOTHING` i nie tworzy duplikatu.
 * `photoPath` wypełniamy TYLKO gdy zdjęcie zdążyło trafić do Storage (upload
 * wymaga sieci; sam tekst kolejkuje się zawsze).
 */
export interface ChatOutboxInput {
  companyId: string;
  threadId: string | null;
  body: string;
  senderLabel: string;
  photoPath?: string | null;
  /**
   * [#374] Cytowana wiadomość. Opcjonalne — wpisy, które leżą już w kolejce
   * ze starego buildu, nie mają tego pola i muszą przejść bez zmian.
   */
  replyToId?: string | null;
}

export type OutboxInput =
  | FuelLogInput
  | TripEventInput
  | ChecklistSubmissionInput
  | DriverExpenseInput
  | ChatOutboxInput;

export type OutboxItem = CoreOutboxItem<OutboxKind, OutboxInput>;

/**
 * Adapter bez własnego try/catch — strażnik odczytu siedzi w rdzeniu
 * (`createAsyncOutboxQueue`), bo dotyczy tak samo `localStorage` w webie.
 * Odrzucone `getItem` (pełny dysk, uszkodzony SQLite, androidowe „Row too big to fit
 * into CursorWindow") kończy się tam pustą kolejką zamiast wyjątku — inaczej
 * `listOutbox()`/`pendingCount()` odrzucałyby aż do ekranów, a `flushQueued().then(refresh)`
 * byłoby nieobsłużonym odrzuceniem obietnicy. ZAPIS celowo zostaje nagi: nieudanego
 * zapisu nie wolno przemilczeć, bo wtedy wpis kierowcy naprawdę przepada.
 */
const storage: AsyncOutboxStorage = {
  read: () => AsyncStorage.getItem(KEY),
  write: (value) => AsyncStorage.setItem(KEY, value),
};

// #294: nasłuch zmian outboxu (globalny pasek "czeka na wysyłkę" nad tab barem).
const listeners = new Set<() => void>();

/** Subskrypcja każdej zmiany outboxu; zwraca funkcję wypisującą. */
export function subscribeOutbox(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Kolejka z mutexem: między odczytem a zapisem `AsyncStorage` jest await, więc
 * i miejsce na przeplot. Bez zamka dwie synchronizacje naraz nadpisywały świeży
 * `synced` starą kopią, a przy kolejnym flushu wpis leciał do bazy PONOWNIE
 * (#audyt Ś4). Szczegóły w rdzeniu.
 */
const queue = createAsyncOutboxQueue<OutboxItem>(storage, () => {
  for (const fn of listeners) fn();
});

/** Liczba wpisów, które nie dotarły jeszcze do Supabase (queued + error). */
export function pendingCount(): Promise<number> {
  return queue.pending();
}

export function listOutbox(kind?: OutboxKind): Promise<OutboxItem[]> {
  return queue.list(kind);
}

export function removeOutbox(itemId: string): Promise<void> {
  return queue.remove(itemId);
}

/**
 * Bieżący auth.uid do stempla właściciela wpisu. Czyta LOKALNĄ sesję
 * (`getSession` bierze ją ze storage — bez sieci); świadomie NIE `getUser`, które
 * bije po sieci i przy zerwanym łączu wisiałoby do timeoutu, blokując „Zapisz"
 * (regres #354). Dodatkowo ograniczamy czekanie krótkim wyścigiem, bo przy
 * wygasłym tokenie offline `getSession` mógłby próbować cichego refreshu.
 * `null` → brak sesji: wpis zostaje „niczyj" i zsynchronizuje się pod pierwszym
 * zalogowanym (backfill w `send`), nie tracąc danych.
 */
async function currentUserId(): Promise<string | null> {
  if (!supabaseConfigured) return null;
  try {
    const session = await Promise.race([
      getSupabase()
        .auth.getSession()
        .then((r) => r.data.session),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3_000)),
    ]);
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Dodaje wpis do outboxu (zawsze lokalnie) i próbuje od razu zsynchronizować. */
export async function enqueue(
  kind: OutboxKind,
  input: OutboxInput,
  createdAt: string,
): Promise<OutboxItem> {
  // #per-user: stempel właściciela z lokalnej sesji (offline-safe, patrz helper).
  const item = newOutboxItem(kind, input, createdAt, await currentUserId());
  await queue.add(item);
  // #354: zapis do outboxu jest LOKALNY i natychmiastowy — synchronizację z serwerem
  // odpalamy w tle (fire-and-forget). Wcześniej `await trySync` blokował powrót z
  // enqueue, a że wysyłka woła `sb.auth.getUser()`/`getActiveMembership()` BEZ
  // timeoutu, na wolnej/zerwanej sieci wisiał w nieskończoność — przez co przycisk
  // „Zapisz" zostawał w stanie `busy` (disabled) i każde kolejne tapnięcie ginęło na
  // `if (busy) return`, co user widział jako „nic się nie dzieje / nie da się zapisać".
  void trySync(item.id).catch(() => {});
  return item;
}

/**
 * Wysyłka jednego wpisu. `"skipped"` zostawia wpis w kolejce BEZ oznaczania
 * błędu — tak wychodzą wpisy, których nie wolno wysłać pod bieżącym kontem.
 */
async function send(item: OutboxItem): Promise<OutboxSendResult> {
  if (!supabaseConfigured) throw new Error("Brak konfiguracji Supabase.");
  const sb = getSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Brak sesji — wpis czeka w kolejce.");

  // #per-user (współdzielony telefon): wpis kierowcy A NIE MOŻE trafić na konto
  // kierowcy B. Ma właściciela (userId) i to NIE bieżący user → pomiń: zostaw w
  // kolejce BEZ oznaczania błędu, zsynchronizuje się gdy zaloguje się właściciel.
  // Wpisy `userId==null` (zakolejkowane bez sesji) NIE mają znanego właściciela —
  // przechodzą dalej i synchronizują się pod bieżącym userem (insert i tak stempluje
  // jego auth.uid jako driver_id), więc claimuje je pierwszy zalogowany. Nie tracimy danych.
  if (isOutboxItemForeign(item, user.id)) return "skipped";

  const membership = await getActiveMembership(sb);
  if (!membership) throw new Error("Brak firmy — wpis czeka w kolejce.");
  const ctx = { id: item.id, companyId: membership.companyId, driverId: user.id };

  if (item.kind === "chat") {
    // #368: wiadomość czatu. `item.id` = `messages.id` → retry nie duplikuje.
    // Firma musi się zgadzać z bieżącym członkostwem (współdzielony telefon):
    // inaczej zostawiamy w kolejce, zamiast wysłać treść do obcej firmy.
    const chat = item.input as ChatOutboxInput;
    if (chat.companyId !== membership.companyId) return "skipped";
    // Wpis BEZ właściciela (zakolejkowany bez sesji) jest wyżej „claimowany" przez
    // pierwszego zalogowanego — dla paliwa/Tripa to świadomy backfill własnych danych.
    // Dla czatu to niedopuszczalne: wiadomość napisana przez kierowcę A wyszłaby
    // w firmowym czacie jako wypowiedź kierowcy B (sender_id = jego auth.uid).
    // Wypowiedź musi mieć jednoznacznego autora, więc czekamy na właściciela.
    if (item.userId == null) return "skipped";
    const sent = await upsertMessage(sb, {
      id: item.id,
      companyId: chat.companyId,
      threadId: chat.threadId,
      body: chat.body,
      senderLabel: chat.senderLabel,
      photoPath: chat.photoPath ?? null,
      replyToId: chat.replyToId ?? null,
    });
    // Push do odbiorców tylko przy realnym wstawieniu (null = już było, retry).
    if (sent) notifyChat(chat.threadId, chat.body, chat.companyId);
  } else if (item.kind === "expense") {
    // #291: wydatek dodany offline — companyId dopinamy przy synchronizacji.
    // [#391] `item.id` przekazany jawnie: bez niego utrata ODPOWIEDZI (żądanie
    // doszło, potwierdzenie nie) kończyła się drugim wydatkiem przy retry.
    await insertDriverExpense(
      sb,
      { ...(item.input as DriverExpenseInput), companyId: membership.companyId },
      item.id,
    );
  } else if (item.kind === "checklist") {
    // #273: checklisty — trigger w bazie dopina driver_id po auth.uid().
    // [#391] `item.id` jak wyżej — inaczej powtórka to druga kontrola pojazdu.
    await insertChecklistSubmission(
      sb,
      membership.companyId,
      item.input as ChecklistSubmissionInput,
      item.id,
    );
  } else if (item.kind === "trip") {
    await insertTripEvent(sb, withOccurredAt(item.input as TripEventInput, item.createdAt), ctx);
  } else {
    await insertFuelLog(
      sb,
      withOccurredAt(item.input as FuelLogInput, item.createdAt),
      ctx,
      item.kind === "adblue" ? "adblue_logs" : "fuel_logs",
    );
  }
  return "synced";
}

const outboxSync = createOutboxSync<OutboxItem>({ queue, send });

/**
 * Best-effort synchronizacja jednego wpisu: wymaga konfiguracji + sesji.
 * Deduplikowana — równoległe wywołania dla tego samego id dzielą jedną obietnicę
 * (bez podwójnego insertu), a status trafia do storage atomowo.
 */
export function trySync(itemId: string): Promise<void> {
  return outboxSync.sync(itemId);
}

/**
 * #368: dostarczona wiadomość czatu żyje już na serwerze — lokalna kopia służy
 * wyłącznie za dymek „wysyłanie…", więc po chwili jest śmieciem. Kasujemy tylko
 * `synced` i starsze niż 5 min (świeże zostawiamy, żeby dymek nie mrugnął, zanim
 * realtime przyniesie prawdziwą wiadomość). Formularzy NIE dotykamy — one są
 * historią aktywności kierowcy na pulpicie.
 */
const CHAT_KEEP_MS = 5 * 60 * 1000;

/** Próba zsynchronizowania wszystkich niewysłanych wpisów (np. po odzyskaniu sieci). */
export async function flushQueued(): Promise<void> {
  await outboxSync.flush();
  await queue.prune({ kinds: ["chat"], keepMs: CHAT_KEEP_MS });
}
