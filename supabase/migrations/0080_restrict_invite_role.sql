-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0080 · Ograniczenie roli nadawanej przez zaproszenie
--  (audyt 2026-07-16, znalezisko Ś15 — eskalacja uprawnień)
--
--  Problem: create_invite/accept_invite (0063) nie walidowały wartości
--  p_role względem uprawnień zapraszającego. Skutki:
--   • dispatcher mógł utworzyć zaproszenie z p_role='owner' i zaakceptować
--     je na drugim koncie → pionowa eskalacja w obrębie tenanta;
--   • dowolny owner/dispatcher mógł nadać GLOBALNĄ rolę 'developer'
--     (is_developer() sprawdza rolę w DOWOLNEJ firmie) → dostęp cross-tenant.
--  Ten sam wektor istniał bezpośrednio przez politykę memberships_write (0013),
--  która pozwalała ownerowi zrobić INSERT/UPDATE membership z rolą 'developer'
--  z pominięciem create_invite.
--
--  Naprawa (defense-in-depth, 3 warstwy):
--   1. create_invite — twardy guard: 'developer' nigdy tym torem; 'owner' tylko
--      gdy zapraszający sam jest ownerem (domyślnie rola ≤ zapraszający).
--   2. accept_invite — odrzucenie roli 'developer' dla zaproszeń utworzonych
--      PRZED tą migracją (funkcja jest SECURITY DEFINER → omija RLS memberships).
--   3. memberships_write (RLS) — zakaz nadawania 'developer' przez klienta.
--
--  Provisioning roli 'developer' pozostaje wyłącznie out-of-band (SQL/dashboard,
--  service_role omija RLS). Sygnatury funkcji bez zmian → create or replace.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. create_invite: guard eskalacji roli ─────────────────────────────
create or replace function create_invite(
  p_role role default 'driver'::role,
  p_vehicle uuid default null,
  p_email text default null,
  p_permissions jsonb default '{}'::jsonb
) returns text
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare cid uuid; tok text; caller_role role;
begin
  -- Firma ORAZ rola zapraszającego z jednego wiersza (spójne cid ↔ caller_role).
  select company_id, role into cid, caller_role
    from memberships
    where user_id = auth.uid() and status = 'active' and role in ('owner', 'dispatcher')
    limit 1;
  if cid is null then raise exception 'Brak uprawnień do zapraszania'; end if;

  -- Przez zaproszenie nie można nadać roli silniejszej niż własna.
  -- 'developer' to rola GLOBALNA (cross-tenant) — nigdy tym torem.
  if p_role = 'developer'::role then
    raise exception 'Rola developer nie może być nadana przez zaproszenie';
  end if;
  -- 'owner' wolno nadać wyłącznie gdy zapraszający sam jest ownerem
  -- (dispatcher może nadać najwyżej dispatcher/driver).
  if p_role = 'owner'::role and caller_role <> 'owner'::role then
    raise exception 'Tylko właściciel może zapraszać właściciela';
  end if;

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

-- ── 2. accept_invite: odrzuć stare zaproszenia z rolą developer ─────────
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

  -- Defense-in-depth: zaproszenia z rolą 'developer' utworzone PRZED tą migracją
  -- nie mogą być zrealizowane. Funkcja jest SECURITY DEFINER → omija RLS
  -- memberships_write, więc guard musi być tutaj jawnie. 'owner' NIE blokujemy:
  -- legalne zaproszenia ownera (utworzone przez ownera) muszą pozostać ważne.
  if inv.role = 'developer'::role then
    raise exception 'Zaproszenie z rolą developer jest niedozwolone';
  end if;

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

revoke all on function accept_invite(text) from public, anon;
grant execute on function accept_invite(text) to authenticated;

-- ── 3. memberships_write (RLS): domknięcie bezpośredniego wektora ────────
-- Zapis memberships pozostaje bramkowany has_role(owner) (bez zmian w USING),
-- więc nadanie 'owner' jest już wyłącznie w gestii ownera. Dokładamy twardy
-- zakaz nadawania 'developer' przez klienta. Out-of-band provisioning (service_role)
-- omija RLS, więc nie jest tym objęty. DELETE nadal dozwolony dla ownera.
drop policy if exists memberships_write on memberships;
create policy memberships_write on memberships for all to authenticated
  using (has_role(company_id, array['owner']::role[]))
  with check (has_role(company_id, array['owner']::role[]) and role <> 'developer'::role);

-- ── 4. Jednorazowe unieważnienie zaległych zaproszeń owner/developer ─────
-- (przegląd 2026-07-16) Zaproszenia z rolą owner/developer utworzone PRZED tą
-- migracją (gdy 0063 nie walidował roli) mogły powstać z eskalacji (np. dispatcher
-- → owner) i nadal byłyby realizowalne w accept_invite (który blokuje tylko
-- 'developer'). Nie da się retroaktywnie odróżnić legalnych od złośliwych, więc
-- wygaszamy WSZYSTKIE oczekujące takie zaproszenia — właściciel wyda ponownie
-- (teraz z pełną walidacją create_invite). Domyka resztkowe okno eskalacji do ownera.
update invites set expires_at = now()
  where accepted_at is null and role in ('owner'::role, 'developer'::role);
