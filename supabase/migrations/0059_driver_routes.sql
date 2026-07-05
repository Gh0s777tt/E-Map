-- 0059: „Wyślij trasę kierowcy" (#272) — most dyspozytor→kierowca.
-- Web zapisuje CAŁĄ policzoną trasę (przystanki + geometria TIR + podsumowanie),
-- mobile tylko ją rysuje — parytet mapy bez silnika routingu w telefonie (M3 fala 2).

create table if not exists driver_routes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  driver_id uuid not null references drivers(id) on delete cascade,
  -- denormalizacja: user_id kierowcy w momencie wysyłki → mobile filtruje po auth.uid()
  driver_user_id uuid,
  name text not null default '',
  stops jsonb not null default '[]'::jsonb,     -- [{lat,lng,label}]
  geometry jsonb not null default '[]'::jsonb,  -- [[lng,lat], …] linia trasy z web
  summary jsonb not null default '{}'::jsonb,   -- {distanceKm,durationMin,tollCost,currency}
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists driver_routes_driver_user_idx on driver_routes(driver_user_id, created_at desc);
create index if not exists driver_routes_company_idx on driver_routes(company_id);

alter table driver_routes enable row level security;

-- Odczyt: zarząd firmy ORAZ kierowca-adresat (po user_id).
drop policy if exists driver_routes_select on driver_routes;
create policy driver_routes_select on driver_routes for select to authenticated
  using (
    has_role(company_id, array['owner','dispatcher']::role[])
    or driver_user_id = auth.uid()
  );

-- Zapis/kasowanie: owner/dispatcher (przez RPC poniżej lub bezpośrednio).
drop policy if exists driver_routes_write on driver_routes;
create policy driver_routes_write on driver_routes for insert to authenticated
  with check (has_role(company_id, array['owner','dispatcher']::role[]));
drop policy if exists driver_routes_delete on driver_routes;
create policy driver_routes_delete on driver_routes for delete to authenticated
  using (has_role(company_id, array['owner','dispatcher']::role[]));

-- RPC: wysyłka trasy — dokleja user_id kierowcy z kartoteki (kolumna niedostępna
-- bezpośrednio dla klienta) i wpis do powiadomień firmy.
create or replace function send_driver_route(
  p_company uuid,
  p_driver uuid,
  p_name text,
  p_stops jsonb,
  p_geometry jsonb,
  p_summary jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_id uuid;
begin
  if not has_role(p_company, array['owner','dispatcher']::role[]) then
    raise exception 'Trasy wysyła właściciel lub spedytor.';
  end if;
  select user_id into v_user from drivers where id = p_driver and company_id = p_company;
  if not found then
    raise exception 'Kierowca nie istnieje w tej firmie.';
  end if;
  insert into driver_routes (company_id, driver_id, driver_user_id, name, stops, geometry, summary, created_by)
  values (p_company, p_driver, v_user, coalesce(p_name, ''), coalesce(p_stops, '[]'::jsonb),
          coalesce(p_geometry, '[]'::jsonb), coalesce(p_summary, '{}'::jsonb), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function send_driver_route(uuid, uuid, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function send_driver_route(uuid, uuid, text, jsonb, jsonb, jsonb) to authenticated;
