-- 0058: kierowca jako encja w HR (#271) — wypłaty/diety/czas pracy dostają
-- `driver_id` (FK do kartoteki) obok historycznego `driver_name` (tekst wolny,
-- podatny na literówki i duplikaty). Backfill po znormalizowanej nazwie w obrębie
-- firmy; wpisy bez dopasowania zostają z samym driver_name (korekta ręczna w UI).

alter table driver_payouts    add column if not exists driver_id uuid references drivers(id) on delete set null;
alter table per_diem_trips    add column if not exists driver_id uuid references drivers(id) on delete set null;
alter table work_time_entries add column if not exists driver_id uuid references drivers(id) on delete set null;

create index if not exists driver_payouts_driver_idx    on driver_payouts(driver_id);
create index if not exists per_diem_trips_driver_idx    on per_diem_trips(driver_id);
create index if not exists work_time_entries_driver_idx on work_time_entries(driver_id);

-- Backfill: PII kierowców jest zaszyfrowane (pgp_sym, klucz _card_key jak w
-- list_drivers) — deszyfrujemy w locie, dopasowanie po znormalizowanej nazwie
-- w tej samej firmie i TYLKO gdy jednoznaczne (1 kierowca o tej nazwie).
do $$
declare t text;
begin
  foreach t in array array['driver_payouts','per_diem_trips','work_time_entries'] loop
    execute format($f$
      update %I x set driver_id = m.id
      from (
        select company_id, full_name, min(id::text)::uuid as id, count(*) as cnt
        from (
          select d.id, d.company_id,
                 lower(btrim(
                   coalesce(case when d.first_name_enc is not null
                     then pgp_sym_decrypt(d.first_name_enc, public._card_key()) end, '') || ' ' ||
                   coalesce(case when d.last_name_enc is not null
                     then pgp_sym_decrypt(d.last_name_enc, public._card_key()) end, '')
                 )) as full_name
          from drivers d
        ) names
        group by 1, 2
      ) m
      where x.driver_id is null
        and x.company_id = m.company_id
        and m.cnt = 1
        and m.full_name <> ''
        and lower(btrim(coalesce(x.driver_name, ''))) = m.full_name
    $f$, t);
  end loop;
end $$;
