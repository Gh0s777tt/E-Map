/**
 * Klient service-role (pełne uprawnienia, OMIJA RLS) — TWARDO server-only.
 *
 * `import "server-only"` sprawia, że każda próba wciągnięcia tego modułu do bundla
 * klienta kończy się błędem builda (audyt #215 — defense-in-depth ponad brakiem
 * prefiksu NEXT_PUBLIC_ w env). Eksportowany subpathem `@e-logistic/api/admin`,
 * osobno od głównego `@e-logistic/api`, którego używa też kod kliencki.
 */
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database, TypedSupabaseClient } from "./client";

/** Klient service-role — TYLKO serwer (API routes / cron). Nigdy w kliencie. */
export function createSupabaseAdminClient(): TypedSupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Brak konfiguracji service-role (SUPABASE_SERVICE_ROLE_KEY).");
  }
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
