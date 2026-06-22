-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0047 · Diety kierowcy (per diem)
--  Zapis podróży służbowych do rozliczenia diet (krajowe/zagraniczne).
--  Należne „doby" i kwoty liczy rdzeń (core/perDiem) — tu trzymamy wejście:
--  kierowca, cel, typ, czas, stawka dobowa, waluta, data.
--  RLS: członek czyta, owner/dispatcher zarządza (jak vehicle_costs).
-- ════════════════════════════════════════════════════════════════════

create table if not exists per_diem_trips (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  driver_name text,
  destination text,
  mode        text not null check (mode in ('domestic', 'foreign')),
  hours       numeric not null check (hours >= 0),
  daily_rate  numeric not null check (daily_rate >= 0),
  currency    text not null default 'EUR',
  trip_date   date,
  note        text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists per_diem_trips_company_idx on per_diem_trips(company_id);
create index if not exists per_diem_trips_date_idx on per_diem_trips(trip_date);

alter table per_diem_trips enable row level security;

drop policy if exists per_diem_trips_select on per_diem_trips;
create policy per_diem_trips_select on per_diem_trips for select to authenticated
  using (public.is_member_of(company_id));

drop policy if exists per_diem_trips_write on per_diem_trips;
create policy per_diem_trips_write on per_diem_trips for all to authenticated
  using (public.has_role(company_id, array['owner','dispatcher']::role[]))
  with check (public.has_role(company_id, array['owner','dispatcher']::role[]));
