-- [#375] Kraj jako kod ISO 3166-1 alpha-2 — normalizacja po stronie bazy.
--
-- Dlaczego w bazie, skoro walidacja jest już w Zod (packages/core/src/schemas.ts):
-- buildy mobile leżące w sklepach nie mają nowego schematu i nadal wysyłają wolny
-- tekst. Baza jest ostatnim miejscem, przez które przechodzi każdy zapis, więc
-- to tutaj musi stać bramka — inaczej „10115 Berlin" (#372) wróci przy pierwszym
-- tankowaniu zrobionym na starej wersji aplikacji.
--
-- Trigger NORMALIZUJE, a nie odrzuca. Kierowca stoi przy dystrybutorze; blokada
-- zapisu z powodu literówki w nazwie kraju kosztowałaby go dokumentację tankowania,
-- a nas — wpis, którego już nikt nie odtworzy. Czego nie da się rozpoznać, zostaje
-- jak było; nowe wersje aplikacji nie wpuszczą tego już na wejściu.
--
-- Mapa aliasów jest bliźniacza z `COUNTRY_ALIASES` w packages/core/src/countries.ts
-- i pilnuje jej test parzystości `countries.sql.test.ts`.

create or replace function public.normalize_country(p_raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  with v as (
    select nullif(regexp_replace(upper(btrim(p_raw)), '\s+', ' ', 'g'), '') as val
  )
  select coalesce(
    -- 1) już poprawny kod ISO
    (select val from v where val in ('AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'GR', 'ES', 'NL', 'IE', 'IS', 'LT', 'LU', 'LV', 'MK', 'MT', 'MD', 'DE', 'NO', 'PL', 'PT', 'RU', 'RO', 'RS', 'SK', 'SI', 'CH', 'SE', 'TR', 'UA', 'HU', 'GB', 'IT', 'ME', 'XK')),
    -- 2) nazwa lub skrót, który potrafimy rozwinąć
    (select a.code from (values
    ('POLSKA', 'PL'),
    ('POLAND', 'PL'),
    ('POL', 'PL'),
    ('NIEMCY', 'DE'),
    ('GERMANY', 'DE'),
    ('DEUTSCHLAND', 'DE'),
    ('GER', 'DE'),
    ('DEU', 'DE'),
    ('CZECHY', 'CZ'),
    ('CZECHIA', 'CZ'),
    ('CZE', 'CZ'),
    ('SLOWACJA', 'SK'),
    ('SŁOWACJA', 'SK'),
    ('SLOVAKIA', 'SK'),
    ('SVK', 'SK'),
    ('FRANCJA', 'FR'),
    ('FRANCE', 'FR'),
    ('FRA', 'FR'),
    ('WLOCHY', 'IT'),
    ('WŁOCHY', 'IT'),
    ('ITALY', 'IT'),
    ('ITALIA', 'IT'),
    ('ITA', 'IT'),
    ('HISZPANIA', 'ES'),
    ('SPAIN', 'ES'),
    ('ESP', 'ES'),
    ('HOLANDIA', 'NL'),
    ('NETHERLANDS', 'NL'),
    ('NLD', 'NL'),
    ('BELGIA', 'BE'),
    ('BELGIUM', 'BE'),
    ('BEL', 'BE'),
    ('AUSTRIA', 'AT'),
    ('AUT', 'AT'),
    ('WEGRY', 'HU'),
    ('WĘGRY', 'HU'),
    ('HUNGARY', 'HU'),
    ('HUN', 'HU'),
    ('UK', 'GB'),
    ('GBR', 'GB'),
    ('ANGLIA', 'GB'),
    ('ENGLAND', 'GB'),
    ('GREAT BRITAIN', 'GB'),
    ('UNITED KINGDOM', 'GB'),
    ('DANIA', 'DK'),
    ('DENMARK', 'DK'),
    ('DNK', 'DK'),
    ('SZWECJA', 'SE'),
    ('SWEDEN', 'SE'),
    ('SWE', 'SE'),
    ('NORWEGIA', 'NO'),
    ('NORWAY', 'NO'),
    ('NOR', 'NO'),
    ('LITWA', 'LT'),
    ('LITHUANIA', 'LT'),
    ('LTU', 'LT'),
    ('LOTWA', 'LV'),
    ('ŁOTWA', 'LV'),
    ('LATVIA', 'LV'),
    ('LVA', 'LV'),
    ('UKRAINA', 'UA'),
    ('UKRAINE', 'UA'),
    ('UKR', 'UA'),
    ('RUMUNIA', 'RO'),
    ('ROMANIA', 'RO'),
    ('ROU', 'RO'),
    ('BULGARIA', 'BG'),
    ('BUŁGARIA', 'BG'),
    ('BGR', 'BG'),
    ('SZWAJCARIA', 'CH'),
    ('SWITZERLAND', 'CH'),
    ('CHE', 'CH'),
    ('SLOWENIA', 'SI'),
    ('SŁOWENIA', 'SI'),
    ('SLOVENIA', 'SI'),
    ('SVN', 'SI'),
    ('CHORWACJA', 'HR'),
    ('CROATIA', 'HR'),
    ('HRV', 'HR'),
    ('PORTUGALIA', 'PT'),
    ('PORTUGAL', 'PT'),
    ('PRT', 'PT'),
    ('FINLANDIA', 'FI'),
    ('FINLAND', 'FI'),
    ('FIN', 'FI'),
    ('ESTONIA', 'EE'),
    ('EST', 'EE'),
    ('IRLANDIA', 'IE'),
    ('IRELAND', 'IE'),
    ('IRL', 'IE'),
    ('LUKSEMBURG', 'LU'),
    ('LUXEMBOURG', 'LU'),
    ('LUX', 'LU'),
    ('GRECJA', 'GR'),
    ('GREECE', 'GR'),
    ('GRC', 'GR'),
    ('TURCJA', 'TR'),
    ('TURKEY', 'TR'),
    ('TUR', 'TR')
    ) as a(name, code), v where a.name = v.val)
  );
$$;

comment on function public.normalize_country(text) is
  '[#375] Wpis użytkownika -> kod ISO 3166-1 alpha-2. NULL, gdy nierozpoznany.';

-- Trigger generyczny: nazwa kolumny przychodzi argumentem, bo ta sama logika
-- obsługuje `station_country` (paliwo/AdBlue) i `country` (reszta formularzy).
create or replace function public.tg_normalize_country()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  col   text  := tg_argv[0];
  doc   jsonb := to_jsonb(new);
  raw   text  := doc ->> col;
  fixed text;
begin
  if raw is null then
    return new;
  end if;
  fixed := public.normalize_country(raw);
  if fixed is not null and fixed is distinct from raw then
    new := jsonb_populate_record(new, doc || jsonb_build_object(col, fixed));
  end if;
  return new;
end;
$$;

-- Postgres nadaje EXECUTE roli PUBLIC z automatu. Funkcja triggerowa nie ma
-- sensu wywoływana ręcznie, więc nie zostawiamy jej wystawionej.
revoke execute on function public.tg_normalize_country() from public;
grant execute on function public.normalize_country(text) to authenticated;

drop trigger if exists fuel_logs_country_normalize on public.fuel_logs;
create trigger fuel_logs_country_normalize
  before insert or update of station_country on public.fuel_logs
  for each row execute function public.tg_normalize_country('station_country');

drop trigger if exists adblue_logs_country_normalize on public.adblue_logs;
create trigger adblue_logs_country_normalize
  before insert or update of station_country on public.adblue_logs
  for each row execute function public.tg_normalize_country('station_country');

drop trigger if exists trip_events_country_normalize on public.trip_events;
create trigger trip_events_country_normalize
  before insert or update of country on public.trip_events
  for each row execute function public.tg_normalize_country('country');

drop trigger if exists pause_events_country_normalize on public.pause_events;
create trigger pause_events_country_normalize
  before insert or update of country on public.pause_events
  for each row execute function public.tg_normalize_country('country');

drop trigger if exists penalties_country_normalize on public.penalties;
create trigger penalties_country_normalize
  before insert or update of country on public.penalties
  for each row execute function public.tg_normalize_country('country');

drop trigger if exists route_extra_costs_country_normalize on public.route_extra_costs;
create trigger route_extra_costs_country_normalize
  before insert or update of country on public.route_extra_costs
  for each row execute function public.tg_normalize_country('country');

-- ── Dane historyczne ────────────────────────────────────────────────
update public.fuel_logs
   set station_country = public.normalize_country(station_country)
 where station_country is not null
   and public.normalize_country(station_country) is not null
   and public.normalize_country(station_country) <> station_country;
update public.adblue_logs
   set station_country = public.normalize_country(station_country)
 where station_country is not null
   and public.normalize_country(station_country) is not null
   and public.normalize_country(station_country) <> station_country;
update public.trip_events
   set country = public.normalize_country(country)
 where country is not null
   and public.normalize_country(country) is not null
   and public.normalize_country(country) <> country;
update public.pause_events
   set country = public.normalize_country(country)
 where country is not null
   and public.normalize_country(country) is not null
   and public.normalize_country(country) <> country;
update public.penalties
   set country = public.normalize_country(country)
 where country is not null
   and public.normalize_country(country) is not null
   and public.normalize_country(country) <> country;
update public.route_extra_costs
   set country = public.normalize_country(country)
 where country is not null
   and public.normalize_country(country) is not null
   and public.normalize_country(country) <> country;

-- Trzy wiersze, których żadna reguła nie rozwinie: geokoder (#372) wstawił do
-- pola „kraj" kod pocztowy z miejscowością. Rozpoznane po formacie kodu —
-- `69-100` to polski wzór `NN-NNN`, `8630 Veurne` to belgijskie Veurne.
update public.adblue_logs set station_country = 'PL'
 where station_country ~ '^\d{2}-\d{3}\s';
update public.adblue_logs set station_country = 'BE'
 where station_country = '8630 Veurne';
update public.fuel_logs set station_country = 'PL'
 where station_country ~ '^\d{2}-\d{3}\s';
