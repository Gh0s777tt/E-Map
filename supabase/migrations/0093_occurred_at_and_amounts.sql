-- [#373] Data zdarzenia + rozbicie kwoty na walutę, netto, VAT i brutto.
--
-- Dwie zmiany w jednej migracji świadomie: obie dotykają tego samego schematu
-- formularza paliwa, tej samej kolejki offline i tych samych buildów mobile,
-- które klienci mają już w telefonach. Dwie osobne migracje to dwa razy więcej
-- okazji, żeby wpis z telefonu przepadł po drodze.

-- ---------------------------------------------------------------------------
-- 1. `occurred_at` — kiedy się WYDARZYŁO, nie kiedy zapisano
-- ---------------------------------------------------------------------------
-- Dotąd datą zdarzenia było `created_at` z `default now()`, a formularze nie
-- miały pola daty. Kolejka offline trzyma `createdAt` lokalnie i NIGDY go nie
-- wysyła — tankowanie zrobione w terenie i zsynchronizowane trzy dni później
-- wpadało do złego miesiąca i cicho psuło zestawienie.
alter table public.fuel_logs   add column if not exists occurred_at timestamptz;
alter table public.adblue_logs add column if not exists occurred_at timestamptz;
alter table public.trip_events add column if not exists occurred_at timestamptz;

-- Backfill: dla danych historycznych „kiedy zapisano" to najlepsze przybliżenie
-- „kiedy się wydarzyło", jakie mamy. Po tym kroku przełączenie raportów na
-- `occurred_at` nie zmienia ani jednej liczby — a to jest cel.
update public.fuel_logs   set occurred_at = created_at where occurred_at is null;
update public.adblue_logs set occurred_at = created_at where occurred_at is null;
update public.trip_events set occurred_at = created_at where occurred_at is null;

alter table public.fuel_logs   alter column occurred_at set not null;
alter table public.adblue_logs alter column occurred_at set not null;
alter table public.trip_events alter column occurred_at set not null;

-- Stare buildy w sklepach nie wysyłają tego pola — musi mieć wartość domyślną,
-- inaczej ich INSERT-y zaczną się wywracać w dniu wdrożenia.
alter table public.fuel_logs   alter column occurred_at set default now();
alter table public.adblue_logs alter column occurred_at set default now();
alter table public.trip_events alter column occurred_at set default now();

comment on column public.fuel_logs.occurred_at is
  'Kiedy tankowanie faktycznie miało miejsce. Raporty liczą po TYM polu, nie po created_at.';

-- Raporty filtrują po zakresie dat w obrębie firmy.
create index if not exists fuel_logs_company_occurred_idx
  on public.fuel_logs (company_id, occurred_at desc);
create index if not exists adblue_logs_company_occurred_idx
  on public.adblue_logs (company_id, occurred_at desc);
create index if not exists trip_events_company_occurred_idx
  on public.trip_events (company_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- 2. Waluta i rozbicie kwoty
-- ---------------------------------------------------------------------------
-- `price_total` istnieje od początku i ZAWSZE oznaczał kwotę zapłaconą, czyli
-- BRUTTO. Świadomie go NIE zmieniamy nazwy: robi to ponad trzydzieści miejsc
-- w kodzie i wszystkie buildy mobile w sklepach. Dokładamy obok brakujące części.
alter table public.fuel_logs
  add column if not exists currency text not null default 'EUR',
  add column if not exists price_net numeric(10, 2),
  add column if not exists vat_rate numeric(5, 2),
  add column if not exists vat_amount numeric(10, 2);

alter table public.adblue_logs
  add column if not exists currency text not null default 'EUR',
  add column if not exists price_net numeric(10, 2),
  add column if not exists vat_rate numeric(5, 2),
  add column if not exists vat_amount numeric(10, 2);

comment on column public.fuel_logs.price_total is
  'Kwota zapłacona = BRUTTO, w walucie `currency`. Netto i VAT w price_net / vat_amount.';
comment on column public.fuel_logs.currency is
  'ISO 4217. Domyślnie EUR — zgodnie z założeniem, na którym opierał się dotychczasowy kod.';

-- Waluta musi być kodem ISO, inaczej `fx_rates` nigdy nie dopasuje kursu
-- i kwota po cichu wypadnie z każdej sumy.
alter table public.fuel_logs   drop constraint if exists fuel_logs_currency_chk;
alter table public.fuel_logs   add constraint fuel_logs_currency_chk
  check (currency ~ '^[A-Z]{3}$');
alter table public.adblue_logs drop constraint if exists adblue_logs_currency_chk;
alter table public.adblue_logs add constraint adblue_logs_currency_chk
  check (currency ~ '^[A-Z]{3}$');

-- Kwoty nie mogą być ujemne. Celowo NIE wymuszamy tu `netto + VAT = brutto`:
-- kierowca na stacji podaje samo brutto, a netto i VAT dolicza się dopiero, gdy
-- znamy stawkę kraju. Sprawdzanie sumy na poziomie bazy odrzucałoby poprawne
-- wpisy w trakcie uzupełniania.
alter table public.fuel_logs   drop constraint if exists fuel_logs_amounts_chk;
alter table public.fuel_logs   add constraint fuel_logs_amounts_chk
  check (
    (price_total is null or price_total >= 0)
    and (price_net is null or price_net >= 0)
    and (vat_amount is null or vat_amount >= 0)
    and (vat_rate is null or (vat_rate >= 0 and vat_rate <= 100))
  );
alter table public.adblue_logs drop constraint if exists adblue_logs_amounts_chk;
alter table public.adblue_logs add constraint adblue_logs_amounts_chk
  check (
    (price_total is null or price_total >= 0)
    and (price_net is null or price_net >= 0)
    and (vat_amount is null or vat_amount >= 0)
    and (vat_rate is null or (vat_rate >= 0 and vat_rate <= 100))
  );
