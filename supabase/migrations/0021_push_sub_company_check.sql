-- 0021: domknięcie izolacji multi-tenant dla push (P0 z audytu 2026-06-21).
-- Polityka insert/update nie walidowała `company_id` → kierowca firmy A mógł zapisać
-- subskrypcję pod firmę B i odbierać jej powiadomienia (wysyłka idzie service-role, omija RLS).
-- Fix: company_id musi być NULL lub firma, której użytkownik jest aktywnym członkiem.
-- Przy okazji: spójne `to authenticated` na wszystkich politykach + jawna polityka update (upsert).

drop policy if exists push_sub_select on public.push_subscriptions;
create policy push_sub_select on public.push_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists push_sub_insert on public.push_subscriptions;
create policy push_sub_insert on public.push_subscriptions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (company_id is null or public.is_member_of(company_id))
  );

drop policy if exists push_sub_update on public.push_subscriptions;
create policy push_sub_update on public.push_subscriptions
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (company_id is null or public.is_member_of(company_id))
  );

drop policy if exists push_sub_delete on public.push_subscriptions;
create policy push_sub_delete on public.push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid());
