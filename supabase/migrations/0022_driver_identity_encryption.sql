-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0022 · Szyfrowanie tożsamości kierowcy (PII at-rest)
--  imię / nazwisko / data ur. → szyfrowane (pgcrypto + Vault), jak dokumenty (0015).
--  Odczyt/zapis tylko owner/dispatcher przez SECURITY DEFINER (omija RLS).
--  Zapis tożsamości audytowany; lista (rutynowy odczyt menedżera) bez audytu.
-- ════════════════════════════════════════════════════════════════════

alter table drivers add column if not exists first_name_enc bytea;
alter table drivers add column if not exists last_name_enc  bytea;
alter table drivers add column if not exists birth_date_enc bytea;

-- Migracja istniejących wartości jawnych → zaszyfrowane, potem usunięcie kolumn jawnych.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name='drivers' and column_name='first_name') then
    update drivers set
      first_name_enc = case when nullif(first_name,'') is not null
                            then pgp_sym_encrypt(first_name, public._card_key()) else null end,
      last_name_enc  = case when nullif(last_name,'')  is not null
                            then pgp_sym_encrypt(last_name,  public._card_key()) else null end,
      birth_date_enc = case when birth_date is not null
                            then pgp_sym_encrypt(birth_date::text, public._card_key()) else null end;
    alter table drivers drop column first_name;
    alter table drivers drop column last_name;
    alter table drivers drop column birth_date;
  end if;
end $$;

-- ── Lista kierowców (deszyfrowanie) — owner/dispatcher ───────────────
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
        'notes', notes
      ) as r,
      case when last_name_enc is not null then pgp_sym_decrypt(last_name_enc, public._card_key()) else '' end as lname
    from drivers where company_id = p_company
  ) t;
  return res;
end; $$;

-- ── Zapis tożsamości (szyfrowanie, insert/update) — owner/dispatcher, audytowane ──
create or replace function public.driver_save(
  p_id uuid, p_company uuid, p_first text, p_last text, p_birth text,
  p_categories text[], p_quals text[], p_notes text
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare did uuid;
begin
  if not public.has_role(p_company, array['owner','dispatcher']::role[]) then
    raise exception 'Brak uprawnień do kartoteki kierowców';
  end if;
  if p_id is null then
    insert into drivers (company_id, first_name_enc, last_name_enc, birth_date_enc,
                         license_categories, qualifications, notes)
    values (
      p_company,
      pgp_sym_encrypt(coalesce(p_first,''), public._card_key()),
      pgp_sym_encrypt(coalesce(p_last,''),  public._card_key()),
      case when nullif(p_birth,'') is not null then pgp_sym_encrypt(p_birth, public._card_key()) else null end,
      coalesce(p_categories, '{}'), coalesce(p_quals, '{}'), p_notes
    ) returning id into did;
  else
    update drivers set
      first_name_enc = pgp_sym_encrypt(coalesce(p_first,''), public._card_key()),
      last_name_enc  = pgp_sym_encrypt(coalesce(p_last,''),  public._card_key()),
      birth_date_enc = case when nullif(p_birth,'') is not null then pgp_sym_encrypt(p_birth, public._card_key()) else null end,
      license_categories = coalesce(p_categories, '{}'),
      qualifications = coalesce(p_quals, '{}'),
      notes = p_notes
    where id = p_id and company_id = p_company
    returning id into did;
    if did is null then raise exception 'Kierowca nie istnieje w tej firmie'; end if;
  end if;
  insert into audit_log (company_id, actor_id, action, target)
    values (p_company, auth.uid(), 'driver.save', did::text);
  return did;
end; $$;
