-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0013 · Hardening RLS — izolacja danych i prywatność
--  Zasady:
--   • Właściciel: widzi wszystko w swojej firmie.
--   • Kierowca: tylko swoje auto (driver_assignments) + tylko swoje formularze
--     (driver_id = auth.uid()); nie widzi rabatów kart ani danych innych kierowców.
--   • Developer: NIE widzi danych firm/kierowców/wrażliwych — tylko agregaty
--     diagnostyczne (dev_stats). Dlatego usuwamy `is_developer()` z polityk
--     dotyczących danych firmowych i z funkcji odczytu/zapisu PIN.
-- ════════════════════════════════════════════════════════════════════

-- ── companies ───────────────────────────────────────────────────────
drop policy if exists companies_select on companies;
create policy companies_select on companies for select to authenticated
  using (is_member_of(id));
drop policy if exists companies_update on companies;
create policy companies_update on companies for update to authenticated
  using (has_role(id, array['owner']::role[]));
drop policy if exists companies_delete on companies;
create policy companies_delete on companies for delete to authenticated
  using (has_role(id, array['owner']::role[]));

-- ── profiles ────────────────────────────────────────────────────────
drop policy if exists profiles_select_self on profiles;
create policy profiles_select_self on profiles for select to authenticated
  using (id = auth.uid());

-- ── memberships ─────────────────────────────────────────────────────
drop policy if exists memberships_select on memberships;
create policy memberships_select on memberships for select to authenticated
  using (user_id = auth.uid() or has_role(company_id, array['owner','dispatcher']::role[]));
drop policy if exists memberships_write on memberships;
create policy memberships_write on memberships for all to authenticated
  using (has_role(company_id, array['owner']::role[]))
  with check (has_role(company_id, array['owner']::role[]));

-- ── vehicles: kierowca widzi tylko PRZYPISANE auto ──────────────────
drop policy if exists vehicles_select on vehicles;
create policy vehicles_select on vehicles for select to authenticated
  using (
    has_role(company_id, array['owner','dispatcher']::role[])
    or exists (
      select 1 from driver_assignments da
      where da.vehicle_id = vehicles.id and da.user_id = auth.uid() and da.active
    )
  );
drop policy if exists vehicles_write on vehicles;
create policy vehicles_write on vehicles for all to authenticated
  using (has_role(company_id, array['owner','dispatcher']::role[]))
  with check (has_role(company_id, array['owner','dispatcher']::role[]));

-- ── driver_profiles ─────────────────────────────────────────────────
drop policy if exists driver_profiles_select on driver_profiles;
create policy driver_profiles_select on driver_profiles for select to authenticated
  using (
    user_id = auth.uid() or exists (
      select 1 from memberships m_self
      join memberships m_drv on m_self.company_id = m_drv.company_id
      where m_self.user_id = auth.uid()
        and m_self.role in ('owner','dispatcher')
        and m_drv.user_id = driver_profiles.user_id
    )
  );
drop policy if exists driver_profiles_update on driver_profiles;
create policy driver_profiles_update on driver_profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── driver_assignments ──────────────────────────────────────────────
drop policy if exists driver_assignments_select on driver_assignments;
create policy driver_assignments_select on driver_assignments for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from vehicles v where v.id = vehicle_id
               and has_role(v.company_id, array['owner','dispatcher']::role[]))
  );
drop policy if exists driver_assignments_write on driver_assignments;
create policy driver_assignments_write on driver_assignments for all to authenticated
  using (exists (select 1 from vehicles v where v.id = vehicle_id
                 and has_role(v.company_id, array['owner','dispatcher']::role[])))
  with check (exists (select 1 from vehicles v where v.id = vehicle_id
                 and has_role(v.company_id, array['owner','dispatcher']::role[])));

-- ── fuel_cards: czytelne tylko dla owner/dispatcher (rabaty ukryte przed kierowcą) ──
drop policy if exists fuel_cards_select on fuel_cards;
create policy fuel_cards_select on fuel_cards for select to authenticated
  using (has_role(company_id, array['owner','dispatcher']::role[]));
drop policy if exists fuel_cards_write on fuel_cards;
create policy fuel_cards_write on fuel_cards for all to authenticated
  using (has_role(company_id, array['owner']::role[]))
  with check (has_role(company_id, array['owner']::role[]));

-- ── card_assignments ────────────────────────────────────────────────
drop policy if exists card_assignments_select on card_assignments;
create policy card_assignments_select on card_assignments for select to authenticated
  using (exists (select 1 from fuel_cards c where c.id = fuel_card_id
                 and has_role(c.company_id, array['owner','dispatcher']::role[])));
drop policy if exists card_assignments_write on card_assignments;
create policy card_assignments_write on card_assignments for all to authenticated
  using (exists (select 1 from fuel_cards c where c.id = fuel_card_id
                 and has_role(c.company_id, array['owner']::role[])))
  with check (exists (select 1 from fuel_cards c where c.id = fuel_card_id
                 and has_role(c.company_id, array['owner']::role[])));

-- ── Formularze: kierowca tylko swoje; owner/dispatcher cała firma ────
drop policy if exists fuel_logs_select on fuel_logs;
create policy fuel_logs_select on fuel_logs for select to authenticated
  using (driver_id = auth.uid() or has_role(company_id, array['owner','dispatcher']::role[]));
drop policy if exists fuel_logs_update on fuel_logs;
create policy fuel_logs_update on fuel_logs for update to authenticated
  using (driver_id = auth.uid() or has_role(company_id, array['owner']::role[]));
drop policy if exists fuel_logs_delete on fuel_logs;
create policy fuel_logs_delete on fuel_logs for delete to authenticated
  using (has_role(company_id, array['owner']::role[]));

drop policy if exists adblue_logs_select on adblue_logs;
create policy adblue_logs_select on adblue_logs for select to authenticated
  using (driver_id = auth.uid() or has_role(company_id, array['owner','dispatcher']::role[]));
drop policy if exists adblue_logs_update on adblue_logs;
create policy adblue_logs_update on adblue_logs for update to authenticated
  using (driver_id = auth.uid() or has_role(company_id, array['owner']::role[]));
drop policy if exists adblue_logs_delete on adblue_logs;
create policy adblue_logs_delete on adblue_logs for delete to authenticated
  using (has_role(company_id, array['owner']::role[]));

drop policy if exists trip_events_select on trip_events;
create policy trip_events_select on trip_events for select to authenticated
  using (driver_id = auth.uid() or has_role(company_id, array['owner','dispatcher']::role[]));
drop policy if exists trip_events_update on trip_events;
create policy trip_events_update on trip_events for update to authenticated
  using (driver_id = auth.uid() or has_role(company_id, array['owner']::role[]));
drop policy if exists trip_events_delete on trip_events;
create policy trip_events_delete on trip_events for delete to authenticated
  using (has_role(company_id, array['owner']::role[]));

-- ── Rewizje (bez is_developer) ──────────────────────────────────────
drop policy if exists fuel_log_rev_select on fuel_log_revisions;
create policy fuel_log_rev_select on fuel_log_revisions for select to authenticated
  using (exists (select 1 from fuel_logs f where f.id = fuel_log_id
         and (f.driver_id = auth.uid() or has_role(f.company_id, array['owner','dispatcher']::role[]))));
drop policy if exists adblue_log_rev_select on adblue_log_revisions;
create policy adblue_log_rev_select on adblue_log_revisions for select to authenticated
  using (exists (select 1 from adblue_logs f where f.id = adblue_log_id
         and (f.driver_id = auth.uid() or has_role(f.company_id, array['owner','dispatcher']::role[]))));
drop policy if exists trip_event_rev_select on trip_event_revisions;
create policy trip_event_rev_select on trip_event_revisions for select to authenticated
  using (exists (select 1 from trip_events t where t.id = trip_event_id
         and (t.driver_id = auth.uid() or has_role(t.company_id, array['owner','dispatcher']::role[]))));

-- ── rates / invites / audit (bez is_developer) ──────────────────────
drop policy if exists rates_select on rates;
create policy rates_select on rates for select to authenticated
  using (is_member_of(company_id));
drop policy if exists rates_write on rates;
create policy rates_write on rates for all to authenticated
  using (has_role(company_id, array['owner']::role[]))
  with check (has_role(company_id, array['owner']::role[]));

drop policy if exists invites_select on invites;
create policy invites_select on invites for select to authenticated
  using (has_role(company_id, array['owner','dispatcher']::role[]));
drop policy if exists invites_write on invites;
create policy invites_write on invites for all to authenticated
  using (has_role(company_id, array['owner','dispatcher']::role[]))
  with check (has_role(company_id, array['owner','dispatcher']::role[]));

drop policy if exists audit_log_select on audit_log;
create policy audit_log_select on audit_log for select to authenticated
  using (has_role(company_id, array['owner']::role[]));

-- ── drivers (kartoteka, 0012) — bez is_developer ────────────────────
drop policy if exists drivers_select on drivers;
create policy drivers_select on drivers for select to authenticated
  using (has_role(company_id, array['owner','dispatcher']::role[]));
drop policy if exists drivers_write on drivers;
create policy drivers_write on drivers for all to authenticated
  using (has_role(company_id, array['owner','dispatcher']::role[]))
  with check (has_role(company_id, array['owner','dispatcher']::role[]));

-- ── PIN: czytają członkowie firmy (kierowca też — automaty); developer NIE ──
create or replace function public.fuel_card_pin(p_card uuid)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare cid uuid; res text;
begin
  select company_id into cid from fuel_cards where id = p_card;
  if not public.is_member_of(cid) then
    raise exception 'Brak uprawnień do PIN-u tej karty';
  end if;
  select pgp_sym_decrypt(pin_encrypted, public._card_key()) into res
    from fuel_cards where id = p_card;
  insert into audit_log (company_id, actor_id, action, target)
    values (cid, auth.uid(), 'fuel_card.read_pin', p_card::text);
  return res;
end; $$;

-- ── PIN ustawia tylko owner (developer NIE) ─────────────────────────
create or replace function public.fuel_card_set_pin(p_card uuid, p_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare cid uuid;
begin
  select company_id into cid from fuel_cards where id = p_card;
  if cid is null then raise exception 'Karta nie istnieje'; end if;
  if not public.has_role(cid, array['owner']::role[]) then
    raise exception 'Brak uprawnień: PIN może ustawiać tylko właściciel';
  end if;
  update fuel_cards set pin_encrypted = pgp_sym_encrypt(p_pin, public._card_key())
    where id = p_card;
  insert into audit_log (company_id, actor_id, action, target)
    values (cid, auth.uid(), 'fuel_card.set_pin', p_card::text);
end; $$;

-- ── Karty dla użytkownika: kierowca → tylko karty swojego auta, BEZ rabatu ──
create or replace function public.list_fuel_cards_for_user()
returns table (
  id uuid,
  provider fuel_card_provider,
  card_number_masked text,
  valid_until date,
  discount_percent numeric,
  vehicle_id uuid,
  registration text
)
language sql stable security definer set search_path = public as $$
  select
    c.id, c.provider, c.card_number_masked, c.valid_until,
    case
      when public.has_role(c.company_id, array['owner','dispatcher']::role[])
        then c.discount_percent
      else null
    end as discount_percent,
    c.vehicle_id, v.registration
  from fuel_cards c
  left join vehicles v on v.id = c.vehicle_id
  where public.is_member_of(c.company_id)
    and (
      public.has_role(c.company_id, array['owner','dispatcher']::role[])
      or exists (
        select 1 from driver_assignments da
        where da.vehicle_id = c.vehicle_id and da.user_id = auth.uid() and da.active
      )
    )
  order by c.provider;
$$;
