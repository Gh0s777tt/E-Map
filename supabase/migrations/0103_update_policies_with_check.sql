-- [#389] `WITH CHECK` na wszystkich pozostałych politykach UPDATE — trzeci raz ten sam błąd.
--
-- Migracja 0094 (`chat_threads`) i 0101 (`driver_positions`) naprawiły po jednym
-- wystąpieniu i obie kończyły się tym samym wnioskiem: **polityka UPDATE bez
-- `WITH CHECK` sprawdza tylko to, co wolno WZIĄĆ, a nie to, czym wolno to
-- ZASTĄPIĆ**. Zapytanie do `pg_policies` na żywej bazie pokazało, że wniosek
-- nigdzie nie został zastosowany szerzej: osiem kolejnych polityk UPDATE nadal
-- nie miało `WITH CHECK`.
--
-- **Dziura potwierdzona doświadczalnie na produkcji**, nie wywnioskowana z dokumentacji:
-- w transakcji zakończonej ROLLBACK, z rolą `authenticated` i JWT prawdziwego
-- kierowcy, `update public.fuel_logs set company_id = <obca firma>` **przeszło**.
-- Wpis tankowania zmienił firmę.
--
-- Dlaczego to działało: `USING ((driver_id = auth.uid()) OR has_role(company_id, ...))`
-- Postgres stosuje także do wiersza PO zmianie. Pierwszy człon — `driver_id = auth.uid()`
-- — pozostaje prawdziwy, bo kierowca nie ruszał `driver_id`. `company_id` nie
-- występuje w warunku w żaden sposób, który by go bronił. Warunek przechodzi,
-- wiersz ląduje w obcej firmie.
--
-- Co to znaczy w praktyce: kierowca firmy A wstrzykuje własne tankowania, wyjazdy,
-- przerwy i wpisy AdBlue do ksiąg firmy B — a jednocześnie usuwa je z ksiąg
-- własnej firmy. Firmie B rosną litry, koszty i przebiegi, których nikt u niej nie
-- zrobił; firmie A znikają. Statystyki spalania, rachunek wyjazdu i rentowność
-- pojazdu liczą się po obu stronach z danych, które nie należą do żadnej z nich.
-- Nie trzeba do tego luki w aplikacji ani wykradzionego tokenu — wystarczy
-- zwykły klucz publiczny i jedno zapytanie do PostgREST.
--
-- Reguła, tym razem wdrożona wszędzie, gdzie miała zastosowanie:
-- **każda polityka UPDATE na tabeli multi-tenant powtarza w `WITH CHECK` warunek
-- przynależności do firmy.** `is_member_of(company_id)` na wierszu wyjściowym
-- domyka dokładnie tę lukę — obcej firmy nie da się wpisać, bo się do niej nie należy.
--
-- Polityki celowo odtwarzane w całości (`drop` + `create`), a nie łatane: `alter
-- policy` nie pokazuje w diffie, jak brzmiał warunek wcześniej, a przy poprawce
-- bezpieczeństwa pełny zapis jest tym, co się czyta za pół roku.

-- ─── Tabele zdarzeń kierowcy: tu dziura była realna i potwierdzona ────────────
--
-- Wzorzec wspólny: `USING` zostaje bez zmian (kto MOŻE ruszyć wiersz — właściciel
-- firmy albo kierowca, do którego wpis należy), a `WITH CHECK` dokłada warunek na
-- wierszu po zmianie. `is_member_of(company_id)` jest tu kluczem: dla kierowcy
-- edytującego własny wpis jest prawdziwe, a dla tego samego kierowcy próbującego
-- przepiąć wpis do obcej firmy — fałszywe.

drop policy if exists fuel_logs_update on public.fuel_logs;
create policy fuel_logs_update on public.fuel_logs
  for update
  using ((driver_id = auth.uid()) or has_role(company_id, array['owner'::role]))
  with check (
    public.is_member_of(company_id)
    and ((driver_id = auth.uid()) or has_role(company_id, array['owner'::role]))
  );

drop policy if exists adblue_logs_update on public.adblue_logs;
create policy adblue_logs_update on public.adblue_logs
  for update
  using ((driver_id = auth.uid()) or has_role(company_id, array['owner'::role]))
  with check (
    public.is_member_of(company_id)
    and ((driver_id = auth.uid()) or has_role(company_id, array['owner'::role]))
  );

drop policy if exists pause_events_update on public.pause_events;
create policy pause_events_update on public.pause_events
  for update
  using ((driver_id = auth.uid()) or has_role(company_id, array['owner'::role]))
  with check (
    public.is_member_of(company_id)
    and ((driver_id = auth.uid()) or has_role(company_id, array['owner'::role]))
  );

-- `trip_events` jest z tej czwórki najgroźniejsza: z niej `buildJourneys` składa
-- wyjazdy, a z wyjazdów biorą się kilometry, przychód ze stawki €/km i marża.
drop policy if exists trip_events_update on public.trip_events;
create policy trip_events_update on public.trip_events
  for update
  using ((driver_id = auth.uid()) or has_role(company_id, array['owner'::role]))
  with check (
    public.is_member_of(company_id)
    and ((driver_id = auth.uid()) or has_role(company_id, array['owner'::role]))
  );

-- ─── Wydatki kierowcy ────────────────────────────────────────────────────────
--
-- Tu granica firm trzymała się sama: `USING` sprawdza rolę W FIRMIE Z WIERSZA,
-- więc dyspozytor firmy A nie przepnie wydatku do firmy B, bo w B roli nie ma.
-- `WITH CHECK` dopisujemy mimo to — żeby przy następnej zmianie warunku nikt nie
-- musiał tego rozumowania odtwarzać od zera i żeby reguła była bez wyjątków.
drop policy if exists driver_expenses_update on public.driver_expenses;
create policy driver_expenses_update on public.driver_expenses
  for update
  using (has_role(company_id, array['owner'::role, 'dispatcher'::role]))
  with check (has_role(company_id, array['owner'::role, 'dispatcher'::role]));

-- ─── Firma ───────────────────────────────────────────────────────────────────
--
-- `has_role(id, owner)` na wierszu wyjściowym oznacza, że właściciel nie podmieni
-- `id` firmy na cudze — bo w tamtej nie jest właścicielem.
drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies
  for update
  using (has_role(id, array['owner'::role]))
  with check (has_role(id, array['owner'::role]));

-- ─── Profil użytkownika ──────────────────────────────────────────────────────
--
-- `profiles` nie ma kolumny roli ani firmy, więc nie było tu drogi do eskalacji
-- uprawnień — `id = auth.uid()` w `USING` broniło już samo z siebie. Dopisujemy
-- dla kompletu reguły.
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ─── Oceny POI (dane społecznościowe) ────────────────────────────────────────
--
-- `user_id` był chroniony, ale `poi_id` nie: autor mógł PRZENIEŚĆ swoją ocenę na
-- inny punkt. To nie jest wyciek danych — to psucie danych społecznościowych,
-- z których korzystają wszyscy: jedynkę wystawioną jednemu parkingowi dawało się
-- przesunąć na sąsiedni, bez śladu i bez pisania nowej opinii.
--
drop policy if exists poi_reviews_modify on public.poi_reviews;
create policy poi_reviews_modify on public.poi_reviews
  for update
  using ((user_id = auth.uid()) or is_developer())
  with check ((user_id = auth.uid()) or is_developer());

-- Niezmienność `poi_id` przez WYZWALACZ, nie przez `WITH CHECK`.
--
-- Kuszące było dopisać do `WITH CHECK` podzapytanie sięgające po stary `poi_id`,
-- ale odczyt tej samej tabeli wewnątrz jej własnej polityki wchodzi ponownie
-- w polityki SELECT — to prosta droga do rekursji i do zachowania zależnego od
-- tego, kto akurat pyta. Porównanie OLD z NEW jest tym, do czego wyzwalacze służą,
-- i nie ma żadnego z tych skutków ubocznych.
create or replace function public.tg_poi_review_immutable_poi()
returns trigger
language plpgsql
as $$
begin
  if new.poi_id is distinct from old.poi_id then
    raise exception 'poi_id oceny jest niezmienny (ocena nalezy do punktu, przy ktorym powstala)'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists poi_reviews_immutable_poi on public.poi_reviews;
create trigger poi_reviews_immutable_poi
  before update on public.poi_reviews
  for each row execute function public.tg_poi_review_immutable_poi();
