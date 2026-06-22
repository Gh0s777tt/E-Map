-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0036 · Faktura ręczna (bez zlecenia)
--  RPC create_blank_invoice: pusta faktura z dowolnym nabywcą i numeracją
--  FV/ROK/NNNN (blokada advisory). Pozycje dodaje się potem (invoice_items),
--  trigger przeliczy sumy. Sprzedawca = dane firmy. owner/dispatcher, audyt.
-- ════════════════════════════════════════════════════════════════════

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
begin
  if not public.has_role(p_company, array['owner','dispatcher']::role[]) then
    raise exception 'Brak uprawnień do wystawiania faktur';
  end if;

  perform pg_advisory_xact_lock(hashtext('invoice:' || p_company::text));
  select count(*) + 1 into seq from invoices
    where company_id = p_company
      and extract(year from issue_date) = extract(year from current_date);
  num := 'FV/' || to_char(current_date, 'YYYY') || '/' || lpad(seq::text, 4, '0');

  select * into comp from companies where id = p_company;

  insert into invoices (
    company_id, order_id, number, seller_name, seller_tax_id, seller_address,
    buyer_name, buyer_tax_id, buyer_address, description, net, vat_rate, vat_amount, gross, currency
  ) values (
    p_company, null, num, comp.name, comp.tax_id, comp.address,
    nullif(p_buyer_name, ''), nullif(p_buyer_tax_id, ''), nullif(p_buyer_address, ''),
    null, 0, 23, 0, 0, coalesce(nullif(p_currency, ''), 'EUR')
  ) returning id into newid;

  insert into audit_log (company_id, actor_id, action, target)
    values (p_company, auth.uid(), 'invoice.create_blank', newid::text);

  return json_build_object('id', newid, 'number', num);
end; $$;
