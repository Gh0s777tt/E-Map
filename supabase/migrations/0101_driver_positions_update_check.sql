-- [#383] Domknięcie izolacji firm przy aktualizacji pozycji kierowcy.
--
-- Polityka `driver_positions_update` miała `USING (user_id = auth.uid())`
-- i NIE miała `WITH CHECK`. Postgres stosuje wtedy `USING` również do wiersza
-- po zmianie, więc `user_id` był chroniony — ale `company_id` **nie występował
-- w warunku w ogóle**.
--
-- Skutek: kierowca firmy A mógł zaktualizować własny wiersz, podmieniając
-- `company_id` na firmę B. Polityka SELECT przepuszcza po `is_member_of(company_id)`,
-- więc jego pozycja pojawiała się na mapie floty obcej firmy. Ścieżka INSERT
-- była zabezpieczona (`is_member_of(company_id)`), UPDATE ją omijał.
--
-- To ta sama klasa błędu co w `chat_threads_update` (migracja 0094): warunek
-- na wierszu wejściowym bez warunku na wierszu wyjściowym. Wnioskiem z obu
-- jest prosta reguła: **każda polityka UPDATE na tabeli multi-tenant musi mieć
-- WITH CHECK powtarzający warunek przynależności**, bo USING sam z siebie
-- pilnuje tylko tego, co wolno wziąć, a nie tego, czym wolno to zastąpić.

drop policy if exists driver_positions_update on public.driver_positions;

create policy driver_positions_update on public.driver_positions
  for update
  using (user_id = auth.uid())
  -- Ten sam warunek co przy INSERT — wiersz po zmianie musi nadal należeć
  -- do tego użytkownika i do firmy, której jest aktywnym członkiem.
  with check (user_id = auth.uid() and public.is_member_of(company_id));
