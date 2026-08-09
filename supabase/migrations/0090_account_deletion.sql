-- [#372] Usuwanie konta i danych z poziomu aplikacji.
--
-- POWÓD: App Store Guideline 5.1.1(v) oraz Google Play wymagają, aby aplikacja
-- pozwalająca założyć konto pozwalała je też USUNĄĆ **wewnątrz aplikacji**.
-- Dotychczas istniała wyłącznie strona /account-deletion z instrukcją wysłania
-- e-maila — to nie spełnia wymogu.
--
-- KONTEKST TECHNICZNY: w tej bazie NIE MA ani jednego klucza obcego do `auth.users`.
-- Nic nie kaskaduje. Każda kolumna wskazująca na użytkownika musi zostać obsłużona
-- jawnie, inaczej po usunięciu konta zostają osierocone wiersze w ~35 tabelach.
--
-- ZASADA PODZIAŁU (spójna z treścią strony /account-deletion i /privacy):
--   USUWAMY  — dane osobowe i poświadczenia: profil, rekord kadrowy, passkeys,
--              tokeny push, pozycje GPS, wiadomości czatu, prywatne opinie.
--   ODPINAMY — zapisy operacyjne i finansowe firmy (tankowania, zlecenia, dokumenty).
--              Zostają w danych firmy, ale bez powiązania z osobą.

-- ---------------------------------------------------------------------------
-- 1. Odpięcie wpisów operacyjnych wymaga, by `driver_id` mógł być NULL.
-- ---------------------------------------------------------------------------
-- Kolumny były NOT NULL, co uniemożliwiało anonimizację bez kasowania danych firmy.
-- Bezpieczeństwo nie ucierpi — polityki RLS tych tabel mają postać
--   using (driver_id = auth.uid() or has_role(company_id, ...))
--   with check (driver_id = auth.uid() and is_member_of(company_id))
-- Dla NULL warunek `driver_id = auth.uid()` daje NULL (nie TRUE), więc:
--   • odpięty wpis znika kierowcom z widoku, a zostaje właścicielowi i dyspozytorowi,
--   • nadal NIE DA SIĘ wstawić wpisu bez kierowcy (WITH CHECK odrzuca NULL).
alter table public.fuel_logs   alter column driver_id drop not null;
alter table public.adblue_logs alter column driver_id drop not null;
alter table public.trip_events alter column driver_id drop not null;

comment on column public.fuel_logs.driver_id is
  'Autor wpisu (auth.users.id). NULL = konto kierowcy zostało usunięte, wpis odpięty od osoby.';
comment on column public.adblue_logs.driver_id is
  'Autor wpisu (auth.users.id). NULL = konto kierowcy zostało usunięte, wpis odpięty od osoby.';
comment on column public.trip_events.driver_id is
  'Autor wpisu (auth.users.id). NULL = konto kierowcy zostało usunięte, wpis odpięty od osoby.';

-- ---------------------------------------------------------------------------
-- 2. Dowód wykonania usunięcia (RODO / wymogi sklepów).
-- ---------------------------------------------------------------------------
-- Trzymamy wyłącznie pseudonimowy identyfikator i liczniki — bez e-maila i imienia.
-- Po usunięciu konta UUID nie da się już powiązać z osobą, a pozwala wykazać,
-- że żądanie zostało zrealizowane.
create table if not exists public.account_deletions (
  user_id uuid primary key,
  deleted_at timestamptz not null default now(),
  deleted_company boolean not null default false,
  counts jsonb not null default '{}'::jsonb
);

alter table public.account_deletions enable row level security;
-- Brak polityk = brak dostępu przez API. Czyta wyłącznie administrator bazy.

-- ---------------------------------------------------------------------------
-- 3. Kompletne czyszczenie danych firmy.
-- ---------------------------------------------------------------------------
-- Wydzielone z `company_wipe_data`, która pomijała 11 tabel (czat, checklisty,
-- wydatki kierowcy, pozycje GPS, trasy, zdarzenia tacho, tokeny push, ustawienia
-- rozliczeń). Ten brak oznaczał, że „wyczyszczona" firma zostawiała wiadomości
-- czatu i checklisty w bazie.
--
-- Funkcja wewnętrzna: NIE sprawdza uprawnień. Wywoływana tylko przez funkcje,
-- które autoryzację wykonały wcześniej. Dostęp odebrany wszystkim rolom API.
create or replace function public._company_purge(
  p_company uuid,
  p_drop_company boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_counts jsonb := '{}'::jsonb;
  v_n bigint;
  v_tab text;
  -- Tabele z własną kolumną `company_id`. Kolejność ma znaczenie: dzieci przed rodzicami.
  -- `memberships` świadomie POZA listą — patrz niżej, przy p_drop_company.
  v_tables text[] := array[
    'trip_events', 'fuel_logs', 'adblue_logs',
    'invoices', 'order_photos', 'orders',
    'checklist_submissions', 'checklist_templates',
    'messages', 'chat_reads', 'chat_threads',
    'driver_expenses', 'driver_payouts', 'per_diem_trips', 'work_time_entries',
    'driver_positions', 'driver_routes', 'driver_tacho_events', 'tacho_downloads',
    'damage_claims', 'documents', 'service_tasks', 'vehicle_costs', 'vehicle_defects',
    'fuel_cards', 'vehicles', 'drivers',
    'contractors', 'saved_places', 'rates', 'invites', 'notifications',
    'expo_push_tokens', 'push_subscriptions',
    'company_settlement_settings'
  ];
begin
  -- Tabele bez własnego `company_id` — czyszczone przez powiązanie z rodzicem.
  delete from public.trip_event_revisions r
   using public.trip_events t where r.trip_event_id = t.id and t.company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('trip_event_revisions', v_n);

  delete from public.fuel_log_revisions r
   using public.fuel_logs f where r.fuel_log_id = f.id and f.company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('fuel_log_revisions', v_n);

  delete from public.adblue_log_revisions r
   using public.adblue_logs a where r.adblue_log_id = a.id and a.company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('adblue_log_revisions', v_n);

  delete from public.invoice_items i
   using public.invoices v where i.invoice_id = v.id and v.company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('invoice_items', v_n);

  delete from public.chat_members m
   using public.chat_threads t where m.thread_id = t.id and t.company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('chat_members', v_n);

  delete from public.card_assignments c
   using public.fuel_cards f where c.fuel_card_id = f.id and f.company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('card_assignments', v_n);

  delete from public.driver_assignments d
   using public.vehicles v where d.vehicle_id = v.id and v.company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('driver_assignments', v_n);

  -- Reszta ma kolumnę `company_id` — kasowana dynamicznie w ustalonej kolejności.
  foreach v_tab in array v_tables loop
    execute format('delete from public.%I where company_id = $1', v_tab) using p_company;
    get diagnostics v_n = row_count;
    v_counts := v_counts || jsonb_build_object(v_tab, v_n);
  end loop;

  -- Członkostwa znikają WYŁĄCZNIE razem z firmą. Przy zwykłym czyszczeniu danych
  -- muszą zostać — inaczej pozostali pracownicy straciliby dostęp do firmy,
  -- co nie jest tym, o co prosi „wyczyść dane".
  if p_drop_company then
    delete from public.memberships where company_id = p_company;
    get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('memberships', v_n);

    delete from public.audit_log where company_id = p_company;
    get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('audit_log', v_n);

    delete from public.companies where id = p_company;
    get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('companies', v_n);
  end if;

  return v_counts;
end;
$$;

revoke all on function public._company_purge(uuid, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. `company_wipe_data` — ta sama sygnatura, ale kompletna.
-- ---------------------------------------------------------------------------
create or replace function public.company_wipe_data(p_company uuid, p_confirm_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_counts jsonb;
begin
  if not has_role(p_company, array['owner']::role[]) then
    raise exception 'Tylko właściciel firmy może wyczyścić jej dane.';
  end if;

  select name into v_name from companies where id = p_company;
  if v_name is null then
    raise exception 'Firma nie istnieje.';
  end if;
  if btrim(coalesce(p_confirm_name, '')) is distinct from btrim(v_name) then
    raise exception 'Potwierdzenie nie zgadza się z nazwą firmy.';
  end if;

  -- `false` = zostaw rekord firmy, jej członków i audyt; czyścimy tylko dane robocze.
  v_counts := _company_purge(p_company, false);

  insert into audit_log (company_id, actor_id, action, target, meta)
  values (p_company, auth.uid(), 'company.wipe_data', v_name, v_counts);

  return v_counts;
end;
$$;

revoke all on function public.company_wipe_data(uuid, text) from public, anon;
grant execute on function public.company_wipe_data(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Podgląd skutków usunięcia konta — dla ekranu potwierdzenia.
-- ---------------------------------------------------------------------------
create or replace function public.account_deletion_preview()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_blocking jsonb := '[]'::jsonb;
  v_solo jsonb := '[]'::jsonb;
  r record;
  v_others int;
begin
  if v_uid is null then
    raise exception 'Brak zalogowanego użytkownika.' using errcode = '28000';
  end if;

  for r in
    select m.company_id, c.name
    from memberships m join companies c on c.id = m.company_id
    where m.user_id = v_uid and m.role = 'owner'
  loop
    select count(*) into v_others
    from memberships
    where company_id = r.company_id and user_id <> v_uid and status = 'active';

    if v_others > 0 then
      v_blocking := v_blocking || jsonb_build_object(
        'companyId', r.company_id, 'name', r.name, 'activeMembers', v_others);
    else
      v_solo := v_solo || jsonb_build_object('companyId', r.company_id, 'name', r.name);
    end if;
  end loop;

  return jsonb_build_object(
    -- Firmy z innymi członkami: usunięcie konta skasuje też ich dane,
    -- więc UI musi zażądać osobnej, świadomej zgody.
    'blockingCompanies', v_blocking,
    -- Firmy, w których jestem jedynym członkiem: znikną razem z kontem.
    'soloCompanies', v_solo,
    'fuelLogs',  (select count(*) from fuel_logs   where driver_id = v_uid),
    'adblueLogs',(select count(*) from adblue_logs where driver_id = v_uid),
    'tripEvents',(select count(*) from trip_events where driver_id = v_uid),
    'messages',  (select count(*) from messages    where sender_id = v_uid)
  );
end;
$$;

revoke all on function public.account_deletion_preview() from public, anon;
grant execute on function public.account_deletion_preview() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Właściwe usunięcie konta.
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account(
  p_confirm text,
  p_delete_company boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_counts jsonb := '{}'::jsonb;
  v_n bigint;
  v_dropped boolean := false;
  r record;
  v_others int;
begin
  if v_uid is null then
    raise exception 'Brak zalogowanego użytkownika.' using errcode = '28000';
  end if;

  -- Stała wartownicza, nie tekst z interfejsu — aplikacja mobilna ma 4 języki
  -- i tłumaczone potwierdzenie rozjechałoby się z bazą.
  if p_confirm is distinct from 'DELETE' then
    raise exception 'Operacja wymaga potwierdzenia.' using errcode = '22023';
  end if;

  -- Firmy, w których użytkownik jest właścicielem.
  for r in
    select m.company_id, c.name
    from memberships m join companies c on c.id = m.company_id
    where m.user_id = v_uid and m.role = 'owner'
  loop
    select count(*) into v_others
    from memberships
    where company_id = r.company_id and user_id <> v_uid and status = 'active';

    -- Firma z aktywnymi pracownikami nie może zostać osierocona przypadkiem.
    -- Usunięcie jest nadal możliwe — wymaga tylko świadomego `p_delete_company`.
    if v_others > 0 and not p_delete_company then
      raise exception
        'Jesteś właścicielem firmy „%" z % aktywnymi członkami.', r.name, v_others
        using errcode = '23503',
              hint = 'Przekaż własność innej osobie albo potwierdź usunięcie firmy wraz z danymi.';
    end if;

    v_counts := v_counts || jsonb_build_object(
      'company:' || r.name, _company_purge(r.company_id, true));
    v_dropped := true;
  end loop;

  -- ---- Odpięcie zapisów firmowych, które mają przetrwać ----
  update fuel_logs   set driver_id = null where driver_id = v_uid;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('fuel_logs.odpiete', v_n);
  update adblue_logs set driver_id = null where driver_id = v_uid;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('adblue_logs.odpiete', v_n);
  update trip_events set driver_id = null where driver_id = v_uid;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('trip_events.odpiete', v_n);

  update orders             set assigned_to    = null where assigned_to    = v_uid;
  update documents          set uploaded_by    = null where uploaded_by    = v_uid;
  update order_photos       set uploaded_by    = null where uploaded_by    = v_uid;
  update saved_places       set created_by     = null where created_by     = v_uid;
  update damage_claims      set created_by     = null where created_by     = v_uid;
  update driver_payouts     set created_by     = null where created_by     = v_uid;
  update per_diem_trips     set created_by     = null where created_by     = v_uid;
  update work_time_entries  set created_by     = null where created_by     = v_uid;
  update driver_routes      set created_by     = null where created_by     = v_uid;
  update driver_routes      set driver_user_id = null where driver_user_id = v_uid;
  update checklist_submissions set driver_user_id = null where driver_user_id = v_uid;
  update vehicle_defects    set reported_by    = null where reported_by    = v_uid;
  update vehicle_defects    set resolved_by    = null where resolved_by    = v_uid;
  update map_reports        set reported_by    = null where reported_by    = v_uid;
  update fuel_prices        set reported_by    = null where reported_by    = v_uid;
  update fuel_log_revisions   set edited_by = null where edited_by = v_uid;
  update adblue_log_revisions set edited_by = null where edited_by = v_uid;
  update trip_event_revisions set edited_by = null where edited_by = v_uid;
  update audit_log          set actor_id      = null where actor_id       = v_uid;
  update card_assignments   set user_id       = null where user_id        = v_uid;

  -- Kolumny tablicowe — usuwamy sam identyfikator, reszta listy zostaje.
  update documents
     set allowed_user_ids = array_remove(allowed_user_ids, v_uid)
   where allowed_user_ids @> array[v_uid];
  update checklist_templates
     set assigned_drivers = array_remove(assigned_drivers, v_uid)
   where assigned_drivers @> array[v_uid];

  -- ---- Usunięcie danych osobowych ----
  delete from messages           where sender_id = v_uid;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('messages', v_n);
  delete from chat_members       where user_id = v_uid;
  delete from chat_reads         where user_id = v_uid;
  delete from driver_positions   where user_id = v_uid;
  delete from driver_tacho_events where driver_user_id = v_uid;
  delete from driver_expenses    where user_id = v_uid;
  delete from driver_assignments where user_id = v_uid;
  delete from parking_reviews    where user_id = v_uid;
  delete from poi_reviews        where user_id = v_uid;
  delete from passkeys           where user_id = v_uid;
  delete from expo_push_tokens   where user_id = v_uid;
  delete from push_subscriptions where user_id = v_uid;
  delete from notifications      where user_id = v_uid;
  delete from driver_profiles    where user_id = v_uid;

  -- Rekord kadrowy (zaszyfrowane imię, nazwisko, dokumenty).
  delete from drivers where user_id = v_uid;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('drivers', v_n);

  -- Wątki czatu założone przez użytkownika — `created_by` jest NOT NULL,
  -- więc nie da się ich odpiąć; kasujemy wraz z zawartością.
  delete from messages m using chat_threads t
   where m.thread_id = t.id and t.created_by = v_uid;
  delete from chat_members m using chat_threads t
   where m.thread_id = t.id and t.created_by = v_uid;
  delete from chat_reads c using chat_threads t
   where c.thread_id = t.id and t.created_by = v_uid;
  delete from chat_threads where created_by = v_uid;

  delete from memberships where user_id = v_uid;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('memberships', v_n);

  -- Pliki użytkownika (avatar). Zdjęcia ładunku i dokumenty należą do firmy
  -- i zostają — usuwane są tylko razem z firmą.
  delete from storage.objects where bucket_id = 'avatars' and owner = v_uid;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('avatars', v_n);

  delete from profiles where id = v_uid;

  -- Ślad wykonania — bez danych osobowych.
  insert into account_deletions (user_id, deleted_company, counts)
  values (v_uid, v_dropped, v_counts)
  on conflict (user_id) do update
    set deleted_at = now(), deleted_company = excluded.deleted_company, counts = excluded.counts;

  -- Konto logowania na końcu; kasuje też sesje i tokeny odświeżania (FK w schemacie auth).
  delete from auth.users where id = v_uid;

  return v_counts;
end;
$$;

revoke all on function public.delete_my_account(text, boolean) from public, anon;
grant execute on function public.delete_my_account(text, boolean) to authenticated;

comment on function public.delete_my_account(text, boolean) is
  'Usuwa konto zalogowanego użytkownika i jego dane osobowe. Zapisy operacyjne firmy '
  'zostają odpięte od osoby. Wymaga p_confirm = ''DELETE''. App Store 5.1.1(v).';
