-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0037 · Status faktury (anulowanie zamiast usuwania)
--  `invoices.status` = issued | cancelled. Anulowanie zachowuje numer
--  (bez luk w numeracji FV/ROK/NNNN) i ślad audytowy. Zmiana statusu
--  audytowana triggerem (tylko realna zmiana). Zapis przez RLS (owner/dispatcher).
-- ════════════════════════════════════════════════════════════════════

alter table invoices add column if not exists status text not null default 'issued';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_status_chk') then
    alter table invoices add constraint invoices_status_chk check (status in ('issued', 'cancelled'));
  end if;
end $$;

-- Audyt zmiany statusu (np. anulowanie) — tylko gdy status faktycznie się zmienia.
create or replace function public.audit_invoice_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (company_id, actor_id, action, target)
    values (NEW.company_id, auth.uid(), 'invoice.status:' || NEW.status, NEW.id::text);
  return null;
end; $$;

drop trigger if exists invoices_status_audit on invoices;
create trigger invoices_status_audit after update of status on invoices
  for each row when (new.status is distinct from old.status)
  execute function public.audit_invoice_status();
