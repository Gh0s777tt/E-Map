-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0084 · Kontrola dostępu członków (#365 audyt → priorytet #1)
--  Domyka lukę: brak sposobu odcięcia dostępu byłemu członkowi firmy.
--  Enum membership_status ma 'disabled', a helpery RLS (is_member_of/
--  has_role/is_developer, 0002) wymagają status='active' → ustawienie
--  'disabled' realnie odcina cały dostęp (dane firmy + PIN-y kart).
--  Do tej pory NIC nie ustawiało 'disabled' z aplikacji. Dokładamy:
--   • set_member_status  — owner zawiesza/przywraca dostęp członka (guardy + audyt)
--   • revoke_invite      — owner/dyspozytor cofa oczekujące zaproszenie (audyt)
--  Oba SECURITY DEFINER (omijają RLS, autoryzacja wewnątrz). Idempotentne.
-- ════════════════════════════════════════════════════════════════════

-- ── set_member_status: zawieś (disabled) / przywróć (active) dostęp członka ──
-- Guardy: tylko owner; nie własne konto; nie właściciel; tylko active⇄disabled.
create or replace function public.set_member_status(p_user uuid, p_status membership_status)
returns void language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  tgt_role role;
begin
  if p_status not in ('active', 'disabled') then
    raise exception 'Dozwolone tylko active/disabled (nie %).', p_status;
  end if;

  -- Firma wywołującego jako aktywny właściciel (jedyna rola mogąca zmieniać dostęp).
  select company_id into cid
  from memberships
  where user_id = auth.uid() and status = 'active' and role = 'owner'
  limit 1;
  if cid is null then
    raise exception 'Tylko właściciel może zmieniać dostęp członków.';
  end if;

  if p_user = auth.uid() then
    raise exception 'Nie możesz zmienić własnego dostępu.';
  end if;

  select role into tgt_role
  from memberships
  where company_id = cid and user_id = p_user;
  if not found then
    raise exception 'Nie ma takiego członka w firmie.';
  end if;

  -- Właściciela nie zawieszamy (ochrona przed utratą kontroli nad firmą).
  if tgt_role = 'owner' then
    raise exception 'Nie można zmienić dostępu właściciela.';
  end if;

  update memberships set status = p_status
  where company_id = cid and user_id = p_user;

  insert into audit_log (company_id, actor_id, action, target)
  values (
    cid,
    auth.uid(),
    'member.' || (case when p_status = 'disabled' then 'suspend' else 'reactivate' end),
    p_user::text
  );
end; $$;

-- Domyślnie Postgres nadaje EXECUTE roli PUBLIC (anon dziedziczy) → odbieramy
-- od PUBLIC i nadajemy tylko authenticated (guard i tak blokuje anon, ale to
-- defense-in-depth zgodne z intencją).
revoke execute on function public.set_member_status(uuid, membership_status) from public;
grant execute on function public.set_member_status(uuid, membership_status) to authenticated;

-- ── revoke_invite: cofnij oczekujące zaproszenie (wygaś natychmiast) ──────────
-- Wygaszamy (expires_at = now()) zamiast kasować — accept_invite wymaga
-- expires_at > now(), więc to realne cofnięcie, a wiersz zostaje jako ślad.
create or replace function public.revoke_invite(p_invite uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
begin
  select company_id into cid from invites where id = p_invite;
  if cid is null then
    raise exception 'Nie ma takiego zaproszenia.';
  end if;
  if not public.has_role(cid, array['owner', 'dispatcher']::role[]) then
    raise exception 'Brak uprawnień do zaproszeń.';
  end if;

  update invites set expires_at = now()
  where id = p_invite and accepted_at is null;

  insert into audit_log (company_id, actor_id, action, target)
  values (cid, auth.uid(), 'invite.revoke', p_invite::text);
end; $$;

revoke execute on function public.revoke_invite(uuid) from public;
grant execute on function public.revoke_invite(uuid) to authenticated;
