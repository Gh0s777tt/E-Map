-- 0065: POD z QR + publiczne śledzenie przesyłki (#289, mockupy 09/17).
-- Każde zlecenie dostaje sekretny token; kierowca pokazuje odbiorcy QR
-- (link /track/<token>), a firma może wysłać ten link klientowi. Strona
-- publiczna czyta WYŁĄCZNIE bezpieczny podzbiór pól przez RPC (anon),
-- bez dostępu do tabeli orders (RLS bez zmian).

alter table orders add column if not exists tracking_token uuid not null default gen_random_uuid();
create unique index if not exists orders_tracking_token_idx on orders (tracking_token);

create or replace function public.order_tracking(p_token uuid)
returns table (
  reference_no text,
  origin text,
  destination text,
  status order_status,
  load_date date,
  unload_date date,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select o.reference_no, o.origin, o.destination, o.status,
         o.load_date, o.unload_date, o.created_at as updated_at
  from orders o
  where o.tracking_token = p_token;
$$;

-- Strona publiczna działa bez logowania.
grant execute on function public.order_tracking(uuid) to anon, authenticated;
