/**
 * Warstwa danych: linki firmowe (#404).
 *
 * Odczyt zawęża RLS: kierowca dostaje wyłącznie pozycje ogólne, zarząd wszystkie.
 * Dzięki temu ta sama funkcja obsługuje oba ekrany — panel właściciela i listę
 * w aplikacji kierowcy — bez rozgałęziania po roli w kodzie klienta.
 */
import type { CompanyLinkInput } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface CompanyLink {
  id: string;
  label: string;
  url: string;
  icon: string | null;
  note: string | null;
  management_only: boolean;
  sort_order: number;
  created_at: string;
}

const COLS = "id, label, url, icon, note, management_only, sort_order, created_at";

/**
 * Skróty wpisuje właściciel z ręki i sam ustala im kolejność — zbiór z natury
 * pozostaje krótki (myto, promy, awizacja, kilka portali klientów). Niski sufit
 * jest tu celowy: setki linków to nie skala, tylko lista, której nikt nie użyje.
 */
const COMPANY_LINKS_DEFAULT_LIMIT = 200;

export async function listCompanyLinks(
  client: SupabaseClient,
  companyId: string,
  opts?: { limit?: number },
): Promise<CompanyLink[]> {
  const { data, error } = await client
    .from("company_links")
    .select(COLS)
    .eq("company_id", companyId)
    // Ręczna kolejność właściciela ma pierwszeństwo; nazwa tylko rozstrzyga remisy.
    .order("sort_order")
    .order("label")
    .limit(opts?.limit ?? COMPANY_LINKS_DEFAULT_LIMIT);
  if (error) throw error;
  return (data ?? []) as CompanyLink[];
}

export async function insertCompanyLink(
  client: SupabaseClient,
  input: CompanyLinkInput,
  companyId: string,
): Promise<string> {
  const { data, error } = await client
    .from("company_links")
    .insert({
      company_id: companyId,
      label: input.label,
      url: input.url,
      icon: input.icon ?? null,
      note: input.note ?? null,
      management_only: input.managementOnly,
      sort_order: input.sortOrder,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateCompanyLink(
  client: SupabaseClient,
  id: string,
  input: CompanyLinkInput,
): Promise<void> {
  // `company_id` świadomie POZA aktualizacją: edycja linku nie może przenieść
  // go do innej firmy. Ta sama zasada co przy pojazdach ([#389]).
  const { error } = await client
    .from("company_links")
    .update({
      label: input.label,
      url: input.url,
      icon: input.icon ?? null,
      note: input.note ?? null,
      management_only: input.managementOnly,
      sort_order: input.sortOrder,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCompanyLink(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("company_links").delete().eq("id", id);
  if (error) throw error;
}
