-- ════════════════════════════════════════════════════════════════════
--  0075 · #324 Pozycje kierowców live (telematyka, fala 1)
--  Jedna AKTUALNA pozycja per kierowca (upsert po user_id) — bez historii
--  (historia tras = przyszła fala / PowerSync). Kierowca udostępnia pozycję
--  DOBROWOLNIE (przełącznik w Ustawieniach aplikacji); wyłączenie = delete.
--  Odczyt: członkowie firmy (mapa web pokazuje auta na żywo).
-- ════════════════════════════════════════════════════════════════════

create table if not exists driver_positions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  speed_kmh numeric,
  heading numeric,
  updated_at timestamptz not null default now()
);

create index if not exists driver_positions_company_idx on driver_positions(company_id, updated_at desc);

alter table driver_positions enable row level security;

-- Odczyt: aktywni członkowie firmy.
drop policy if exists driver_positions_select on driver_positions;
create policy driver_positions_select on driver_positions for select to authenticated
  using (is_member_of(company_id));

-- Zapis/aktualizacja/kasowanie: wyłącznie własny wiersz, w firmie, której jest się członkiem.
drop policy if exists driver_positions_insert on driver_positions;
create policy driver_positions_insert on driver_positions for insert to authenticated
  with check (user_id = auth.uid() and is_member_of(company_id));

drop policy if exists driver_positions_update on driver_positions;
create policy driver_positions_update on driver_positions for update to authenticated
  using (user_id = auth.uid());

drop policy if exists driver_positions_delete on driver_positions;
create policy driver_positions_delete on driver_positions for delete to authenticated
  using (user_id = auth.uid());
