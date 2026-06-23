-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0048 · Ewidencja czasu pracy kierowcy
--  Zapis dni pracy (jazda / inna praca / odpoczynek) do rozliczeń i raportów.
--  Podsumowania liczy rdzeń (core/workTime). RLS: członek czyta,
--  owner/dispatcher zarządza (jak per_diem_trips / vehicle_costs).
-- ════════════════════════════════════════════════════════════════════

create table if not exists work_time_entries (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  driver_name text,
  work_date   date not null,
  driving     numeric not null default 0 check (driving >= 0),
  other_work  numeric not null default 0 check (other_work >= 0),
  rest        numeric not null default 0 check (rest >= 0),
  note        text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists work_time_entries_company_idx on work_time_entries(company_id);
create index if not exists work_time_entries_date_idx on work_time_entries(work_date);

alter table work_time_entries enable row level security;

drop policy if exists work_time_entries_select on work_time_entries;
create policy work_time_entries_select on work_time_entries for select to authenticated
  using (public.is_member_of(company_id));

drop policy if exists work_time_entries_write on work_time_entries;
create policy work_time_entries_write on work_time_entries for all to authenticated
  using (public.has_role(company_id, array['owner','dispatcher']::role[]))
  with check (public.has_role(company_id, array['owner','dispatcher']::role[]));
