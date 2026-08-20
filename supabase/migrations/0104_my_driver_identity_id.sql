-- [#389] `my_driver_identity()` zwraca też `id` wiersza kartoteki.
--
-- Powód: aplikacja mobilna nie miała jak zapytać „które wpisy ewidencji są MOJE".
-- `work_time_entries.driver_id` wskazuje na `drivers.id` (kartoteka), a telefon zna
-- wyłącznie `auth.uid()` (konto). Bez tego powiązania oba ekrany — „Moje
-- rozliczenie" i „Czas pracy" — brały ewidencję CAŁEJ firmy i liczyły ją jako
-- własną kierowcy:
--
--   • rozliczenie: dni służby liczone ze wszystkich kierowców naraz (i to jako
--     liczba WPISÓW, nie unikalnych dni) — szacunek wypłaty zawyżony tyle razy,
--     ilu kierowców ma firma;
--   • czas pracy: godziny jazdy i pracy zsumowane po całej firmie, a z nich
--     liczony status WTD 2002/15/WE — kierowca dostawał czerwony alarm
--     przekroczenia 48 h/60 h, którego nie sposób było wyjaśnić, bo w jego
--     własnych dniach żadnego przekroczenia nie było.
--
-- Polityka SELECT na `work_time_entries` to `is_member_of(company_id)`, więc
-- kierowca faktycznie WIDZI wpisy kolegów — RLS niczego tu nie ratowało.
-- Filtrowanie musi zrobić aplikacja i musi mieć czym.
--
-- Zmiana jest wstecznie zgodna: dokładamy klucz do zwracanego JSON-a, nie
-- ruszając `first_name` ani `last_name`. Buildy mobilne obecne w sklepach czytają
-- tylko te dwa pola i działają dalej bez zmian.
--
-- `id` nie jest daną wrażliwą (to UUID kartoteki, nie dane osobowe) i dotyczy
-- wyłącznie wiersza pytającego — funkcja jak dotąd filtruje po `user_id = auth.uid()`.

create or replace function public.my_driver_identity()
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare res json;
begin
  select json_build_object(
    'id', id,
    'first_name', case when first_name_enc is not null then pgp_sym_decrypt(first_name_enc, public._card_key()) else '' end,
    'last_name',  case when last_name_enc  is not null then pgp_sym_decrypt(last_name_enc,  public._card_key()) else '' end
  ) into res
  from drivers
  where user_id = auth.uid()
  limit 1;
  -- Brak powiązanej kartoteki: `id` jako null, żeby wywołujący mógł ODRÓŻNIĆ
  -- „kierowca bez kartoteki" od „kierowca bez wpisanego nazwiska" i powiedzieć
  -- o tym wprost, zamiast pokazywać liczby policzone z cudzych danych.
  return coalesce(res, json_build_object('id', null, 'first_name', '', 'last_name', ''));
end; $function$;
