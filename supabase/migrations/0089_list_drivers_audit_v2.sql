-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0089 · Wartość dowodowa audytu odczytu PII kierowców (#369)
--
--  0087 dodała audyt do `list_drivers`, ale z dławieniem „jeden wpis na
--  godzinę". To zabijało sens audytu:
--   1) masowe zassanie kartoteki (skrypt w pętli) zostawiało DOKŁADNIE JEDEN
--      wiersz — nieodróżnialny od pojedynczego wejścia na listę;
--   2) `raise exception` dla osoby bez roli owner/dispatcher wykonywał się
--      PRZED audytem, więc próby rekonesansu nie zostawiały żadnego śladu.
--
--  Zmiany (definicja funkcji poza nimi odtworzona 1:1 z 0087 — te same
--  kolumny, `security definer`, `set search_path`):
--   • W oknie godziny NIE pomijamy wpisu, tylko AKTUALIZUJEMY istniejący:
--     `meta->>'hits'` (licznik odczytów), `meta->>'last_at'` (ostatni odczyt),
--     `meta->>'rows_last'` (ile wierszy wydano ostatnio). Widać skalę: 1 wejście
--     to `hits=1`, zassanie kartoteki w pętli to `hits=8400`.
--   • Dochodzi ślad ODMOWY (`driver.list_pii_denied`) przed `raise exception`,
--     dławiony tym samym mechanizmem — próby rekonesansu podbijają licznik
--     w jednym wierszu na (firma, użytkownik, godzina), więc nie da się nimi
--     zalać `audit_log`.
--
--  ⚠️ OGRANICZENIE POSTGRESA (zweryfikowane empirycznie na 16.14, nie da się
--  obejść bez nowego rozszerzenia): `raise exception` przerywa transakcję,
--  więc wiersz o odmowie zapisany tuż przed nim zostaje wycofany razem z nią.
--  Dotyczy to także wywołań z bloku plpgsql łapiącego wyjątek — rollback
--  podtransakcji zabiera ten sam wiersz. Autonomiczna transakcja wymagałaby
--  `dblink`/`postgres_fdw`, których to wdrożenie nie ma (0001/0003/0024
--  włączają tylko postgis, pgcrypto i supabase_vault).
--  Dlatego TRWAŁYM śladem odmowy jest `raise log`: log serwera Postgresa jest
--  nietransakcyjny, wpis przeżywa rollback i jest widoczny w Supabase → Logs.
--  Zapis do `audit_log` zostaje jako ścieżka „best effort" — poprawna i gotowa
--  na dzień, w którym dojdzie mechanizm autonomicznego zapisu; dziś skutkuje
--  tym, że odmowami NIE DA SIĘ zalać `audit_log` (nic z nich nie commituje).
--
--  Audyt NIE MOŻE wywrócić odczytu — każdy blok audytowy ma własny
--  `exception when others then null` (sprawdzone: przy błędzie zapisu do
--  `audit_log` funkcja nadal zwraca kartotekę).
--
--  `actor_id is not distinct from v_actor` zamiast `=`: przy `auth.uid() IS NULL`
--  (np. service_role) porównanie `=` nigdy nie trafiało w istniejący wiersz
--  i dławienie w ogóle nie działało — każde wywołanie tworzyło nowy wiersz.
-- ════════════════════════════════════════════════════════════════════

-- Indeks pod wyszukiwanie wpisu do podbicia (okno godziny per firma+użytkownik).
create index if not exists audit_log_pii_probe_idx
  on public.audit_log (company_id, actor_id, action, created_at desc)
  where action in ('driver.list_pii', 'driver.list_pii_denied');

create or replace function public.list_drivers(p_company uuid)
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  res json;
  v_actor uuid := auth.uid();
begin
  if not public.has_role(p_company, array['owner','dispatcher']::role[]) then
    -- #369: ślad ODMOWY — WYŁĄCZNIE `raise log`, świadomie bez zapisu do `audit_log`.
    -- Zapis do tabeli byłby tu martwym kodem: `raise exception` niżej wycofuje całą
    -- transakcję, więc wiersz i tak by nie przetrwał. Zostawienie go kosztowałoby
    -- za to realnie — `list_drivers` może wywołać każdy zalogowany z dowolnym
    -- company_id, więc pętla odmówionych wywołań konsumowałaby identyfikatory
    -- transakcji (każda transakcja, która coś zapisała, pobiera XID).
    -- Nietransakcyjny (przeżywa rollback) ślad w logu serwera. Poziom LOG,
    -- więc nie wraca do klienta i nie podpowiada atakującemu, że jest logowany.
    raise log 'AUDIT driver.list_pii_denied company=% actor=%', p_company, v_actor;
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

  -- #369: ślad odczytu PII — w oknie godziny podbijamy licznik zamiast pomijać wpis.
  begin
    update audit_log
       set meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object(
             'hits', coalesce(nullif(meta->>'hits', '')::int, 1) + 1,
             'rows_last', json_array_length(res),
             'last_at', to_jsonb(now())
           )
     where id = (
       select id from audit_log
        where company_id = p_company
          and actor_id is not distinct from v_actor
          and action = 'driver.list_pii'
          and created_at > now() - interval '1 hour'
        order by created_at desc
        limit 1
     );
    if not found then
      insert into audit_log (company_id, actor_id, action, target, meta)
      values (
        p_company,
        v_actor,
        'driver.list_pii',
        p_company::text,
        jsonb_build_object(
          'rows', json_array_length(res),
          'rows_last', json_array_length(res),
          'hits', 1,
          'last_at', to_jsonb(now()),
          'window', '1h'
        )
      );
    end if;
  exception when others then null; -- awaria audytu nie może zabrać danych użytkownikowi
  end;

  return res;
end; $function$;
