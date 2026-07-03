import { isPodCaption } from "./pod";

/**
 * Kategorie załączników zlecenia (#248) — zapisywane w `order_photos.caption`.
 * POD (podpis odbiorcy / e-CMR) ma osobny, strukturalny format captiona (patrz `pod.ts`);
 * kategorie to zwykły tekst, więc `isPodCaption` ich nie myli. Domyślna „Towar" zapisywana
 * jest bez captiona (spójność ze starymi zdjęciami), pozostałe jako etykieta w `caption`.
 */
export const PHOTO_CATEGORIES = ["Towar", "CMR", "Dokument", "Inne"] as const;
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];
export const DEFAULT_PHOTO_CATEGORY: PhotoCategory = "Towar";

/** Caption do zapisania dla wybranej kategorii (domyślna „Towar" → brak captiona). */
export function photoCategoryCaption(category: string): string | undefined {
  const c = category.trim();
  return c && c !== DEFAULT_PHOTO_CATEGORY ? c : undefined;
}

// ── Typ załącznika (#249) — kolumna `kind` (migracja 0054, generowana z caption) ──

/** Maszynowe typy załącznika (slug). Zgodne z kolumną generowaną `order_photos.kind`. */
export const PHOTO_KINDS = ["cargo", "cmr", "document", "other", "pod"] as const;
export type PhotoKind = (typeof PHOTO_KINDS)[number];

/** Etykiety PL typów (do badge'y i chipów filtra). */
export const PHOTO_KIND_LABEL: Record<PhotoKind, string> = {
  cargo: "Towar",
  cmr: "CMR",
  document: "Dokument",
  other: "Inne",
  pod: "POD",
};

/**
 * Wyprowadza typ zdjęcia: preferuje kolumnę `kind` (po migracji 0054), a gdy jej brak
 * (przed migracją / stary wiersz) — fallback z `caption`. Ta sama logika co generowana
 * kolumna w SQL, więc filtrowanie działa spójnie także client-side przed migracją.
 */
export function resolvePhotoKind(photo: {
  kind?: string | null;
  caption?: string | null;
}): PhotoKind {
  const k = photo.kind;
  if (k && (PHOTO_KINDS as readonly string[]).includes(k)) return k as PhotoKind;
  if (isPodCaption(photo.caption)) return "pod";
  const c = (photo.caption ?? "").trim();
  if (c === "CMR") return "cmr";
  if (c === "Dokument") return "document";
  if (c === "Inne") return "other";
  return "cargo";
}
