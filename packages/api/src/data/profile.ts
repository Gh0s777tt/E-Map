/**
 * #318: profil zalogowanego użytkownika — avatar (Storage `avatars`),
 * telefon (user_metadata), zmiana e-maila (link potwierdzający Supabase)
 * i hasła. Wspólne dla web i mobile.
 */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

const AVATARS_BUCKET = "avatars";

/**
 * Wgrywa avatar do własnego folderu ({uid}/avatar-<rand>.<ext>) i zwraca
 * publiczny URL. Losowy sufiks omija cache CDN po podmianie zdjęcia.
 */
export async function uploadMyAvatar(
  client: SupabaseClient,
  data: ArrayBuffer | Uint8Array,
  opts: { contentType: string; ext?: string },
): Promise<string> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Brak sesji.");
  const ext = opts.ext ? (opts.ext.startsWith(".") ? opts.ext : `.${opts.ext}`) : ".jpg";
  const path = `${user.id}/avatar-${crypto.randomUUID().slice(0, 8)}${ext}`;
  const up = await client.storage
    .from(AVATARS_BUCKET)
    .upload(path, data, { contentType: opts.contentType, upsert: true });
  if (up.error) throw up.error;
  const { data: pub } = client.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  await client.auth.updateUser({ data: { avatar_url: pub.publicUrl } });
  return pub.publicUrl;
}

/** Telefon kontaktowy w user_metadata (bez SMS-owej weryfikacji auth). */
export async function updateMyPhone(client: SupabaseClient, phone: string): Promise<void> {
  const { error } = await client.auth.updateUser({ data: { phone_contact: phone.trim() } });
  if (error) throw error;
}

/** Zmiana e-maila — Supabase wysyła link potwierdzający na NOWY adres. */
export async function changeMyEmail(client: SupabaseClient, email: string): Promise<void> {
  const { error } = await client.auth.updateUser({ email: email.trim() });
  if (error) throw error;
}

/** Zmiana hasła zalogowanego użytkownika (min. 8 znaków — walidacja UI). */
export async function changeMyPassword(client: SupabaseClient, password: string): Promise<void> {
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
}
