import { getActiveMembership, insertFuelLog, insertTripEvent } from "@e-logistic/api";
import { type FuelLogInput, newId, type TripEventInput } from "@e-logistic/core";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSupabase, supabaseConfigured } from "./supabase";

/**
 * Outbox offline-first (AsyncStorage) — odpowiednik webowego `lib/outbox.ts`.
 * Zapis trafia najpierw lokalnie (status `queued`), potem best-effort sync do
 * Supabase. Obsługuje formularze: paliwo, AdBlue i Trip. Fundament pod PowerSync.
 */
const KEY = "el-outbox";

export type OutboxKind = "fuel" | "adblue" | "trip";

export interface OutboxItem {
  id: string;
  kind: OutboxKind;
  input: FuelLogInput | TripEventInput;
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

async function write(items: OutboxItem[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export async function listOutbox(kind?: OutboxKind): Promise<OutboxItem[]> {
  const all = await read();
  return kind ? all.filter((i) => i.kind === kind) : all;
}

export async function removeOutbox(itemId: string): Promise<void> {
  await write((await read()).filter((i) => i.id !== itemId));
}

/** Dodaje wpis do outboxu (zawsze lokalnie) i próbuje od razu zsynchronizować. */
export async function enqueue(
  kind: OutboxKind,
  input: FuelLogInput | TripEventInput,
  createdAt: string,
): Promise<OutboxItem> {
  const item: OutboxItem = { id: newId(), kind, input, status: "queued", createdAt };
  const items = await read();
  items.unshift(item);
  await write(items);
  await trySync(item.id);
  return (await read()).find((i) => i.id === item.id) ?? item;
}

/** Best-effort synchronizacja jednego wpisu: wymaga konfiguracji + sesji. */
export async function trySync(itemId: string): Promise<void> {
  const items = await read();
  const item = items.find((i) => i.id === itemId);
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

    if (item.kind === "trip") {
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
  await write(items);
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
