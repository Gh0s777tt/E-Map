-- ════════════════════════════════════════════════════════════════════
--  0079 · #345 Dziennik Tacho kierowcy — zdarzenia czasu pracy zapisywane
--  w profilu (trwale, per kierowca): rozpoczęcie/zakończenie dnia pracy oraz
--  rozpoczęcie/zakończenie odpoczynku (dobowego/tygodniowego) z typem
--  (regularny/skrócony). Na tej podstawie aplikacja liczy termin kolejnego
--  odpoczynku tygodniowego (144 h) i przypomina. Kierowca widzi wszystko na
--  bieżąco; zarząd czyta dziennik firmy.
-- ════════════════════════════════════════════════════════════════════

create table if not exists driver_tacho_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  driver_user_id uuid not null,
  -- work_start | work_end | weekly_rest_start | weekly_rest_end
  --  | daily_rest_start | daily_rest_end
  kind text not null,
  -- dla odpoczynku: regular | reduced (null dla dnia pracy)
  rest_type text,
  -- moment zdarzenia (edytowalny przez kierowcę; domyślnie teraz)
  at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists driver_tacho_events_driver_idx
  on driver_tacho_events(driver_user_id, at desc);
create index if not exists driver_tacho_events_company_idx
  on driver_tacho_events(company_id, at desc);

alter table driver_tacho_events enable row level security;

-- Zapis/kasowanie: wyłącznie własne wpisy kierowcy (w firmie, której jest członkiem).
drop policy if exists driver_tacho_insert on driver_tacho_events;
create policy driver_tacho_insert on driver_tacho_events for insert to authenticated
  with check (driver_user_id = auth.uid() and is_member_of(company_id));

drop policy if exists driver_tacho_delete on driver_tacho_events;
create policy driver_tacho_delete on driver_tacho_events for delete to authenticated
  using (driver_user_id = auth.uid());

-- Odczyt: kierowca swoje, zarząd całą firmę.
drop policy if exists driver_tacho_select on driver_tacho_events;
create policy driver_tacho_select on driver_tacho_events for select to authenticated
  using (
    driver_user_id = auth.uid()
    or has_role(company_id, array['owner','dispatcher']::role[])
  );
