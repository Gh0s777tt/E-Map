-- [#376] Domknięcie luk w modelu wiadomości znalezionych w przeglądzie #374.
--
-- Cztery niezależne problemy, wszystkie z jednej przyczyny: `messages_update`
-- i `messages_insert` ufały klientowi w kolumnach, które sterują usuwaniem,
-- znikaniem i dostępem do plików.

-- ---------------------------------------------------------------------------
-- 1. `photo_path` musi należeć do firmy i wątku wiadomości
-- ---------------------------------------------------------------------------
-- ATAK: kierowca odczytuje `photo_path` cudzego zdjęcia (albo dowodu dostawy)
-- i wstawia własną wiadomość wskazującą TĘ ścieżkę, z `expires_at` w przeszłości.
-- Wiersz jest niewidoczny w interfejsie (odfiltrowuje go `messages_select`),
-- ale w ciągu 15 minut cron `/api/cron/chat-purge` wybiera go jako wygasły
-- i wywołuje `storage.remove()` kluczem `service_role`, który OMIJA RLS Storage.
-- Plik ofiary znika bezpowrotnie, bez śladu.
--
-- Reguła odpowiada układowi ścieżek z migracji 0088:
--   {company_id}/chat/{thread_id|general}/{uuid}.{ext}
create or replace function public.messages_guard_insert()
returns trigger
language plpgsql
as $$
declare
  seg text[];
begin
  if new.photo_path is not null then
    seg := string_to_array(new.photo_path, '/');

    if seg[1] is distinct from new.company_id::text then
      raise exception 'Załącznik spoza firmy wiadomości.' using errcode = '42501';
    end if;

    -- Ścieżki czatu dodatkowo pilnują wątku. Inne prefiksy (zdjęcia ładunku
    -- podpinane do wiadomości) zostają przy samej kontroli firmy.
    if coalesce(seg[2], '') = 'chat' then
      if new.thread_id is null then
        if coalesce(seg[3], '') <> 'general' then
          raise exception 'Załącznik z innego wątku.' using errcode = '42501';
        end if;
      elsif seg[3] is distinct from new.thread_id::text then
        raise exception 'Załącznik z innego wątku.' using errcode = '42501';
      end if;
    end if;
  end if;

  -- Data wygaśnięcia w przeszłości ukrywa wiadomość natychmiast i kieruje ją
  -- prosto pod cron — z pominięciem 30-dniowej karencji przewidzianej dla
  -- miękkiego usunięcia. To obejście, nie funkcja.
  if new.expires_at is not null and new.expires_at <= now() then
    raise exception 'Termin zniknięcia musi być w przyszłości.' using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists messages_guard_ins on public.messages;
create trigger messages_guard_ins
  before insert on public.messages
  for each row execute function public.messages_guard_insert();

-- ---------------------------------------------------------------------------
-- 2. Kolumny stanu przestają być pod kontrolą klienta
-- ---------------------------------------------------------------------------
-- Poprzedni wyzwalacz chronił tylko tożsamość wiersza. Klient mógł przez REST:
--   • wyzerować `edited_at` i ukryć fakt edycji („· edytowano" znikało),
--   • wyzerować `deleted_at` i PRZYWRÓCIĆ wiadomość usuniętą przez kogoś innego,
--   • wyzerować `expires_at` i ominąć znikanie ustawione dla kanału,
--   • ustawić `expires_at` wstecz i skasować wiadomość bez śladu w rozmowie.
--
-- Dodatkowo: EDYCJĘ TREŚCI wolno wyłącznie NADAWCY. Zarząd może wiadomość
-- usunąć (moderacja), ale nie przepisać — inaczej w czacie, który ma być
-- dowodem, kto wydał polecenie, mogłaby stanąć sfałszowana wypowiedź kierowcy.
-- Reguła zgadza się teraz z `canEditMessage` z `packages/core`.
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

  -- Załącznika i rodzaju nie zmieniamy po fakcie — inaczej edycja stawałaby się
  -- furtką do podmiany ścieżki pliku z pominięciem kontroli przy wstawianiu.
  if new.photo_path is distinct from old.photo_path or new.kind is distinct from old.kind then
    raise exception 'Nie można podmienić załącznika ani rodzaju wiadomości.' using errcode = '42501';
  end if;

  if new.body is distinct from old.body then
    if new.sender_id is distinct from auth.uid() then
      raise exception 'Treść wiadomości może zmienić wyłącznie jej autor.' using errcode = '42501';
    end if;
    -- Znacznik nadaje BAZA. Klient nie może go ani ustawić, ani wyczyścić.
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;

  -- Usunięcie jest jednokierunkowe: da się je ustawić, nie da się cofnąć.
  if old.deleted_at is not null then
    new.deleted_at := old.deleted_at;
    new.deleted_by := old.deleted_by;
  end if;

  -- Termin zniknięcia wolno wyłącznie SKRÓCIĆ i tylko w przyszłość — nie da się
  -- go wyłączyć ani ustawić wstecz, żeby ominąć politykę kanału albo karencję.
  if new.expires_at is distinct from old.expires_at then
    if old.expires_at is not null and (new.expires_at is null or new.expires_at > old.expires_at)
    then
      raise exception 'Terminu zniknięcia nie można wydłużyć ani znieść.' using errcode = '42501';
    end if;
    if new.expires_at is not null and new.expires_at <= now() then
      raise exception 'Termin zniknięcia musi być w przyszłości.' using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Miękkie usunięcie musi DOCIERAĆ do pozostałych klientów
-- ---------------------------------------------------------------------------
-- Realtime sprawdza politykę SELECT dla NOWEGO wiersza. Skoro `messages_select`
-- wymagało `deleted_at is null`, zdarzenie UPDATE po usunięciu nie było
-- dostarczane NIKOMU — u autora dymek znikał tylko dzięki optymistycznej
-- podmianie stanu, a pozostali widzieli treść aż do przeładowania aplikacji.
-- To dokładne zaprzeczenie powodu, dla którego wybrano usuwanie miękkie.
--
-- Wiersz usunięty zostaje więc WIDOCZNY w polityce, ale bez treści: czyści ją
-- wyzwalacz przy usuwaniu, więc do klienta trafia sam fakt usunięcia.
-- Wygasłe nadal ukrywamy — tam nie ma czego dostarczać.
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select
  using (
    (expires_at is null or expires_at > now())
    and is_member_of(company_id)
    and (
      thread_id is null
      or is_thread_member(thread_id)
      or has_role(company_id, array['owner', 'dispatcher']::role[])
    )
  );

-- Treść usuniętej wiadomości nie może wyjechać do klientów — zastępujemy ją
-- znacznikiem. Interfejs i tak renderuje ślad („Wiadomość usunięta") na
-- podstawie `deleted_at`, więc nic nie traci, a treść przestaje istnieć.
create or replace function public.messages_scrub_deleted()
returns trigger
language plpgsql
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    new.body := '';
    new.meta := null;
  end if;
  return new;
end;
$$;

drop trigger if exists messages_scrub on public.messages;
create trigger messages_scrub
  before update on public.messages
  for each row execute function public.messages_scrub_deleted();

-- Kolejność wyzwalaczy w Postgresie jest alfabetyczna: `messages_immutable`
-- < `messages_scrub`, więc kontrola uprawnień wykonuje się PRZED czyszczeniem
-- treści — inaczej `new.body <> old.body` wywołane czyszczeniem wyglądałoby
-- jak edycja i wymagałoby bycia autorem.
drop trigger if exists messages_immutable on public.messages;
create trigger messages_immutable
  before update on public.messages
  for each row execute function public.messages_immutable_cols();

-- ---------------------------------------------------------------------------
-- 4. Pusta treść jest teraz poprawna — wymuszają ją lokalizacje i usunięcia
-- ---------------------------------------------------------------------------
-- Wiadomość typu `location` nie ma tekstu, a `messages.body` miało z migracji
-- 0066 `check (char_length(body) between 1 and 2000)`. Efekt: funkcja „wyślij
-- lokalizację" była odrzucana przez bazę przy KAŻDEJ próbie, na obu platformach,
-- a komunikat w interfejsie mylnie wskazywał na brak zgody na GPS.
-- To samo ograniczenie blokowałoby czyszczenie treści przy usuwaniu.
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages drop constraint if exists messages_body_len_chk;
alter table public.messages add constraint messages_body_len_chk
  check (char_length(body) <= 2000);
