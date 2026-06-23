-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0050 · Rozliczenia kierowcy (zaliczki / wypłaty)
--  Ewidencja pozycji: należność / zaliczka / potrącenie / wypłata.
--  Saldo do wypłaty liczy rdzeń (core/payouts). RLS: członek czyta,
--  owner/dispatcher zarządza (jak per_diem_trips / work_time_entries).
-- ════════════════════════════════════════════════════════════════════

create table if not exists driver_payouts (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  driver_name text,
  kind        text not null check (kind in ('due', 'advance', 'deduction', 'payout')),
  amount      numeric not null check (amount >= 0),
  currency    text not null default 'PLN',
  entry_date  date not null default current_date,
  note        text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists driver_payouts_company_idx on driver_payouts(company_id);
create index if not exists driver_payouts_date_idx on driver_payouts(entry_date);

alter table driver_payouts enable row level security;

drop policy if exists driver_payouts_select on driver_payouts;
create policy driver_payouts_select on driver_payouts for select to authenticated
  using (public.is_member_of(company_id));

drop policy if exists driver_payouts_write on driver_payouts;
create policy driver_payouts_write on driver_payouts for all to authenticated
  using (public.has_role(company_id, array['owner','dispatcher']::role[]))
  with check (public.has_role(company_id, array['owner','dispatcher']::role[]));
