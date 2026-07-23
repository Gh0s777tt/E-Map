-- ════════════════════════════════════════════════════════════════════
--  0083 · Firma własna kierowcy (kierowcy na B2B / kontrakt, nie etat):
--  • company_name / company_tax_id (NIP) / company_regon /
--    company_address / company_activity (profil działalności) —
--    zwykły tekst, NIE PII (dane rejestrowe firmy, nie szyfrujemy),
--  • pola opcjonalne: kontraktowy kierowca wypełnia, etatowy zostawia puste,
--  • list_drivers/driver_save + nowe pola (RLS kierowców rządzi wierszem,
--    bez zmian w politykach).
-- ════════════════════════════════════════════════════════════════════

alter table drivers add column if not exists company_name text;
alter table drivers add column if not exists company_tax_id text;
alter table drivers add column if not exists company_regon text;
alter table drivers add column if not exists company_address text;
alter table drivers add column if not exists company_activity text;

comment on column drivers.company_name is 'Firma własna kierowcy (B2B) — nazwa. Dane rejestrowe, jawne (nie PII).';
comment on column drivers.company_tax_id is 'Firma własna kierowcy — NIP.';
comment on column drivers.company_regon is 'Firma własna kierowcy — REGON.';
comment on column drivers.company_address is 'Firma własna kierowcy — adres.';
comment on column drivers.company_activity is 'Firma własna kierowcy — profil działalności.';

-- ── list_drivers: + pola firmy kierowcy ─────────────────────────────
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
        'qualification_details', coalesce(qualification_details, '[]'::jsonb),
        'notes', notes,
        'license_expiry', license_expiry,
        'code95_expiry', code95_expiry,
        'medical_expiry', medical_expiry,
        'psychotech_expiry', psychotech_expiry,
        'adr_expiry', adr_expiry,
        'passport_expiry', passport_expiry,
        'id_card_expiry', id_card_expiry,
        'company_name', company_name,
        'company_tax_id', company_tax_id,
        'company_regon', company_regon,
        'company_address', company_address,
        'company_activity', company_activity,
        'user_id', user_id
      ) as r,
      case when last_name_enc is not null then pgp_sym_decrypt(last_name_enc, public._card_key()) else '' end as lname
    from drivers where company_id = p_company
  ) t;
  return res;
end; $$;

-- ── driver_save: + pola firmy kierowcy (5 parametrów na końcu) ───────
drop function if exists public.driver_save(uuid, uuid, text, text, text, text[], text[], text, text, text, text, text, text, text, text, jsonb);
create or replace function public.driver_save(
  p_id uuid, p_company uuid, p_first text, p_last text, p_birth text,
  p_categories text[], p_quals text[], p_notes text,
  p_license_expiry text default null, p_code95_expiry text default null,
  p_medical_expiry text default null, p_adr_expiry text default null,
  p_psychotech_expiry text default null,
  p_passport_expiry text default null, p_id_card_expiry text default null,
  p_qual_details jsonb default null,
  p_company_name text default null, p_company_tax_id text default null,
  p_company_regon text default null, p_company_address text default null,
  p_company_activity text default null
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare did uuid;
begin
  if not public.has_role(p_company, array['owner','dispatcher']::role[]) then
    raise exception 'Brak uprawnień do kartoteki kierowców';
  end if;
  if p_id is null then
    insert into drivers (company_id, first_name_enc, last_name_enc, birth_date_enc,
                         license_categories, qualifications, notes,
                         license_expiry, code95_expiry, medical_expiry, adr_expiry,
                         psychotech_expiry, passport_expiry, id_card_expiry, qualification_details,
                         company_name, company_tax_id, company_regon, company_address, company_activity)
    values (p_company,
            pgp_sym_encrypt(p_first, public._card_key()),
            pgp_sym_encrypt(p_last,  public._card_key()),
            case when p_birth is null then null else pgp_sym_encrypt(p_birth, public._card_key()) end,
            coalesce(p_categories, '{}'), coalesce(p_quals, '{}'), p_notes,
            p_license_expiry::date, p_code95_expiry::date, p_medical_expiry::date,
            p_adr_expiry::date, p_psychotech_expiry::date,
            p_passport_expiry::date, p_id_card_expiry::date, p_qual_details,
            p_company_name, p_company_tax_id, p_company_regon, p_company_address, p_company_activity)
    returning id into did;
  else
    update drivers set
      first_name_enc = pgp_sym_encrypt(p_first, public._card_key()),
      last_name_enc  = pgp_sym_encrypt(p_last,  public._card_key()),
      birth_date_enc = case when p_birth is null then null else pgp_sym_encrypt(p_birth, public._card_key()) end,
      license_categories = coalesce(p_categories, '{}'),
      qualifications = coalesce(p_quals, '{}'),
      notes = p_notes,
      license_expiry = p_license_expiry::date,
      code95_expiry = p_code95_expiry::date,
      medical_expiry = p_medical_expiry::date,
      adr_expiry = p_adr_expiry::date,
      psychotech_expiry = p_psychotech_expiry::date,
      passport_expiry = p_passport_expiry::date,
      id_card_expiry = p_id_card_expiry::date,
      qualification_details = p_qual_details,
      company_name = p_company_name,
      company_tax_id = p_company_tax_id,
      company_regon = p_company_regon,
      company_address = p_company_address,
      company_activity = p_company_activity
    where id = p_id and company_id = p_company
    returning id into did;
    if did is null then
      raise exception 'Nie znaleziono kierowcy w tej firmie';
    end if;
  end if;
  return did;
end; $$;
