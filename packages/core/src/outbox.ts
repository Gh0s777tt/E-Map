/**
 * Wspólny rdzeń kolejki offline-first („outbox").
 *
 * Web (localStorage) i mobile (AsyncStorage) miały dotąd dwie NIEZALEŻNE
 * implementacje tej samej logiki i rozjechały się o setki linii. To nie jest
 * kwestia stylu: poprawka wyścigu read-modify-write powstała najpierw na mobile
 * (#audyt Ś4), a na web trafiła dopiero przy [#390] — do tego czasu ten sam
 * błąd po cichu kasował wpisy w panelu. Outbox trzyma dane, których NIE DA SIĘ
 * odtworzyć (tankowanie wpisane w terenie bez zasięgu), więc rozjazd znaczy, że
 * ta sama awaria sieci kończy się inaczej u kierowcy i u spedytora.
 *
 * Tutaj mieszka wszystko, co NIE zależy od platformy: kształt wpisu, kolejność,
 * deduplikacja, walidacja odczytu, polityka ponowień, przycinanie i atomowa
 * podmiana statusu. Po stronie aplikacji zostaje adapter storage'u oraz sama
 * wysyłka do backendu (inny klient Supabase, inny zestaw rodzajów zdarzeń).
 *
 * `packages/core` kompiluje się z `lib: ["ES2023"]` — bez DOM i bez React Native
 * — więc storage MUSI być wstrzykiwany. Inaczej ta sama logika nie mogłaby
 * działać po obu stronach.
 */

import { newId } from "./ids";

/** Wynik operacji, która na jednej platformie jest synchroniczna, a na drugiej nie. */
export type MaybePromise<T> = T | Promise<T>;

/**
 * `queued` — czeka na wysyłkę · `synced` — potwierdzone przez backend ·
 * `error` — ostatnia próba się nie udała, wpis NADAL czeka (błąd to informacja
 * dla użytkownika, nie kasowanie danych).
 */
export type OutboxStatus = "queued" | "synced" | "error";

/**
 * Wpis kolejki. Generyczny po rodzaju i ładunku, bo web obsługuje trzy rodzaje
 * formularzy, a mobile sześć — i każda aplikacja musi zachować swoją wąską unię
 * (`Record<OutboxItem["kind"], …>` w ekranach przestałby pilnować kompletności,
 * gdyby `kind` zdegenerował się tu do `string`).
 */
export interface OutboxItem<K extends string = string, I = unknown> {
  /** UUID nadany na kliencie. Jest też kluczem głównym rekordu w bazie —
      dzięki temu ponowna wysyłka to `ON CONFLICT (id) DO NOTHING` [#222]. */
  id: string;
  kind: K;
  input: I;
  status: OutboxStatus;
  /** Moment ZAKOLEJKOWANIA (nie synchronizacji) — patrz `withOccurredAt` [#373]. */
  createdAt: string;
  error?: string;
  /**
   * #per-user (współdzielony telefon): auth.uid właściciela wpisu.
   * `null`/undefined = zakolejkowane bez sesji (głęboki offline) — „niczyje".
   */
  userId?: string | null;
}

/** Zmiana, jaką synchronizacja nanosi na pojedynczy wpis. */
export interface OutboxPatch {
  status: OutboxStatus;
  error?: string;
}

const STATUSES: readonly string[] = ["queued", "synced", "error"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Sprawdza wpis odczytany ze storage'u. Świadomie POBŁAŻLIWA:
 * odrzucamy wyłącznie to, czego nie da się ani zsynchronizować, ani usunąć
 * (brak `id`) albo skierować do właściwej tabeli (brak `kind`). Każde ostrzejsze
 * kryterium kasowałoby dane kierowcy z powodu pola, którego zabrakło po
 * aktualizacji aplikacji — a utrata wpisu jest tu gorsza niż wpis dziwny.
 *
 * Nieznany status → `queued`, NIGDY `synced`: fałszywe „wysłane" oznacza wpis,
 * którego już nikt nie ponowi.
 */
function normalizeItem<T extends OutboxItem>(entry: unknown): T | null {
  if (!isRecord(entry)) return null;
  const id = entry.id;
  const kind = entry.kind;
  if (typeof id !== "string" || id === "") return null;
  if (typeof kind !== "string" || kind === "") return null;
  const status: OutboxStatus =
    typeof entry.status === "string" && STATUSES.includes(entry.status)
      ? (entry.status as OutboxStatus)
      : "queued";
  const normalized = {
    ...entry,
    id,
    kind,
    status,
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : "",
    error: typeof entry.error === "string" ? entry.error : undefined,
  };
  // Granica zaufania: dane pochodzą ze storage'u, więc kształt `T` jest
  // deklaracją aplikacji, a nie faktem możliwym do udowodnienia w typach.
  return normalized as unknown as T;
}

/**
 * Odczyt kolejki z surowego JSON-a. Storage bywa uszkodzony (przerwany zapis,
 * ręczna edycja, migracja formatu), a wyjątek w tym miejscu wywracał cały ekran
 * historii — dlatego zawsze zwracamy tablicę.
 *
 * Deduplikacja po `id` [#221]: wyścig read-modify-write potrafił wpisać ten sam
 * wpis dwa razy. Zostawiamy PIERWSZE wystąpienie (kolejka jest od najnowszych),
 * ale jeśli którykolwiek duplikat jest `synced`, wygrywa `synced` — inaczej
 * ponawialibyśmy coś, co backend już potwierdził.
 */
export function parseOutbox<T extends OutboxItem>(raw: string | null | undefined): T[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw ?? "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const items: T[] = [];
  const seen = new Map<string, number>();
  for (const entry of parsed) {
    const item = normalizeItem<T>(entry);
    if (!item) continue;
    const at = seen.get(item.id);
    if (at === undefined) {
      seen.set(item.id, items.length);
      items.push(item);
      continue;
    }
    const kept = items[at];
    if (kept && kept.status !== "synced" && item.status === "synced") {
      items[at] = { ...kept, status: "synced", error: undefined };
    }
  }
  return items;
}

/** Zapis kolejki do JSON-a (para dla `parseOutbox`). */
export function serializeOutbox<T extends OutboxItem>(items: readonly T[]): string {
  return JSON.stringify(items);
}

/**
 * Nowy wpis kolejki. `userId` stemplujemy tylko tam, gdzie platforma potrafi go
 * podać bez sieci — brak pola znaczy „niczyj", a nie „cudzy".
 */
export function newOutboxItem<K extends string, I>(
  kind: K,
  input: I,
  createdAt: string,
  userId?: string | null,
): OutboxItem<K, I> {
  const item: OutboxItem<K, I> = { id: newId(), kind, input, status: "queued", createdAt };
  if (userId !== undefined) item.userId = userId;
  return item;
}

/**
 * Dokłada wpis na POCZĄTEK kolejki — ekrany pokazują historię od najnowszej.
 * Wpis o tym samym `id` zastępuje poprzedni: dwa wpisy z jednym `id` byłyby
 * nie do rozróżnienia przy `patch`/`remove`, a `id` jest kluczem w bazie.
 */
export function insertIntoOutbox<T extends OutboxItem>(items: readonly T[], item: T): T[] {
  return [item, ...items.filter((i) => i.id !== item.id)];
}

/**
 * Podmiana statusu JEDNEGO wpisu. `null` = wpisu już nie ma — wtedy wołający ma
 * NIE zapisywać niczego. To nie jest detal: synchronizacja zaczęta przed
 * usunięciem wpisu wskrzeszała go ze swojego snapshotu, a użytkownik widział
 * „skasowałem, a wrócił" [#390]. Usunięcie jest świadomą decyzją użytkownika
 * i wygrywa z synchronizacją, która wystartowała wcześniej.
 */
export function patchOutbox<T extends OutboxItem>(
  items: readonly T[],
  id: string,
  patch: OutboxPatch,
): T[] | null {
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  const current = items[idx];
  if (!current) return null;
  const next = items.slice();
  next[idx] = { ...current, status: patch.status, error: patch.error };
  return next;
}

/** Usuwa wpis z kolejki (np. błędny, oparty o nieistniejący pojazd demo). */
export function dropFromOutbox<T extends OutboxItem>(items: readonly T[], id: string): T[] {
  return items.filter((i) => i.id !== id);
}

/** Wpisy jednego rodzaju (bez argumentu — całość, w kolejności kolejki). */
export function filterOutboxByKind<T extends OutboxItem>(
  items: readonly T[],
  kind?: T["kind"],
): T[] {
  return kind ? items.filter((i) => i.kind === kind) : items.slice();
}

/**
 * Polityka ponowień: ponawiamy KAŻDY wpis, który nie jest `synced`, w kolejności
 * kolejki, po jednym na raz.
 *
 * Świadomie BEZ backoffu i bez limitu prób. Ponowienia nie chodzą tu z zegara,
 * tylko z realnych zdarzeń (powrót sieci, wejście na ekran, przycisk „ponów"),
 * więc opóźnianie ich tylko przetrzymywałoby dane kierowcy w telefonie. Wpis
 * ze statusem `error` też wraca do ponowienia — błąd bywa chwilowy (wygasła
 * sesja, brak firmy), a jedyna droga wyjścia z kolejki to albo udany zapis,
 * albo świadome usunięcie przez użytkownika.
 */
export function pendingOutboxItems<T extends OutboxItem>(items: readonly T[]): T[] {
  return items.filter((i) => i.status !== "synced");
}

/** Ile wpisów nie dotarło jeszcze do backendu (queued + error). */
export function countPendingOutbox<T extends OutboxItem>(items: readonly T[]): number {
  return pendingOutboxItems(items).length;
}

/** Warunki przycinania kolejki — patrz `pruneOutbox`. */
export interface OutboxPruneOptions {
  /** Rodzaje, które wolno przyciąć. Formularzy NIE przycinamy — to historia kierowcy. */
  kinds: readonly string[];
  /** Ile trzymać potwierdzony wpis, zanim stanie się śmieciem. */
  keepMs: number;
  /** Wstrzykiwany czas — testy i tak nie mogą polegać na zegarze. */
  now?: number;
}

/**
 * Przycina kolejkę: usuwa wyłącznie wpisy POTWIERDZONE przez backend, wskazanych
 * rodzajów i starsze niż `keepMs`.
 *
 * Trzy warunki naraz, bo każdy z osobna kasowałby dane: `synced` — żeby nie
 * stracić czegoś, co nigdy nie dotarło; `kinds` — bo lokalna kopia wiadomości
 * czatu jest tylko dymkiem „wysyłanie…", a wpis paliwa jest historią; `keepMs` —
 * żeby dymek nie mrugnął, zanim realtime przyniesie prawdziwą wiadomość.
 *
 * Wpis z niepoprawną datą (`NaN`) zostaje — nie kasujemy z powodu wątpliwości.
 */
export function pruneOutbox<T extends OutboxItem>(
  items: readonly T[],
  options: OutboxPruneOptions,
): T[] {
  const cutoff = (options.now ?? Date.now()) - options.keepMs;
  return items.filter(
    (i) =>
      !(
        options.kinds.includes(i.kind) &&
        i.status === "synced" &&
        new Date(i.createdAt).getTime() < cutoff
      ),
  );
}

/**
 * [#373] Dopina datę zdarzenia z momentu ZAKOLEJKOWANIA, nie synchronizacji.
 *
 * Kolejka od zawsze trzymała `createdAt` lokalnie, ale nigdy go nie wysyłała.
 * Tankowanie wpisane w terenie bez zasięgu i zsynchronizowane trzy dni później
 * dostawało w bazie datę synchronizacji, więc wpadało do złego miesiąca i cicho
 * psuło zestawienie. Jawna data z formularza ma pierwszeństwo — użytkownik mógł
 * wpisać tankowanie sprzed tygodnia.
 */
export function withOccurredAt<T extends { occurredAt?: string }>(input: T, queuedAt: string): T {
  return input.occurredAt ? input : { ...input, occurredAt: queuedAt };
}

/**
 * #per-user (współdzielony telefon): czy wpis należy do KOGOŚ INNEGO niż
 * zalogowany użytkownik. Wpis bez właściciela („niczyj", zakolejkowany bez
 * sesji) przechodzi — claimuje go pierwszy zalogowany, bo inaczej dane
 * z głębokiego offline'u nie miałyby jak wyjść z telefonu.
 */
export function isOutboxItemForeign(item: OutboxItem, userId: string): boolean {
  return item.userId != null && item.userId !== userId;
}

/** Czytelny komunikat z błędu (Supabase/PostgREST zwraca obiekt, nie `Error`). */
export function outboxErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object") {
    const o = e as { message?: string; details?: string; hint?: string; code?: string };
    return o.message || o.details || o.hint || o.code || "Błąd synchronizacji";
  }
  return "Błąd synchronizacji";
}

// ── Storage i kolejka ────────────────────────────────────────────────────────

/**
 * Odczyt kolejki tolerujący AWARIĘ SAMEGO STORAGE'U, nie tylko uszkodzony JSON.
 *
 * `parseOutbox` broni się przed treścią, której nie da się sparsować — ale wywołanie
 * `storage.read()` leży POZA nim i potrafi rzucić albo odrzucić obietnicę: AsyncStorage
 * zwraca „database or disk is full", uszkodzony SQLite/RocksDB albo androidowe
 * „Row too big to fit into CursorWindow" przy dużej kolejce, a `localStorage` rzuca przy
 * storage zablokowanym przez politykę przeglądarki. Wcześniej taki błąd wychodził aż do
 * ekranów: `listOutbox()`/`pendingCount()` odrzucały, `flushQueued().then(refresh)`
 * kończyło się nieobsłużonym odrzuceniem, a pasek „czeka na wysyłkę" przestawał pokazywać
 * zaległe wpisy. Awaria storage'u jest dla kolejki nieodróżnialna od storage'u pustego,
 * więc traktujemy ją tak samo: pusta lista zamiast wyjątku.
 *
 * ZAPIS świadomie zostaje bez tego strażnika — nieudanego zapisu NIE wolno przemilczeć,
 * bo to jest moment, w którym dane kierowcy naprawdę przepadają.
 */
function readRaw(read: () => string | null): string | null {
  try {
    return read();
  } catch {
    return null;
  }
}

async function readRawAsync(read: () => Promise<string | null>): Promise<string | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}

/** Adapter storage'u synchronicznego (web: `localStorage`). */
export interface SyncOutboxStorage {
  read(): string | null;
  write(value: string): void;
}

/** Adapter storage'u asynchronicznego (mobile: `AsyncStorage`). */
export interface AsyncOutboxStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
}

/** Kolejka nad storage'em synchronicznym. */
export interface SyncOutboxQueue<T extends OutboxItem> {
  list(kind?: T["kind"]): T[];
  add(item: T): void;
  patch(id: string, patch: OutboxPatch): void;
  remove(id: string): void;
  prune(options: OutboxPruneOptions): void;
  pending(): number;
}

/** Kolejka nad storage'em asynchronicznym. */
export interface AsyncOutboxQueue<T extends OutboxItem> {
  list(kind?: T["kind"]): Promise<T[]>;
  add(item: T): Promise<void>;
  patch(id: string, patch: OutboxPatch): Promise<void>;
  remove(id: string): Promise<void>;
  prune(options: OutboxPruneOptions): Promise<void>;
  pending(): Promise<number>;
}

/**
 * Kolejka na storage'u SYNCHRONICZNYM.
 *
 * Nie ma tu mutexa i to jest celowe: `localStorage` jest synchroniczny, więc
 * każda operacja odczytuje i zapisuje kolejkę w jednym zadaniu pętli zdarzeń —
 * nie ma miejsca, w którym inny zapis mógłby się wcisnąć między odczyt a zapis.
 * Dodanie tu mutexa opartego o obietnice ROZERWAŁOBY tę atomowość (odczyt i
 * zapis wylądowałyby w różnych mikrozadaniach) i przywróciło błąd [#390].
 * Wersja asynchroniczna nie ma tego luksusu i mutex mieć musi.
 */
export function createSyncOutboxQueue<T extends OutboxItem>(
  storage: SyncOutboxStorage,
  onChange?: () => void,
): SyncOutboxQueue<T> {
  const read = (): T[] => parseOutbox<T>(readRaw(() => storage.read()));
  const write = (items: readonly T[]): void => {
    storage.write(serializeOutbox(items));
    onChange?.();
  };

  return {
    list: (kind) => filterOutboxByKind(read(), kind),
    add: (item) => write(insertIntoOutbox(read(), item)),
    patch: (id, patch) => {
      // Odczyt tuż przed zapisem — snapshot sprzed wysyłki sieciowej jest już
      // nieaktualny i nadpisałby wszystko, co w międzyczasie weszło do kolejki.
      const next = patchOutbox(read(), id, patch);
      if (next) write(next);
    },
    remove: (id) => write(dropFromOutbox(read(), id)),
    prune: (options) => {
      const items = read();
      const kept = pruneOutbox(items, options);
      if (kept.length !== items.length) write(kept);
    },
    pending: () => countPendingOutbox(read()),
  };
}

/**
 * Kolejka na storage'u ASYNCHRONICZNYM.
 *
 * #audyt Ś4: każdy read-modify-write idzie przez łańcuch obietnic, bo między
 * odczytem a zapisem `AsyncStorage` jest await, a więc i miejsce na przeplot.
 * Bez tego dwie synchronizacje naraz nadpisywały świeży `synced` starą kopią —
 * i przy kolejnym flushu wpis leciał do bazy PONOWNIE.
 *
 * `list` celowo NIE bierze zamka: to czysty odczyt, a blokowanie go opóźniałoby
 * odświeżanie ekranów za każdą trwającą synchronizacją.
 */
export function createAsyncOutboxQueue<T extends OutboxItem>(
  storage: AsyncOutboxStorage,
  onChange?: () => void,
): AsyncOutboxQueue<T> {
  let chain: Promise<unknown> = Promise.resolve();
  const withLock = <R>(fn: () => Promise<R>): Promise<R> => {
    const run = chain.then(fn, fn);
    // Ogniwo łańcucha nigdy nie odrzuca — inaczej kolejna operacja by przepadła.
    chain = run.then(
      () => {},
      () => {},
    );
    return run;
  };

  const read = async (): Promise<T[]> => parseOutbox<T>(await readRawAsync(() => storage.read()));
  const write = async (items: readonly T[]): Promise<void> => {
    await storage.write(serializeOutbox(items));
    onChange?.();
  };

  return {
    list: async (kind) => filterOutboxByKind(await read(), kind),
    add: (item) => withLock(async () => write(insertIntoOutbox(await read(), item))),
    patch: (id, patch) =>
      withLock(async () => {
        const next = patchOutbox(await read(), id, patch);
        if (next) await write(next);
      }),
    remove: (id) => withLock(async () => write(dropFromOutbox(await read(), id))),
    prune: (options) =>
      withLock(async () => {
        const items = await read();
        const kept = pruneOutbox(items, options);
        if (kept.length !== items.length) await write(kept);
      }),
    pending: async () => countPendingOutbox(await read()),
  };
}

// ── Synchronizacja ───────────────────────────────────────────────────────────

/**
 * Wynik wysyłki. `"skipped"` = zostaw wpis w kolejce BEZ zmiany statusu — to nie
 * jest błąd: tak wychodzi wpis, którego nie wolno wysłać pod bieżącym kontem
 * (współdzielony telefon) i który poczeka na właściciela, zamiast trafić do
 * obcej firmy. Wynik jest WYMAGANY (a nie `void`), żeby każda gałąź wysyłki
 * musiała powiedzieć wprost, czy wpis wolno oznaczyć jako dostarczony.
 */
export type OutboxSendResult = "synced" | "skipped";

/** Minimum, jakiego synchronizacja potrzebuje od kolejki (sync i async pasują tak samo). */
export interface OutboxQueueView<T extends OutboxItem> {
  list(): MaybePromise<T[]>;
  patch(id: string, patch: OutboxPatch): MaybePromise<void>;
}

export interface OutboxSyncOptions<T extends OutboxItem> {
  queue: OutboxQueueView<T>;
  /** Wysyłka do backendu. Wyjątek → status `error` z komunikatem dla użytkownika. */
  send(item: T): Promise<OutboxSendResult>;
}

export interface OutboxSyncController {
  /** Best-effort synchronizacja jednego wpisu. */
  sync(id: string): Promise<void>;
  /** Ponowienie wszystkich niewysłanych wpisów (np. po powrocie sieci). */
  flush(): Promise<void>;
}

/**
 * Orkiestracja synchronizacji — wspólna dla obu platform, bo to tutaj mieszkały
 * najdroższe błędy: podwójny insert, cofnięty status i wskrzeszony wpis.
 *
 * Wysyłka (`send`) zostaje po stronie aplikacji, bo tylko ona wie, którą tabelę
 * zasilić i którym klientem Supabase.
 */
export function createOutboxSync<T extends OutboxItem>(
  options: OutboxSyncOptions<T>,
): OutboxSyncController {
  const { queue, send } = options;
  /** Synchronizacje w toku (id → obietnica) — dedup i wspólne oczekiwanie. */
  const inFlight = new Map<string, Promise<void>>();

  async function run(id: string): Promise<void> {
    const item = (await queue.list()).find((i) => i.id === id);
    // Strażnik na ŚWIEŻYM odczycie: wpis mógł zostać w międzyczasie usunięty
    // albo już potwierdzony przez równoległą próbę.
    if (!item || item.status === "synced") return;
    try {
      if ((await send(item)) === "skipped") return;
      await queue.patch(id, { status: "synced", error: undefined });
    } catch (e) {
      await queue.patch(id, { status: "error", error: outboxErrorMessage(e) });
    }
  }

  function sync(id: string): Promise<void> {
    const existing = inFlight.get(id);
    if (existing) return existing;
    // Rejestracja jest SYNCHRONICZNA (żaden await między get a set) — dwa
    // równoległe `sync` tego samego id nie mogą wystartować dwóch wysyłek.
    // Wołający dzielą jedną obietnicę i czekają na ten sam wynik.
    const started = run(id).finally(() => inFlight.delete(id));
    inFlight.set(id, started);
    return started;
  }

  async function flush(): Promise<void> {
    // Po jednym na raz: równoległa wysyłka całej kolejki po powrocie zasięgu to
    // pewny timeout na słabym łączu, a kolejność wpisów niesie sens (start/stop
    // trasy). Statusy czytamy ze snapshotu, ale `sync` i tak weryfikuje świeży.
    for (const item of pendingOutboxItems(await queue.list())) await sync(item.id);
  }

  return { sync, flush };
}
