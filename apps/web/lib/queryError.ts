/**
 * Komunikat błędu zapytania w dokładnie tej formie, w jakiej strony panelu
 * generowały go przed migracją na TanStack Query: `e instanceof Error ? e.message : fallback`.
 *
 * Osobny helper, bo strony łączą błędy dwóch zapytań (członkostwo + właściwa lista)
 * i bez niego każda powtarzałaby ten sam warunek. Pusty `message` traktujemy jak brak
 * komunikatu — użytkownik ma zobaczyć zdanie, nie samo „⚠️ Błąd ładowania.".
 */
export function queryErrorMessage(error: unknown, fallback: string): string | null {
  if (!error) return null;
  return error instanceof Error && error.message ? error.message : fallback;
}
