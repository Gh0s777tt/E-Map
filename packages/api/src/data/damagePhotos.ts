/**
 * Zdjęcia/dowody szkody (#270) — bez nowej tabeli: pliki w prywatnym buckecie
 * `cargo-photos` pod `{companyId}/damage-{claimId}/…`, więc istniejące polityki
 * storage (prefiks = firma, RLS 0044) obejmują je bez zmian. Metadane = listing.
 */
import { newId } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

const BUCKET = "cargo-photos";
const prefix = (companyId: string, claimId: string) => `${companyId}/damage-${claimId}`;

export interface DamagePhoto {
  path: string;
  name: string;
  signedUrl: string;
}

/** Lista zdjęć szkody z podpisanymi URL-ami (bucket prywatny, 10 min). */
export async function listDamagePhotos(
  client: SupabaseClient,
  companyId: string,
  claimId: string,
): Promise<DamagePhoto[]> {
  const dir = prefix(companyId, claimId);
  const { data, error } = await client.storage
    .from(BUCKET)
    .list(dir, { sortBy: { column: "created_at", order: "desc" } });
  if (error) throw error;
  const files = (data ?? []).filter((f) => f.name && !f.name.startsWith("."));
  if (files.length === 0) return [];
  const paths = files.map((f) => `${dir}/${f.name}`);
  const { data: signed, error: sErr } = await client.storage
    .from(BUCKET)
    .createSignedUrls(paths, 600);
  if (sErr) throw sErr;
  const out: DamagePhoto[] = [];
  (signed ?? []).forEach((s, i) => {
    if (s.signedUrl) {
      out.push({ path: paths[i] ?? "", name: files[i]?.name ?? "", signedUrl: s.signedUrl });
    }
  });
  return out;
}

/** Upload dowodu szkody (zdjęcie/PDF polisy). Członek firmy. */
export async function uploadDamagePhoto(
  client: SupabaseClient,
  companyId: string,
  claimId: string,
  file: File,
): Promise<void> {
  const rand = newId().slice(0, 8);
  const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
  const path = `${prefix(companyId, claimId)}/${rand}${ext}`;
  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
}

/** Usunięcie dowodu — polityka storage ogranicza wg roli (jak zdjęcia ładunku). */
export async function removeDamagePhoto(client: SupabaseClient, path: string): Promise<void> {
  const { error } = await client.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
