-- 0060: checklisty kierowców (#273) — np. „Wjazd do UK" (Border Force, plomba,
-- pasażer na gapę) i „Tachograf" (tryb + godzina, OOC, młotki na load/unload).
-- Szablony definiuje firma (owner/dispatcher), kierowca wypełnia w aplikacji;
-- zgłoszenie automatycznie przypina się do kierowcy (trigger po auth.uid())
-- i do wybranego pojazdu — nic się nie miesza, wszystko sortowalne.

create table if not exists checklist_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  -- [{key, label, type: 'yesno'|'multi', options?: text[], photo?: bool, time?: bool}]
  items jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists checklist_submissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  template_id uuid references checklist_templates(id) on delete set null,
  template_name text not null default '',      -- snapshot (szablon może się zmienić)
  driver_id uuid references drivers(id) on delete set null,
  driver_user_id uuid,                          -- auth.uid() wypełniającego
  driver_label text not null default '',        -- e-mail/nazwa do listy (bez joinów po PII)
  vehicle_id uuid references vehicles(id) on delete set null,
  answers jsonb not null default '{}'::jsonb,   -- {key: {value, time?, photo?}}
  created_at timestamptz not null default now()
);

create index if not exists checklist_submissions_company_idx
  on checklist_submissions(company_id, created_at desc);
create index if not exists checklist_submissions_vehicle_idx
  on checklist_submissions(vehicle_id, created_at desc);
create index if not exists checklist_submissions_driver_idx
  on checklist_submissions(driver_user_id, created_at desc);

alter table checklist_templates  enable row level security;
alter table checklist_submissions enable row level security;

-- Szablony: czyta każdy członek (kierowca musi widzieć co wypełnia), pisze zarząd.
drop policy if exists checklist_templates_select on checklist_templates;
create policy checklist_templates_select on checklist_templates for select to authenticated
  using (is_member_of(company_id));
drop policy if exists checklist_templates_write on checklist_templates;
create policy checklist_templates_write on checklist_templates for all to authenticated
  using (has_role(company_id, array['owner','dispatcher']::role[]))
  with check (has_role(company_id, array['owner','dispatcher']::role[]));

-- Zgłoszenia: kierowca dodaje SWOJE (driver_user_id = auth.uid()) i widzi swoje;
-- zarząd widzi wszystkie firmy. Bez update (dziennik); delete tylko owner.
drop policy if exists checklist_submissions_insert on checklist_submissions;
create policy checklist_submissions_insert on checklist_submissions for insert to authenticated
  with check (is_member_of(company_id) and driver_user_id = auth.uid());
drop policy if exists checklist_submissions_select on checklist_submissions;
create policy checklist_submissions_select on checklist_submissions for select to authenticated
  using (
    has_role(company_id, array['owner','dispatcher']::role[])
    or driver_user_id = auth.uid()
  );
drop policy if exists checklist_submissions_delete on checklist_submissions;
create policy checklist_submissions_delete on checklist_submissions for delete to authenticated
  using (has_role(company_id, array['owner']::role[]));

-- Auto-przypisanie kierowcy z kartoteki po user_id (denormalizacja jak w 0058/0059).
create or replace function checklist_link_driver()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.driver_user_id := auth.uid();
  select d.id into new.driver_id
    from drivers d
    where d.company_id = new.company_id and d.user_id = auth.uid()
    limit 1;
  return new;
end;
$$;

drop trigger if exists checklist_link_driver_trg on checklist_submissions;
create trigger checklist_link_driver_trg
  before insert on checklist_submissions
  for each row execute function checklist_link_driver();
