-- [#390] Klucze szyfrujące przestają być wywoływalne z przeglądarki.
--
-- ZNALEZIONE: `public._card_key()` i `public._pii_key()` — funkcje zwracające
-- klucz pgcrypto, którym szyfrowane są PIN-y kart paliwowych oraz dane osobowe
-- kierowców — miały `EXECUTE` przyznane rolom **`anon` i `authenticated`**.
--
-- PostgREST wystawia funkcje ze schematu `public` jako punkty `/rest/v1/rpc/<nazwa>`,
-- a rola `anon` to klucz publiczny, który z definicji leży w paczce aplikacji
-- webowej. Innymi słowy: klucz szyfrujący dało się pobrać **bez logowania**,
-- jednym żądaniem HTTP, przy użyciu danych, które i tak są jawne.
--
-- POTWIERDZONE, nie wywnioskowane: w transakcji zakończonej ROLLBACK,
-- `set local role anon; select length(public._card_key());` zwróciło wartość
-- dodatnią. Sama wartość klucza nie została nigdzie wypisana ani zapisana.
--
-- Dlaczego to poważne: szyfrowanie PII i PIN-ów jest w tym produkcie ostatnią
-- linią obrony na wypadek wycieku wierszy — RLS chroni dostęp, a szyfrowanie
-- chroni treść, gdyby RLS zawiodło. Klucz dostępny publicznie sprowadza tę
-- drugą warstwę do zera, zostawiając bezpieczeństwo danych osobowych całej
-- floty na jednej warstwie zamiast dwóch.
--
-- DLACZEGO ODEBRANIE JEST BEZPIECZNE: obie funkcje są wołane wyłącznie WEWNĄTRZ
-- innych funkcji `SECURITY DEFINER` należących do `postgres`
-- (`fuel_card_pin`, `fuel_card_set_pin`, `driver_save`, `driver_documents`,
-- `driver_set_documents`, `list_drivers`, `list_invites`, `create_invite`,
-- `my_driver_identity`, `handle_new_user` — sprawdzone zapytaniem po `prosrc`).
-- Te funkcje wykonują się z uprawnieniami właściciela, więc po odebraniu
-- `EXECUTE` klientom działają dalej bez żadnej zmiany.

revoke execute on function public._card_key() from public;
revoke execute on function public._card_key() from anon;
revoke execute on function public._card_key() from authenticated;

revoke execute on function public._pii_key() from public;
revoke execute on function public._pii_key() from anon;
revoke execute on function public._pii_key() from authenticated;

-- ─── Operacje wymagające zalogowania przestają być wywoływalne bez logowania ──
--
-- Każda z tych funkcji sprawdza uprawnienia w środku (`auth.uid()`, `has_role`,
-- `is_member_of`), więc wywołanie przez `anon` i tak nic nie zwracało ani nie
-- zapisywało. Odbieramy `EXECUTE` mimo to, bo obrona ma nie zależeć od tego, czy
-- KAŻDA z nich pamiętała o sprawdzeniu — i czy będzie pamiętała następna.
-- To zawężenie powierzchni, nie naprawa konkretnej dziury.
--
-- `authenticated` zachowuje uprawnienia: to są normalne operacje aplikacji.

-- UWAGA — pułapka DWUWARSTWOWA (opis uzupełniony w [#396], bo pierwsza wersja
-- tego komentarza była półprawdą i sam się na niej przejechałem):
--
-- Warstwa 1: Postgres domyślnie nadaje `EXECUTE` roli `PUBLIC`, a `anon` po niej
--   dziedziczy. Samo `revoke ... from anon` nie zmienia wtedy nic.
--
-- Warstwa 2: Supabase ma ustawione `alter default privileges` nadające `EXECUTE`
--   rolom `anon`/`authenticated`/`service_role` **jawnie**, przy tworzeniu funkcji.
--   Wpis `anon=X/postgres` w `proacl` NIE znika po odebraniu `PUBLIC`.
--
-- Reguła bez wyjątków: **odbierać od `public` ORAZ od `anon`**, a skutek sprawdzać
-- przez `has_function_privilege('anon', …)`, nie przez obecność `revoke` w migracji.
-- Migracja 0108 domyka to dla funkcji, których dotyczyła warstwa 2.
--
-- Odebranie `PUBLIC` jest tu bezpieczne, bo wszystkie te funkcje mają JAWNE
-- nadanie dla `authenticated` i `service_role` (sprawdzone w `proacl`) — zalogowany
-- użytkownik i ścieżka serwerowa zachowują dostęp, traci go wyłącznie `anon`.

revoke execute on function public.fuel_card_pin(uuid) from public;
revoke execute on function public.fuel_card_set_pin(uuid, text) from public;
revoke execute on function public.driver_documents(uuid) from public;
revoke execute on function public.driver_set_documents(uuid, text, text, text) from public;
revoke execute on function public.driver_link_user(uuid, uuid, uuid) from public;
revoke execute on function public.list_drivers(uuid) from public;
revoke execute on function public.list_invites(uuid) from public;
revoke execute on function public.create_invite(role, uuid, text, jsonb) from public;
revoke execute on function public.list_fuel_cards_for_user() from public;
revoke execute on function public.my_driver_identity() from public;
revoke execute on function public.dev_stats() from public;
revoke execute on function public.bootstrap_company(text) from public;
revoke execute on function public.create_invoice(uuid, numeric) from public;
revoke execute on function public.create_blank_invoice(uuid, text, text, text, text) from public;
revoke execute on function public.duplicate_invoice(uuid) from public;
revoke execute on function public.order_set_status(uuid, order_status) from public;
revoke execute on function public.generate_expiry_notifications(uuid) from public;
revoke execute on function public.notify_company(uuid, text, text, text, text) from public;
revoke execute on function public.list_visible_checklist_templates() from public;

-- ŚWIADOMIE ZOSTAWIONE `anon`:
--
-- `order_tracking(...)` — publiczny link śledzenia przesyłki. Klient końcowy
--   otwiera go bez konta i to jest cel tej funkcji, nie przeoczenie.
--
-- `is_member_of`, `has_role`, `is_thread_member`, `is_assigned_to_vehicle`,
--   `is_developer`, `thread_company` — predykaty używane WEWNĄTRZ polityk RLS.
--   Wyrażenia polityk wykonują się z uprawnieniami roli pytającej, więc
--   odebranie `EXECUTE` wyłączyłoby izolację zamiast ją wzmocnić. Same w sobie
--   nie zdradzają niczego: pytają o uprawnienia WOŁAJĄCEGO, a dla `anon`
--   `auth.uid()` jest puste, więc odpowiedzią jest zawsze „nie".

-- ─── search_path przypięty na wyzwalaczach (reguła 5 z SECURITY-RLS.md) ──────
--
-- Sześć funkcji wyzwalaczy nie miało przypiętego `search_path`. Wszystkie są
-- `SECURITY INVOKER`, więc ryzyko jest mniejsze niż przy `DEFINER` — ale reguła
-- nie ma wyjątków, a jedna z nich (`tg_poi_review_immutable_poi`) powstała
-- w migracji 0103, czyli w tej samej serii poprawek bezpieczeństwa.
-- Przypięcie ścieżki odbiera możliwość podstawienia własnej funkcji o tej samej
-- nazwie w schemacie wcześniejszym na ścieżce wyszukiwania.

alter function public._is_payment_method(text) set search_path = public;
alter function public.chat_threads_immutable_cols() set search_path = public;
alter function public.messages_guard_insert() set search_path = public;
alter function public.messages_immutable_cols() set search_path = public;
alter function public.messages_scrub_deleted() set search_path = public;
alter function public.tg_poi_review_immutable_poi() set search_path = public;

-- ─── Znane ostrzeżenia, których NIE naprawiamy (i dlaczego) ──────────────────
--
-- `spatial_ref_sys` bez RLS (poziom ERROR u dostawcy) — tabela należy do
--   rozszerzenia PostGIS, nie do nas. Włączenie RLS wymaga uprawnień superusera
--   i psuje działanie rozszerzenia. Nasza bramka `audit:rls` pomija obiekty
--   rozszerzeń (`pg_depend deptype='e'`) właśnie z tego powodu.
--
-- `postgis` w schemacie `public` — przeniesienie do osobnego schematu wymaga
--   przebudowy rozszerzenia i zmiany ścieżek we wszystkich zapytaniach
--   przestrzennych. To osobne przedsięwzięcie, nie poprawka przy okazji.
--
-- `account_deletions` z RLS bez polityk — celowe „zamknięte na głucho":
--   wiersze zapisuje wyłącznie ścieżka serwerowa (`service_role` pomija RLS),
--   a klient nie ma tu czego czytać. Brak polityki oznacza tu brak dostępu,
--   czyli dokładnie to, co zamierzone.
