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
