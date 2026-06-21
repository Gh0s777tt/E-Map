-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0017 · Powiadomienia w aplikacji (centrum + realtime)
--  Wstawianie tylko przez funkcje SECURITY DEFINER (kontrola uprawnień);
--  użytkownik czyta i oznacza jako przeczytane wyłącznie swoje.
-- ════════════════════════════════════════════════════════════════════

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  severity    text not null default 'info',   -- info | warning | danger
  dedup_key   text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications(user_id, created_at desc);
create unique index if not exists notifications_dedup
  on notifications(user_id, dedup_key) where dedup_key is not null;

alter table notifications enable row level security;
drop policy if exists notifications_select on notifications;
create policy notifications_select on notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists notifications_update on notifications;
create policy notifications_update on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- brak polityki INSERT → klient nie wstawia bezpośrednio (tylko RPC poniżej)

-- ── Powiadom kadrę zarządzającą firmy (owner/dispatcher) ────────────
create or replace function public.notify_company(
  p_company uuid, p_type text, p_title text, p_body text, p_severity text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member_of(p_company) then
    raise exception 'Brak dostępu do firmy';
  end if;
  insert into notifications (company_id, user_id, type, title, body, severity)
  select p_company, m.user_id, p_type, p_title, p_body, coalesce(p_severity, 'info')
  from memberships m
  where m.company_id = p_company and m.status = 'active'
    and m.role in ('owner','dispatcher');
end; $$;

-- ── Wygeneruj powiadomienia o wygasających terminach (idempotentne) ──
create or replace function public.generate_expiry_notifications(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
declare horizon date := current_date + 30;
begin
  if not public.has_role(p_company, array['owner','dispatcher']::role[]) then
    return; -- ciche wyjście dla nie-zarządzających
  end if;

  -- Pojazdy: przegląd / OC / leasing
  insert into notifications (company_id, user_id, type, title, body, severity, dedup_key)
  select p_company, mgr.user_id, 'vehicle_expiry',
         'Termin pojazdu ' || v.registration,
         d.label || ': ' || to_char(d.due, 'YYYY-MM-DD'),
         case when d.due < current_date then 'danger' else 'warning' end,
         'veh:' || v.id || ':' || d.kind || ':' || to_char(d.due, 'YYYYMMDD')
  from vehicles v
  cross join lateral (values
    ('inspection','Przegląd', v.inspection_expiry),
    ('insurance','OC', v.insurance_expiry),
    ('leasing','Leasing', v.leasing_end)
  ) as d(kind, label, due)
  join memberships mgr on mgr.company_id = p_company and mgr.status='active'
    and mgr.role in ('owner','dispatcher')
  where v.company_id = p_company and d.due is not null and d.due <= horizon
  on conflict (user_id, dedup_key) do nothing;

  -- Karty: ważność
  insert into notifications (company_id, user_id, type, title, body, severity, dedup_key)
  select p_company, mgr.user_id, 'card_expiry',
         'Karta ' || c.provider || ' wygasa',
         'Ważna do: ' || to_char(c.valid_until, 'YYYY-MM-DD'),
         case when c.valid_until < current_date then 'danger' else 'warning' end,
         'card:' || c.id || ':' || to_char(c.valid_until, 'YYYYMMDD')
  from fuel_cards c
  join memberships mgr on mgr.company_id = p_company and mgr.status='active'
    and mgr.role in ('owner','dispatcher')
  where c.company_id = p_company and c.valid_until is not null and c.valid_until <= horizon
  on conflict (user_id, dedup_key) do nothing;
end; $$;
