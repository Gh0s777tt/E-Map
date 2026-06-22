-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0034 · Faktury: pozycje wieloliniowe + duplikat
--  Tabela `invoice_items` (pozycje). Kwoty pozycji liczone triggerem BEFORE,
--  sumy faktury przeliczane triggerem AFTER (net/VAT/brutto = suma pozycji).
--  `create_invoice` dokłada pozycję ze zlecenia. `duplicate_invoice` kopiuje
--  fakturę z pozycjami pod nowym numerem. RLS przez firmę faktury.
-- ════════════════════════════════════════════════════════════════════

create table if not exists invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references invoices(id) on delete cascade,
  position    int not null default 1,
  description text not null,
  quantity    numeric not null default 1,
  unit_price  numeric not null default 0,
  vat_rate    numeric not null default 23,
  net         numeric not null default 0,
  vat_amount  numeric not null default 0,
  gross       numeric not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists invoice_items_invoice_idx on invoice_items(invoice_id, position);

alter table invoice_items enable row level security;

drop policy if exists invoice_items_select on invoice_items;
create policy invoice_items_select on invoice_items for select to authenticated
  using (
    exists (select 1 from invoices i where i.id = invoice_id and public.is_member_of(i.company_id))
  );

drop policy if exists invoice_items_write on invoice_items;
create policy invoice_items_write on invoice_items for all to authenticated
  using (
    exists (
      select 1 from invoices i
      where i.id = invoice_id and public.has_role(i.company_id, array['owner','dispatcher']::role[])
    )
  )
  with check (
    exists (
      select 1 from invoices i
      where i.id = invoice_id and public.has_role(i.company_id, array['owner','dispatcher']::role[])
    )
  );

-- ── BEFORE: policz kwoty pozycji (netto/VAT/brutto z ilości i ceny) ──
create or replace function public.invoice_item_amounts()
returns trigger language plpgsql set search_path = public as $$
begin
  NEW.net := round(coalesce(NEW.quantity, 0) * coalesce(NEW.unit_price, 0), 2);
  NEW.vat_amount := round(NEW.net * coalesce(NEW.vat_rate, 0) / 100, 2);
  NEW.gross := NEW.net + NEW.vat_amount;
  return NEW;
end; $$;

drop trigger if exists invoice_items_amounts on invoice_items;
create trigger invoice_items_amounts before insert or update on invoice_items
  for each row execute function public.invoice_item_amounts();

-- ── AFTER: przelicz sumy faktury z pozycji ──────────────────────────
create or replace function public.invoice_recalc()
returns trigger language plpgsql security definer set search_path = public as $$
declare inv uuid := coalesce(NEW.invoice_id, OLD.invoice_id);
begin
  update invoices i set
    net        = coalesce((select sum(net) from invoice_items where invoice_id = inv), 0),
    vat_amount = coalesce((select sum(vat_amount) from invoice_items where invoice_id = inv), 0),
    gross      = coalesce((select sum(gross) from invoice_items where invoice_id = inv), 0)
  where i.id = inv;
  return null;
end; $$;

drop trigger if exists invoice_items_recalc on invoice_items;
create trigger invoice_items_recalc after insert or update or delete on invoice_items
  for each row execute function public.invoice_recalc();

-- ── create_invoice: dołóż pozycję ze zlecenia ───────────────────────
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
  v_desc text;
  inv invoices%rowtype;
begin
  select * into o from orders where id = p_order;
  if o.id is null then raise exception 'Zlecenie nie istnieje'; end if;
  if not public.has_role(o.company_id, array['owner','dispatcher']::role[]) then
    raise exception 'Brak uprawnień do fakturowania';
  end if;

  perform pg_advisory_xact_lock(hashtext('invoice:' || o.company_id::text));
  select count(*) + 1 into seq from invoices
    where company_id = o.company_id
      and extract(year from issue_date) = extract(year from current_date);
  num := 'FV/' || to_char(current_date, 'YYYY') || '/' || lpad(seq::text, 4, '0');

  select * into comp from companies where id = o.company_id;
  v_net := coalesce(o.price, 0);
  v_vat := round(v_net * coalesce(p_vat_rate, 0) / 100, 2);
  v_gross := v_net + v_vat;
  v_desc := 'Usługa transportowa'
    || coalesce(' — zlecenie ' || nullif(o.reference_no, ''), '')
    || coalesce(' (' || o.origin || ' → ' || o.destination || ')', '');

  insert into invoices (
    company_id, order_id, number, seller_name, seller_tax_id, seller_address,
    buyer_name, description, net, vat_rate, vat_amount, gross, currency
  ) values (
    o.company_id, o.id, num, comp.name, comp.tax_id, comp.address,
    o.shipper, v_desc, v_net, coalesce(p_vat_rate, 0), v_vat, v_gross, coalesce(o.currency, 'EUR')
  ) returning * into inv;

  -- Pozycja startowa (trigger przeliczy sumy faktury do tych samych wartości).
  insert into invoice_items (invoice_id, position, description, quantity, unit_price, vat_rate)
    values (inv.id, 1, v_desc, 1, v_net, coalesce(p_vat_rate, 0));

  update orders set status = 'invoiced' where id = o.id;

  insert into audit_log (company_id, actor_id, action, target)
    values (o.company_id, auth.uid(), 'invoice.create', inv.id::text);

  return json_build_object('id', inv.id, 'number', inv.number, 'gross', inv.gross);
end; $$;

-- ── duplicate_invoice: kopia faktury z pozycjami pod nowym numerem ──
create or replace function public.duplicate_invoice(p_invoice uuid)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  src invoices%rowtype;
  seq int;
  num text;
  newid uuid;
begin
  select * into src from invoices where id = p_invoice;
  if src.id is null then raise exception 'Faktura nie istnieje'; end if;
  if not public.has_role(src.company_id, array['owner','dispatcher']::role[]) then
    raise exception 'Brak uprawnień';
  end if;

  perform pg_advisory_xact_lock(hashtext('invoice:' || src.company_id::text));
  select count(*) + 1 into seq from invoices
    where company_id = src.company_id
      and extract(year from issue_date) = extract(year from current_date);
  num := 'FV/' || to_char(current_date, 'YYYY') || '/' || lpad(seq::text, 4, '0');

  insert into invoices (
    company_id, order_id, number, seller_name, seller_tax_id, seller_address,
    buyer_name, buyer_tax_id, buyer_address, description, net, vat_rate, vat_amount, gross, currency
  ) values (
    src.company_id, src.order_id, num, src.seller_name, src.seller_tax_id, src.seller_address,
    src.buyer_name, src.buyer_tax_id, src.buyer_address, src.description,
    src.net, src.vat_rate, src.vat_amount, src.gross, src.currency
  ) returning id into newid;

  insert into invoice_items (invoice_id, position, description, quantity, unit_price, vat_rate)
    select newid, position, description, quantity, unit_price, vat_rate
    from invoice_items where invoice_id = src.id;

  insert into audit_log (company_id, actor_id, action, target)
    values (src.company_id, auth.uid(), 'invoice.duplicate', newid::text);

  return json_build_object('id', newid, 'number', num);
end; $$;
