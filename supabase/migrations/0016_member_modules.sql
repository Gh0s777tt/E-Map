-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0016 · Uprawnienia modułowe (moduły per członek)
--  Właściciel decyduje, do których paneli/modułów ma dostęp dany członek.
--  `modules = null` → domyślny zestaw wg roli (liczony w aplikacji).
--  Twarda izolacja danych nadal przez RLS wg roli (owner/dispatcher/driver);
--  moduły sterują widocznością paneli (UI) + dostępem do funkcji zarządczych.
-- ════════════════════════════════════════════════════════════════════

alter table memberships add column if not exists modules text[];

-- Lista członków firmy z e-mailem (auth.users) — tylko dla owner/dispatcher.
create or replace function public.company_members()
returns table (user_id uuid, email text, role role, modules text[], status text)
language sql stable security definer set search_path = public as $$
  select m.user_id, u.email::text, m.role, m.modules, m.status
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
