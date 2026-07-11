-- 0066: czat firmowy kierowca ↔ dyspozytor/właściciel (#290, mockup 14).
-- Jeden wspólny kanał firmy (MVP): każdy aktywny członek czyta i pisze we
-- własnym imieniu; etykieta nadawcy zapisywana przy wysyłce (e-mail), bo
-- profile PII są szyfrowane. Realtime przez publikację supabase_realtime.

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sender_label text not null default '',
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_company_idx on messages (company_id, created_at desc);

alter table messages enable row level security;

create policy messages_select on messages for select to authenticated
  using (is_member_of(company_id));

create policy messages_insert on messages for insert to authenticated
  with check (sender_id = auth.uid() and is_member_of(company_id));

-- Realtime: zdarzenia INSERT dla klientów (RLS filtruje per firma).
alter publication supabase_realtime add table messages;
