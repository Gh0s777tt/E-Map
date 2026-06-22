-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0045 · Zapisane miejsca (POI firmy)
--  Ulubione punkty floty: stacje paliw, porty, odprawy celne, firmy,
--  parkingi… Współdzielone w firmie — klik na mapie ustawia/dodaje punkt
--  do trasy. Zastępuje lokalny localStorage (per-urządzenie) trwałym,
--  współdzielonym rejestrem.
--  RLS: członek czyta i dodaje; kasowanie — autor lub owner/dispatcher.
-- ════════════════════════════════════════════════════════════════════

create table if not exists saved_places (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null,
  category    text not null default 'other',
  lat         double precision not null,
  lng         double precision not null,
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists saved_places_company_idx on saved_places(company_id, name);

alter table saved_places enable row level security;

drop policy if exists saved_places_select on saved_places;
create policy saved_places_select on saved_places for select to authenticated
  using (public.is_member_of(company_id));

-- Dodawanie: każdy aktywny członek (kierowca też zapisuje przydatne punkty).
drop policy if exists saved_places_insert on saved_places;
create policy saved_places_insert on saved_places for insert to authenticated
  with check (public.is_member_of(company_id));

-- Kasowanie: autor lub owner/dispatcher.
drop policy if exists saved_places_delete on saved_places;
create policy saved_places_delete on saved_places for delete to authenticated
  using (
    created_by = auth.uid()
    or public.has_role(company_id, array['owner','dispatcher']::role[])
  );
