-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0002 · RLS, funkcje pomocnicze, bezpieczny PIN
--  Multi-tenant: kierowca widzi swoje, spedytor/owner swoją firmę.
-- ════════════════════════════════════════════════════════════════════

-- ── Funkcje pomocnicze (SECURITY DEFINER → omijają RLS, brak rekursji) ──

create or replace function public.is_member_of(p_company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.user_id = auth.uid() and m.company_id = p_company and m.status = 'active'
  );
$$;

create or replace function public.has_role(p_company uuid, p_roles role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.user_id = auth.uid() and m.company_id = p_company
      and m.status = 'active' and m.role = any (p_roles)
  );
$$;

create or replace function public.is_developer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.user_id = auth.uid() and m.role = 'developer' and m.status = 'active'
  );
$$;

-- ── Bootstrap firmy (rozwiązuje problem jajka i kury dla membership) ──
create or replace function public.bootstrap_company(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  insert into companies (name) values (p_name) returning id into cid;
  insert into memberships (company_id, user_id, role, status)
    values (cid, auth.uid(), 'owner', 'active');
  return cid;
end; $$;

-- ── PIN kart paliwowych: szyfrowanie + dostęp tylko owner + audyt ────
-- Klucz: docelowo Supabase Vault. Tu: current_setting('app.card_key').
create or replace function public._card_key()
returns text language sql stable as $$
  select current_setting('app.card_key', true);
$$;

create or replace function public.fuel_card_set_pin(p_card uuid, p_pin text)
returns void language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select company_id into cid from fuel_cards where id = p_card;
  if cid is null then raise exception 'Karta nie istnieje'; end if;
  if not (public.has_role(cid, array['owner']::role[]) or public.is_developer()) then
    raise exception 'Brak uprawnień: PIN może ustawiać tylko właściciel';
  end if;
  update fuel_cards set pin_encrypted = pgp_sym_encrypt(p_pin, public._card_key())
    where id = p_card;
  insert into audit_log (company_id, actor_id, action, target)
    values (cid, auth.uid(), 'fuel_card.set_pin', p_card::text);
end; $$;

create or replace function public.fuel_card_pin(p_card uuid)
returns text language plpgsql security definer set search_path = public as $$
declare cid uuid; res text;
begin
  select company_id into cid from fuel_cards where id = p_card;
  if not (public.has_role(cid, array['owner']::role[]) or public.is_developer()) then
    raise exception 'Brak uprawnień: PIN widzi tylko właściciel';
  end if;
  select pgp_sym_decrypt(pin_encrypted, public._card_key()) into res
    from fuel_cards where id = p_card;
  insert into audit_log (company_id, actor_id, action, target)
    values (cid, auth.uid(), 'fuel_card.read_pin', p_card::text);
  return res;
end; $$;

-- ════════════════════════════════════════════════════════════════════
--  Włączenie RLS
-- ════════════════════════════════════════════════════════════════════
alter table companies            enable row level security;
alter table profiles             enable row level security;
alter table memberships          enable row level security;
alter table vehicles             enable row level security;
alter table driver_profiles      enable row level security;
alter table driver_assignments   enable row level security;
alter table fuel_cards           enable row level security;
alter table card_assignments     enable row level security;
alter table fuel_logs            enable row level security;
alter table adblue_logs          enable row level security;
alter table trip_events          enable row level security;
alter table fuel_log_revisions   enable row level security;
alter table adblue_log_revisions enable row level security;
alter table trip_event_revisions enable row level security;
alter table rates                enable row level security;
alter table pois                 enable row level security;
alter table poi_reviews          enable row level security;
alter table fuel_prices          enable row level security;
alter table map_reports          enable row level security;
alter table invites              enable row level security;
alter table audit_log            enable row level security;

-- ── companies ───────────────────────────────────────────────────────
create policy companies_select on companies for select to authenticated
  using (is_member_of(id) or is_developer());
create policy companies_update on companies for update to authenticated
  using (has_role(id, array['owner']::role[]) or is_developer());
create policy companies_delete on companies for delete to authenticated
  using (has_role(id, array['owner']::role[]) or is_developer());

-- ── profiles ────────────────────────────────────────────────────────
create policy profiles_select_self on profiles for select to authenticated
  using (id = auth.uid() or is_developer());
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid());

-- ── memberships ─────────────────────────────────────────────────────
create policy memberships_select on memberships for select to authenticated
  using (user_id = auth.uid() or has_role(company_id, array['owner','dispatcher']::role[]) or is_developer());
create policy memberships_write on memberships for all to authenticated
  using (has_role(company_id, array['owner']::role[]) or is_developer())
  with check (has_role(company_id, array['owner']::role[]) or is_developer());

-- ── vehicles ────────────────────────────────────────────────────────
create policy vehicles_select on vehicles for select to authenticated
  using (is_member_of(company_id) or is_developer());
create policy vehicles_write on vehicles for all to authenticated
  using (has_role(company_id, array['owner','dispatcher']::role[]) or is_developer())
  with check (has_role(company_id, array['owner','dispatcher']::role[]) or is_developer());

-- ── driver_profiles ─────────────────────────────────────────────────
create policy driver_profiles_select on driver_profiles for select to authenticated
  using (
    user_id = auth.uid() or is_developer() or exists (
      select 1 from memberships m_self
      join memberships m_drv on m_self.company_id = m_drv.company_id
      where m_self.user_id = auth.uid()
        and m_self.role in ('owner','dispatcher')
        and m_drv.user_id = driver_profiles.user_id
    )
  );
create policy driver_profiles_update on driver_profiles for all to authenticated
  using (user_id = auth.uid() or is_developer())
  with check (user_id = auth.uid() or is_developer());

-- ── driver_assignments ──────────────────────────────────────────────
create policy driver_assignments_select on driver_assignments for select to authenticated
  using (
    user_id = auth.uid() or is_developer()
    or exists (select 1 from vehicles v where v.id = vehicle_id and is_member_of(v.company_id))
  );
create policy driver_assignments_write on driver_assignments for all to authenticated
  using (exists (select 1 from vehicles v where v.id = vehicle_id
                 and has_role(v.company_id, array['owner','dispatcher']::role[])) or is_developer())
  with check (exists (select 1 from vehicles v where v.id = vehicle_id
                 and has_role(v.company_id, array['owner','dispatcher']::role[])) or is_developer());

-- ── fuel_cards (ciphertext bezpieczny; zapis tylko owner) ───────────
create policy fuel_cards_select on fuel_cards for select to authenticated
  using (is_member_of(company_id) or is_developer());
create policy fuel_cards_write on fuel_cards for all to authenticated
  using (has_role(company_id, array['owner']::role[]) or is_developer())
  with check (has_role(company_id, array['owner']::role[]) or is_developer());

-- ── card_assignments ────────────────────────────────────────────────
create policy card_assignments_select on card_assignments for select to authenticated
  using (exists (select 1 from fuel_cards c where c.id = fuel_card_id and is_member_of(c.company_id)) or is_developer());
create policy card_assignments_write on card_assignments for all to authenticated
  using (exists (select 1 from fuel_cards c where c.id = fuel_card_id and has_role(c.company_id, array['owner']::role[])) or is_developer())
  with check (exists (select 1 from fuel_cards c where c.id = fuel_card_id and has_role(c.company_id, array['owner']::role[])) or is_developer());

-- ── Formularze: kierowca widzi/edytuje swoje, owner/spedytor całą firmę ──
create policy fuel_logs_select on fuel_logs for select to authenticated
  using (driver_id = auth.uid() or has_role(company_id, array['owner','dispatcher']::role[]) or is_developer());
create policy fuel_logs_insert on fuel_logs for insert to authenticated
  with check (driver_id = auth.uid() and is_member_of(company_id));
create policy fuel_logs_update on fuel_logs for update to authenticated
  using (driver_id = auth.uid() or has_role(company_id, array['owner']::role[]) or is_developer());
create policy fuel_logs_delete on fuel_logs for delete to authenticated
  using (has_role(company_id, array['owner']::role[]) or is_developer());

create policy adblue_logs_select on adblue_logs for select to authenticated
  using (driver_id = auth.uid() or has_role(company_id, array['owner','dispatcher']::role[]) or is_developer());
create policy adblue_logs_insert on adblue_logs for insert to authenticated
  with check (driver_id = auth.uid() and is_member_of(company_id));
create policy adblue_logs_update on adblue_logs for update to authenticated
  using (driver_id = auth.uid() or has_role(company_id, array['owner']::role[]) or is_developer());
create policy adblue_logs_delete on adblue_logs for delete to authenticated
  using (has_role(company_id, array['owner']::role[]) or is_developer());

create policy trip_events_select on trip_events for select to authenticated
  using (driver_id = auth.uid() or has_role(company_id, array['owner','dispatcher']::role[]) or is_developer());
create policy trip_events_insert on trip_events for insert to authenticated
  with check (driver_id = auth.uid() and is_member_of(company_id));
create policy trip_events_update on trip_events for update to authenticated
  using (driver_id = auth.uid() or has_role(company_id, array['owner']::role[]) or is_developer());
create policy trip_events_delete on trip_events for delete to authenticated
  using (has_role(company_id, array['owner']::role[]) or is_developer());

-- ── Rewizje (widoczne, gdy widoczny formularz nadrzędny) ────────────
create policy fuel_log_rev_select on fuel_log_revisions for select to authenticated
  using (exists (select 1 from fuel_logs f where f.id = fuel_log_id
         and (f.driver_id = auth.uid() or has_role(f.company_id, array['owner','dispatcher']::role[]) or is_developer())));
create policy fuel_log_rev_insert on fuel_log_revisions for insert to authenticated
  with check (exists (select 1 from fuel_logs f where f.id = fuel_log_id
         and (f.driver_id = auth.uid() or has_role(f.company_id, array['owner']::role[]))));

create policy adblue_log_rev_select on adblue_log_revisions for select to authenticated
  using (exists (select 1 from adblue_logs f where f.id = adblue_log_id
         and (f.driver_id = auth.uid() or has_role(f.company_id, array['owner','dispatcher']::role[]) or is_developer())));
create policy adblue_log_rev_insert on adblue_log_revisions for insert to authenticated
  with check (exists (select 1 from adblue_logs f where f.id = adblue_log_id
         and (f.driver_id = auth.uid() or has_role(f.company_id, array['owner']::role[]))));

create policy trip_event_rev_select on trip_event_revisions for select to authenticated
  using (exists (select 1 from trip_events t where t.id = trip_event_id
         and (t.driver_id = auth.uid() or has_role(t.company_id, array['owner','dispatcher']::role[]) or is_developer())));
create policy trip_event_rev_insert on trip_event_revisions for insert to authenticated
  with check (exists (select 1 from trip_events t where t.id = trip_event_id
         and (t.driver_id = auth.uid() or has_role(t.company_id, array['owner']::role[]))));

-- ── rates ───────────────────────────────────────────────────────────
create policy rates_select on rates for select to authenticated
  using (is_member_of(company_id) or is_developer());
create policy rates_write on rates for all to authenticated
  using (has_role(company_id, array['owner']::role[]) or is_developer())
  with check (has_role(company_id, array['owner']::role[]) or is_developer());

-- ── Dane mapy/społeczności (współdzielone) ──────────────────────────
create policy pois_select on pois for select to authenticated using (true);
create policy pois_write on pois for all to authenticated
  using (is_developer()) with check (is_developer());

create policy poi_reviews_select on poi_reviews for select to authenticated using (true);
create policy poi_reviews_insert on poi_reviews for insert to authenticated
  with check (user_id = auth.uid());
create policy poi_reviews_modify on poi_reviews for update to authenticated
  using (user_id = auth.uid() or is_developer());
create policy poi_reviews_delete on poi_reviews for delete to authenticated
  using (user_id = auth.uid() or is_developer());

create policy fuel_prices_select on fuel_prices for select to authenticated using (true);
create policy fuel_prices_insert on fuel_prices for insert to authenticated with check (true);

create policy map_reports_select on map_reports for select to authenticated using (true);
create policy map_reports_insert on map_reports for insert to authenticated
  with check (reported_by = auth.uid());
create policy map_reports_delete on map_reports for delete to authenticated
  using (reported_by = auth.uid() or is_developer());

-- ── invites ─────────────────────────────────────────────────────────
create policy invites_select on invites for select to authenticated
  using (has_role(company_id, array['owner','dispatcher']::role[]) or is_developer());
create policy invites_write on invites for all to authenticated
  using (has_role(company_id, array['owner','dispatcher']::role[]) or is_developer())
  with check (has_role(company_id, array['owner','dispatcher']::role[]) or is_developer());

-- ── audit_log (odczyt owner; zapis przez funkcje/serwer) ────────────
create policy audit_log_select on audit_log for select to authenticated
  using (has_role(company_id, array['owner']::role[]) or is_developer());
