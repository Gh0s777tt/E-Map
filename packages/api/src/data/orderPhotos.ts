/** Warstwa danych: zdjęcia towaru przy zleceniu (dowód zabezpieczenia ładunku). */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export const CARGO_PHOTOS_BUCKET = "cargo-photos";

export interface OrderPhoto {
  id: string;
  order_id: string;
  path: string;
  mime: string | null;
  size_bytes: number | null;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
}

const COLS = "id, order_id, path, mime, size_bytes, caption, uploaded_by, created_at";

/** Zdjęcia danego zlecenia (najnowsze pierwsze). RLS: członek czyta. */
export async function listOrderPhotos(
  client: SupabaseClient,
  orderId: string,
): Promise<OrderPhoto[]> {
  const { data, error } = await client
    .from("order_photos")
    .select(COLS)
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OrderPhoto[];
}

/**
 * Wgrywa zdjęcie ładunku do bucketu `cargo-photos` pod
 * `{companyId}/{orderId}/{losowy}-{nazwa}` i zapisuje metadane.
 * Upload: każdy aktywny członek (kierowca). Zwraca wpis metadanych.
 */
export async function uploadOrderPhoto(
  client: SupabaseClient,
  companyId: string,
  orderId: string,
  file: File,
  caption?: string | null,
): Promise<OrderPhoto> {
  const rand = crypto.randomUUID().slice(0, 8);
  const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
  const path = `${companyId}/${orderId}/${rand}${ext}`;

  const up = await client.storage
    .from(CARGO_PHOTOS_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (up.error) throw up.error;

  const { data, error } = await client
    .from("order_photos")
    .insert({
      company_id: companyId,
      order_id: orderId,
      path,
      mime: file.type || null,
      size_bytes: file.size,
      caption: caption?.trim() || null,
    })
    .select(COLS)
    .single();
  if (error) {
    await client.storage.from(CARGO_PHOTOS_BUCKET).remove([path]);
    throw error;
  }
  return data as OrderPhoto;
}

/** Podpisany URL do podglądu (bucket prywatny). Domyślnie ważny 5 min. */
export async function getOrderPhotoUrl(
  client: SupabaseClient,
  path: string,
  expiresIn = 300,
): Promise<string> {
  const { data, error } = await client.storage
    .from(CARGO_PHOTOS_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

/** Kasuje zdjęcie (Storage + metadane). RLS: owner/dispatcher. */
export async function deleteOrderPhoto(client: SupabaseClient, photo: OrderPhoto): Promise<void> {
  const rm = await client.storage.from(CARGO_PHOTOS_BUCKET).remove([photo.path]);
  if (rm.error) throw rm.error;
  const { error } = await client.from("order_photos").delete().eq("id", photo.id);
  if (error) throw error;
}
