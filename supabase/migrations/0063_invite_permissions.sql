-- 0063: uprawnienia w zaproszeniu (#278, etap 2 matrycy #276) — właściciel
-- ustawia matrycę none/view/edit JUŻ przy zapraszaniu; accept_invite przenosi
-- ją na membership. Zmiana sygnatury create_invite ⇒ drop+create.

alter table invites add column if not exists permissions jsonb not null default '{}'::jsonb;

drop function if exists create_invite(role, uuid, text);
create function create_invite(
  p_role role default 'driver'::role,
  p_vehicle uuid default null,
  p_email text default null,
  p_permissions jsonb default '{}'::jsonb
) returns text
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare cid uuid; tok text;
begin
  select company_id into cid
    from memberships
    where user_id = auth.uid() and status = 'active' and role in ('owner', 'dispatcher')
    limit 1;
  if cid is null then raise exception 'Brak uprawnień do zapraszania'; end if;

  tok := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into invites (company_id, email_enc, vehicle_id, role, token_hash, expires_at, permissions)
    values (cid,
            case when nullif(p_email,'') is not null
                 then pgp_sym_encrypt(p_email, public._pii_key()) end,
            p_vehicle, p_role, encode(digest(tok, 'sha256'), 'hex'),
            now() + interval '7 days',
            coalesce(p_permissions, '{}'::jsonb));
  return tok;
end; $$;

revoke all on function create_invite(role, uuid, text, jsonb) from public, anon;
grant execute on function create_invite(role, uuid, text, jsonb) to authenticated;

create or replace function accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare inv invites%rowtype;
begin
  select * into inv from invites
    where token_hash = encode(digest(p_token, 'sha256'), 'hex')
      and accepted_at is null and expires_at > now()
    limit 1;
  if inv.id is null then raise exception 'Zaproszenie nieważne lub wygasłe'; end if;

  insert into memberships (company_id, user_id, role, status, permissions)
    values (inv.company_id, auth.uid(), inv.role, 'active', coalesce(inv.permissions, '{}'::jsonb))
    on conflict (company_id, user_id) do nothing;
  update invites set accepted_at = now() where id = inv.id;

  if inv.vehicle_id is not null then
    insert into driver_assignments (vehicle_id, user_id, active)
      values (inv.vehicle_id, auth.uid(), true);
  end if;

  return inv.company_id;
end; $$;
