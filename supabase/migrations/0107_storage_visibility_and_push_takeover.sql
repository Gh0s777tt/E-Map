-- [#390] Dwie dziury prywatności: sejf dokumentów i token push na firmowym telefonie.

-- ═══ 1. Sejf dokumentów: widoczność egzekwowana także na PLIKU ══════════════
--
-- Migracja 0061 wprowadziła widoczność dokumentu (`management` / `company` /
-- `selected`) i poprawnie założyła ją na tabelę METADANYCH. Polityka na
-- `storage.objects` została jednak taka, jak w 0031 — sprawdzała wyłącznie
-- przynależność do firmy.
--
-- Skutek: kierowca nie widział dokumentu na liście (tabela go filtrowała), ale
-- **mógł pobrać sam plik**, bo bucket przepuszczał każdego aktywnego członka
-- firmy. Ścieżki nie trzeba zgadywać — `storage.objects` daje się wylistować
-- tą samą polityką. W sejfie leżą umowy leasingowe, polisy i dokumenty
-- kadrowe oznaczone jako `management` właśnie po to, żeby nie były dla wszystkich.
--
-- To wzorzec do zapamiętania: **przy plikach reguła musi stać w DWÓCH miejscach**
-- — na wierszu metadanych i na obiekcie w buckecie. Zabezpieczenie jednego z nich
-- wygląda na kompletne, bo lista faktycznie się filtruje.
--
-- Warunek poniżej jest dokładnym odbiciem `documents_select` z 0061, dopięty
-- po `documents.path = storage.objects.name`.

drop policy if exists documents_obj_select on storage.objects;
create policy documents_obj_select on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and (
      -- Zarząd firmy, do której należy folder: pełny dostęp. Ta gałąź obsługuje
      -- też pliki BEZ wiersza metadanych (przerwany upload, sprzątanie) — bez
      -- niej stałyby się nieusuwalne i niewidoczne dla kogokolwiek.
      exists (
        select 1 from public.memberships m
        where m.user_id = auth.uid() and m.status = 'active'
          and m.company_id::text = (storage.foldername(name))[1]
          and m.role in ('owner', 'dispatcher')
      )
      -- Pozostali: wyłącznie pliki, których metadane są dla nich widoczne.
      or exists (
        select 1 from public.documents d
        where d.path = storage.objects.name
          and (
            (d.visibility = 'company' and public.is_member_of(d.company_id))
            or (d.visibility = 'selected' and auth.uid() = any(d.allowed_user_ids))
          )
      )
    )
  );

-- ═══ 2. Token push: telefon zmienia właściciela, powiadomienia nie ══════════
--
-- `expo_push_tokens.token` jest UNIQUE, a tabela ma polityki SELECT/INSERT/DELETE
-- — **nie ma polityki UPDATE**. Zapis tokenu to `upsert(onConflict: "token")`,
-- czyli przy istniejącym wierszu wykonuje się UPDATE. Bez polityki UPDATE ten
-- upsert po prostu się nie udaje.
--
-- Scenariusz, w którym to boli, jest w tej branży codzienny: firmowy telefon
-- przechodzi z kierowcy A na kierowcę B. B loguje się swoim kontem, aplikacja
-- próbuje zapisać ten sam token Expo (token należy do URZĄDZENIA, nie do konta)
-- — zapis nie przechodzi, wiersz zostaje przypisany do A. Od tej chwili
-- powiadomienia adresowane do A — przydziały zleceń, treści z czatu, dane
-- kierowcy — lądują na ekranie telefonu, którego używa B.
--
-- Rozwiązanie: **przejęcie tokenu przez tego, kto trzyma urządzenie**. Fizyczne
-- posiadanie telefonu jest tu jedyną sensowną podstawą — token pochodzi z tego
-- urządzenia i tylko na nie trafiają powiadomienia. Robimy to funkcją
-- `SECURITY DEFINER`, bo B z definicji nie ma prawa dotknąć wiersza A: usuwamy
-- poprzednie przypisanie i zakładamy nowe, dla wołającego.
--
-- Świadomie NIE dodajemy polityki UPDATE — pozwoliłaby wyłącznie właścicielowi
-- wiersza go zmienić, czyli nie rozwiązałaby ani jednego z opisanych przypadków.

create or replace function public.save_expo_push_token(
  p_token text,
  p_platform text default null,
  p_company uuid default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Wymagane zalogowanie';
  end if;
  if p_token is null or length(trim(p_token)) = 0 then
    raise exception 'Pusty token push';
  end if;

  -- Token należy do urządzenia: poprzednie przypisanie traci ważność w chwili,
  -- gdy z tego urządzenia loguje się ktoś inny.
  delete from public.expo_push_tokens where token = p_token and user_id <> auth.uid();

  insert into public.expo_push_tokens (user_id, token, platform, company_id)
  values (auth.uid(), p_token, p_platform, p_company)
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        company_id = excluded.company_id;
end $function$;

-- Wylogowanie ma zabierać token z tego urządzenia. Bez tego telefon oddany
-- innej osobie dostaje powiadomienia poprzedniego użytkownika aż do jego
-- pierwszego logowania — a jeśli ten nigdy się nie zaloguje, to bezterminowo.
create or replace function public.delete_expo_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    return;
  end if;
  delete from public.expo_push_tokens where token = p_token and user_id = auth.uid();
end $function$;

revoke execute on function public.save_expo_push_token(text, text, uuid) from public;
revoke execute on function public.delete_expo_push_token(text) from public;
grant execute on function public.save_expo_push_token(text, text, uuid) to authenticated;
grant execute on function public.delete_expo_push_token(text) to authenticated;
