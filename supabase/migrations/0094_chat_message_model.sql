-- [#374] Model wiadomości czatu: usuwanie, edycja, cytowanie, reakcje, znikanie.
--
-- Dziewięć funkcji z backlogu (usuń, edytuj, cytuj, przekaż, reakcje, znikające
-- per wiadomość i per kanał, lokalizacja) opiera się na tym samym: tabela
-- `messages` ma dziś WYŁĄCZNIE polityki SELECT i INSERT, żadnych kolumn stanu,
-- a realtime obsługuje tylko INSERT. Robienie tych funkcji pojedynczo to siedem
-- migracji i siedem przebudów subskrypcji — stąd jedna migracja fundamentowa.

-- ---------------------------------------------------------------------------
-- 0. NAPRAWA BEZPIECZEŃSTWA: wątek dawało się przenieść do innej firmy
-- ---------------------------------------------------------------------------
-- `chat_threads_update` miało USING bez WITH CHECK. Postgres stosuje wtedy
-- wyrażenie USING także do NOWEGO wiersza, a warunek `created_by = auth.uid()`
-- jest spełniony NIEZALEŻNIE od tego, co stanie się z `company_id`.
--
-- Skutek nie był teoretyczny: polityka Storage z migracji 0088 kluczuje dostęp
-- do zdjęć czatu po `thread_company(thread_id)`. Przepisanie wątku do firmy X
-- dawało właścicielowi X wgląd w zdjęcia z cudzych rozmów. Dodatkowo pozwalało
-- wstrzyknąć obcy wątek na listę kanałów innej firmy (wektor podszycia).
--
-- Dziś twórcą wątku jest zawsze zarząd, więc skutek był ograniczony. Po
-- dopuszczeniu kierowców do zakładania wątków (Faza 3) stałby się realny —
-- dlatego łatamy to ZANIM, a nie potem.
drop policy if exists chat_threads_update on public.chat_threads;
create policy chat_threads_update on public.chat_threads
  for update
  using (has_role(company_id, array['owner', 'dispatcher']::role[]) or created_by = auth.uid())
  -- WITH CHECK ocenia NOWY wiersz: firma musi zostać taka, w której nadal mamy
  -- prawo do wątku. Zmiana `company_id` na obcą firmę przestaje przechodzić.
  with check (has_role(company_id, array['owner', 'dispatcher']::role[]) or created_by = auth.uid());

-- Sama polityka nie wystarcza: twórca wciąż mógłby przenieść wątek do firmy,
-- w której też jest właścicielem, i przeciągnąć za sobą cudze wiadomości.
-- Kolumny tożsamości wątku są niezmienne — pilnuje tego wyzwalacz.
create or replace function public.chat_threads_immutable_cols()
returns trigger
language plpgsql
as $$
begin
  if new.company_id is distinct from old.company_id then
    raise exception 'Nie można przenieść wątku do innej firmy.' using errcode = '42501';
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'Nie można zmienić autora wątku.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists chat_threads_immutable on public.chat_threads;
create trigger chat_threads_immutable
  before update on public.chat_threads
  for each row execute function public.chat_threads_immutable_cols();

-- ---------------------------------------------------------------------------
-- 1. Kolumny stanu wiadomości
-- ---------------------------------------------------------------------------
alter table public.messages
  -- Miękkie usunięcie. Twarde `DELETE` byłoby gorsze: klient, który był offline,
  -- nigdy nie zobaczy zdarzenia DELETE i zostanie z wiadomością w pamięci.
  -- Przy `deleted_at` dostaje zwykły UPDATE i usuwa ją u siebie.
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid,
  add column if not exists edited_at timestamptz,
  -- Znikanie: moment, po którym wiadomość przestaje być widoczna.
  add column if not exists expires_at timestamptz,
  -- Cytowanie / odpowiedź. `on delete set null` — skasowanie cytowanej
  -- wiadomości nie może kasować odpowiedzi na nią.
  add column if not exists reply_to_id uuid references public.messages (id) on delete set null,
  -- Rodzaj treści. `text` domyślnie, żeby istniejące wiersze pozostały poprawne.
  add column if not exists kind text not null default 'text',
  -- Dane zależne od rodzaju (np. współrzędne dla `location`). Trzymane w jsonb,
  -- bo każdy nowy rodzaj inaczej by rozsadzał schemat kolumnami.
  add column if not exists meta jsonb;

alter table public.messages drop constraint if exists messages_kind_chk;
alter table public.messages add constraint messages_kind_chk
  check (kind in ('text', 'photo', 'location'));

comment on column public.messages.deleted_at is
  'Miękkie usunięcie. Odczyt filtruje te wiersze; fizycznie kasuje je cron po 30 dniach.';
comment on column public.messages.expires_at is
  'Znikanie. UWAGA: filtr w polityce UKRYWA wiersz, nie usuwa go — fizycznie robi to cron.';

-- Odczyt wątku zawsze pyta o „żywe" wiadomości w kolejności czasu.
create index if not exists messages_thread_live_idx
  on public.messages (thread_id, created_at desc)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 2. Znikanie ustawiane dla całego kanału
-- ---------------------------------------------------------------------------
-- Kanał ogólny firmy NIE MA wiersza w `chat_threads` (thread_id IS NULL),
-- więc jego ustawienie musi mieszkać przy firmie.
alter table public.chat_threads
  add column if not exists ephemeral_ttl_seconds integer
  check (ephemeral_ttl_seconds is null or ephemeral_ttl_seconds between 5 and 2592000);

alter table public.companies
  add column if not exists chat_ephemeral_ttl_seconds integer
  check (chat_ephemeral_ttl_seconds is null or chat_ephemeral_ttl_seconds between 5 and 2592000);

comment on column public.chat_threads.ephemeral_ttl_seconds is
  'TTL wiadomości kanału w sekundach. NULL = wyłączone (domyślnie). Ustawia zarząd.';

-- Nadaje `expires_at` przy wstawieniu, gdy kanał ma włączone znikanie.
-- Liczone po stronie bazy, bo zegar klienta bywa przestawiony, a od tego zależy,
-- kiedy treść zniknie.
create or replace function public.messages_apply_ttl()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ttl integer;
begin
  -- Wiadomość z jawnym `expires_at` (znikanie ustawione dla POJEDYNCZEJ
  -- wiadomości przez nadawcę) ma pierwszeństwo przed ustawieniem kanału.
  if new.expires_at is not null then
    return new;
  end if;

  if new.thread_id is null then
    select chat_ephemeral_ttl_seconds into v_ttl from companies where id = new.company_id;
  else
    select ephemeral_ttl_seconds into v_ttl from chat_threads where id = new.thread_id;
  end if;

  if v_ttl is not null then
    new.expires_at := now() + make_interval(secs => v_ttl);
  end if;
  return new;
end;
$$;

drop trigger if exists messages_ttl on public.messages;
create trigger messages_ttl
  before insert on public.messages
  for each row execute function public.messages_apply_ttl();

-- ---------------------------------------------------------------------------
-- 3. Odczyt pomija usunięte i wygasłe
-- ---------------------------------------------------------------------------
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select
  using (
    deleted_at is null
    and (expires_at is null or expires_at > now())
    and is_member_of(company_id)
    and (
      thread_id is null
      or is_thread_member(thread_id)
      or has_role(company_id, array['owner', 'dispatcher']::role[])
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Edycja i usuwanie
-- ---------------------------------------------------------------------------
-- Edytować może wyłącznie nadawca. Usunąć — nadawca albo zarząd (moderacja).
-- Jedno i drugie realizowane jako UPDATE, bo usunięcie jest miękkie.
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages
  for update
  using (
    is_member_of(company_id)
    and (sender_id = auth.uid() or has_role(company_id, array['owner', 'dispatcher']::role[]))
  )
  with check (
    is_member_of(company_id)
    and (sender_id = auth.uid() or has_role(company_id, array['owner', 'dispatcher']::role[]))
  );

-- Kolumny tożsamości wiadomości są niezmienne — inaczej autor mógłby przez
-- UPDATE przepisać własną wiadomość do cudzego wątku albo podmienić nadawcę.
create or replace function public.messages_immutable_cols()
returns trigger
language plpgsql
as $$
begin
  if new.company_id is distinct from old.company_id
     or new.thread_id is distinct from old.thread_id
     or new.sender_id is distinct from old.sender_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Nie można zmienić tożsamości wiadomości.' using errcode = '42501';
  end if;
  -- Zmiana treści = edycja; znacznik ustawia baza, nie klient.
  if new.body is distinct from old.body and new.deleted_at is null then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists messages_immutable on public.messages;
create trigger messages_immutable
  before update on public.messages
  for each row execute function public.messages_immutable_cols();

-- Twarde kasowanie zostaje dla zarządu i dla crona (czyszczenie po TTL).
drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages
  for delete
  using (has_role(company_id, array['owner', 'dispatcher']::role[]));

-- ---------------------------------------------------------------------------
-- 5. Reakcje emoji
-- ---------------------------------------------------------------------------
create table if not exists public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null default auth.uid(),
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  -- Jeden użytkownik = jedna reakcja danego rodzaju na wiadomość.
  primary key (message_id, user_id, emoji)
);

create index if not exists message_reactions_message_idx
  on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;

-- Widzisz reakcje pod wiadomościami, które i tak możesz przeczytać.
-- Podzapytanie do `messages` przechodzi przez jej własne RLS, więc nie trzeba
-- powtarzać tu całej reguły widoczności wątku.
drop policy if exists message_reactions_select on public.message_reactions;
create policy message_reactions_select on public.message_reactions
  for select
  using (exists (select 1 from public.messages m where m.id = message_id));

drop policy if exists message_reactions_insert on public.message_reactions;
create policy message_reactions_insert on public.message_reactions
  for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.messages m where m.id = message_id)
  );

-- Zdejmujesz wyłącznie własną reakcję.
drop policy if exists message_reactions_delete on public.message_reactions;
create policy message_reactions_delete on public.message_reactions
  for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 6. Realtime dla UPDATE i DELETE
-- ---------------------------------------------------------------------------
-- Bez tego edycja, usunięcie i reakcja byłyby widoczne dopiero po odświeżeniu.
-- `replica identity full` jest konieczne, żeby zdarzenie DELETE niosło dane
-- wiersza — inaczej klient dostaje sam identyfikator i nie wie, z którego wątku.
alter table public.messages replica identity full;
alter table public.message_reactions replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_reactions'
  ) then
    alter publication supabase_realtime add table public.message_reactions;
  end if;
end;
$$;
