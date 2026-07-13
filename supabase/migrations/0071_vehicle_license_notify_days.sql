-- ════════════════════════════════════════════════════════════════════
--  0071 · #316 Feedback właściciela:
--  1) vehicles.license_expiry — data ważności licencji transportowej,
--  2) companies.notify_days_ahead — konfigurowalne wyprzedzenie
--     powiadomień o terminach (1–90 dni; np. 1 dzień / 2–3 tyg. / miesiąc),
--  3) generate_expiry_notifications: horyzont z ustawienia firmy
--     + licencja pojazdu w alertach.
-- ════════════════════════════════════════════════════════════════════

alter table vehicles add column if not exists license_expiry date;
alter table companies add column if not exists notify_days_ahead int not null default 30;
alter table companies drop constraint if exists companies_notify_days_ahead_check;
alter table companies add constraint companies_notify_days_ahead_check
  check (notify_days_ahead between 1 and 90);

create or replace function public.generate_expiry_notifications(p_company uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare horizon date;
begin
  if not public.has_role(p_company, array['owner','dispatcher']::role[]) then
    return;
  end if;
  select current_date + coalesce(notify_days_ahead, 30) into horizon
  from companies where id = p_company;

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
    ('leasing','Leasing', v.leasing_end),
    ('license','Licencja transportowa', v.license_expiry)
  ) as d(kind, label, due)
  join memberships mgr on mgr.company_id = p_company and mgr.status='active'
    and mgr.role in ('owner','dispatcher')
  where v.company_id = p_company and d.due is not null and d.due <= horizon
  on conflict (user_id, dedup_key) where dedup_key is not null do nothing;

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
  on conflict (user_id, dedup_key) where dedup_key is not null do nothing;

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
    ('psychotech','Badania psychotechniczne', dr.psychotech_expiry),
    ('adr','ADR', dr.adr_expiry)
  ) as doc(kind, label, due)
  join memberships mgr on mgr.company_id = p_company and mgr.status='active'
    and mgr.role in ('owner','dispatcher')
  where dr.company_id = p_company and doc.due is not null and doc.due <= horizon
  on conflict (user_id, dedup_key) where dedup_key is not null do nothing;
end; $$;
