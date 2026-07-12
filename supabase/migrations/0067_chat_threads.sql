-- 0067: Czat 2.0 (#291) — wiele kanałów z nazwami i członkami. Kanał ogólny
-- firmy to wiadomości z thread_id NULL (zachowanie historyczne #290). Zarząd
-- (owner/dispatcher) tworzy kanały (np. osobny per kierowca), nadaje nazwy
-- i zarządza członkami; kierowca widzi kanał ogólny + wątki, do których należy.
-- Dodatkowo: zdjęcia w wiadomościach (photo_path — Storage cargo-photos).

create table if not exists chat_threads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists chat_members (
  thread_id uuid not null references chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

alter table messages add column if not exists thread_id uuid references chat_threads(id) on delete cascade;
alter table messages add column if not exists photo_path text;
create index if not exists messages_thread_idx on messages (thread_id, created_at desc);

-- Helpery SECURITY DEFINER (bez rekurencji RLS w politykach).
create or replace function public.is_thread_member(p_thread uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from chat_members where thread_id = p_thread and user_id = auth.uid());
$$;

create or replace function public.thread_company(p_thread uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select company_id from chat_threads where id = p_thread;
$$;

alter table chat_threads enable row level security;
alter table chat_members enable row level security;

-- Wątki: zarząd widzi wszystkie w firmie, kierowca — te, do których należy.
create policy chat_threads_select on chat_threads for select to authenticated
  using (
    is_member_of(company_id)
    and (
      has_role(company_id, array['owner', 'dispatcher']::role[])
      or created_by = auth.uid()
      or is_thread_member(id)
    )
  );
create policy chat_threads_insert on chat_threads for insert to authenticated
  with check (created_by = auth.uid() and has_role(company_id, array['owner', 'dispatcher']::role[]));
create policy chat_threads_update on chat_threads for update to authenticated
  using (has_role(company_id, array['owner', 'dispatcher']::role[]) or created_by = auth.uid());
create policy chat_threads_delete on chat_threads for delete to authenticated
  using (has_role(company_id, array['owner', 'dispatcher']::role[]));

-- Członkostwa wątku: widzi członek/zarząd; dodaje i usuwa zarząd; wyjść może każdy sam.
create policy chat_members_select on chat_members for select to authenticated
  using (
    user_id = auth.uid()
    or is_thread_member(thread_id)
    or has_role(thread_company(thread_id), array['owner', 'dispatcher']::role[])
  );
create policy chat_members_insert on chat_members for insert to authenticated
  with check (has_role(thread_company(thread_id), array['owner', 'dispatcher']::role[]));
create policy chat_members_delete on chat_members for delete to authenticated
  using (
    user_id = auth.uid()
    or has_role(thread_company(thread_id), array['owner', 'dispatcher']::role[])
  );

-- Wiadomości: kanał ogólny (NULL) — cała firma; wątek — członkowie + zarząd.
drop policy if exists messages_select on messages;
create policy messages_select on messages for select to authenticated
  using (
    is_member_of(company_id)
    and (
      thread_id is null
      or is_thread_member(thread_id)
      or has_role(company_id, array['owner', 'dispatcher']::role[])
    )
  );

drop policy if exists messages_insert on messages;
create policy messages_insert on messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and is_member_of(company_id)
    and (
      thread_id is null
      or is_thread_member(thread_id)
      or has_role(company_id, array['owner', 'dispatcher']::role[])
    )
  );
