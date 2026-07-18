-- 0081: terminy obowiązkowych sczytań tachografu (rozp. (UE) 581/2010).
-- KARTA KIEROWCY co ≤ 28 dni, JEDNOSTKA POJAZDOWA co ≤ 90 dni. Osobna tabela,
-- żeby nie zmieniać drivers/vehicles (istniejące strony bez zmian).
-- Owner/dyspozytor zarządza; członkowie firmy czytają (silnik statusu w core: checkDownloads).

create table if not exists tacho_downloads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  kind text not null check (kind in ('card', 'vu')),
  driver_id uuid references drivers(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete cascade,
  last_download date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- karta → driver_id; vu → vehicle_id (dokładnie jeden podmiot wg kind)
  constraint tacho_downloads_subject check (
    (kind = 'card' and driver_id is not null and vehicle_id is null)
    or (kind = 'vu' and vehicle_id is not null and driver_id is null)
  )
);

-- jedna aktualna data na podmiot w firmie
create unique index if not exists tacho_downloads_card_uidx
  on tacho_downloads (company_id, driver_id)
  where kind = 'card';
create unique index if not exists tacho_downloads_vu_uidx
  on tacho_downloads (company_id, vehicle_id)
  where kind = 'vu';
create index if not exists tacho_downloads_company_idx on tacho_downloads (company_id);

alter table tacho_downloads enable row level security;

drop policy if exists tacho_downloads_select on tacho_downloads;
create policy tacho_downloads_select on tacho_downloads for select to authenticated
  using (is_member_of(company_id));

drop policy if exists tacho_downloads_write on tacho_downloads;
create policy tacho_downloads_write on tacho_downloads for all to authenticated
  using (has_role(company_id, array['owner', 'dispatcher']::role[]))
  with check (has_role(company_id, array['owner', 'dispatcher']::role[]));
