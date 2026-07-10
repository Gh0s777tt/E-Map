-- 0062: granularne uprawnienia per członek (#276) — właściciel nadaje każdemu
-- kierowcy/pracownikowi poziom per moduł: none / view / edit (jsonb, klucze z
-- APP_MODULES w core). Zarząd (owner/dispatcher) zawsze pełne uprawnienia.

alter table memberships add column if not exists permissions jsonb not null default '{}'::jsonb;

-- company_members: dokładamy kolumnę permissions (zmiana kształtu TABLE ⇒ drop+create).
drop function if exists company_members();
create function company_members()
returns table(user_id uuid, email text, role role, modules text[], permissions jsonb, status text)
language sql
stable security definer
set search_path to 'public'
as $$
  select m.user_id, u.email::text, m.role, m.modules, m.permissions, m.status
  from memberships m
  join auth.users u on u.id = m.user_id
  where m.status = 'active'
    and exists (
      select 1 from memberships me
      where me.user_id = auth.uid() and me.company_id = m.company_id
        and me.status = 'active' and me.role in ('owner','dispatcher')
    )
  order by m.role, u.email;
$$;

revoke all on function company_members() from public, anon;
grant execute on function company_members() to authenticated;
