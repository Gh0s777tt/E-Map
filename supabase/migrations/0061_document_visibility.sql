-- 0061: widoczność dokumentów (#275) — właściciel wgrywa np. tachobooki i listy
-- kontrolne do podglądu/druku i decyduje KTO je widzi: cała firma albo wybrane
-- osoby. Zarząd (owner/dispatcher) widzi zawsze wszystko.

alter table documents add column if not exists visibility text not null default 'management'
  check (visibility in ('management', 'company', 'selected'));
alter table documents add column if not exists allowed_user_ids uuid[] not null default '{}';

-- Odczyt wg widoczności: zarząd wszystko; 'company' — każdy członek;
-- 'selected' — wskazani użytkownicy; 'management' (domyślne, zachowanie
-- historyczne dokumentów floty) — tylko zarząd.
drop policy if exists documents_select on documents;
create policy documents_select on documents for select to authenticated
  using (
    has_role(company_id, array['owner','dispatcher']::role[])
    or (visibility = 'company' and is_member_of(company_id))
    or (visibility = 'selected' and auth.uid() = any(allowed_user_ids))
  );
