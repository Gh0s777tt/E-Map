/** Warstwa danych: sejf dokumentów (Supabase Storage + metadane). */
import { newId } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

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

export async function listDocuments(
  client: SupabaseClient,
  companyId: string,
): Promise<DocumentMeta[]> {
  const { data, error } = await client
    .from("documents")
    .select(COLS)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DocumentMeta[];
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
