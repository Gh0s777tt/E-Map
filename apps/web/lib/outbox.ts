"use client";

import { getActiveMembership, insertFuelLog, insertTripEvent } from "@e-logistic/api";
import {
  type OutboxItem as CoreOutboxItem,
  createOutboxSync,
  createSyncOutboxQueue,
  type FuelLogInput,
  newOutboxItem,
  type OutboxSendResult,
  type SyncOutboxStorage,
  type TripEventInput,
  withOccurredAt,
} from "@e-logistic/core";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * Outbox offline-first (localStorage) — fundament pod PowerSync.
 * Zapis trafia najpierw lokalnie (status `queued`), potem best-effort sync.
 * Obsługuje formularze: paliwo, AdBlue i Trip.
 *
 * Cała logika kolejki (kolejność, deduplikacja, walidacja odczytu, atomowa
 * podmiana statusu, polityka ponowień) mieszka w `@e-logistic/core/outbox`,
 * wspólnie z mobile. Tutaj zostaje tylko to, co NAPRAWDĘ platformowe: adapter
 * `localStorage` i wysyłka przez przeglądarkowego klienta Supabase.
 */
const KEY = "el-outbox";

export type OutboxKind = "fuel" | "adblue" | "trip";
export type OutboxInput = FuelLogInput | TripEventInput;
export type OutboxItem = CoreOutboxItem<OutboxKind, OutboxInput>;

const storage: SyncOutboxStorage = {
  // SSR: przy renderze na serwerze `window` nie istnieje, a kolejka jest wtedy
  // z definicji pusta — komponenty i tak dostaną ją dopiero po hydracji.
  read: () => (typeof window === "undefined" ? null : window.localStorage.getItem(KEY)),
  // Zapis świadomie BEZ tego strażnika: dane do kolejki trafiają wyłącznie
  // z akcji użytkownika w przeglądarce. Gdyby kiedykolwiek doszło do zapisu na
  // serwerze, ma to głośno paść, a nie po cichu zgubić wpis kierowcy.
  write: (value) => {
    window.localStorage.setItem(KEY, value);
  },
};

/**
 * `localStorage` jest synchroniczny i WSPÓLNY dla wszystkich kart tej samej
 * domeny — właściciel z dwiema otwartymi zakładkami tracił wpisy bez żadnego
 * zerwanego łącza [#390]. Kolejka z core czyta stan świeżo tuż przed każdym
 * zapisem i rusza wyłącznie ten jeden wpis, zamiast odtwarzać snapshot sprzed
 * żądań sieciowych.
 */
const queue = createSyncOutboxQueue<OutboxItem>(storage);

export function listOutbox(kind?: OutboxKind): OutboxItem[] {
  return queue.list(kind);
}

/** Usuwa wpis z kolejki (np. błędny, oparty o nieistniejący pojazd demo). */
export function removeOutbox(itemId: string): void {
  queue.remove(itemId);
}

/** Wysyłka jednego wpisu: wymaga konfiguracji Supabase i zalogowanej sesji. */
async function send(item: OutboxItem): Promise<OutboxSendResult> {
  const supabase = getBrowserSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji — wpis czeka w kolejce.");

  const membership = await getActiveMembership(supabase);
  if (!membership) throw new Error("Brak firmy — utwórz firmę (onboarding), by zsynchronizować.");
  const ctx = { id: item.id, companyId: membership.companyId, driverId: user.id };

  if (item.kind === "trip") {
    await insertTripEvent(
      supabase,
      withOccurredAt(item.input as TripEventInput, item.createdAt),
      ctx,
    );
  } else {
    await insertFuelLog(
      supabase,
      withOccurredAt(item.input as FuelLogInput, item.createdAt),
      ctx,
      item.kind === "adblue" ? "adblue_logs" : "fuel_logs",
    );
  }
  // Panel webowy nie ma stempla właściciela wpisu (kolejka żyje w jednej
  // przeglądarce, a sesję znamy dopiero tutaj), więc nie ma tu czego pominąć —
  // wszystko, co doszło bez wyjątku, jest dostarczone.
  return "synced";
}

const outboxSync = createOutboxSync<OutboxItem>({ queue, send });

/**
 * Best-effort synchronizacja. Deduplikowana po `id`: ekran historii ma przycisk
 * „ponów", a kolejka bywa flushowana po powrocie sieci — bez tego ten sam wpis
 * potrafił polecieć dwoma żądaniami naraz. Duplikatu w bazie by nie zrobił
 * ([#222] upsert po `id`), ale drugie żądanie i tak wracało błędem, który
 * użytkownik widział jako awarię poprawnie zapisanego wpisu.
 */
export function trySync(itemId: string): Promise<void> {
  return outboxSync.sync(itemId);
}

/** Dodaje wpis do outboxu (zawsze lokalnie) i próbuje od razu zsynchronizować. */
export async function enqueue(
  kind: OutboxKind,
  input: OutboxInput,
  createdAt: string,
): Promise<OutboxItem> {
  const item = newOutboxItem(kind, input, createdAt);
  queue.add(item);
  // Web czeka na wynik synchronizacji (mobile świadomie nie — #354), bo formularz
  // pokazuje status od razu po zapisie, a przeglądarka nie wisi tu na wygaszonym
  // ekranie telefonu.
  await outboxSync.sync(item.id);
  return queue.list().find((i) => i.id === item.id) ?? item;
}

/** Próba synchronizacji wszystkich niewysłanych wpisów (np. po powrocie sieci). */
export function flushQueued(): Promise<void> {
  return outboxSync.flush();
}

let autoFlushArmed = false;

/** #267: auto-flush outboxu po powrocie online (mobile robi to od zawsze). Idempotentne. */
export function initOutboxAutoFlush(): void {
  if (autoFlushArmed || typeof window === "undefined") return;
  autoFlushArmed = true;
  window.addEventListener("online", () => {
    void flushQueued();
  });
}
