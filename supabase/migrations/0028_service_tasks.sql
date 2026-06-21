-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0028 · Plan serwisowy wg przebiegu (interwały km/miesiące)
--  Zadania serwisowe pojazdu (olej, opony, filtry…) z interwałem km i/lub
--  miesięcznym. „Wymagane", gdy bieżący przebieg ≥ ostatni_serwis_km + interwał.
--  Przypomnienia km-owe dołączone do generate_expiry_notifications (dedup po
--  docelowym przebiegu → jeden alert na cykl, do czasu „wykonano").
-- ════════════════════════════════════════════════════════════════════

create table if not exists service_tasks (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  vehicle_id      uuid not null references vehicles(id) on delete cascade,
  name            text not null,
  interval_km     integer,
  interval_months integer,
  last_done_km    integer,
  last_done_date  date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists service_tasks_company_idx on service_tasks(company_id);
create index if not exists service_tasks_vehicle_idx on service_tasks(vehicle_id);

drop trigger if exists service_tasks_updated_at on service_tasks;
create trigger service_tasks_updated_at before update on service_tasks
  for each row execute function set_updated_at();

alter table service_tasks enable row level security;

drop policy if exists service_tasks_select on service_tasks;
create policy service_tasks_select on service_tasks for select to authenticated
  using (public.is_member_of(company_id));

drop policy if exists service_tasks_write on service_tasks;
create policy service_tasks_write on service_tasks for all to authenticated
  using (public.has_role(company_id, array['owner','dispatcher']::role[]))
  with check (public.has_role(company_id, array['owner','dispatcher']::role[]));

-- ── generate_expiry_notifications: + blok serwisu (km) ──────────────
create or replace function public.generate_expiry_notifications(p_company uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare horizon date := current_date + 30;
begin
  if not public.has_role(p_company, array['owner','dispatcher']::role[]) then
    return;
  end if;

  -- Pojazdy: przegląd / OC / leasing
  insert into notifications (company_id, user_id, type, title, body, severity, dedup_key)
  select p_company, mgr.user_id, 'vehicle_expiry',
         'Termin pojazdu ' || v.registration,
         d.label || ': ' || to_char(d.due, 'YYYY-MM-DD'),
         case when d.due < current_date then 'danger' else 'warning' end,
         'veh:' || v.id || ':' || d.kind || ':' || to_char(d.due, 'YYYYMMDD')
  from vehicles v
  cross join lateral (values
    ('inspection','Przegląd', v.inspection_expiry),
    ('insurance','OC', v.insurance_expiry),
    ('leasing','Leasing', v.leasing_end)
  ) as d(kind, label, due)
  join memberships mgr on mgr.company_id = p_company and mgr.status='active'
    and mgr.role in ('owner','dispatcher')
  where v.company_id = p_company and d.due is not null and d.due <= horizon
  on conflict (user_id, dedup_key) do nothing;

  -- Karty: ważność
  insert into notifications (company_id, user_id, type, title, body, severity, dedup_key)
  select p_company, mgr.user_id, 'card_expiry',
         'Karta ' || c.provider || ' wygasa',
         'Ważna do: ' || to_char(c.valid_until, 'YYYY-MM-DD'),
         case when c.valid_until < current_date then 'danger' else 'warning' end,
         'card:' || c.id || ':' || to_char(c.valid_until, 'YYYYMMDD')
  from fuel_cards c
  join memberships mgr on mgr.company_id = p_company and mgr.status='active'
    and mgr.role in ('owner','dispatcher')
  where c.company_id = p_company and c.valid_until is not null and c.valid_until <= horizon
  on conflict (user_id, dedup_key) do nothing;

  -- Dokumenty kierowcy (bez nazwiska — PII)
  insert into notifications (company_id, user_id, type, title, body, severity, dedup_key)
  select p_company, mgr.user_id, 'driver_document_expiry',
         'Termin dokumentu kierowcy',
         doc.label || ' wygasa: ' || to_char(doc.due, 'YYYY-MM-DD') || ' — sprawdź kartotekę kierowców',
         case when doc.due < current_date then 'danger' else 'warning' end,
         'drv:' || dr.id || ':' || doc.kind || ':' || to_char(doc.due, 'YYYYMMDD')
  from drivers dr
  cross join lateral (values
    ('license','Prawo jazdy', dr.license_expiry),
    ('code95','Kod 95', dr.code95_expiry),
    ('medical','Badania lekarskie', dr.medical_expiry),
    ('adr','ADR', dr.adr_expiry)
  ) as doc(kind, label, due)
  join memberships mgr on mgr.company_id = p_company and mgr.status='active'
    and mgr.role in ('owner','dispatcher')
  where dr.company_id = p_company and doc.due is not null and doc.due <= horizon
  on conflict (user_id, dedup_key) do nothing;

  -- Serwis pojazdu (km): bieżący przebieg blisko/po docelowym (interwał).
  insert into notifications (company_id, user_id, type, title, body, severity, dedup_key)
  select p_company, mgr.user_id, 'service_due',
         'Serwis pojazdu ' || v.registration,
         st.name || ': cel ' || (st.last_done_km + st.interval_km) || ' km (stan ' || cur.km || ' km)',
         case when cur.km >= st.last_done_km + st.interval_km then 'danger' else 'warning' end,
         'svc:' || st.id || ':' || (st.last_done_km + st.interval_km)
  from service_tasks st
  join vehicles v on v.id = st.vehicle_id
  join lateral (select max(odometer_km) as km from fuel_logs where vehicle_id = st.vehicle_id) cur on true
  join memberships mgr on mgr.company_id = p_company and mgr.status='active'
    and mgr.role in ('owner','dispatcher')
  where st.company_id = p_company
    and st.interval_km is not null and st.last_done_km is not null
    and cur.km is not null
    and cur.km >= st.last_done_km + st.interval_km - 2000
  on conflict (user_id, dedup_key) do nothing;
end; $$;
