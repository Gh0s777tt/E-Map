-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0087 · Audyt masowego odczytu PII kierowców (#368, audyt)
--
--  CLAUDE.md wymaga, by KAŻDY odczyt danych wrażliwych był audytowany.
--  Odczyt PIN-u karty (`fuel_card_pin`) i lista zaproszeń (`list_invites`)
--  zostawiają ślad w `audit_log`, ale `list_drivers` — która deszyfruje
--  imię, nazwisko i datę urodzenia CAŁEJ kartoteki (RODO) — nie zostawiała
--  żadnego. Niespójność polityki i luka w rozliczalności: po incydencie nie
--  dało się odpowiedzieć, kto i kiedy pobrał dane osobowe kierowców.
--
--  Definicja funkcji odtworzona 1:1 ze stanu produkcyjnego (pg_get_functiondef)
--  — zmieniamy WYŁĄCZNIE dodanie audytu, żeby nie zgubić logiki 0074/0083.
--
--  DŁAWIENIE: funkcja jest wołana przy każdym wejściu na listę kierowców
--  (kartoteka, formularze, przypisania), więc wpis bez ograniczenia zalałby
--  `audit_log` i uczynił go bezużytecznym. Zapisujemy jeden wpis na
--  (firma, użytkownik) na godzinę — to wystarcza, by odtworzyć „kto i kiedy
--  miał dostęp", a nie generuje szumu.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.list_drivers(p_company uuid)
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
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

  -- #368: ślad odczytu PII (dławiony do 1/h na użytkownika i firmę).
  if not exists (
    select 1 from audit_log
    where company_id = p_company
      and actor_id = auth.uid()
      and action = 'driver.list_pii'
      and created_at > now() - interval '1 hour'
  ) then
    insert into audit_log (company_id, actor_id, action, target, meta)
    values (
      p_company,
      auth.uid(),
      'driver.list_pii',
      p_company::text,
      jsonb_build_object('rows', json_array_length(res), 'throttle', '1h')
    );
  end if;

  return res;
end; $function$;
