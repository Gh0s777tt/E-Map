-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0032 · Przypisanie kierowcy do zlecenia + samoobsługa statusu
--  `orders.assigned_to` → użytkownik (auth.users) odpowiedzialny za przewóz.
--  RPC `order_set_status`: owner/dispatcher zmienia dowolny status; przypisany
--  kierowca może ustawić tylko operacyjny status (w trakcie / dostarczone).
--  Dzięki temu kierowca ma widok „Moje zlecenia" bez modułu zleceń.
-- ════════════════════════════════════════════════════════════════════

alter table orders
  add column if not exists assigned_to uuid references auth.users(id) on delete set null;
create index if not exists orders_assigned_idx on orders(assigned_to);

-- ── Zmiana statusu zlecenia (z kontrolą uprawnień) ──────────────────
create or replace function public.order_set_status(p_order uuid, p_status order_status)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare o orders%rowtype;
begin
  select * into o from orders where id = p_order;
  if o.id is null then raise exception 'Zlecenie nie istnieje'; end if;

  if public.has_role(o.company_id, array['owner','dispatcher']::role[]) then
    -- spedytor/właściciel: pełny zakres
    null;
  elsif o.assigned_to = auth.uid() and public.is_member_of(o.company_id) then
    -- przypisany kierowca: tylko statusy operacyjne
    if p_status not in ('assigned', 'in_progress', 'delivered') then
      raise exception 'Kierowca może ustawić tylko: w trakcie / dostarczone';
    end if;
  else
    raise exception 'Brak uprawnień do zmiany statusu zlecenia';
  end if;

  update orders set status = p_status where id = p_order;

  insert into audit_log (company_id, actor_id, action, target)
    values (o.company_id, auth.uid(), 'order.status:' || p_status, p_order::text);
end; $$;
