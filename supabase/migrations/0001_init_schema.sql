-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0001 · Schema startowa (encje + PostGIS + indeksy)
--  Postgres 17 / Supabase. RLS dodane w 0002_rls.sql.
-- ════════════════════════════════════════════════════════════════════

-- ── Rozszerzenia ────────────────────────────────────────────────────
create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ── Enumy ───────────────────────────────────────────────────────────
create type role as enum ('developer', 'owner', 'dispatcher', 'driver');
create type membership_status as enum ('active', 'invited', 'disabled');
create type vehicle_type as enum ('truck', 'tractor', 'van', 'trailer', 'other');
create type payment_method as enum ('card', 'cash');
create type trip_action as enum ('load', 'unload', 'start', 'end', 'service', 'other');
create type fuel_card_provider as enum (
  'dkv', 'eurowag', 'shell', 'bp', 'circlek', 'e100', 'uta', 'as24',
  'aral', 'omv', 'routex', 'logpay', 'esso', 'totalenergies', 'other'
);
create type poi_type as enum ('parking', 'fuel_station', 'ferry', 'airport', 'company', 'wash', 'weigh');
create type report_type as enum ('accident', 'police', 'closure', 'traffic', 'weigh', 'hazard');

-- ── Trigger: updated_at ─────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ── Tenant: firmy ───────────────────────────────────────────────────
create table companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  tax_id      text,
  address     text,
  country     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Profile (rozszerza auth.users) ──────────────────────────────────
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  phone        text,
  email        text,
  locale       text default 'pl',
  mfa_enabled  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- auto-tworzenie profilu po rejestracji w auth
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Członkostwo (rola w firmie) ─────────────────────────────────────
create table memberships (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references companies(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        role not null,
  status      membership_status not null default 'active',
  created_at  timestamptz not null default now(),
  unique (company_id, user_id)
);
create index memberships_user_idx on memberships(user_id);
create index memberships_company_idx on memberships(company_id);

-- ── Pojazdy ─────────────────────────────────────────────────────────
create table vehicles (
  id                       uuid primary key default gen_random_uuid(),
  company_id               uuid not null references companies(id) on delete cascade,
  registration             text not null,
  model                    text not null,
  year                     int,
  first_registration_date  date,
  inspection_expiry        date,
  insurance_expiry         date,
  leasing_end              date,
  curb_weight_kg           int,
  max_payload_kg           int,
  height_cm                int,
  width_cm                 int,
  length_cm                int,
  vehicle_type             vehicle_type not null default 'truck',
  forwarder                text,
  comment                  text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (company_id, registration)
);
create index vehicles_company_idx on vehicles(company_id);
create trigger vehicles_updated_at before update on vehicles
  for each row execute function set_updated_at();

-- ── Profil kierowcy ─────────────────────────────────────────────────
create table driver_profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  company_name   text,
  company_data   jsonb,
  phone          text,
  email          text,
  qualifications jsonb default '{}'::jsonb,  -- wózki, ADR, ...
  comment        text
);

create table driver_assignments (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references vehicles(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  valid_from  date,
  valid_to    date,
  active      boolean not null default true
);
create index driver_assignments_vehicle_idx on driver_assignments(vehicle_id);
create index driver_assignments_user_idx on driver_assignments(user_id);

-- ── Karty paliwowe (dane wrażliwe) ──────────────────────────────────
create table fuel_cards (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references companies(id) on delete cascade,
  provider            fuel_card_provider not null,
  card_number_masked  text not null,
  pin_encrypted       bytea,                     -- pgp_sym_encrypt; odszyfrowanie tylko fn (0002)
  valid_until         date,
  discount_percent    numeric(5,2) not null default 0,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index fuel_cards_company_idx on fuel_cards(company_id);
create trigger fuel_cards_updated_at before update on fuel_cards
  for each row execute function set_updated_at();

create table card_assignments (
  id            uuid primary key default gen_random_uuid(),
  fuel_card_id  uuid not null references fuel_cards(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  vehicle_id    uuid references vehicles(id) on delete set null,
  active        boolean not null default true
);

-- ── Formularze (offline-first: id z klienta = UUIDv7) ───────────────
create table fuel_logs (
  id              uuid primary key,            -- generowane na kliencie
  company_id      uuid not null references companies(id) on delete cascade,
  driver_id       uuid not null references auth.users(id) on delete cascade,
  vehicle_id      uuid not null references vehicles(id) on delete cascade,
  station_country text not null,
  station_city    text,
  station_loc     text,
  geo             geography(Point, 4326),
  odometer_km     int not null,
  liters          numeric(8,2) not null,
  payment_method  payment_method not null,
  fuel_card_id    uuid references fuel_cards(id) on delete set null,
  price_total     numeric(10,2),
  comment         text,
  device_id       text,
  revision        int not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  synced_at       timestamptz
);
create index fuel_logs_stat_idx on fuel_logs(company_id, vehicle_id, created_at);
create index fuel_logs_driver_idx on fuel_logs(driver_id);
create trigger fuel_logs_updated_at before update on fuel_logs
  for each row execute function set_updated_at();

create table adblue_logs (
  id              uuid primary key,
  company_id      uuid not null references companies(id) on delete cascade,
  driver_id       uuid not null references auth.users(id) on delete cascade,
  vehicle_id      uuid not null references vehicles(id) on delete cascade,
  station_country text not null,
  station_city    text,
  station_loc     text,
  geo             geography(Point, 4326),
  odometer_km     int not null,
  liters          numeric(8,2) not null,
  payment_method  payment_method not null,
  fuel_card_id    uuid references fuel_cards(id) on delete set null,
  price_total     numeric(10,2),
  comment         text,
  device_id       text,
  revision        int not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  synced_at       timestamptz
);
create index adblue_logs_stat_idx on adblue_logs(company_id, vehicle_id, created_at);
create trigger adblue_logs_updated_at before update on adblue_logs
  for each row execute function set_updated_at();

create table trip_events (
  id              uuid primary key,
  company_id      uuid not null references companies(id) on delete cascade,
  driver_id       uuid not null references auth.users(id) on delete cascade,
  vehicle_id      uuid not null references vehicles(id) on delete cascade,
  action          trip_action not null,
  country         text not null,
  location        text,
  geo             geography(Point, 4326),
  odometer_km     int not null,
  weight_kg       int,
  amount          numeric(10,2),
  comment         text,
  device_id       text,
  revision        int not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  synced_at       timestamptz
);
create index trip_events_stat_idx on trip_events(company_id, vehicle_id, created_at);
create index trip_events_driver_idx on trip_events(driver_id);
create trigger trip_events_updated_at before update on trip_events
  for each row execute function set_updated_at();

-- ── Historia edycji (rewizje) ───────────────────────────────────────
create table fuel_log_revisions (
  id          uuid primary key default gen_random_uuid(),
  fuel_log_id uuid not null references fuel_logs(id) on delete cascade,
  revision    int not null,
  snapshot    jsonb not null,
  edited_by   uuid references auth.users(id),
  edited_at   timestamptz not null default now()
);
create table adblue_log_revisions (
  id            uuid primary key default gen_random_uuid(),
  adblue_log_id uuid not null references adblue_logs(id) on delete cascade,
  revision      int not null,
  snapshot      jsonb not null,
  edited_by     uuid references auth.users(id),
  edited_at     timestamptz not null default now()
);
create table trip_event_revisions (
  id            uuid primary key default gen_random_uuid(),
  trip_event_id uuid not null references trip_events(id) on delete cascade,
  revision      int not null,
  snapshot      jsonb not null,
  edited_by     uuid references auth.users(id),
  edited_at     timestamptz not null default now()
);

-- ── Stawki ──────────────────────────────────────────────────────────
create table rates (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  vehicle_id   uuid references vehicles(id) on delete cascade,  -- null = domyślna
  rate_per_km  numeric(10,4) not null,
  currency     text not null default 'EUR',
  valid_from   date not null default current_date
);
create index rates_company_idx on rates(company_id);

-- ── Mapa: POI, oceny, ceny paliw, zgłoszenia ────────────────────────
create table pois (
  id          uuid primary key default gen_random_uuid(),
  type        poi_type not null,
  name        text,
  country     text,
  address     text,
  geo         geography(Point, 4326) not null,
  amenities   jsonb default '{}'::jsonb,   -- truck_spaces, toilet, shower, restaurant, water, air
  accepts     jsonb default '{}'::jsonb,   -- snap, travis, karty paliwowe
  source      text default 'osm',          -- osm | tpe | crowd
  rating_avg  numeric(3,2),
  created_at  timestamptz not null default now()
);
create index pois_geo_idx on pois using gist (geo);
create index pois_type_idx on pois(type);

create table poi_reviews (
  id         uuid primary key default gen_random_uuid(),
  poi_id     uuid not null references pois(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  rating     int check (rating between 1 and 5),
  safety     int check (safety between 1 and 5),
  comment    text,
  created_at timestamptz not null default now()
);

create table fuel_prices (
  id          uuid primary key default gen_random_uuid(),
  poi_id      uuid references pois(id) on delete cascade,
  fuel_type   text not null default 'diesel',
  price       numeric(8,3) not null,
  currency    text not null default 'EUR',
  reported_at timestamptz not null default now(),
  source      text default 'crowd'
);
create index fuel_prices_poi_idx on fuel_prices(poi_id, reported_at);

create table map_reports (
  id          uuid primary key default gen_random_uuid(),
  type        report_type not null,
  geo         geography(Point, 4326) not null,
  reported_by uuid references auth.users(id) on delete set null,
  confidence  numeric(4,3) not null default 1.0,
  votes       int not null default 0,
  comment     text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '2 hours'
);
create index map_reports_geo_idx on map_reports using gist (geo);
create index map_reports_expiry_idx on map_reports(expires_at);

-- ── Zaproszenia i audyt ─────────────────────────────────────────────
create table invites (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  email       text,
  phone       text,
  vehicle_id  uuid references vehicles(id) on delete set null,
  role        role not null default 'driver',
  token_hash  text not null,
  expires_at  timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);
create index invites_company_idx on invites(company_id);

create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references companies(id) on delete cascade,
  actor_id    uuid references auth.users(id) on delete set null,
  action      text not null,
  target      text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_company_idx on audit_log(company_id, created_at);
