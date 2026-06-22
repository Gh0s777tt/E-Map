-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0041 · Indeks faktura↔zlecenie + utwardzenie statusu zlecenia
--  (P2 z audytu 2026-06-22)
--  1) Indeks na invoices(order_id) — RPC łączą faktury po order_id; bez indeksu
--     seq scan przy dużej liczbie faktur.
--  2) order_set_status: przypisany kierowca może ustawić TYLKO statusy operacyjne
--     w przód (in_progress / delivered) — bez cofania na 'assigned'.
-- ════════════════════════════════════════════════════════════════════

create index if not exists invoices_order_idx on invoices(order_id);

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
    -- przypisany kierowca: tylko statusy operacyjne w przód
    if p_status not in ('in_progress', 'delivered') then
      raise exception 'Kierowca może ustawić tylko: w trakcie / dostarczone';
    end if;
  else
    raise exception 'Brak uprawnień do zmiany statusu zlecenia';
  end if;

  update orders set status = p_status where id = p_order;

  insert into audit_log (company_id, actor_id, action, target)
    values (o.company_id, auth.uid(), 'order.status:' || p_status, p_order::text);
end; $$;
