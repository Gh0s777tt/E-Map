-- [#404] Linki firmowe — skróty, które właściciel definiuje dla swoich kierowców.
--
-- Po co to w ogóle. Kierowca w trasie potrzebuje kilku adresów, które nie należą
-- do tej aplikacji i nigdy nie będą: portal myta (viaTOLL, ASFINAG, Toll Collect),
-- rezerwacja promu, zgłoszenie szkody u ubezpieczyciela, awizacja u konkretnego
-- klienta. Dziś każdy przewoźnik rozwiązuje to tak samo — wysyła kierowcom link
-- na czacie albo dyktuje przez telefon, a kierowca przepisuje go z pamięci na
-- parkingu, w rękawicach, przy złym zasięgu.
--
-- To nie jest funkcja „ładna". To jest zdjęcie z kierowcy czynności, którą i tak
-- wykonuje, tylko gorzej.
--
-- Świadomie WĄSKI zakres, żeby nie zrobić z tego drugiego CMS-a:
--   • bez folderów i zagnieżdżeń — lista z ręczną kolejnością wystarcza przy
--     kilkunastu pozycjach, a kilkuset nikt tu nie doda,
--   • bez uprawnień per link — widoczność ma dwa stopnie (wszyscy / tylko zarząd),
--     bo trzeci stopień to już matryca uprawnień, a ta jest osobną decyzją (#393),
--   • bez śledzenia kliknięć — to skrót do cudzej strony, nie kampania.

create table if not exists public.company_links (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  label       text not null,
  url         text not null,
  -- Emoji albo krótki znak. Kierowca w kabinie szuka wzrokiem ikony, nie tekstu.
  icon        text,
  -- Krótkie wyjaśnienie „do czego to jest" — link do portalu myta bez podpisu
  -- „opłata za Austrię" niczego nie tłumaczy komuś, kto jedzie tam pierwszy raz.
  note        text,
  -- `false` = widzą wszyscy członkowie firmy; `true` = tylko owner/dispatcher.
  -- Dwa stopnie, bo trzeci wymagałby decyzji o matrycy uprawnień (patrz nagłówek).
  management_only boolean not null default false,
  -- Ręczna kolejność: właściciel układa najważniejsze na górze. Bez tego lista
  -- sortowałaby się po nazwie, a „ASFINAG" trafiałoby przed „viaTOLL" tylko
  -- dlatego, że alfabet.
  sort_order  integer not null default 0,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),

  -- URL musi wyglądać jak URL. To nie jest walidacja treści, tylko zabezpieczenie
  -- przed wpisaniem `javascript:...` albo `data:...` w polu, które aplikacja
  -- kierowcy otwiera jednym dotknięciem.
  constraint company_links_url_http check (url ~* '^https?://.+'),
  constraint company_links_label_len check (char_length(label) between 1 and 60)
);

create index if not exists idx_company_links_company on public.company_links (company_id, sort_order);
create index if not exists idx_company_links_created_by on public.company_links (created_by);

alter table public.company_links enable row level security;

-- Odczyt: członek firmy widzi linki ogólne; zarząd widzi wszystkie.
drop policy if exists company_links_select on public.company_links;
create policy company_links_select on public.company_links
  for select to authenticated
  using (
    public.is_member_of(company_id)
    and (
      management_only = false
      or public.has_role(company_id, array['owner', 'dispatcher']::role[])
    )
  );

-- Zapis: wyłącznie zarząd. `WITH CHECK` powtarza warunek przynależności —
-- reguła 7 z docs/SECURITY-RLS.md, wprowadzona po tym, jak ten sam błąd
-- wystąpił trzy razy (migracje 0094, 0101, 0103).
drop policy if exists company_links_write on public.company_links;
create policy company_links_write on public.company_links
  for all to authenticated
  using (public.has_role(company_id, array['owner', 'dispatcher']::role[]))
  with check (public.has_role(company_id, array['owner', 'dispatcher']::role[]));

comment on table public.company_links is
  '[#404] Skroty do stron zewnetrznych definiowane przez wlasciciela (myto, promy, ubezpieczyciel).';
comment on column public.company_links.management_only is
  '[#404] true = widoczne tylko dla owner/dispatcher; false = dla kazdego czlonka firmy.';
