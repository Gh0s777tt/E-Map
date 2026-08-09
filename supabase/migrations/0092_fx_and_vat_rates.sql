-- [#373] Fundament finansowy: kursy walut i stawki VAT per kraj.
--
-- POWÓD: osiem pozycji ze statystyk (netto/brutto na litr, przeliczanie walut,
-- zwrot VAT, sumy per pojazd w wielu walutach, P&L, koszty, rozliczenia) jest
-- dziś NIEWYKONALNYCH. Jedyne kursy w repo to hardcode dla myta w
-- `packages/maps/src/here.ts` (nieaktualizowany) i kursy pobierane na żywo
-- w `/api/fuel-eu`, które nigdzie nie są zapisywane. Jedenaście miejsc w kodzie
-- cicho odrzuca wszystko, co nie jest EUR — koszt w PLN po prostu znika z sumy.
--
-- To dane REFERENCYJNE, wspólne dla wszystkich firm — nie podlegają multi-tenant.
-- Zapis wyłącznie przez `service_role` (cron), odczyt dla zalogowanych.

-- ---------------------------------------------------------------------------
-- 1. Kursy walut
-- ---------------------------------------------------------------------------
-- KIERUNEK KURSU JEST CZĘŚCIĄ KONTRAKTU I MUSI BYĆ JEDNOZNACZNY.
-- `units_per_eur` = ile jednostek waluty kosztuje 1 EUR (np. PLN ≈ 4.30).
-- Tak właśnie publikuje EBC, więc przy imporcie nie ma żadnej inwersji — a każda
-- inwersja to okazja do cichego odwrócenia kursu, którego nikt nie zauważy,
-- dopóki ktoś nie policzy zwrotu VAT.
--   kwota_w_EUR = kwota / units_per_eur
create table if not exists public.fx_rates (
  -- Dzień notowania. Przeliczamy po kursie z DNIA ZDARZENIA, nie z dzisiaj —
  -- to wymóg księgowy, a nie preferencja.
  as_of date not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  units_per_eur numeric(18, 8) not null check (units_per_eur > 0),
  source text not null default 'ecb',
  fetched_at timestamptz not null default now(),
  primary key (as_of, currency)
);

comment on column public.fx_rates.units_per_eur is
  'Ile jednostek tej waluty kosztuje 1 EUR (format EBC). kwota_EUR = kwota / units_per_eur.';

-- Odczyt niemal zawsze brzmi „najświeższy kurs waluty X nie nowszy niż dzień D".
create index if not exists fx_rates_currency_date_idx
  on public.fx_rates (currency, as_of desc);

alter table public.fx_rates enable row level security;

drop policy if exists fx_rates_select on public.fx_rates;
create policy fx_rates_select on public.fx_rates
  for select to authenticated using (true);
-- Brak polityk INSERT/UPDATE/DELETE = zapis tylko przez `service_role`,
-- które omija RLS. Kursy uzupełnia cron, nigdy klient.

-- EUR jako sam siebie — pozwala liczyć bez rozgałęziania „jeśli waluta = EUR".
insert into public.fx_rates (as_of, currency, units_per_eur, source)
values ('2000-01-01', 'EUR', 1, 'stała')
on conflict (as_of, currency) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Stawki VAT per kraj
-- ---------------------------------------------------------------------------
-- Dziś istnieje wyłącznie `companies.default_vat_rate` — jedna stawka firmowa
-- do faktur sprzedaży. Do zwrotu VAT za paliwo zagraniczne potrzebna jest stawka
-- KRAJU TANKOWANIA; źródło kraju już mamy w `fuel_logs.station_country`.
--
-- `valid_from` jest obowiązkowe, a nie ozdobne: stawki się zmieniają, a wniosek
-- o zwrot dotyczy okresu historycznego i musi użyć stawki z tamtego czasu.
create table if not exists public.vat_rates (
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  valid_from date not null,
  rate numeric(5, 2) not null check (rate >= 0 and rate <= 100),
  -- Czy kraj zwraca VAT od paliwa dla przewoźników zagranicznych. Nie wszystkie
  -- zwracają i nie od wszystkiego — bez tej flagi zwrot byłby liczony zawyżony.
  fuel_refundable boolean not null default true,
  note text,
  primary key (country_code, valid_from)
);

comment on table public.vat_rates is
  'Podstawowe stawki VAT per kraj, wersjonowane od `valid_from`. Do zwrotu VAT za paliwo.';

alter table public.vat_rates enable row level security;

drop policy if exists vat_rates_select on public.vat_rates;
create policy vat_rates_select on public.vat_rates
  for select to authenticated using (true);

-- Seed: stawki podstawowe UE + kraje tranzytowe, stan na 2026-01-01.
-- `fuel_refundable = false` tam, gdzie odzyskanie VAT od paliwa przez przewoźnika
-- zagranicznego jest wyłączone lub mocno ograniczone.
insert into public.vat_rates (country_code, valid_from, rate, fuel_refundable, note) values
  ('PL', '2026-01-01', 23.00, true,  'Polska'),
  ('DE', '2026-01-01', 19.00, true,  'Niemcy'),
  ('CZ', '2026-01-01', 21.00, true,  'Czechy'),
  ('SK', '2026-01-01', 23.00, true,  'Słowacja'),
  ('AT', '2026-01-01', 20.00, true,  'Austria'),
  ('HU', '2026-01-01', 27.00, true,  'Węgry'),
  ('SI', '2026-01-01', 22.00, true,  'Słowenia'),
  ('HR', '2026-01-01', 25.00, true,  'Chorwacja'),
  ('RO', '2026-01-01', 19.00, true,  'Rumunia'),
  ('BG', '2026-01-01', 20.00, true,  'Bułgaria'),
  ('NL', '2026-01-01', 21.00, true,  'Holandia'),
  ('BE', '2026-01-01', 21.00, true,  'Belgia'),
  ('LU', '2026-01-01', 17.00, true,  'Luksemburg'),
  ('FR', '2026-01-01', 20.00, true,  'Francja'),
  ('ES', '2026-01-01', 21.00, true,  'Hiszpania'),
  ('PT', '2026-01-01', 23.00, true,  'Portugalia'),
  ('IT', '2026-01-01', 22.00, true,  'Włochy'),
  ('DK', '2026-01-01', 25.00, true,  'Dania'),
  ('SE', '2026-01-01', 25.00, true,  'Szwecja'),
  ('FI', '2026-01-01', 25.50, true,  'Finlandia'),
  ('EE', '2026-01-01', 24.00, true,  'Estonia'),
  ('LV', '2026-01-01', 21.00, true,  'Łotwa'),
  ('LT', '2026-01-01', 21.00, true,  'Litwa'),
  ('IE', '2026-01-01', 23.00, true,  'Irlandia'),
  ('GR', '2026-01-01', 24.00, true,  'Grecja'),
  ('GB', '2026-01-01', 20.00, false, 'Wielka Brytania — poza UE, zwrot poza procedurą unijną'),
  ('CH', '2026-01-01',  8.10, false, 'Szwajcaria — poza UE'),
  ('NO', '2026-01-01', 25.00, false, 'Norwegia — poza UE')
on conflict (country_code, valid_from) do nothing;
