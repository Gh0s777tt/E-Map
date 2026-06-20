"use client";

import { insertFuelLog, insertTripEvent } from "@e-logistic/api";
import { type FuelLogInput, newId, type TripEventInput } from "@e-logistic/core";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * Outbox offline-first (localStorage) — fundament pod PowerSync.
 * Zapis trafia najpierw lokalnie (status `queued`), potem best-effort sync.
 * Obsługuje formularze: paliwo, AdBlue i Trip.
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

function read(): OutboxItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as OutboxItem[];
  } catch {
    return [];
  }
}

function write(items: OutboxItem[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

export function listOutbox(kind?: OutboxKind): OutboxItem[] {
  const all = read();
  return kind ? all.filter((i) => i.kind === kind) : all;
}

/** Dodaje wpis do outboxu (zawsze lokalnie) i próbuje od razu zsynchronizować. */
export async function enqueue(
  kind: OutboxKind,
  input: FuelLogInput | TripEventInput,
  createdAt: string,
): Promise<OutboxItem> {
  const item: OutboxItem = { id: newId(), kind, input, status: "queued", createdAt };
  const items = read();
  items.unshift(item);
  write(items);
  await trySync(item.id);
  return read().find((i) => i.id === item.id) ?? item;
}

/** Best-effort synchronizacja: wymaga konfiguracji Supabase i zalogowanej sesji. */
export async function trySync(itemId: string): Promise<void> {
  const items = read();
  const item = items.find((i) => i.id === itemId);
  if (!item || item.status === "synced") return;

  try {
    const supabase = getBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Brak sesji — wpis czeka w kolejce.");

    const companyId = (user.user_metadata?.company_id as string | undefined) ?? user.id;
    const ctx = { id: item.id, companyId, driverId: user.id };

    if (item.kind === "trip") {
      await insertTripEvent(supabase, item.input as TripEventInput, ctx);
    } else {
      await insertFuelLog(
        supabase,
        item.input as FuelLogInput,
        ctx,
        item.kind === "adblue" ? "adblue_logs" : "fuel_logs",
      );
    }
    item.status = "synced";
  } catch (e) {
    item.status = "error";
    item.error = e instanceof Error ? e.message : "Błąd synchronizacji";
  }
  write(items);
}
