import {
  type ChecklistSubmissionInput,
  type DriverExpenseInput,
  getActiveMembership,
  insertChecklistSubmission,
  insertDriverExpense,
  insertFuelLog,
  insertTripEvent,
} from "@e-logistic/api";
import { type FuelLogInput, newId, type TripEventInput } from "@e-logistic/core";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSupabase, supabaseConfigured } from "./supabase";

/**
 * Outbox offline-first (AsyncStorage) — odpowiednik webowego `lib/outbox.ts`.
 * Zapis trafia najpierw lokalnie (status `queued`), potem best-effort sync do
 * Supabase. Obsługuje formularze: paliwo, AdBlue i Trip. Fundament pod PowerSync.
 */
const KEY = "el-outbox";

export type OutboxKind = "fuel" | "adblue" | "trip" | "checklist" | "expense";

export interface OutboxItem {
  id: string;
  kind: OutboxKind;
  input: FuelLogInput | TripEventInput | ChecklistSubmissionInput | DriverExpenseInput;
  status: "queued" | "synced" | "error";
  createdAt: string;
  error?: string;
}

async function read(): Promise<OutboxItem[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) ?? "[]") as OutboxItem[];
  } catch {
    return [];
  }
}

// #294: nasłuch zmian outboxu (globalny pasek "czeka na wysyłkę" nad tab barem).
const listeners = new Set<() => void>();

/** Subskrypcja każdej zmiany outboxu; zwraca funkcję wypisującą. */
export function subscribeOutbox(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Liczba wpisów, które nie dotarły jeszcze do Supabase (queued + error). */
export async function pendingCount(): Promise<number> {
  return (await read()).filter((i) => i.status !== "synced").length;
}

async function write(items: OutboxItem[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
  for (const fn of listeners) fn();
}

// #audyt Ś4: wyścig read-modify-write. Wcześniej trySync czytał CAŁĄ tablicę,
// mutował jeden wpis i zapisywał ją w całości — z awaitami pomiędzy. Dwa
// przeploty (np. tłowy sync z enqueue + flushQueued z ekranu) nadpisywały świeży
// `synced` nieaktualną kopią: A→synced, potem B zapisuje starą tablicę z A=queued
// → przy kolejnym flushu A wstawiany PONOWNIE (duplikat) lub ginął status error.
// Naprawa: (a) każdy zapis tablicy idzie przez `withOutboxLock` (łańcuch obietnic
// serializuje read-modify-write); (b) status pojedynczego wpisu zmienia atomowo
// `patchItem` (re-czyta świeżą tablicę i podmienia TYLKO ten wpis); (c) sieciowa
// synchronizacja danego id jest deduplikowana przez `inFlight` — ten sam wpis nie
// poleci równolegle (brak podwójnego insertu), a równolegli wołający dzielą jedną
// obietnicę i czekają na jej wynik.
let writeChain: Promise<unknown> = Promise.resolve();
function withOutboxLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  // Ogniwo łańcucha nigdy nie odrzuca — inaczej kolejna operacja by przepadła.
  writeChain = run.then(
    () => {},
    () => {},
  );
  return run;
}

/** Synchronizacje w toku (id → obietnica) — dedup i wspólne oczekiwanie. */
const inFlight = new Map<string, Promise<void>>();

/** Atomowa podmiana statusu/błędu jednego wpisu (read-merge-write pod mutexem). */
async function patchItem(id: string, status: OutboxItem["status"], error?: string): Promise<void> {
  await withOutboxLock(async () => {
    const items = await read();
    const current = items.find((i) => i.id === id);
    if (!current) return; // usunięty w międzyczasie — nie wskrzeszamy
    current.status = status;
    current.error = error;
    await write(items);
  });
}

export async function listOutbox(kind?: OutboxKind): Promise<OutboxItem[]> {
  const all = await read();
  return kind ? all.filter((i) => i.kind === kind) : all;
}

export async function removeOutbox(itemId: string): Promise<void> {
  await withOutboxLock(async () => {
    await write((await read()).filter((i) => i.id !== itemId));
  });
}

/** Dodaje wpis do outboxu (zawsze lokalnie) i próbuje od razu zsynchronizować. */
export async function enqueue(
  kind: OutboxKind,
  input: FuelLogInput | TripEventInput | ChecklistSubmissionInput | DriverExpenseInput,
  createdAt: string,
): Promise<OutboxItem> {
  const item: OutboxItem = { id: newId(), kind, input, status: "queued", createdAt };
  await withOutboxLock(async () => {
    const items = await read();
    items.unshift(item);
    await write(items);
  });
  // #354: zapis do outboxu jest LOKALNY i natychmiastowy — synchronizację z serwerem
  // odpalamy w tle (fire-and-forget). Wcześniej `await trySync` blokował powrót z
  // enqueue, a że `trySync` woła `sb.auth.getUser()`/`getActiveMembership()` BEZ
  // timeoutu, na wolnej/zerwanej sieci wisiał w nieskończoność — przez co przycisk
  // „Zapisz" zostawał w stanie `busy` (disabled) i każde kolejne tapnięcie ginęło na
  // `if (busy) return`, co user widział jako „nic się nie dzieje / nie da się zapisać".
  void trySync(item.id).catch(() => {});
  return item;
}

/**
 * Best-effort synchronizacja jednego wpisu: wymaga konfiguracji + sesji.
 * Deduplikowana — równoległe wywołania dla tego samego id dzielą jedną obietnicę
 * (bez podwójnego insertu), a status trafia do storage atomowo przez `patchItem`.
 */
export function trySync(itemId: string): Promise<void> {
  const existing = inFlight.get(itemId);
  if (existing) return existing;
  // Rejestracja jest SYNCHRONICZNA (żaden await między get a set) — dwa równoległe
  // trySync tego samego id nie mogą wystartować dwóch synchronizacji.
  const run = syncItem(itemId).finally(() => inFlight.delete(itemId));
  inFlight.set(itemId, run);
  return run;
}

async function syncItem(itemId: string): Promise<void> {
  const item = (await read()).find((i) => i.id === itemId);
  if (!item || item.status === "synced") return;

  try {
    if (!supabaseConfigured) throw new Error("Brak konfiguracji Supabase.");
    const sb = getSupabase();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) throw new Error("Brak sesji — wpis czeka w kolejce.");

    const membership = await getActiveMembership(sb);
    if (!membership) throw new Error("Brak firmy — wpis czeka w kolejce.");
    const ctx = { id: item.id, companyId: membership.companyId, driverId: user.id };

    if (item.kind === "expense") {
      // #291: wydatek dodany offline — companyId dopinamy przy synchronizacji.
      await insertDriverExpense(sb, {
        ...(item.input as DriverExpenseInput),
        companyId: membership.companyId,
      });
    } else if (item.kind === "checklist") {
      // #273: checklisty — trigger w bazie dopina driver_id po auth.uid().
      await insertChecklistSubmission(
        sb,
        membership.companyId,
        item.input as ChecklistSubmissionInput,
      );
    } else if (item.kind === "trip") {
      await insertTripEvent(sb, item.input as TripEventInput, ctx);
    } else {
      await insertFuelLog(
        sb,
        item.input as FuelLogInput,
        ctx,
        item.kind === "adblue" ? "adblue_logs" : "fuel_logs",
      );
    }
    item.status = "synced";
    item.error = undefined;
  } catch (e) {
    item.status = "error";
    item.error = errorMessage(e);
  }
  // Zapis statusu re-czyta świeżą tablicę i podmienia tylko ten wpis (patrz Ś4).
  await patchItem(item.id, item.status, item.error);
}

/** Próba zsynchronizowania wszystkich niewysłanych wpisów (np. po odzyskaniu sieci). */
export async function flushQueued(): Promise<void> {
  const items = await read();
  for (const it of items) {
    if (it.status !== "synced") await trySync(it.id);
  }
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object") {
    const o = e as { message?: string; details?: string; hint?: string; code?: string };
    return o.message || o.details || o.hint || o.code || "Błąd synchronizacji";
  }
  return "Błąd synchronizacji";
}
