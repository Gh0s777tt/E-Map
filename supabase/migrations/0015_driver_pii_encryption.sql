-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0015 · Szyfrowanie danych wrażliwych kierowcy (PII)
--  Numery: dowodu, paszportu, prawa jazdy → szyfrowane (pgcrypto + Vault),
--  jak PIN-y kart. Odczyt/zapis tylko owner/dispatcher, każdy dostęp audytowany.
--  Imię/nazwisko/data ur. pozostają (potrzebne do identyfikacji) — chronione RLS.
-- ════════════════════════════════════════════════════════════════════

alter table drivers add column if not exists id_card_enc  bytea;
alter table drivers add column if not exists passport_enc bytea;
alter table drivers add column if not exists license_enc  bytea;

-- Przeniesienie ewentualnych istniejących wartości do postaci zaszyfrowanej.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name='drivers' and column_name='id_card_number') then
    update drivers set
      id_card_enc  = case when nullif(id_card_number,'')  is not null
                          then pgp_sym_encrypt(id_card_number,  public._card_key()) else null end,
      passport_enc = case when nullif(passport_number,'') is not null
                          then pgp_sym_encrypt(passport_number, public._card_key()) else null end,
      license_enc  = case when nullif(license_number,'')  is not null
                          then pgp_sym_encrypt(license_number,  public._card_key()) else null end;
    alter table drivers drop column id_card_number;
    alter table drivers drop column passport_number;
    alter table drivers drop column license_number;
  end if;
end $$;

-- ── Zapis dokumentów (szyfrowanie) — owner/dispatcher, audytowane ────
create or replace function public.driver_set_documents(
  p_driver uuid, p_id_card text, p_passport text, p_license text
) returns void language plpgsql security definer set search_path = public, extensions as $$
declare cid uuid;
begin
  select company_id into cid from drivers where id = p_driver;
  if cid is null then raise exception 'Kierowca nie istnieje'; end if;
  if not public.has_role(cid, array['owner','dispatcher']::role[]) then
    raise exception 'Brak uprawnień do danych kierowcy';
  end if;
  update drivers set
    id_card_enc  = case when nullif(p_id_card,'')  is not null then pgp_sym_encrypt(p_id_card,  public._card_key()) else null end,
    passport_enc = case when nullif(p_passport,'') is not null then pgp_sym_encrypt(p_passport, public._card_key()) else null end,
    license_enc  = case when nullif(p_license,'')  is not null then pgp_sym_encrypt(p_license,  public._card_key()) else null end
  where id = p_driver;
  insert into audit_log (company_id, actor_id, action, target)
    values (cid, auth.uid(), 'driver.set_documents', p_driver::text);
end; $$;

-- ── Odczyt dokumentów (deszyfrowanie) — owner/dispatcher, audytowane ─
create or replace function public.driver_documents(p_driver uuid)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare cid uuid; res json;
begin
  select company_id into cid from drivers where id = p_driver;
  if not public.has_role(cid, array['owner','dispatcher']::role[]) then
    raise exception 'Brak uprawnień do danych kierowcy';
  end if;
  select json_build_object(
    'idCard',   case when id_card_enc  is not null then pgp_sym_decrypt(id_card_enc,  public._card_key()) else null end,
    'passport', case when passport_enc is not null then pgp_sym_decrypt(passport_enc, public._card_key()) else null end,
    'license',  case when license_enc  is not null then pgp_sym_decrypt(license_enc,  public._card_key()) else null end
  ) into res from drivers where id = p_driver;
  insert into audit_log (company_id, actor_id, action, target)
    values (cid, auth.uid(), 'driver.read_documents', p_driver::text);
  return res;
end; $$;
