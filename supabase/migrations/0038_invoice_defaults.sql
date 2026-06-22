-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0038 · Domyślny VAT + termin płatności (z ustawień firmy)
--  companies.default_vat_rate, companies.payment_due_days → używane przy
--  wystawianiu faktur. invoices.due_date = data wystawienia + termin płatności.
--  create_invoice/create_blank_invoice biorą VAT i termin z firmy (gdy nie podano).
-- ════════════════════════════════════════════════════════════════════

alter table companies add column if not exists default_vat_rate numeric not null default 23;
alter table companies add column if not exists payment_due_days int not null default 14;
alter table invoices add column if not exists due_date date;

-- ── create_invoice: VAT z firmy (gdy nie podano) + termin płatności ──
create or replace function public.create_invoice(p_order uuid, p_vat_rate numeric default null)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  o orders%rowtype;
  comp companies%rowtype;
  seq int;
  num text;
  v_rate numeric;
  v_net numeric;
  v_vat numeric;
  v_gross numeric;
  v_due date;
  v_desc text;
  inv invoices%rowtype;
begin
  select * into o from orders where id = p_order;
  if o.id is null then raise exception 'Zlecenie nie istnieje'; end if;
  if not public.has_role(o.company_id, array['owner','dispatcher']::role[]) then
    raise exception 'Brak uprawnień do fakturowania';
  end if;

  select * into comp from companies where id = o.company_id;
  v_rate := coalesce(p_vat_rate, comp.default_vat_rate, 23);
  v_due := current_date + coalesce(comp.payment_due_days, 14);

  perform pg_advisory_xact_lock(hashtext('invoice:' || o.company_id::text));
  select count(*) + 1 into seq from invoices
    where company_id = o.company_id
      and extract(year from issue_date) = extract(year from current_date);
  num := 'FV/' || to_char(current_date, 'YYYY') || '/' || lpad(seq::text, 4, '0');

  v_net := coalesce(o.price, 0);
  v_vat := round(v_net * v_rate / 100, 2);
  v_gross := v_net + v_vat;
  v_desc := 'Usługa transportowa'
    || coalesce(' — zlecenie ' || nullif(o.reference_no, ''), '')
    || coalesce(' (' || o.origin || ' → ' || o.destination || ')', '');

  insert into invoices (
    company_id, order_id, number, seller_name, seller_tax_id, seller_address,
    buyer_name, description, net, vat_rate, vat_amount, gross, currency, due_date
  ) values (
    o.company_id, o.id, num, comp.name, comp.tax_id, comp.address,
    o.shipper, v_desc, v_net, v_rate, v_vat, v_gross, coalesce(o.currency, 'EUR'), v_due
  ) returning * into inv;

  insert into invoice_items (invoice_id, position, description, quantity, unit_price, vat_rate)
    values (inv.id, 1, v_desc, 1, v_net, v_rate);

  update orders set status = 'invoiced' where id = o.id;

  insert into audit_log (company_id, actor_id, action, target)
    values (o.company_id, auth.uid(), 'invoice.create', inv.id::text);

  return json_build_object('id', inv.id, 'number', inv.number, 'gross', inv.gross);
end; $$;

-- ── create_blank_invoice: VAT z firmy + termin płatności ────────────
create or replace function public.create_blank_invoice(
  p_company uuid,
  p_buyer_name text,
  p_buyer_tax_id text default null,
  p_buyer_address text default null,
  p_currency text default 'EUR'
)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  comp companies%rowtype;
  seq int;
  num text;
  newid uuid;
  v_rate numeric;
  v_due date;
begin
  if not public.has_role(p_company, array['owner','dispatcher']::role[]) then
    raise exception 'Brak uprawnień do wystawiania faktur';
  end if;

  select * into comp from companies where id = p_company;
  v_rate := coalesce(comp.default_vat_rate, 23);
  v_due := current_date + coalesce(comp.payment_due_days, 14);

  perform pg_advisory_xact_lock(hashtext('invoice:' || p_company::text));
  select count(*) + 1 into seq from invoices
    where company_id = p_company
      and extract(year from issue_date) = extract(year from current_date);
  num := 'FV/' || to_char(current_date, 'YYYY') || '/' || lpad(seq::text, 4, '0');

  insert into invoices (
    company_id, order_id, number, seller_name, seller_tax_id, seller_address,
    buyer_name, buyer_tax_id, buyer_address, description, net, vat_rate, vat_amount, gross, currency, due_date
  ) values (
    p_company, null, num, comp.name, comp.tax_id, comp.address,
    nullif(p_buyer_name, ''), nullif(p_buyer_tax_id, ''), nullif(p_buyer_address, ''),
    null, 0, v_rate, 0, 0, coalesce(nullif(p_currency, ''), 'EUR'), v_due
  ) returning id into newid;

  insert into audit_log (company_id, actor_id, action, target)
    values (p_company, auth.uid(), 'invoice.create_blank', newid::text);

  return json_build_object('id', newid, 'number', num);
end; $$;
