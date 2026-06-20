"use client";

import { insertFuelLog } from "@e-logistic/api";
import { type FuelLogInput, newId } from "@e-logistic/core";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * Prosty outbox offline-first (localStorage) — fundament pod PowerSync.
 * Zapis trafia najpierw lokalnie (status `queued`), potem best-effort sync.
 */
const KEY = "el-fuel-outbox";

export interface OutboxItem {
  id: string;
  input: FuelLogInput;
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

export function listOutbox(): OutboxItem[] {
  return read();
}

/** Dodaje wpis do outboxu (zawsze lokalnie) i próbuje od razu zsynchronizować. */
export async function enqueueFuelLog(input: FuelLogInput, createdAt: string): Promise<OutboxItem> {
  const item: OutboxItem = { id: newId(), input, status: "queued", createdAt };
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

    // companyId pochodzi z membership użytkownika (uproszczenie etapu: z metadanych).
    const companyId = (user.user_metadata?.company_id as string | undefined) ?? user.id;
    await insertFuelLog(supabase, item.input, {
      id: item.id,
      companyId,
      driverId: user.id,
    });
    item.status = "synced";
  } catch (e) {
    item.status = "error";
    item.error = e instanceof Error ? e.message : "Błąd synchronizacji";
  }
  write(items);
}
