-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0043 · Koszty pojazdu (inne niż paliwo)
--  Naprawy, leasing/raty, ubezpieczenie, podatki, mandaty, opony… — razem
--  z kosztem paliwa pozwalają policzyć DOKŁADNY zysk floty (przychód ze
--  zleceń − paliwo − pozostałe koszty).
--  RLS: członek czyta, owner/dispatcher zarządza (jak service_tasks/contractors).
-- ════════════════════════════════════════════════════════════════════

create table if not exists vehicle_costs (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  vehicle_id  uuid not null references vehicles(id) on delete cascade,
  category    text not null,
  amount      numeric not null check (amount >= 0),
  currency    text not null default 'EUR',
  cost_date   date not null default current_date,
  description text,
  created_at  timestamptz not null default now()
);
create index if not exists vehicle_costs_company_idx on vehicle_costs(company_id);
create index if not exists vehicle_costs_vehicle_idx on vehicle_costs(vehicle_id);
create index if not exists vehicle_costs_date_idx on vehicle_costs(cost_date);

alter table vehicle_costs enable row level security;

drop policy if exists vehicle_costs_select on vehicle_costs;
create policy vehicle_costs_select on vehicle_costs for select to authenticated
  using (public.is_member_of(company_id));

drop policy if exists vehicle_costs_write on vehicle_costs;
create policy vehicle_costs_write on vehicle_costs for all to authenticated
  using (public.has_role(company_id, array['owner','dispatcher']::role[]))
  with check (public.has_role(company_id, array['owner','dispatcher']::role[]));
