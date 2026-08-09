-- [#372] Numer karty paliwowej — w bazie zostają wyłącznie cztery ostatnie cyfry.
--
-- STAN PRZED: kolumna nazywa się `card_number_masked`, ale maskowanie było wyłącznie
-- sugestią w placeholderze formularza. Kontrola na produkcji wykazała, że wszystkie
-- karty miały zapisany PEŁNY numer (15–17 cyfr, zero znaków maskujących), a UI
-- pokazywał go w 14 miejscach. Najgorszy przypadek: `apps/web/lib/alerts.ts` wklejał
-- numer do TYTUŁU powiadomienia o wygasającej karcie — pełny numer trafiał trwale do
-- tabeli `notifications` i na ekran blokady telefonu.
--
-- Kontrast był wymowny: PIN ma szyfrowanie pgcrypto, audytowane RPC i re-maskowanie
-- po 30 s, a numer karty — pozwalający zapłacić na stacji — nie miał nic.
--
-- DECYZJA: numer jest przycinany bezprzywrotnie. Świadomy wybór właściciela projektu:
-- pełnego numeru nie potrzebujemy w systemie, a w razie potrzeby (zgłoszenie zgubionej
-- karty do wystawcy) odczytuje się go z fizycznej karty.
--
-- Zapis nowych wartości jest już zabezpieczony w `packages/core/src/schemas.ts`
-- (`fuelCardSchema` przycina wejście funkcją `cardLast4` PRZED wysłaniem do bazy),
-- więc ta migracja domyka wyłącznie dane historyczne i stawia barierę na przyszłość.

-- 1) Przycięcie danych historycznych: same cyfry, cztery ostatnie.
--    `regexp_replace(..., 'g')` usuwa spacje i myślniki, którymi rozdzielano numer.
update public.fuel_cards
   set card_number_masked = right(regexp_replace(card_number_masked, '\D', '', 'g'), 4)
 where card_number_masked !~ '^\d{0,4}$';

-- 2) Bariera na przyszłość — nawet gdyby ktoś ominął walidację w aplikacji
--    (bezpośredni INSERT, skrypt migracyjny, import), baza odrzuci pełny numer.
alter table public.fuel_cards
  drop constraint if exists fuel_cards_number_masked_chk;

alter table public.fuel_cards
  add constraint fuel_cards_number_masked_chk
  check (card_number_masked ~ '^\d{0,4}$');

comment on column public.fuel_cards.card_number_masked is
  'Wyłącznie cztery ostatnie cyfry numeru karty. Pełny numer NIE jest przechowywany '
  '(decyzja #372). Formatowanie do postaci "•••• 1234" robi maskCardNumber() z packages/core.';
