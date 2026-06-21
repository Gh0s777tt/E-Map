-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0029 · Zlecenia / ładunki (rdzeń spedytora)
--  Nadawca/odbiorca, trasa, ładunek, stawka, status. Bez przepływów płatniczych
--  (cena = stawka informacyjna). RLS: członek czyta, owner/dispatcher zarządza.
-- ════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum (
      'new', 'assigned', 'in_progress', 'delivered', 'invoiced', 'cancelled'
    );
  end if;
end $$;

create table if not exists orders (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  reference_no text,
  shipper      text,
  consignee    text,
  origin       text,
  destination  text,
  cargo        text,
  weight_kg    numeric,
  price        numeric,
  currency     text not null default 'EUR',
  status       order_status not null default 'new',
  vehicle_id   uuid references vehicles(id) on delete set null,
  load_date    date,
  unload_date  date,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists orders_company_idx on orders(company_id, created_at desc);
create index if not exists orders_status_idx on orders(company_id, status);

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();

alter table orders enable row level security;

drop policy if exists orders_select on orders;
create policy orders_select on orders for select to authenticated
  using (public.is_member_of(company_id));

drop policy if exists orders_write on orders;
create policy orders_write on orders for all to authenticated
  using (public.has_role(company_id, array['owner','dispatcher']::role[]))
  with check (public.has_role(company_id, array['owner','dispatcher']::role[]));
