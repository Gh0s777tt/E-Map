-- 0057: parametry rozliczenia miesięcznego kierowcy per FIRMA (#265).
-- Każdy właściciel ustala własną normę i stawki (wartości domyślne to tylko seed
-- przykładowy z wzorcowego formularza). Czyta każdy członek (kierowca może
-- zweryfikować swoje rozliczenie), zapisuje wyłącznie owner.

create table if not exists company_settlement_settings (
  company_id uuid primary key references companies(id) on delete cascade,
  daily_rate numeric not null default 250,          -- stawka dzienna [zł/dzień]
  km_norm_per_day numeric not null default 555.5,   -- norma km na dzień (premia liczona od nadwyżki)
  km_rate numeric not null default 0.45,            -- stawka za km nadwyżki [zł/km]
  insurance_per_day numeric not null default 75,    -- dodatek ubezpieczeniowy [zł/dzień]
  phone_monthly numeric not null default 200,       -- ryczałt telefoniczny [zł/30 dni]
  doc_bonus_monthly numeric not null default 1500,  -- premia dokumentacja/bezszkodowość/terminowość/paliwo [zł/30 dni]
  updated_at timestamptz not null default now()
);

alter table company_settlement_settings enable row level security;

drop policy if exists settlement_settings_select on company_settlement_settings;
create policy settlement_settings_select on company_settlement_settings
  for select using (is_member_of(company_id));

drop policy if exists settlement_settings_write on company_settlement_settings;
create policy settlement_settings_write on company_settlement_settings
  for all using (has_role(company_id, array['owner']::role[]))
  with check (has_role(company_id, array['owner']::role[]));
