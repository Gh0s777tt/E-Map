-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0019 · Zgłaszanie usterek pojazdu (kierowca → mechanik/owner)
--  Kierowca raportuje co jest nie tak (część + strona + opis + kontrolka),
--  właściciel/mechanik zmienia status (zgłoszone → w naprawie → naprawione).
-- ════════════════════════════════════════════════════════════════════

create table if not exists vehicle_defects (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  vehicle_id      uuid not null references vehicles(id) on delete cascade,
  reported_by     uuid references auth.users(id) on delete set null,
  part            text not null,
  side            text,
  severity        text not null default 'medium',  -- low|medium|high
  dashboard_light boolean not null default false,
  description     text not null,
  status          text not null default 'open',    -- open|in_progress|resolved
  resolved_by     uuid references auth.users(id) on delete set null,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists vehicle_defects_company_idx on vehicle_defects(company_id);
create index if not exists vehicle_defects_vehicle_idx on vehicle_defects(vehicle_id);

drop trigger if exists vehicle_defects_updated_at on vehicle_defects;
create trigger vehicle_defects_updated_at before update on vehicle_defects
  for each row execute function set_updated_at();

alter table vehicle_defects enable row level security;

-- Widzą: owner/dispatcher (cała firma), autor zgłoszenia, kierowca przypisanego auta.
drop policy if exists vehicle_defects_select on vehicle_defects;
create policy vehicle_defects_select on vehicle_defects for select to authenticated
  using (
    has_role(company_id, array['owner','dispatcher']::role[])
    or reported_by = auth.uid()
    or public.is_assigned_to_vehicle(vehicle_id)
  );

-- Zgłasza: każdy członek firmy (autorem jest on sam).
drop policy if exists vehicle_defects_insert on vehicle_defects;
create policy vehicle_defects_insert on vehicle_defects for insert to authenticated
  with check (is_member_of(company_id) and reported_by = auth.uid());

-- Edycja/zmiana statusu: owner/dispatcher (mechanik) lub autor (póki nierozwiązane).
drop policy if exists vehicle_defects_update on vehicle_defects;
create policy vehicle_defects_update on vehicle_defects for update to authenticated
  using (has_role(company_id, array['owner','dispatcher']::role[]) or reported_by = auth.uid())
  with check (has_role(company_id, array['owner','dispatcher']::role[]) or reported_by = auth.uid());

drop policy if exists vehicle_defects_delete on vehicle_defects;
create policy vehicle_defects_delete on vehicle_defects for delete to authenticated
  using (has_role(company_id, array['owner']::role[]));
