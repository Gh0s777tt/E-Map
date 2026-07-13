-- #308: Oceny i udogodnienia parkingów TIR (dane społecznościowe, roadmapa Faza 3).
-- Jedna ocena użytkownika na parking (upsert po user_id+poi_id); odczyt wspólny
-- dla wszystkich zalogowanych (jak map_reports), zapis/edycja tylko własnych.

create table if not exists public.parking_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  poi_id text not null,
  poi_name text,
  lat double precision,
  lng double precision,
  rating smallint not null check (rating between 1 and 5),
  has_shower boolean not null default false,
  has_wc boolean not null default false,
  has_food boolean not null default false,
  security boolean not null default false,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, poi_id)
);

create index if not exists parking_reviews_poi_idx on public.parking_reviews (poi_id);

alter table public.parking_reviews enable row level security;

-- Dane społecznościowe: każdy zalogowany widzi wszystkie oceny.
create policy parking_reviews_select on public.parking_reviews
  for select to authenticated using (true);

create policy parking_reviews_insert on public.parking_reviews
  for insert to authenticated with check (auth.uid() = user_id);

create policy parking_reviews_update on public.parking_reviews
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy parking_reviews_delete on public.parking_reviews
  for delete to authenticated using (auth.uid() = user_id);
