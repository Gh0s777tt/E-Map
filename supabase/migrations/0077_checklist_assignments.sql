-- ════════════════════════════════════════════════════════════════════
--  0077 · #338 Przypisania checklist per kierowca + włącz/wyłącz.
--  • assigned_drivers uuid[] — pusta = dla WSZYSTKICH (zgodność wstecz),
--    niepusta = tylko wskazani kierowcy (np. ADR tylko dla ADR, UK tylko
--    dla jeżdżących do UK). Kolumna `active` (0060) = globalny włącznik.
--  • RPC list_visible_checklist_templates() — kierowca dostaje TYLKO aktywne
--    i przypisane do niego szablony; zarząd widzi wszystkie aktywne.
-- ════════════════════════════════════════════════════════════════════

alter table checklist_templates
  add column if not exists assigned_drivers uuid[] not null default '{}';

create or replace function public.list_visible_checklist_templates()
returns table (id uuid, name text, items jsonb, active boolean, assigned_drivers uuid[])
language sql security definer set search_path = public, extensions stable as $$
  select t.id, t.name, t.items, t.active, t.assigned_drivers
  from checklist_templates t
  join memberships mem
    on mem.company_id = t.company_id
   and mem.user_id = auth.uid()
   and mem.status = 'active'
  where t.active
    and (
      mem.role in ('owner', 'dispatcher')
      or coalesce(array_length(t.assigned_drivers, 1), 0) = 0
      or exists (
        select 1 from drivers d
        where d.user_id = auth.uid()
          and d.company_id = t.company_id
          and d.id = any(t.assigned_drivers)
      )
    )
  order by t.name;
$$;

grant execute on function public.list_visible_checklist_templates() to authenticated;
