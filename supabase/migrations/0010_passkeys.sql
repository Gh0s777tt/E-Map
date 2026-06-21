-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0010 · Passkey (WebAuthn) — klucze dostępu użytkownika
--  Logowanie bez hasła (odcisk/Face ID/klucz sprzętowy). Sesja Supabase
--  mintowana po stronie serwera po weryfikacji asercji WebAuthn.
-- ════════════════════════════════════════════════════════════════════

create table if not exists passkeys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,          -- base64url
  public_key    text not null,                 -- base64url (COSE)
  counter       bigint not null default 0,
  transports    text[],
  name          text,
  created_at    timestamptz not null default now()
);
create index if not exists passkeys_user_idx on passkeys(user_id);

alter table passkeys enable row level security;

-- Użytkownik widzi i zarządza wyłącznie swoimi kluczami.
-- (Weryfikacja przy logowaniu idzie service-rolem po stronie serwera.)
drop policy if exists passkeys_select on passkeys;
create policy passkeys_select on passkeys for select to authenticated
  using (user_id = auth.uid());

drop policy if exists passkeys_write on passkeys;
create policy passkeys_write on passkeys for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
