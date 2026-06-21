-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0005 · Zaproszenia kierowców (link/QR)
--  Owner/spedytor generuje token (hash w bazie), kierowca akceptuje po loginie.
-- ════════════════════════════════════════════════════════════════════

-- Tworzy zaproszenie i zwraca surowy token (pokazywany raz; w bazie tylko hash).
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
  insert into invites (company_id, email, vehicle_id, role, token_hash, expires_at)
    values (cid, p_email, p_vehicle, p_role, encode(digest(tok, 'sha256'), 'hex'),
            now() + interval '7 days');
  return tok;
end; $$;

-- Akceptuje zaproszenie: dołącza zalogowanego usera do firmy (membership) wg tokenu.
create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare inv invites%rowtype;
begin
  select * into inv from invites
    where token_hash = encode(digest(p_token, 'sha256'), 'hex')
      and accepted_at is null and expires_at > now()
    limit 1;
  if inv.id is null then raise exception 'Zaproszenie nieważne lub wygasłe'; end if;

  insert into memberships (company_id, user_id, role, status)
    values (inv.company_id, auth.uid(), inv.role, 'active')
    on conflict (company_id, user_id) do nothing;
  update invites set accepted_at = now() where id = inv.id;

  if inv.vehicle_id is not null then
    insert into driver_assignments (vehicle_id, user_id, active)
      values (inv.vehicle_id, auth.uid(), true);
  end if;

  return inv.company_id;
end; $$;
