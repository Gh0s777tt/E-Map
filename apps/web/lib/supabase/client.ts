"use client";

import { createSupabaseBrowserClient } from "@e-logistic/api";

let client: ReturnType<typeof createSupabaseBrowserClient> | null = null;

/** Singleton klienta przeglądarkowego (tworzony leniwie przy pierwszym użyciu). */
export function getBrowserSupabase() {
  client ??= createSupabaseBrowserClient();
  return client;
}
