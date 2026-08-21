/** Warstwa danych: sejf dokumentów (Supabase Storage + metadane). */
import { newId } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";
import { fetchAllByKeyset, type PagedRows } from "./pagination";

export const DOCUMENTS_BUCKET = "documents";

export interface DocumentMeta {
  id: string;
  vehicle_id: string | null;
  name: string;
  path: string;
  size_bytes: number | null;
  mime: string | null;
  category: string | null;
  expiry_date: string | null;
  uploaded_by: string | null;
  created_at: string;
  /** #275: kto widzi — 'management' (zarząd), 'company' (wszyscy), 'selected'. */
  visibility: "management" | "company" | "selected";
  allowed_user_ids: string[];
}

export interface UploadDocumentInput {
  name: string;
  vehicleId?: string | null;
  category?: string | null;
  expiryDate?: string | null;
  visibility?: "management" | "company" | "selected";
  allowedUserIds?: string[];
}

const COLS =
  "id, vehicle_id, name, path, size_bytes, mime, category, expiry_date, uploaded_by, created_at, visibility, allowed_user_ids";

/**
 * Sejf dokumentów — JEDNO zapytanie, więc obowiązuje sufit serwera.
 *
 * Brak `limit` NIE znaczy „bez granicy", tylko granicę CUDZĄ: `api.max_rows` PostgREST
 * (u Supabase 1000), egzekwowany bez błędu. Nadaje się więc wyłącznie tam, gdzie lista
 * jest listą — mobilny sejf pokazuje najnowsze wpisy i nic z nich nie liczy. Tam, gdzie
 * z dokumentów czyta się TERMINY albo eksportuje je dalej, wołaj `listDocumentsAll`
 * (z `withExpiry`, jeśli wystarczą wiersze mające termin).
 *
 * `opts.limit` zostaje dla wywołującego, który chce podglądu (np. kilku ostatnich wpisów).
 */
export async function listDocuments(
  client: SupabaseClient,
  companyId: string,
  opts?: { limit?: number },
): Promise<DocumentMeta[]> {
  let query = client
    .from("documents")
    .select(COLS)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (opts?.limit !== undefined) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DocumentMeta[];
}

/**
 * Dokumenty pobrane STRONAMI — komplet albo jawne `complete: false`.
 *
 * Powstało dla dwóch wywołujących, którzy czytają z tej listy TERMINY: panelu „Wymaga
 * uwagi" i ekranu sejfu z kolumną „ważne do". Obcięcie działa po `created_at`,
 * a sprawdzenie po `expiry_date` — a te dwie daty w tej domenie prawie nie korelują.
 * Wypis z licencji wspólnotowej (10 lat), świadectwo kierowcy (5 lat) czy umowa leasingu
 * to skany wgrane dawno, z terminem daleko w przyszłości: przy flocie po kilku latach
 * wypadały poza pierwszy tysiąc NAJNOWSZYCH wpisów i termin ustawowy mijał po cichu.
 *
 * `withExpiry` jest dla panelu, któremu wiersze bez terminu nie mają czego wnieść:
 * skany CMR i faktur stanowią gros sejfu, więc bez tego zawężenia panel ściągałby całą
 * historię załączników po to, żeby ją natychmiast odrzucić. Ekran sejfu, który pokazuje
 * WSZYSTKIE dokumenty, woła to samo bez tej opcji.
 */
export async function listDocumentsAll(
  client: SupabaseClient,
  companyId: string,
  opts?: { withExpiry?: boolean; pageSize?: number; maxPages?: number },
): Promise<PagedRows<DocumentMeta>> {
  const paged = await fetchAllByKeyset<DocumentMeta>(async (afterId, pageSize) => {
    let query = client.from("documents").select(COLS).eq("company_id", companyId);
    if (opts?.withExpiry) query = query.not("expiry_date", "is", null);
    if (afterId) query = query.gt("id", afterId);
    const { data, error } = await query.order("id", { ascending: true }).limit(pageSize);
    if (error) throw error;
    return (data ?? []) as DocumentMeta[];
  }, opts);
  // Porządek prezentacyjny wraca dopiero po złożeniu stron — patrz `pagination.ts`.
  return {
    ...paged,
    rows: [...paged.rows].sort(
      (a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
    ),
  };
}

/** Bezpieczna nazwa pliku w ścieżce (ASCII, bez spacji) — oryginał trzymamy w `name`. */
function slugifyName(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 80) || "plik"
  );
}

/**
 * Wgrywa plik do bucketu `documents` pod `{companyId}/{losowy}-{nazwa}` i zapisuje
 * metadane. RLS na storage + tabeli wymusza, by ścieżka zaczynała się od company_id
 * użytkownika oraz rolę owner/dispatcher. Zwraca wpis metadanych.
 */
export async function uploadDocument(
  client: SupabaseClient,
  companyId: string,
  file: File,
  input: UploadDocumentInput,
): Promise<DocumentMeta> {
  const rand = newId().slice(0, 8);
  const path = `${companyId}/${rand}-${slugifyName(input.name || file.name)}`;

  const up = await client.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (up.error) throw up.error;

  const row = {
    company_id: companyId,
    vehicle_id: input.vehicleId ?? null,
    name: input.name || file.name,
    path,
    size_bytes: file.size,
    mime: file.type || null,
    category: input.category ?? null,
    expiry_date: input.expiryDate ?? null,
    visibility: input.visibility ?? "management",
    allowed_user_ids: input.allowedUserIds ?? [],
  };
  const { data, error } = await client.from("documents").insert(row).select(COLS).single();
  if (error) {
    // Rollback osieroconego obiektu w Storage, jeśli insert metadanych padł.
    await client.storage.from(DOCUMENTS_BUCKET).remove([path]);
    throw error;
  }
  return data as DocumentMeta;
}

/** Podpisany URL do pobrania (bucket prywatny). Domyślnie ważny 60 s. */
export async function getDocumentUrl(
  client: SupabaseClient,
  path: string,
  expiresIn = 60,
): Promise<string> {
  const { data, error } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

/** Kasuje obiekt w Storage i metadane (owner/dispatcher wg RLS). */
export async function deleteDocument(client: SupabaseClient, doc: DocumentMeta): Promise<void> {
  const rm = await client.storage.from(DOCUMENTS_BUCKET).remove([doc.path]);
  if (rm.error) throw rm.error;
  const { error } = await client.from("documents").delete().eq("id", doc.id);
  if (error) throw error;
}

/** #275: zmiana widoczności dokumentu (owner/dispatcher — RLS write). */
export async function setDocumentVisibility(
  client: SupabaseClient,
  docId: string,
  visibility: "management" | "company" | "selected",
  allowedUserIds: string[] = [],
): Promise<void> {
  const { error } = await client
    .from("documents")
    .update({ visibility, allowed_user_ids: allowedUserIds })
    .eq("id", docId);
  if (error) throw error;
}
