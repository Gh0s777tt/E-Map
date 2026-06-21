-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0012 · Kartoteka kierowców (dane osobowe + uprawnienia)
--  Dane wrażliwe (PII): dowód/paszport/prawo jazdy. Dostęp ograniczony
--  do właściciela i spedytora (nie każdy członek firmy).
-- ════════════════════════════════════════════════════════════════════

create table if not exists drivers (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references companies(id) on delete cascade,
  first_name         text not null,
  last_name          text not null,
  birth_date         date,
  license_number     text,
  id_card_number     text,
  passport_number    text,
  license_categories text[] not null default '{}',
  qualifications     text[] not null default '{}',
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists drivers_company_idx on drivers(company_id);

drop trigger if exists drivers_updated_at on drivers;
create trigger drivers_updated_at before update on drivers
  for each row execute function set_updated_at();

alter table drivers enable row level security;

-- PII → tylko owner/dispatcher (i developer). Kierowca nie widzi cudzych danych.
drop policy if exists drivers_select on drivers;
create policy drivers_select on drivers for select to authenticated
  using (has_role(company_id, array['owner','dispatcher']::role[]) or is_developer());

drop policy if exists drivers_write on drivers;
create policy drivers_write on drivers for all to authenticated
  using (has_role(company_id, array['owner','dispatcher']::role[]) or is_developer())
  with check (has_role(company_id, array['owner','dispatcher']::role[]) or is_developer());
