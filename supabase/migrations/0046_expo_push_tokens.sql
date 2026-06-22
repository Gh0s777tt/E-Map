-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0046 · Tokeny push Expo (aplikacja mobilna)
--  Web Push (push_subscriptions, 0020) używa endpoint+klucze VAPID; Expo Push
--  używa pojedynczego tokenu (ExponentPushToken[...]). Osobna tabela.
--  Każdy użytkownik zarządza własnymi tokenami; wysyłka serwerowa service-role.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.expo_push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  company_id  uuid references public.companies (id) on delete cascade,
  token       text not null unique,
  platform    text,
  created_at  timestamptz not null default now()
);

create index if not exists expo_push_tokens_user_idx on public.expo_push_tokens (user_id);
create index if not exists expo_push_tokens_company_idx on public.expo_push_tokens (company_id);

alter table public.expo_push_tokens enable row level security;

drop policy if exists expo_push_select on public.expo_push_tokens;
create policy expo_push_select on public.expo_push_tokens
  for select using (user_id = auth.uid());

drop policy if exists expo_push_insert on public.expo_push_tokens;
create policy expo_push_insert on public.expo_push_tokens
  for insert with check (user_id = auth.uid());

drop policy if exists expo_push_delete on public.expo_push_tokens;
create policy expo_push_delete on public.expo_push_tokens
  for delete using (user_id = auth.uid());
