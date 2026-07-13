-- #313: ON CONFLICT musi wskazywać partial index notifications_dedup (WHERE dedup_key IS NOT NULL);
-- bez tego INSERT zlecenia z przypisanym kierowcą i cron terminów padały na 42P10.

CREATE OR REPLACE FUNCTION public.generate_expiry_notifications(p_company uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare horizon date := current_date + 30;
begin
  if not public.has_role(p_company, array['owner','dispatcher']::role[]) then
    return;
  end if;

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
end; $function$
;

CREATE OR REPLACE FUNCTION public.notify_order_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare route text;
begin
  if NEW.assigned_to is null then
    return NEW;
  end if;
  -- przy UPDATE: tylko gdy faktycznie zmieniono osobę
  if TG_OP = 'UPDATE' and NEW.assigned_to is not distinct from OLD.assigned_to then
    return NEW;
  end if;
  -- nie powiadamiaj o przypisaniu samego siebie
  if NEW.assigned_to = auth.uid() then
    return NEW;
  end if;

  route := coalesce(nullif(NEW.origin, ''), '?') || ' → ' || coalesce(nullif(NEW.destination, ''), '?');

  insert into notifications (company_id, user_id, type, title, body, severity, dedup_key)
  values (
    NEW.company_id,
    NEW.assigned_to,
    'order_assigned',
    'Nowe zlecenie' || coalesce(' ' || nullif(NEW.reference_no, ''), ''),
    route
      || coalesce(' · ' || nullif(NEW.cargo, ''), '')
      || coalesce(' · załadunek ' || to_char(NEW.load_date, 'YYYY-MM-DD'), ''),
    'info',
    'order_assigned:' || NEW.id::text || ':' || NEW.assigned_to::text
  )
  on conflict (user_id, dedup_key) where dedup_key is not null do nothing;

  return NEW;
end; $function$
;
