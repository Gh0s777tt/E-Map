-- 0053: hardening triggera auto-zamykania zlecenia (#245 / migracja 0052).
-- Multi-tenant: zamykaj TYLKO zlecenie w tej samej firmie co zdarzenie trasy.
-- Bez tego spreparowany insert do trip_events z cudzym order_id mógłby (przez
-- SECURITY DEFINER) zmienić status zlecenia innej firmy. Dodajemy warunek
-- `company_id = new.company_id`. Idempotentne (create or replace) — bezpieczne przy
-- ponownym uruchomieniu; stosuje owner razem z 0052 (`supabase db push`).

create or replace function auto_close_order_on_delivery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.order_id is not null then
    if exists (select 1 from trip_events where order_id = new.order_id and action = 'load')
       and exists (select 1 from trip_events where order_id = new.order_id and action = 'unload')
    then
      update orders
        set status = 'delivered'
        where id = new.order_id
          and company_id = new.company_id
          and status in ('new', 'assigned', 'in_progress');
    end if;
  end if;
  return new;
end;
$$;
