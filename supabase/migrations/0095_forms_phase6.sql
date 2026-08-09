-- [#375] Formularze: usuwanie w historii, ekspres/parking strzeżony,
-- oraz trzy nowe rodzaje zgłoszeń — pauza, dodatkowe koszty trasy, kary.

-- ---------------------------------------------------------------------------
-- 1. Usuwanie własnych wpisów z historii
-- ---------------------------------------------------------------------------
-- Dotąd `DELETE` mógł wyłącznie właściciel firmy, więc kierowca, który pomylił
-- się przy tankowaniu, nie miał jak tego cofnąć — mógł tylko edytować wpis,
-- zostawiając w bazie zdarzenie, które nigdy nie miało miejsca.
--
-- Zarząd zachowuje prawo do kasowania cudzych wpisów (moderacja), autor dostaje
-- prawo do własnych. Świadomie BEZ limitu czasu: pomyłkowe tankowanie odkryte
-- po tygodniu nadal jest pomyłką, a wpis fantom psuje wszystkie statystyki.
drop policy if exists fuel_logs_delete on public.fuel_logs;
create policy fuel_logs_delete on public.fuel_logs
  for delete
  using (driver_id = auth.uid() or has_role(company_id, array['owner']::role[]));

drop policy if exists adblue_logs_delete on public.adblue_logs;
create policy adblue_logs_delete on public.adblue_logs
  for delete
  using (driver_id = auth.uid() or has_role(company_id, array['owner']::role[]));

drop policy if exists trip_events_delete on public.trip_events;
create policy trip_events_delete on public.trip_events
  for delete
  using (driver_id = auth.uid() or has_role(company_id, array['owner']::role[]));

-- ---------------------------------------------------------------------------
-- 2. Ekspres i parking strzeżony przy załadunku/rozładunku
-- ---------------------------------------------------------------------------
alter table public.trip_events
  add column if not exists express boolean not null default false,
  add column if not exists secured_parking boolean not null default false;

comment on column public.trip_events.express is
  'Zlecenie ekspresowe — kierowca zaznacza przy załadunku; wpływa na rozliczenie.';
comment on column public.trip_events.secured_parking is
  'Ładunek wymaga parkingu strzeżonego — planowanie postoju i odpowiedzialność.';

-- ---------------------------------------------------------------------------
-- 3. Wspólny słownik metod płatności dla nowych formularzy
-- ---------------------------------------------------------------------------
-- Celowo `text` + CHECK zamiast rozszerzania enuma `payment_method`: ten enum
-- jest używany przez tankowania i przez buildy mobile, które są już w sklepach.
-- Dodanie wartości do wspólnego typu zmusiłoby je do obsługi metod, o których
-- nie wiedzą. Nowe formularze mają własny, szerszy słownik.
create or replace function public._is_payment_method(p text)
returns boolean
language sql
immutable
as $$
  select p in ('cash', 'card', 'toll_box', 'snap', 'travis', 'transfer', 'other');
$$;

-- ---------------------------------------------------------------------------
-- 4. Pauza / postój
-- ---------------------------------------------------------------------------
-- Kierowca dokumentuje postój: gdzie, przy jakim przebiegu, czy parking był
-- płatny i strzeżony. Zasila planowanie odpoczynków i koszty trasy.
create table if not exists public.pause_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  -- NULL po usunięciu konta kierowcy — wpis operacyjny zostaje przy firmie,
  -- tak samo jak tankowania (patrz migracja 0090).
  driver_id uuid,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  occurred_at timestamptz not null default now(),
  country text not null,
  city text,
  postcode text,
  location text,
  geo geography(Point, 4326),
  odometer_km integer check (odometer_km is null or odometer_km >= 0),
  -- Postój bywa bezpłatny — kwota jest opcjonalna, a nie zerowa.
  price_total numeric(10, 2) check (price_total is null or price_total >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  secured_parking boolean not null default false,
  payment_method text check (payment_method is null or _is_payment_method(payment_method)),
  fuel_card_id uuid references public.fuel_cards (id) on delete set null,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists pause_events_company_occurred_idx
  on public.pause_events (company_id, occurred_at desc);

alter table public.pause_events enable row level security;

-- Wzorzec uprawnień skopiowany z `fuel_logs`: kierowca widzi swoje, zarząd całą firmę.
drop policy if exists pause_events_select on public.pause_events;
create policy pause_events_select on public.pause_events
  for select
  using (driver_id = auth.uid() or has_role(company_id, array['owner', 'dispatcher']::role[]));

drop policy if exists pause_events_insert on public.pause_events;
create policy pause_events_insert on public.pause_events
  for insert
  with check (driver_id = auth.uid() and is_member_of(company_id));

drop policy if exists pause_events_update on public.pause_events;
create policy pause_events_update on public.pause_events
  for update
  using (driver_id = auth.uid() or has_role(company_id, array['owner']::role[]));

drop policy if exists pause_events_delete on public.pause_events;
create policy pause_events_delete on public.pause_events
  for delete
  using (driver_id = auth.uid() or has_role(company_id, array['owner']::role[]));

-- ---------------------------------------------------------------------------
-- 5. Dodatkowe koszty trasy (hotele, bramki, promy, tunele, pociągi)
-- ---------------------------------------------------------------------------
-- Wprowadza ZARZĄD po zakończeniu trasy przez kierowcę — stąd inne uprawnienia
-- niż przy pauzie: kierowca tych kosztów nie widzi ani nie dodaje.
create table if not exists public.route_extra_costs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  -- Powiązanie ze zleceniem pozwala policzyć pełny koszt trasy (Faza 7).
  order_id uuid references public.orders (id) on delete set null,
  occurred_at timestamptz not null default now(),
  kind text not null check (
    kind in ('hotel', 'toll', 'motorway', 'ferry', 'tunnel', 'train', 'bridge', 'vignette',
             'parking', 'wash', 'repair', 'fine_admin', 'other')
  ),
  country text,
  city text,
  location text,
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  payment_method text check (payment_method is null or _is_payment_method(payment_method)),
  fuel_card_id uuid references public.fuel_cards (id) on delete set null,
  comment text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists route_extra_costs_company_occurred_idx
  on public.route_extra_costs (company_id, occurred_at desc);
create index if not exists route_extra_costs_vehicle_idx
  on public.route_extra_costs (vehicle_id);

alter table public.route_extra_costs enable row level security;

drop policy if exists route_extra_costs_select on public.route_extra_costs;
create policy route_extra_costs_select on public.route_extra_costs
  for select using (has_role(company_id, array['owner', 'dispatcher']::role[]));

drop policy if exists route_extra_costs_write on public.route_extra_costs;
create policy route_extra_costs_write on public.route_extra_costs
  for all
  using (has_role(company_id, array['owner', 'dispatcher']::role[]))
  with check (has_role(company_id, array['owner', 'dispatcher']::role[]));

-- ---------------------------------------------------------------------------
-- 6. Kary i mandaty
-- ---------------------------------------------------------------------------
-- Osobno od `route_extra_costs`, mimo podobnej struktury: kara ma inny obieg
-- (kwestionowanie, termin płatności, przypisanie winy) i miesza się w raportach,
-- gdyby siedziała w jednym worku z opłatami drogowymi.
create table if not exists public.penalties (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  -- Kierowca, którego dotyczy. NULL = nieprzypisana albo konto usunięte.
  driver_id uuid,
  occurred_at timestamptz not null default now(),
  country text,
  city text,
  location text,
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  -- Za co: przekroczenie prędkości, przeciążenie, tachograf, brak winiety...
  reason text not null,
  status text not null default 'open' check (status in ('open', 'paid', 'appealed', 'cancelled')),
  due_date date,
  comment text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists penalties_company_occurred_idx
  on public.penalties (company_id, occurred_at desc);
create index if not exists penalties_vehicle_idx on public.penalties (vehicle_id);

alter table public.penalties enable row level security;

-- Kierowca WIDZI karę, która jego dotyczy (dowiaduje się, że dostał mandat),
-- ale nie może jej dodać, zmienić ani usunąć.
drop policy if exists penalties_select on public.penalties;
create policy penalties_select on public.penalties
  for select
  using (driver_id = auth.uid() or has_role(company_id, array['owner', 'dispatcher']::role[]));

drop policy if exists penalties_write on public.penalties;
create policy penalties_write on public.penalties
  for all
  using (has_role(company_id, array['owner', 'dispatcher']::role[]))
  with check (has_role(company_id, array['owner', 'dispatcher']::role[]));
