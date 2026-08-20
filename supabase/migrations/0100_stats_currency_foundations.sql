-- [#378] Fundament walutowy pod statystyki (Faza 7).
--
-- Trzy dziury znalezione przy mapowaniu podsystemu statystyk. Każda z nich
-- osobno wygląda niewinnie, a razem powodują, że kwota w innej walucie niż euro
-- albo jest doliczana jak euro (zawyżenie ~4,3× przy złotówce), albo po cichu
-- wypada z sumy. Statystyki bez tego byłyby ładniejsze, ale nadal nieprawdziwe.

-- ── 1. trip_events: kwota bez waluty ────────────────────────────────
--
-- `trip_events.amount` istnieje od dawna i trzyma koszt zdarzenia (serwis,
-- myto, inne), ale kolumny `currency` nigdy nie dostał — migracja 0093 dodała
-- ją tylko do fuel_logs i adblue_logs. Dopóki tego nie ma, wymaganie „zdarzenia
-- Trip w statystykach" oznacza dokładnie ten sam błąd, który właśnie naprawiamy
-- gdzie indziej: 1200 PLN policzone jako 1200 €.
--
-- Default 'EUR' jest zgodny z tym, co system zakładał dotąd milcząco, więc
-- istniejące wiersze nie zmieniają znaczenia. CHECK jak w 0093: bez formatu
-- ISO 4217 tabela `fx_rates` nigdy nie dopasuje kursu.
alter table public.trip_events
  add column if not exists currency text not null default 'EUR';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trip_events_currency_iso'
  ) then
    alter table public.trip_events
      add constraint trip_events_currency_iso check (currency ~ '^[A-Z]{3}$');
  end if;
end $$;

comment on column public.trip_events.currency is
  '[#378] Waluta pola `amount` (ISO 4217). Bez niej kwota jest liczbą bez jednostki.';

-- ── 2. Waluty bez walidacji formatu ─────────────────────────────────
--
-- `vehicle_costs.currency` i `orders.currency` są NOT NULL z defaultem 'EUR',
-- ale — w odróżnieniu od tabel Fazy 6 — nie mają CHECK-a na format. Wpis „zł",
-- „euro" albo „PLN " (ze spacją) przechodzi, a potem nie dopasuje się do
-- żadnego kursu i kwota wypadnie z zestawienia bez komunikatu.
--
-- Najpierw porządkujemy to, co już jest, potem zakładamy bramkę — odwrotna
-- kolejność wywaliłaby migrację na pierwszym brudnym wierszu.
update public.vehicle_costs
   set currency = upper(btrim(currency))
 where currency is distinct from upper(btrim(currency));
update public.orders
   set currency = upper(btrim(currency))
 where currency is distinct from upper(btrim(currency));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'vehicle_costs_currency_iso')
     and not exists (select 1 from public.vehicle_costs where currency !~ '^[A-Z]{3}$') then
    alter table public.vehicle_costs
      add constraint vehicle_costs_currency_iso check (currency ~ '^[A-Z]{3}$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'orders_currency_iso')
     and not exists (select 1 from public.orders where currency !~ '^[A-Z]{3}$') then
    alter table public.orders
      add constraint orders_currency_iso check (currency ~ '^[A-Z]{3}$');
  end if;
end $$;

-- ── 3. Indeks pod zwrot VAT ─────────────────────────────────────────
--
-- Zwrot VAT liczy się per kraj tankowania: „ile zapłaciliśmy podatku w Niemczech
-- w drugim kwartale". Bez tego indeksu każde takie pytanie to pełny skan tabeli
-- tankowań firmy.
create index if not exists fuel_logs_company_country_idx
  on public.fuel_logs (company_id, station_country, occurred_at desc);
create index if not exists adblue_logs_company_country_idx
  on public.adblue_logs (company_id, station_country, occurred_at desc);
