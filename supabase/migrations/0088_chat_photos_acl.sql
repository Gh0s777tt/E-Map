-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0088 · Bramka wątku dla załączników czatu (#369, audyt)
--
--  PROBLEM. Wiersz wiadomości jest poprawnie zawężony przez `messages_select`
--  (0067): wątek widzą tylko jego członkowie + zarząd. Ale ZDJĘCIE z tej
--  wiadomości leży w buckecie `cargo-photos`, a polityka `cargo_photos_obj_select`
--  (0044) sprawdza wyłącznie PIERWSZY folder ścieżki = company_id — czyli daje
--  odczyt KAŻDEMU aktywnemu członkowi firmy. Skan dowodu, paragon albo zdjęcie
--  z prywatnej rozmowy właściciel↔kierowca chroniła więc tylko nieodgadywalność
--  UUID-a w nazwie pliku, a nie autoryzacja. `chatPhotoUrl` podpisuje dowolną
--  przekazaną ścieżkę, więc znajomość nazwy = pełny dostęp na godzinę.
--
--  ROZWIĄZANIE. Od #369 aplikacja zapisuje załączniki czatu pod ścieżką
--  niosącą kanał: `{company_id}/chat/{thread_id|general}/{uuid}.{ext}`
--  (packages/api/src/data/messages.ts · uploadChatPhotoBinary). Polityka SELECT
--  odtwarza na tym prefiksie DOKŁADNIE regułę z `messages_select`:
--    • `general`      → każdy aktywny członek firmy (kanał ogólny = cała firma),
--    • `{thread_id}`  → `is_thread_member()` albo owner/dispatcher firmy wątku.
--  Helpery `is_thread_member` / `thread_company` pochodzą z 0067 (SECURITY
--  DEFINER, bez rekurencji RLS), wzorzec `storage.foldername(name)` z 0044/0073.
--
--  POZOSTAŁE ŚCIEŻKI W BUCKECIE ZOSTAJĄ BEZ ZMIAN — bramka dotyczy wyłącznie
--  prefiksu `chat/`. Nietknięte (drugi folder nigdy nie równa się 'chat'):
--    {company}/{order_id}/…      zdjęcia ładunku + podpis POD (0044)
--    {company}/damage-{claim}/…  załączniki szkód
--    {company}/checklists/…      zdjęcia z checklist
--    {company}/expense-{uuid}…   paragony kierowcy
--
--  ZGODNOŚĆ WSTECZ — NIEPOTRZEBNA (sprawdzone na produkcji przed nałożeniem).
--  Bucket `cargo-photos` był PUSTY (0 obiektów), a w `messages` nie było ANI JEDNEJ
--  wiadomości z `photo_path`. Nie ma więc plików w starym, płaskim układzie
--  `{company}/chat-{uuid}.{ext}` — nie ma czego migrować ani czego chronić.
--
--  Wcześniejszy szkic tej migracji dziedziczył ACL starych plików z widoczności
--  wiersza wiadomości (`exists (select 1 from messages where photo_path = name)`).
--  ODRZUCONE, bo dawało się obejść: `messages_insert` (0067) pozwala KAŻDEMU
--  aktywnemu członkowi firmy wstawić wiersz do kanału ogólnego z DOWOLNYM
--  `photo_path` (kolumna nie jest walidowana ani unikalna), więc atakujący
--  podrabiał wiersz wskazujący cudze zdjęcie i odzyskiwał do niego dostęp.
--  Zamiast uszczelniać martwą ścieżkę, stary prefiks jest po prostu ZAMKNIĘTY
--  (fail-closed) — przy zerowej liczbie takich plików to nic nie kosztuje,
--  a usuwa cały wektor i podzapytanie do `messages` przy każdym podpisaniu URL-a.
--
--  Idempotentna: drop policy if exists + create, index if not exists.
-- ════════════════════════════════════════════════════════════════════

drop policy if exists cargo_photos_obj_select on storage.objects;
create policy cargo_photos_obj_select on storage.objects for select to authenticated
  using (
    bucket_id = 'cargo-photos'
    -- Warstwa 1 (jak w 0044): pierwszy folder = firma, której jestem członkiem.
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.status = 'active'
        and m.company_id::text = (storage.foldername(name))[1]
    )
    -- Warstwa 2 (#369): dla załączników czatu dodatkowo bramka na poziomie kanału.
    -- CASE, bo gwarantuje leniwą ewaluację — rzutowanie na uuid wykonuje się
    -- wyłącznie w gałęzi, w której segment naprawdę wygląda jak uuid. To ta sama
    -- ostrożność co w 0031 („bez rzutowania na uuid → brak błędów dla nietypowych
    -- ścieżek"): jeden plik o dziwnej nazwie nie może wywalić całego zapytania.
    and case
      -- Nowy układ: {company}/chat/{thread_id|general}/{uuid}.{ext}
      when (storage.foldername(name))[2] = 'chat' then
        case
          when (storage.foldername(name))[3] = 'general' then true
          when (storage.foldername(name))[3] ~*
               '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
            -- Wątek MUSI należeć do firmy z pierwszego folderu — inaczej ktoś
            -- mógłby wgrać plik pod `{swoja_firma}/chat/{watek_z_innej_firmy}/`
            -- i czytać go na podstawie członkostwa w tamtym wątku.
            public.thread_company(((storage.foldername(name))[3])::uuid)::text
              = (storage.foldername(name))[1]
            and (
              public.is_thread_member(((storage.foldername(name))[3])::uuid)
              or public.has_role(
                   public.thread_company(((storage.foldername(name))[3])::uuid),
                   array['owner', 'dispatcher']::role[]
                 )
            )
          -- Śmieciowy prefiks `chat/` spoza naszego klienta — brak dostępu.
          else false
        end
      -- Stary, płaski układ (przed #369): {company}/chat-{uuid}.{ext}. Takich
      -- plików NIE MA (bucket był pusty), więc zamykamy prefiks na głucho zamiast
      -- odtwarzać ACL z podrabialnego wiersza wiadomości — patrz nagłówek.
      when array_length(storage.foldername(name), 1) = 1 and name like '%/chat-%' then
        false
      -- Ładunek, szkody, checklisty, paragony — bez zmian względem 0044.
      else true
    end
  );
