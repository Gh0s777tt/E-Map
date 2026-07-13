-- ════════════════════════════════════════════════════════════════════
--  0076 · #325 Śledzenie z ETA — RPC `order_tracking` zwraca też pozycję
--  auta (z driver_positions po przypisanym kierowcy, #324), aby publiczna
--  strona /track pokazała klientowi „auto w drodze" i szacowany przyjazd.
--  Prywatność: współrzędne zaokrąglone do 2 miejsc (~1 km), wyłącznie gdy
--  zlecenie jest przypisane/w trasie i pozycja świeższa niż 12 h.
-- ════════════════════════════════════════════════════════════════════

drop function if exists public.order_tracking(uuid);

create or replace function public.order_tracking(p_token uuid)
returns table (
  reference_no text,
  origin text,
  destination text,
  status order_status,
  load_date date,
  unload_date date,
  updated_at timestamptz,
  truck_lat double precision,
  truck_lng double precision,
  truck_updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select o.reference_no, o.origin, o.destination, o.status,
         o.load_date, o.unload_date, o.created_at as updated_at,
         case when o.status in ('assigned','in_progress')
                   and p.updated_at > now() - interval '12 hours'
              then round(p.lat::numeric, 2)::double precision end as truck_lat,
         case when o.status in ('assigned','in_progress')
                   and p.updated_at > now() - interval '12 hours'
              then round(p.lng::numeric, 2)::double precision end as truck_lng,
         case when o.status in ('assigned','in_progress')
                   and p.updated_at > now() - interval '12 hours'
              then p.updated_at end as truck_updated_at
  from orders o
  left join driver_positions p on p.user_id = o.assigned_to
  where o.tracking_token = p_token;
$$;

grant execute on function public.order_tracking(uuid) to anon, authenticated;
