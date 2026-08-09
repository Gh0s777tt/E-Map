/**
 * Maskowanie numerów kart paliwowych.
 *
 * Kontekst: kolumna nazywa się `card_number_masked`, ale do tej pory maskowanie
 * było wyłącznie sugestią w placeholderze formularza — w bazie leżały pełne,
 * niezamaskowane numery, a UI pokazywał je w 14 miejscach. Najgorszy przypadek
 * to tytuł powiadomienia o wygasającej karcie: pełny numer trafiał trwale do
 * tabeli `notifications` i na ekran blokady telefonu.
 *
 * Zasada: przechowujemy i pokazujemy WYŁĄCZNIE cztery ostatnie cyfry.
 * Numer karty paliwowej pozwala zapłacić na stacji, więc traktujemy go jak PAN.
 */

/** Ile końcowych cyfr zostaje jawnych. Standard branżowy (PCI DSS) to 4. */
export const CARD_VISIBLE_DIGITS = 4;

/**
 * Wyciąga same cyfry i zwraca co najwyżej cztery ostatnie.
 * Używane PRZY ZAPISIE — do bazy nie ma trafić nic więcej.
 *
 * `null`/`undefined`/pusty wejściowo → pusty ciąg (rozstrzyga wywołujący).
 */
export function cardLast4(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.slice(-CARD_VISIBLE_DIGITS);
}

/**
 * Etykieta do wyświetlenia: `•••• 1234`.
 *
 * Świadomie NIE odtwarzamy pełnej długości numeru gwiazdkami — po przycięciu
 * danych w bazie nie wiemy już, ile cyfr miał oryginał, a udawanie tej wiedzy
 * dawałoby fałszywe wrażenie, że pełny numer gdzieś jest.
 */
export function maskCardNumber(raw: string | null | undefined): string {
  const last4 = cardLast4(raw);
  if (!last4) return "••••";
  return `•••• ${last4}`;
}

/**
 * Etykieta karty z dostawcą, np. `DKV •••• 1234` — do list, statystyk i
 * powiadomień. `provider` bywa pusty (dane historyczne), wtedy sama maska.
 */
export function maskedCardLabel(
  provider: string | null | undefined,
  raw: string | null | undefined,
): string {
  const mask = maskCardNumber(raw);
  const p = (provider ?? "").trim();
  return p ? `${p.toUpperCase()} ${mask}` : mask;
}

/**
 * Czy wartość jest już bezpiecznie przycięta (0–4 cyfry, nic więcej)?
 * Wykorzystywane przez walidację i test migracji danych historycznych.
 */
export function isMaskedCardValue(raw: string | null | undefined): boolean {
  const v = (raw ?? "").trim();
  return /^\d{0,4}$/.test(v);
}
