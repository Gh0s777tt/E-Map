-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0031 · Sejf dokumentów (Supabase Storage + metadane)
--  Prywatny bucket `documents`; pliki pod ścieżką `{company_id}/{uuid}-nazwa`.
--  Tabela `documents` = metadane (nazwa, kategoria, pojazd, termin ważności).
--  Dostęp przez RLS na storage.objects: pierwszy segment ścieżki = company_id
--  użytkownika (porównanie tekstowe — bez ryzyka błędu rzutowania uuid).
--  Odczyt: każdy aktywny członek firmy. Zapis/kasowanie: owner/dispatcher.
--  Terminy ważności dokumentów dołączone do generate_expiry_notifications.
-- ════════════════════════════════════════════════════════════════════

-- ── Metadane dokumentów ─────────────────────────────────────────────
create table if not exists documents (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  vehicle_id   uuid references vehicles(id) on delete set null,
  name         text not null,
  path         text not null unique,            -- ścieżka obiektu w buckecie
  size_bytes   bigint,
  mime         text,
  category     text,                            -- OC / przegląd / leasing / umowa / inne
  expiry_date  date,                            -- opcjonalny termin ważności
  uploaded_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists documents_company_idx on documents(company_id, created_at desc);
create index if not exists documents_vehicle_idx on documents(vehicle_id);

alter table documents enable row level security;

drop policy if exists documents_select on documents;
create policy documents_select on documents for select to authenticated
  using (public.is_member_of(company_id));

drop policy if exists documents_write on documents;
create policy documents_write on documents for all to authenticated
  using (public.has_role(company_id, array['owner','dispatcher']::role[]))
  with check (public.has_role(company_id, array['owner','dispatcher']::role[]));

-- ── Bucket Storage (prywatny) ───────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('documents', 'documents', false)
  on conflict (id) do nothing;

-- ── RLS na storage.objects dla bucketu `documents` ──────────────────
-- Pierwszy folder w ścieżce = company_id. Porównanie tekstowe z members
-- (bez rzutowania na uuid → brak błędów dla nietypowych ścieżek).
drop policy if exists documents_obj_select on storage.objects;
create policy documents_obj_select on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.status = 'active'
        and m.company_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists documents_obj_insert on storage.objects;
create policy documents_obj_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('owner','dispatcher')
        and m.company_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists documents_obj_delete on storage.objects;
create policy documents_obj_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('owner','dispatcher')
        and m.company_id::text = (storage.foldername(name))[1]
    )
  );

-- ── generate_expiry_notifications: + blok terminów dokumentów ───────
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

  -- Dokumenty w sejfie: termin ważności (OC/przegląd/leasing/umowy…).
  insert into notifications (company_id, user_id, type, title, body, severity, dedup_key)
  select p_company, mgr.user_id, 'document_expiry',
         'Dokument wygasa: ' || dok.name,
         coalesce(dok.category || ' — ', '') || 'termin: ' || to_char(dok.expiry_date, 'YYYY-MM-DD')
           || coalesce(' · pojazd ' || v.registration, ''),
         case when dok.expiry_date < current_date then 'danger' else 'warning' end,
         'doc:' || dok.id || ':' || to_char(dok.expiry_date, 'YYYYMMDD')
  from documents dok
  left join vehicles v on v.id = dok.vehicle_id
  join memberships mgr on mgr.company_id = p_company and mgr.status='active'
    and mgr.role in ('owner','dispatcher')
  where dok.company_id = p_company and dok.expiry_date is not null and dok.expiry_date <= horizon
  on conflict (user_id, dedup_key) do nothing;
end; $$;
