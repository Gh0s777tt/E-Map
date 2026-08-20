-- [#385] Kartoteka pojazdu: liczba osi, ADR i klasa emisji.
--
-- Routing pyta o te trzy rzeczy, a kartoteka ich nie miała — więc ekran mapy
-- podstawiał wartości domyślne ze stanu komponentu. Kierowca z pięcioosiowym
-- zestawem i kierowca z trzyosiową solówką dostawali tę samą trasę, bo obie
-- liczyły się „na pięć osi".
--
-- Trzy kolumny, trzy różne powody:
--
-- `axle_count` — HERE i TomTom biorą liczbę osi do wyliczenia opłat drogowych
--   i ograniczeń nacisku. Domyślne 5 zawyża myto solówce i zaniża je zestawowi
--   niskopodwoziowemu.
--
-- `adr_tunnel_code` — litera z pomarańczowej tablicy. Decyduje, przez które
--   tunele zestaw MOŻE przejechać. To warunek legalności przejazdu, nie
--   preferencja: kontrola przy wjeździe kończy się zawróceniem i mandatem.
--   NULL znaczy „ładunek zwykły", a nie „nie wiemy" — bo zestaw bez ADR to
--   normalny stan, nie brak danych.
--
-- `emission_class` — dziś nieużywana w routingu. Wchodzi teraz, bo bez niej
--   nie ruszy omijanie stref niskiej emisji, a dołożenie kolumny później
--   oznaczałoby drugą migrację i drugie przejście przez wszystkie formularze.
--
-- Wszystkie NULLABLE świadomie: istniejące pojazdy nie mają tych danych i nie
-- wolno ich zgadywać. Puste pole ma być WIDOCZNE na ekranie planowania trasy —
-- parametr wysłany „na oko" jest gorszy niż jego brak, bo wygląda tak samo
-- jak parametr prawdziwy.

alter table public.vehicles
  add column if not exists axle_count integer,
  add column if not exists adr_tunnel_code text,
  add column if not exists emission_class text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'vehicles_axle_count_range') then
    -- Dwie osie to minimum dla pojazdu drogowego, dwanaście z zapasem pokrywa
    -- zestawy niskopodwoziowe. Granice mają odsiewać literówki, nie realne auta.
    alter table public.vehicles
      add constraint vehicles_axle_count_range
      check (axle_count is null or (axle_count between 2 and 12));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'vehicles_adr_tunnel_code_valid') then
    alter table public.vehicles
      add constraint vehicles_adr_tunnel_code_valid
      check (adr_tunnel_code is null or adr_tunnel_code in ('B', 'C', 'D', 'E'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'vehicles_emission_class_valid') then
    alter table public.vehicles
      add constraint vehicles_emission_class_valid
      check (emission_class is null or emission_class in ('euro3', 'euro4', 'euro5', 'euro6'));
  end if;
end $$;

comment on column public.vehicles.axle_count is
  '[#385] Liczba osi — wchodzi do routingu (myto, naciski). NULL = nie podano.';
comment on column public.vehicles.adr_tunnel_code is
  '[#385] Kategoria tunelowa ADR (B-E). NULL = ladunek zwykly, nie brak danych.';
comment on column public.vehicles.emission_class is
  '[#385] Klasa emisji Euro — pod strefy niskiej emisji. NULL = nie podano.';
