-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0018 · Fix: ON CONFLICT na częściowym indeksie unikalnym
--  Indeks `notifications_dedup` jest częściowy (where dedup_key is not null),
--  więc ON CONFLICT musi powtórzyć ten predykat.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.generate_expiry_notifications(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
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
end; $$;
