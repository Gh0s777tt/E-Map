-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0033 · Powiadomienie kierowcy o przypisaniu zlecenia
--  Trigger na `orders`: gdy zlecenie zostaje przypisane do kierowcy (nowy rekord
--  lub zmiana `assigned_to`), tworzy powiadomienie w aplikacji dla tego kierowcy.
--  Powiadomienie trafia do dzwonka (realtime) oraz — przez cron — jako web push.
--  Nie powiadamia, gdy ktoś przypisuje sam siebie. Dedup per (zlecenie, kierowca).
-- ════════════════════════════════════════════════════════════════════

create or replace function public.notify_order_assignment()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare route text;
begin
  if NEW.assigned_to is null then
    return NEW;
  end if;
  -- przy UPDATE: tylko gdy faktycznie zmieniono osobę
  if TG_OP = 'UPDATE' and NEW.assigned_to is not distinct from OLD.assigned_to then
    return NEW;
  end if;
  -- nie powiadamiaj o przypisaniu samego siebie
  if NEW.assigned_to = auth.uid() then
    return NEW;
  end if;

  route := coalesce(nullif(NEW.origin, ''), '?') || ' → ' || coalesce(nullif(NEW.destination, ''), '?');

  insert into notifications (company_id, user_id, type, title, body, severity, dedup_key)
  values (
    NEW.company_id,
    NEW.assigned_to,
    'order_assigned',
    'Nowe zlecenie' || coalesce(' ' || nullif(NEW.reference_no, ''), ''),
    route
      || coalesce(' · ' || nullif(NEW.cargo, ''), '')
      || coalesce(' · załadunek ' || to_char(NEW.load_date, 'YYYY-MM-DD'), ''),
    'info',
    'order_assigned:' || NEW.id::text || ':' || NEW.assigned_to::text
  )
  on conflict (user_id, dedup_key) do nothing;

  return NEW;
end; $$;

drop trigger if exists orders_notify_assignment on orders;
create trigger orders_notify_assignment
  after insert or update of assigned_to on orders
  for each row execute function public.notify_order_assignment();
