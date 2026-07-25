-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0085 · Znaczniki przeczytania czatu (#368 audyt → „czat
--  gotowy do pracy”). Do tej pory NIC nie mówiło użytkownikowi, że są
--  nowe wiadomości — brak licznika w zakładce (mobile) i w nawigacji (web).
--
--  Model: jeden znacznik `last_read_at` per (firma, użytkownik, kanał).
--  Kanał ogólny = thread_id NULL (zachowanie historyczne #290/#291 — modelu
--  kanał/wątek NIE zmieniamy). Kolumna generowana `thread_key` sprowadza NULL
--  do sentinela, dzięki czemu unikalność i ON CONFLICT działają bez sztuczek
--  z indeksami częściowymi (patrz lekcja z 0069) i bez `nulls not distinct`.
--
--  Dokładamy dwa RPC (SECURITY INVOKER — RLS pilnuje widoczności):
--   • chat_mark_read      — upsert znacznika „przeczytane do teraz”
--   • chat_unread_counts  — liczniki nieprzeczytanych per kanał (bez własnych
--                           wiadomości); sumę liczy klient
-- ════════════════════════════════════════════════════════════════════

create table if not exists chat_reads (
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  thread_id uuid references chat_threads(id) on delete cascade,
  -- Sentinel dla kanału ogólnego (thread_id NULL) — klucz unikalności i cel ON CONFLICT.
  thread_key uuid generated always as
    (coalesce(thread_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists chat_reads_key
  on chat_reads (company_id, user_id, thread_key);
create index if not exists chat_reads_user_idx on chat_reads (user_id, company_id);

alter table chat_reads enable row level security;

-- Znaczniki są prywatne: każdy widzi i zmienia WYŁĄCZNIE własne, w firmie,
-- której jest aktywnym członkiem (multi-tenant jak reszta tabel czatu).
drop policy if exists chat_reads_select on chat_reads;
create policy chat_reads_select on chat_reads for select to authenticated
  using (user_id = auth.uid() and is_member_of(company_id));

drop policy if exists chat_reads_insert on chat_reads;
create policy chat_reads_insert on chat_reads for insert to authenticated
  with check (
    user_id = auth.uid()
    and is_member_of(company_id)
    and (thread_id is null or thread_company(thread_id) = company_id)
  );

drop policy if exists chat_reads_update on chat_reads;
create policy chat_reads_update on chat_reads for update to authenticated
  using (user_id = auth.uid() and is_member_of(company_id))
  with check (
    user_id = auth.uid()
    and is_member_of(company_id)
    -- Ten sam niezmiennik co przy INSERT: znacznik nie może wskazywać wątku z innej firmy.
    and (thread_id is null or thread_company(thread_id) = company_id)
  );

drop policy if exists chat_reads_delete on chat_reads;
create policy chat_reads_delete on chat_reads for delete to authenticated
  using (user_id = auth.uid() and is_member_of(company_id));

-- ── Oznacz kanał jako przeczytany (upsert; znacznik nigdy się nie cofa) ──
create or replace function public.chat_mark_read(p_company uuid, p_thread uuid default null)
returns void language plpgsql set search_path = public as $$
begin
  insert into chat_reads (company_id, user_id, thread_id, last_read_at, updated_at)
  values (p_company, auth.uid(), p_thread, now(), now())
  on conflict (company_id, user_id, thread_key) do update
    set last_read_at = greatest(chat_reads.last_read_at, excluded.last_read_at),
        updated_at = now();
end; $$;

-- ── Liczniki nieprzeczytanych per kanał (NULL = ogólny) ──────────────
-- SECURITY INVOKER: RLS `messages` sam zawęża do kanałów widocznych dla
-- wywołującego (ogólny + wątki, do których należy; zarząd — wszystkie).
-- Własne wiadomości nigdy nie są „nieprzeczytane”.
create or replace function public.chat_unread_counts(p_company uuid)
returns table (thread uuid, unread integer)
language sql stable set search_path = public as $$
  select m.thread_id, count(*)::int
  from messages m
  left join chat_reads r
    on r.company_id = m.company_id
   and r.user_id = auth.uid()
   and r.thread_id is not distinct from m.thread_id
  where m.company_id = p_company
    and m.sender_id <> auth.uid()
    and (r.last_read_at is null or m.created_at > r.last_read_at)
  group by m.thread_id;
$$;

-- Postgres domyślnie nadaje EXECUTE roli PUBLIC (anon dziedziczy). Same funkcje są
-- SECURITY INVOKER, więc RLS i tak nic anonimowi nie pokaże, ale trzymamy spójność
-- z 0084: wykonywać może wyłącznie zalogowany.
revoke execute on function public.chat_mark_read(uuid, uuid) from public;
grant execute on function public.chat_mark_read(uuid, uuid) to authenticated;
revoke execute on function public.chat_unread_counts(uuid) from public;
grant execute on function public.chat_unread_counts(uuid) to authenticated;
