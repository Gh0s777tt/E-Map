/**
 * [#375] Elementy wspólne dla formularzy w `/forms/*`.
 *
 * Wydzielone, bo trzy nowe zgłoszenia (pauza, koszty trasy, kary) powtarzają
 * dokładnie te same wzorce co tankowanie i Trip: pola miejsca z geokodera,
 * data zdarzenia, waluta, metoda płatności. Kopiowanie tego do każdego pliku
 * skończyłoby się rozjazdem — dokładnie tak powstał `splitPlace`, który przez
 * długi czas żył w dwóch kopiach i w obu zgadywał kraj z etykiety (#372).
 */
import type { GeoHit } from "@e-logistic/maps";

/**
 * Waluty do wyboru. Lista celowo krótka — to te, którymi realnie płaci się
 * na trasach floty, i wszystkie mają notowanie w EBC, więc każda kwota
 * da się przeliczyć na EUR.
 */
export const CURRENCIES = [
  "EUR",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "SEK",
  "DKK",
  "NOK",
  "GBP",
  "CHF",
] as const;

/**
 * Metody płatności nowych formularzy — szerszy zestaw niż enum `payment_method`
 * używany przez tankowania. Rozszerzanie tamtego enuma zmusiłoby buildy mobile
 * obecne w sklepach do obsługi wartości, o których nie wiedzą, więc nowe
 * tabele mają własny słownik (`_is_payment_method`, migracja 0095).
 */
export const PAYMENT_METHODS_EXT = [
  "cash",
  "card",
  "toll_box",
  "snap",
  "travis",
  "transfer",
  "other",
] as const;

/**
 * „Teraz" w formacie pola `datetime-local`, czyli w czasie LOKALNYM przeglądarki.
 * `toISOString()` dałoby UTC i użytkownik w Polsce zobaczyłby godzinę przesuniętą
 * o dwie wstecz.
 */
export function localNowInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Wartość pola `datetime-local` → pełne ISO w UTC. Puste pole zwraca `undefined`,
 * dzięki czemu maper pomija klucz, a baza zostawia `default now()`.
 */
export function toIsoOrUndefined(local: string): string | undefined {
  return local ? new Date(local).toISOString() : undefined;
}

/** Pola miejsca odczytane z trafienia geokodera. */
export interface PlaceFields {
  city: string;
  country: string;
  countryCode: string;
  postcode: string;
}

/**
 * Wyciąga pola miejsca z `GeoHit`.
 *
 * Kraju NIE zgadujemy z etykiety — bierzemy go z pól strukturalnych. Etykieta
 * TomToma nie zawiera kraju („Rynek 1, 31-042 Kraków"), więc heurystyka
 * „ostatni człon po przecinku" wstawiała do pola Kraj kod pocztowy z miastem.
 * Z etykiety bierzemy co najwyżej awaryjną nazwę miejsca.
 */
export function placeFromHit(h: GeoHit): PlaceFields {
  return {
    city: h.city ?? h.label.split(",")[0]?.trim() ?? h.label,
    country: h.countryCode ?? h.country ?? "",
    countryCode: h.countryCode ?? "",
    postcode: h.postcode ?? "",
  };
}
