-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0039 · Status płatności faktury
--  `invoices.paid_at` (null = nieopłacona). Oznaczanie przez RLS (owner/dispatcher).
--  Zmiana audytowana triggerem (tylko realna zmiana paid_at).
-- ════════════════════════════════════════════════════════════════════

alter table invoices add column if not exists paid_at timestamptz;

create or replace function public.audit_invoice_paid()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (company_id, actor_id, action, target)
    values (
      NEW.company_id, auth.uid(),
      case when NEW.paid_at is null then 'invoice.unpaid' else 'invoice.paid' end,
      NEW.id::text
    );
  return null;
end; $$;

drop trigger if exists invoices_paid_audit on invoices;
create trigger invoices_paid_audit after update of paid_at on invoices
  for each row when (new.paid_at is distinct from old.paid_at)
  execute function public.audit_invoice_paid();
