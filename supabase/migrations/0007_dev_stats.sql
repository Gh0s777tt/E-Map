-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0007 · Panel developera — RPC dev_stats (liczniki)
--  Dostęp tylko dla roli developer (globalny wgląd, audytowany).
-- ════════════════════════════════════════════════════════════════════

create or replace function public.dev_stats()
returns json language plpgsql security definer set search_path = public as $$
declare res json;
begin
  if not public.is_developer() then
    raise exception 'Dostęp tylko dla developera';
  end if;
  select json_build_object(
    'companies',   (select count(*) from companies),
    'profiles',    (select count(*) from profiles),
    'memberships', (select count(*) from memberships),
    'vehicles',    (select count(*) from vehicles),
    'fuel_logs',   (select count(*) from fuel_logs),
    'adblue_logs', (select count(*) from adblue_logs),
    'trip_events', (select count(*) from trip_events),
    'fuel_cards',  (select count(*) from fuel_cards),
    'map_reports', (select count(*) from map_reports),
    'invites',     (select count(*) from invites)
  ) into res;
  return res;
end; $$;
