-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0030 · Faktury ze zleceń (uproszczone)
--  Faktura generowana ze zlecenia: snapshot sprzedawcy (firma), nabywca
--  (nadawca zlecenia), netto/VAT/brutto. Numeracja FV/ROK/NNNN per firma
--  (blokada advisory → bez kolizji). Zlecenie → status `invoiced`.
--  Uwaga: uproszczone; pełna zgodność (stawki/odwrotne obciążenie) po stronie wystawcy.
-- ════════════════════════════════════════════════════════════════════

create table if not exists invoices (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  order_id      uuid references orders(id) on delete set null,
  number        text not null,
  issue_date    date not null default current_date,
  seller_name   text,
  seller_tax_id text,
  seller_address text,
  buyer_name    text,
  buyer_tax_id  text,
  buyer_address text,
  description   text,
  net           numeric not null default 0,
  vat_rate      numeric not null default 23,
  vat_amount    numeric not null default 0,
  gross         numeric not null default 0,
  currency      text not null default 'EUR',
  created_at    timestamptz not null default now()
);
create unique index if not exists invoices_company_number on invoices(company_id, number);
create index if not exists invoices_company_idx on invoices(company_id, created_at desc);

alter table invoices enable row level security;

drop policy if exists invoices_select on invoices;
create policy invoices_select on invoices for select to authenticated
  using (public.is_member_of(company_id));

drop policy if exists invoices_write on invoices;
create policy invoices_write on invoices for all to authenticated
  using (public.has_role(company_id, array['owner','dispatcher']::role[]))
  with check (public.has_role(company_id, array['owner','dispatcher']::role[]));

-- ── Wystawienie faktury ze zlecenia (owner/dispatcher) ──────────────
create or replace function public.create_invoice(p_order uuid, p_vat_rate numeric default 23)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  o orders%rowtype;
  comp companies%rowtype;
  seq int;
  num text;
  v_net numeric;
  v_vat numeric;
  v_gross numeric;
  inv invoices%rowtype;
begin
  select * into o from orders where id = p_order;
  if o.id is null then raise exception 'Zlecenie nie istnieje'; end if;
  if not public.has_role(o.company_id, array['owner','dispatcher']::role[]) then
    raise exception 'Brak uprawnień do fakturowania';
  end if;

  -- Serializacja numeracji per firma (bez kolizji/luk w obrębie roku).
  perform pg_advisory_xact_lock(hashtext('invoice:' || o.company_id::text));
  select count(*) + 1 into seq from invoices
    where company_id = o.company_id
      and extract(year from issue_date) = extract(year from current_date);
  num := 'FV/' || to_char(current_date, 'YYYY') || '/' || lpad(seq::text, 4, '0');

  select * into comp from companies where id = o.company_id;
  v_net := coalesce(o.price, 0);
  v_vat := round(v_net * coalesce(p_vat_rate, 0) / 100, 2);
  v_gross := v_net + v_vat;

  insert into invoices (
    company_id, order_id, number, seller_name, seller_tax_id, seller_address,
    buyer_name, description, net, vat_rate, vat_amount, gross, currency
  ) values (
    o.company_id, o.id, num, comp.name, comp.tax_id, comp.address,
    o.shipper,
    'Usługa transportowa'
      || coalesce(' — zlecenie ' || nullif(o.reference_no, ''), '')
      || coalesce(' (' || o.origin || ' → ' || o.destination || ')', ''),
    v_net, coalesce(p_vat_rate, 0), v_vat, v_gross, coalesce(o.currency, 'EUR')
  ) returning * into inv;

  update orders set status = 'invoiced' where id = o.id;

  insert into audit_log (company_id, actor_id, action, target)
    values (o.company_id, auth.uid(), 'invoice.create', inv.id::text);

  return json_build_object('id', inv.id, 'number', inv.number, 'gross', inv.gross);
end; $$;
