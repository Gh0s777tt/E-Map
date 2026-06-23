-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0049 · Badania psychotechniczne kierowcy (compliance)
--  Dokłada termin badań psychotechnicznych obok prawa jazdy / kodu 95 /
--  badań lekarskich / ADR (mig. 0027). Data jawna (bez PII). Aktualizuje
--  list_drivers, driver_save i generate_expiry_notifications.
-- ════════════════════════════════════════════════════════════════════

alter table drivers add column if not exists psychotech_expiry date;

-- ── list_drivers: + psychotech_expiry ───────────────────────────────
create or replace function public.list_drivers(p_company uuid)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare res json;
begin
  if not public.has_role(p_company, array['owner','dispatcher']::role[]) then
    raise exception 'Brak uprawnień do kartoteki kierowców';
  end if;
  select coalesce(json_agg(r order by lname), '[]'::json) into res from (
    select
      json_build_object(
        'id', id,
        'first_name', case when first_name_enc is not null then pgp_sym_decrypt(first_name_enc, public._card_key()) else '' end,
        'last_name',  case when last_name_enc  is not null then pgp_sym_decrypt(last_name_enc,  public._card_key()) else '' end,
        'birth_date', case when birth_date_enc is not null then pgp_sym_decrypt(birth_date_enc, public._card_key()) else null end,
        'license_categories', coalesce(license_categories, '{}'),
        'qualifications', coalesce(qualifications, '{}'),
        'notes', notes,
        'license_expiry', license_expiry,
        'code95_expiry', code95_expiry,
        'medical_expiry', medical_expiry,
        'psychotech_expiry', psychotech_expiry,
        'adr_expiry', adr_expiry
      ) as r,
      case when last_name_enc is not null then pgp_sym_decrypt(last_name_enc, public._card_key()) else '' end as lname
    from drivers where company_id = p_company
  ) t;
  return res;
end; $$;

-- ── driver_save: + p_psychotech_expiry (drop+create — zmiana sygnatury) ──
drop function if exists public.driver_save(uuid, uuid, text, text, text, text[], text[], text, text, text, text, text);
create or replace function public.driver_save(
  p_id uuid, p_company uuid, p_first text, p_last text, p_birth text,
  p_categories text[], p_quals text[], p_notes text,
  p_license_expiry text default null, p_code95_expiry text default null,
  p_medical_expiry text default null, p_adr_expiry text default null,
  p_psychotech_expiry text default null
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare did uuid;
begin
  if not public.has_role(p_company, array['owner','dispatcher']::role[]) then
    raise exception 'Brak uprawnień do kartoteki kierowców';
  end if;
  if p_id is null then
    insert into drivers (company_id, first_name_enc, last_name_enc, birth_date_enc,
                         license_categories, qualifications, notes,
                         license_expiry, code95_expiry, medical_expiry, adr_expiry, psychotech_expiry)
    values (
      p_company,
      pgp_sym_encrypt(coalesce(p_first,''), public._card_key()),
      pgp_sym_encrypt(coalesce(p_last,''),  public._card_key()),
      case when nullif(p_birth,'') is not null then pgp_sym_encrypt(p_birth, public._card_key()) else null end,
      coalesce(p_categories, '{}'), coalesce(p_quals, '{}'), p_notes,
      nullif(p_license_expiry,'')::date, nullif(p_code95_expiry,'')::date,
      nullif(p_medical_expiry,'')::date, nullif(p_adr_expiry,'')::date,
      nullif(p_psychotech_expiry,'')::date
    ) returning id into did;
  else
    update drivers set
      first_name_enc = pgp_sym_encrypt(coalesce(p_first,''), public._card_key()),
      last_name_enc  = pgp_sym_encrypt(coalesce(p_last,''),  public._card_key()),
      birth_date_enc = case when nullif(p_birth,'') is not null then pgp_sym_encrypt(p_birth, public._card_key()) else null end,
      license_categories = coalesce(p_categories, '{}'),
      qualifications = coalesce(p_quals, '{}'),
      notes = p_notes,
      license_expiry = nullif(p_license_expiry,'')::date,
      code95_expiry  = nullif(p_code95_expiry,'')::date,
      medical_expiry = nullif(p_medical_expiry,'')::date,
      adr_expiry     = nullif(p_adr_expiry,'')::date,
      psychotech_expiry = nullif(p_psychotech_expiry,'')::date
    where id = p_id and company_id = p_company
    returning id into did;
    if did is null then raise exception 'Kierowca nie istnieje w tej firmie'; end if;
  end if;
  insert into audit_log (company_id, actor_id, action, target)
    values (p_company, auth.uid(), 'driver.save', did::text);
  return did;
end; $$;

-- ── generate_expiry_notifications: + psychotech w bloku dokumentów kierowcy ──
create or replace function public.generate_expiry_notifications(p_company uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
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
  on conflict (user_id, dedup_key) do nothing;

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
  on conflict (user_id, dedup_key) do nothing;
end; $$;
