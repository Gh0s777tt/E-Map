-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0042 · Rejestr kontrahentów (nabywcy / nadawcy)
--  Zamiast wolnego tekstu — wspólny rejestr per firma, budowany organicznie
--  (upsert przy wystawianiu faktur/zleceń) i podpowiadany (autouzupełnianie).
--  RLS: członek czyta, owner/dispatcher zarządza. Unikalność po (company_id, name)
--  pozwala na upsert (onConflict).
-- ════════════════════════════════════════════════════════════════════

create table if not exists contractors (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null,
  tax_id      text,
  address     text,
  country     text,
  created_at  timestamptz not null default now()
);
create unique index if not exists contractors_company_name_idx on contractors(company_id, name);

alter table contractors enable row level security;

drop policy if exists contractors_select on contractors;
create policy contractors_select on contractors for select to authenticated
  using (public.is_member_of(company_id));

drop policy if exists contractors_write on contractors;
create policy contractors_write on contractors for all to authenticated
  using (public.has_role(company_id, array['owner','dispatcher']::role[]))
  with check (public.has_role(company_id, array['owner','dispatcher']::role[]));
