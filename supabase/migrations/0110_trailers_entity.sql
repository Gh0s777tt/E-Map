-- [#405] Naczepa jako osobna encja, nie dwa pola przyklejone do ciągnika.
--
-- STAN DOTYCHCZASOWY (migracja 0055): `vehicles.trailer_registration` i
-- `vehicles.trailer_type` — dwa pola tekstowe w kartotece ciągnika. To działało
-- jako notatka, ale zakładało coś, co w transporcie nie jest prawdą: że naczepa
-- należy do ciągnika na stałe.
--
-- Co przez to nie działało:
--
--   • Naczepa ma WŁASNE terminy — przegląd techniczny i ubezpieczenie. Jako pole
--     tekstowe nie miała gdzie ich trzymać, więc nie wchodziły do przypomnień.
--     Naczepa po przeglądzie zatrzymuje zestaw tak samo skutecznie jak ciągnik.
--   • Ciągnik WYMIENIA naczepy. Przepięcie oznaczało nadpisanie tekstu i utratę
--     informacji, że poprzednia w ogóle istniała.
--   • Naczepa ma własne gabaryty i liczbę osi — a to one, nie ciągnik, decydują
--     o wysokości i długości zestawu, czyli o tym, co idzie do routingu.
--   • Nie dało się mieć naczepy odstawionej — bez ciągnika nie istniała w systemie.
--
-- CO ROBIMY: osobna tabela `trailers` należąca do FIRMY, plus `vehicles.trailer_id`
-- jako „naczepa aktualnie podpięta". Zestaw powstaje z pary, a nie z jednego wiersza.
--
-- ZGODNOŚĆ WSTECZNA. Kolumny `trailer_registration`/`trailer_type` ZOSTAJĄ i nadal
-- są zapisywane. Powód jest konkretny, nie ostrożnościowy: w sklepach są buildy
-- aplikacji mobilnej, które o tabeli `trailers` nie wiedzą i czytają te pola.
-- Usunięcie ich teraz zepsułoby kartotekę pojazdu każdemu, kto nie zaktualizował
-- aplikacji. Znikną, gdy najstarszy wspierany build będzie je już ignorował.

create table if not exists public.trailers (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  registration  text not null,
  trailer_type  text,
  vin           text,
  year          integer,
  -- Terminy — powód, dla którego ta tabela w ogóle powstaje.
  inspection_expiry date,
  insurance_expiry  date,
  leasing_end       date,
  insurer           text,
  -- Gabaryty naczepy: to one wyznaczają wysokość i długość ZESTAWU.
  height_cm     integer,
  width_cm      integer,
  length_cm     integer,
  curb_weight_kg integer,
  max_payload_kg integer,
  axle_count    integer,
  note          text,
  created_at    timestamptz not null default now(),

  -- Rejestracja unikalna W OBRĘBIE FIRMY, nie globalnie: dwie firmy mogą mieć
  -- naczepy o tej samej rejestracji (np. po odsprzedaży), a globalna unikalność
  -- zablokowałaby drugiej wpisanie własnego sprzętu.
  constraint trailers_reg_per_company unique (company_id, registration),
  constraint trailers_axles_range check (axle_count is null or axle_count between 1 and 6),
  constraint trailers_year_range check (year is null or year between 1950 and 2100)
);

create index if not exists idx_trailers_company on public.trailers (company_id, registration);

-- „Naczepa aktualnie podpięta". `on delete set null`: skasowanie naczepy nie może
-- skasować ciągnika ani go zablokować — zestaw się rozpina, auto zostaje.
alter table public.vehicles add column if not exists trailer_id uuid
  references public.trailers (id) on delete set null;
create index if not exists idx_vehicles_trailer_id on public.vehicles (trailer_id);

alter table public.trailers enable row level security;

drop policy if exists trailers_select on public.trailers;
create policy trailers_select on public.trailers
  for select to authenticated
  using (public.is_member_of(company_id));

-- Zapis: zarząd. `WITH CHECK` powtarza warunek przynależności — reguła 7
-- z docs/SECURITY-RLS.md, wprowadzona po trzykrotnym wystąpieniu tego błędu.
drop policy if exists trailers_write on public.trailers;
create policy trailers_write on public.trailers
  for all to authenticated
  using (public.has_role(company_id, array['owner', 'dispatcher']::role[]))
  with check (public.has_role(company_id, array['owner', 'dispatcher']::role[]));

-- ── Przeniesienie tego, co już wpisano ──────────────────────────────────────
--
-- Każda niepusta `trailer_registration` staje się wierszem w `trailers`, a ciągnik
-- dostaje do niej wskazanie. Bez tego kroku właściciel musiałby przepisać ręcznie
-- to, co już raz wpisał — a to najpewniejszy sposób, żeby funkcja została pusta.
--
-- `on conflict do nothing`: dwa ciągniki mogą mieć wpisaną tę samą naczepę
-- (przepięcie zanotowane w obu kartotekach). Powstaje wtedy JEDEN wiersz naczepy,
-- a wskazanie dostają oba pojazdy — co jest stanem bliższym prawdzie niż duplikat.
insert into public.trailers (company_id, registration, trailer_type)
select distinct v.company_id, trim(v.trailer_registration), nullif(trim(v.trailer_type), '')
from public.vehicles v
where v.trailer_registration is not null and trim(v.trailer_registration) <> ''
on conflict (company_id, registration) do nothing;

update public.vehicles v
set trailer_id = t.id
from public.trailers t
where t.company_id = v.company_id
  and t.registration = trim(v.trailer_registration)
  and v.trailer_id is null;

comment on table public.trailers is
  '[#405] Naczepy firmy — wlasne terminy, gabaryty i osie. Ciagnik wskazuje aktualna przez vehicles.trailer_id.';
comment on column public.vehicles.trailer_id is
  '[#405] Naczepa aktualnie podpieta. Kolumny trailer_registration/trailer_type zostaja dla starszych buildow mobilnych.';
