-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0024 · Szyfrowanie PII at-rest (profiles / driver_profiles / invites)
--
--  Domyka audyt bezpieczeństwa (P1 #4): dane osobowe profilu i zaproszeń
--  przestają być jawne w bazie. Wzorzec jak 0015/0022 (pgcrypto + Vault),
--  ale OSOBNY klucz `pii_key` (segmentacja od `card_key` — PIN-y kart vs PII;
--  częściowo adresuje też P1 #5: różne klucze dla różnych klas danych).
--
--  Zakres pól (mapowanie kodu potwierdza: BRAK czytelników w apps/* — kanoniczny
--  e-mail żyje w auth.users; profiles.email to redundantna kopia; invites.phone
--  było martwą kolumną nigdy nie zapisywaną):
--    profiles        : full_name, phone, email   → *_enc (bytea)
--    driver_profiles : phone, email, company_data → *_enc (bytea)
--    invites         : email → email_enc ; phone (martwa) → usunięta
--
--  Pisarze przepięci w tej migracji: trigger handle_new_user (e-mail przy
--  rejestracji) + RPC create_invite. Brak zmian w kodzie web/api (zero odczytów).
--  Brak wyszukiwania po e-mail/telefonie → blind-index (HMAC) niepotrzebny.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists supabase_vault;

-- ── Klucz PII z Vault (tworzony jednorazowo, wartość NIE w repo) ──────
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'pii_key') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'base64'),
      'pii_key',
      'E-Logistic — klucz szyfrowania PII (profiles/driver_profiles/invites). Odrębny od card_key.'
    );
  end if;
end $$;

create or replace function public._pii_key()
returns text language sql stable security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'pii_key' limit 1;
$$;

-- ════════════════════════════════════════════════════════════════════
--  profiles
-- ════════════════════════════════════════════════════════════════════
alter table profiles add column if not exists full_name_enc bytea;
alter table profiles add column if not exists phone_enc     bytea;
alter table profiles add column if not exists email_enc     bytea;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name='profiles' and column_name='email') then
    update profiles set
      full_name_enc = case when nullif(full_name,'') is not null
                           then extensions.pgp_sym_encrypt(full_name, public._pii_key()) else full_name_enc end,
      phone_enc     = case when nullif(phone,'') is not null
                           then extensions.pgp_sym_encrypt(phone, public._pii_key()) else phone_enc end,
      email_enc     = case when nullif(email,'') is not null
                           then extensions.pgp_sym_encrypt(email, public._pii_key()) else email_enc end;
    alter table profiles drop column full_name;
    alter table profiles drop column phone;
    alter table profiles drop column email;
  end if;
end $$;

-- Trigger rejestracji: e-mail z auth.users zapisywany od razu zaszyfrowany.
-- KRYTYCZNE: search_path musi zawierać `extensions` (pgp_sym_encrypt).
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into public.profiles (id, email_enc)
    values (new.id,
            case when new.email is not null
                 then pgp_sym_encrypt(new.email, public._pii_key()) end)
  on conflict (id) do nothing;
  return new;
end; $$;

-- ════════════════════════════════════════════════════════════════════
--  driver_profiles
-- ════════════════════════════════════════════════════════════════════
alter table driver_profiles add column if not exists phone_enc        bytea;
alter table driver_profiles add column if not exists email_enc        bytea;
alter table driver_profiles add column if not exists company_data_enc bytea;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name='driver_profiles' and column_name='email') then
    update driver_profiles set
      phone_enc        = case when nullif(phone,'') is not null
                              then extensions.pgp_sym_encrypt(phone, public._pii_key()) else phone_enc end,
      email_enc        = case when nullif(email,'') is not null
                              then extensions.pgp_sym_encrypt(email, public._pii_key()) else email_enc end,
      company_data_enc = case when company_data is not null
                              then extensions.pgp_sym_encrypt(company_data::text, public._pii_key()) else company_data_enc end;
    alter table driver_profiles drop column phone;
    alter table driver_profiles drop column email;
    alter table driver_profiles drop column company_data;
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════════
--  invites
-- ════════════════════════════════════════════════════════════════════
alter table invites add column if not exists email_enc bytea;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name='invites' and column_name='email') then
    update invites set
      email_enc = case when nullif(email,'') is not null
                       then extensions.pgp_sym_encrypt(email, public._pii_key()) else email_enc end;
    alter table invites drop column email;
  end if;
  -- `phone` nigdy nie był zapisywany przez create_invite — martwa kolumna, usuwamy.
  if exists (select 1 from information_schema.columns
             where table_name='invites' and column_name='phone') then
    alter table invites drop column phone;
  end if;
end $$;

-- create_invite: e-mail zapraszanego zapisywany zaszyfrowany (sygnatura bez zmian).
create or replace function public.create_invite(
  p_role role default 'driver',
  p_vehicle uuid default null,
  p_email text default null
)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare cid uuid; tok text;
begin
  select company_id into cid
    from memberships
    where user_id = auth.uid() and status = 'active' and role in ('owner', 'dispatcher')
    limit 1;
  if cid is null then raise exception 'Brak uprawnień do zapraszania'; end if;

  tok := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into invites (company_id, email_enc, vehicle_id, role, token_hash, expires_at)
    values (cid,
            case when nullif(p_email,'') is not null
                 then pgp_sym_encrypt(p_email, public._pii_key()) end,
            p_vehicle, p_role, encode(digest(tok, 'sha256'), 'hex'),
            now() + interval '7 days');
  return tok;
end; $$;

-- ── Podgląd zaproszeń (deszyfrowanie e-mail) — owner/dispatcher, audytowane ──
-- Na przyszłość: brak konsumenta w UI dziś, ale czytelny i bezpieczny punkt
-- wejścia (zamiast bezpośredniego SELECT po RLS, który zwracałby już tylko *_enc).
create or replace function public.list_invites(p_company uuid)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare res json;
begin
  if not public.has_role(p_company, array['owner','dispatcher']::role[]) then
    raise exception 'Brak uprawnień do zaproszeń';
  end if;
  select coalesce(json_agg(json_build_object(
    'id', id,
    'email', case when email_enc is not null then pgp_sym_decrypt(email_enc, public._pii_key()) else null end,
    'role', role,
    'vehicle_id', vehicle_id,
    'accepted_at', accepted_at,
    'expires_at', expires_at,
    'created_at', created_at
  ) order by created_at desc), '[]'::json) into res
  from invites where company_id = p_company;
  insert into audit_log (company_id, actor_id, action, target)
    values (p_company, auth.uid(), 'invites.list', p_company::text);
  return res;
end; $$;
