/**
 * Globalne wyszukiwanie w panelu — czysty filtr/ranking po znormalizowanych
 * pozycjach (zlecenia, pojazdy, kierowcy, faktury). Komponent buduje listę
 * `SearchItem[]` z danych, ten silnik tylko dopasowuje i sortuje. Bez UI.
 */

export interface SearchItem {
  /** Kategoria do nagłówka/etykiety (np. „Zlecenie", „Pojazd"). */
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  /** Dokąd prowadzi wynik. */
  href: string;
  /** Dodatkowy tekst do przeszukania (np. nadawca, VIN, NIP). */
  keywords?: string;
}

/** Minimalna długość frazy, od której szukamy (mniej = za dużo szumu). */
export const SEARCH_MIN_CHARS = 2;

/**
 * Dopasowuje pozycje do frazy (wszystkie tokeny muszą wystąpić) i sortuje wg
 * trafności: tytuł zaczyna się od frazy → zawiera frazę → reszta. Zwraca top N.
 */
export function searchEntities<T extends SearchItem>(query: string, items: T[], limit = 8): T[] {
  const q = query.trim().toLowerCase();
  if (q.length < SEARCH_MIN_CHARS) return [];
  const tokens = q.split(/\s+/);

  const scored: { item: T; score: number }[] = [];
  for (const it of items) {
    const title = it.title.toLowerCase();
    const hay = `${it.title} ${it.subtitle ?? ""} ${it.keywords ?? ""}`.toLowerCase();
    if (!tokens.every((tk) => hay.includes(tk))) continue;
    const score = title.startsWith(q) ? 0 : title.includes(q) ? 1 : 2;
    scored.push({ item: it, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map((s) => s.item);
}
