-- 0064: rejestr wydatków kierowcy (#288, mockup „Rejestr Wydatków") — opłaty
-- drogowe / parking / naprawa / myjnia / inne, ze zdjęciem paragonu (Storage,
-- bucket cargo-photos, prefix expense-). Kierowca dodaje i widzi swoje;
-- zarząd (owner/dispatcher) widzi wszystkie i zatwierdza/odrzuca do rozliczenia.

create table if not exists driver_expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete set null,
  category text not null check (category in ('toll', 'parking', 'repair', 'wash', 'other')),
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null default 'PLN',
  expense_date date not null default current_date,
  note text,
  photo_path text,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists driver_expenses_company_idx
  on driver_expenses (company_id, created_at desc);

alter table driver_expenses enable row level security;

-- Kierowca widzi własne wpisy, zarząd — wszystkie w firmie.
create policy driver_expenses_select on driver_expenses for select to authenticated
  using (user_id = auth.uid() or has_role(company_id, array['owner', 'dispatcher']::role[]));

-- Dodaje wyłącznie członek firmy we własnym imieniu.
create policy driver_expenses_insert on driver_expenses for insert to authenticated
  with check (user_id = auth.uid() and is_member_of(company_id));

-- Status zmienia zarząd (zatwierdzenie/odrzucenie do rozliczenia).
create policy driver_expenses_update on driver_expenses for update to authenticated
  using (has_role(company_id, array['owner', 'dispatcher']::role[]));

-- Autor może usunąć wpis, dopóki nie został rozpatrzony.
create policy driver_expenses_delete on driver_expenses for delete to authenticated
  using (user_id = auth.uid() and status = 'submitted');
