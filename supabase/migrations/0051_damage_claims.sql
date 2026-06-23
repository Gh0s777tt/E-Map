-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0051 · Rejestr szkód / OC
--  Zgłoszenia szkód pojazdów: rodzaj, status, koszt, ubezpieczyciel, nr szkody.
--  Podsumowania liczy rdzeń (core/damageClaims). RLS: członek czyta,
--  owner/dispatcher zarządza (jak vehicle_costs).
-- ════════════════════════════════════════════════════════════════════

create table if not exists damage_claims (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  vehicle_id   uuid references vehicles(id) on delete set null,
  driver_name  text,
  claim_date   date not null default current_date,
  kind         text not null default 'other'
                 check (kind in ('collision','theft','glass','weather','vandalism','other')),
  status       text not null default 'reported'
                 check (status in ('reported','in_progress','repaired','closed','rejected')),
  description  text,
  cost         numeric check (cost is null or cost >= 0),
  currency     text not null default 'PLN',
  insurer      text,
  claim_number text,
  note         text,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists damage_claims_company_idx on damage_claims(company_id);
create index if not exists damage_claims_vehicle_idx on damage_claims(vehicle_id);
create index if not exists damage_claims_date_idx on damage_claims(claim_date);

alter table damage_claims enable row level security;

drop policy if exists damage_claims_select on damage_claims;
create policy damage_claims_select on damage_claims for select to authenticated
  using (public.is_member_of(company_id));

drop policy if exists damage_claims_write on damage_claims;
create policy damage_claims_write on damage_claims for all to authenticated
  using (public.has_role(company_id, array['owner','dispatcher']::role[]))
  with check (public.has_role(company_id, array['owner','dispatcher']::role[]));
