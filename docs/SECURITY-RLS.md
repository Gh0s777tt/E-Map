# 🔒 Audyt RLS — bramka izolacji multi-tenant

Automatyczna, **powtarzalna** kontrola żywej bazy pod kątem izolacji między firmami.
Operacjonalizuje ustalenia jednorazowego [audytu z 2026‑06‑21](AUDIT-2026-06-21.md): zamiast
ręcznego przeglądu polityk po każdej migracji, jeden skrypt sprawdza prod i zwraca kod wyjścia
nadający się do CI. Migracje aplikujemy bezpośrednio na prod, więc realne ryzyko to **rozjazd**
żywych polityk z plikami — ten skrypt go wyłapie.

## Uruchomienie

```bash
NODE_PATH=.git/tmpdeps/node_modules node scripts/audit-rls.mjs
# albo:  pnpm audit:rls
```

Połączenie jak w [apply-migration.mjs](../scripts/apply-migration.mjs): pooler
`aws-1-eu-central-1` + `SUPABASE_DB_PASSWORD` z `apps/web/.env.local` (lub `SUPABASE_DB_URL`).
Skrypt jest **tylko do odczytu** (pyta katalog systemowy `pg_*`, nic nie zmienia).
Kod wyjścia: `0` = czysto, `1` = wykryto problem, `2` = błąd połączenia.

## W CI (GitLab)

Job **`rls`** w [.gitlab-ci.yml](../.gitlab-ci.yml) odpala `pnpm audit:rls`. Jedynym CI w tym
repo jest GitLab — GitHub to mirror z wyłączonymi Actions i **bez jakiegokolwiek workflow**,
więc nie szukaj tam żadnej bramki. Łączenie przez zmienną CI **`SUPABASE_DB_URL`**:

```
postgresql://postgres.<REF>:<HASŁO>@aws-1-eu-central-1.pooler.supabase.com:5432/postgres
```

Skrypt rozkłada URL ręcznie i wymusza `ssl: { rejectUnauthorized: false }` (pooler ma
self-signed chain), więc sufiks `?sslmode=...` nie ma znaczenia. Bez tej zmiennej reguły joba
się nie dopasowują i job w ogóle nie powstaje — bramka **nie blokuje** wtedy niczego. Zmienną
dodaje się raz: *Settings → CI/CD → Variables*, `masked`.

> ⚠️ **Flaga „protected” decyduje o zakresie bramki.** GitLab podaje zmienne oznaczone jako
> protected wyłącznie w pipeline'ach na gałęziach/tagach chronionych, a pipeline MR-owy biegnie
> na niechronionej gałęzi źródłowej. Z „protected” audyt RLS jest więc bramką **po scaleniu**
> (na `main`), a nie w recenzji. Bez „protected” chodzi też w MR-ach — ale wartość widzi każdy
> pipeline, więc rób tak tylko z poświadczeniami tylko‑do‑odczytu. Ten sam kompromis dotyczy
> joba `db-types`, który używa tej samej zmiennej.

## Co sprawdza ([scripts/audit-rls.mjs](../scripts/audit-rls.mjs))

| # | Reguła | Dlaczego |
|---|--------|----------|
| 1 | RLS włączone na każdej tabeli `public` | Tabela bez RLS = każdy zalogowany czyta cudze dane. |
| 2 | Każda tabela z RLS ma ≥1 policy | RLS bez policy = ciche deny‑all = ukryty bug. |
| 3 | Brak `USING (true)` na SELECT/ALL | Szeroki odczyt = wyciek między firmami (poza tabelami wspólnotowymi). |
| 4 | Zapisy ograniczone do autora/roli | INSERT→`WITH CHECK`, UPDATE/DELETE→`USING`; `true` = każdy może pisać. |
| 5 | `SECURITY DEFINER` ma `search_path` | Brak przypięcia = ryzyko hijacku przez podmianę ścieżki schematu. |
| 6 | Helpery `is_member_of` / `has_role` istnieją i są `SECURITY DEFINER` | Filary RLS — bez nich polityki nie izolują. |
| 7 | **Każda polityka UPDATE ma `WITH CHECK`** z powtórzonym warunkiem przynależności | Bez `WITH CHECK` Postgres stosuje `USING` do wiersza po zmianie — a to broni WYŁĄCZNIE kolumn, które w `USING` wystąpiły. Typowe `USING (driver_id = auth.uid() OR has_role(company_id, …))` przepuszcza podmianę `company_id`, bo pierwszy człon pozostaje prawdziwy: kierowca przepina własny wiersz do obcej firmy. |
| 8 | **Żadna funkcja `SECURITY DEFINER` nie jest wywoływalna przez `anon`** (poza jawną listą wyjątków) | PostgREST wystawia funkcje z `public` jako `/rest/v1/rpc/<nazwa>`, a `anon` to klucz publiczny leżący w paczce aplikacji. Funkcja dostępna dla `anon` jest dostępna dla całego internetu. **Uwaga:** Postgres domyślnie nadaje `EXECUTE` roli `PUBLIC`, a `anon` po niej dziedziczy — samo `revoke … from anon` nic nie zmienia, odbierać trzeba `PUBLIC`. |


> ### Reguła 7 — skąd się wzięła
>
> Ten sam błąd wystąpił **trzy razy**: migracja 0094 (`chat_threads`), 0101
> (`driver_positions`) i 0103 (osiem pozostałych polityk). Dwie pierwsze naprawiły
> po jednym wystąpieniu, obie kończąc się identycznym wnioskiem — i wniosek za
> każdym razem zostawał w komentarzu do migracji, zamiast trafić do bramki.
>
> Za trzecim razem dziurę **potwierdzono doświadczalnie na produkcji**: w transakcji
> zakończonej ROLLBACK, z rolą `authenticated` i JWT prawdziwego kierowcy,
> `update fuel_logs set company_id = <obca firma>` przeszło. Wpis tankowania zmienił
> firmę. Dotyczyło to `fuel_logs`, `adblue_logs`, `pause_events` i `trip_events` —
> czyli tankowań, AdBlue, postojów i zdarzeń trasy, z których liczą się kilometry,
> spalanie, koszty i marża po obu stronach.
>
> Reguła jest teraz sprawdzana automatycznie w [`audit:rls`](../scripts/audit-rls.mjs),
> bo naprawianie po jednym działa dopóki ktoś pamięta, a bramka działa dalej.

> ### Reguła 8 — skąd się wzięła
>
> Znalezione przy przeglądzie ostrzeżeń dostawcy: `public._card_key()` i
> `public._pii_key()` — funkcje zwracające klucz pgcrypto, którym szyfrowane są
> **PIN-y kart paliwowych i dane osobowe kierowców** — miały `EXECUTE` dla `PUBLIC`.
>
> Potwierdzone doświadczalnie (w transakcji zakończonej ROLLBACK,
> `set local role anon`): wywołanie przechodziło i zwracało klucz. Wartość nie
> została nigdzie wypisana ani zapisana.
>
> Szyfrowanie jest w tym produkcie **drugą warstwą** — RLS chroni dostęp do wierszy,
> a szyfrowanie chroni ich treść, gdyby RLS zawiodło. Klucz dostępny publicznie
> sprowadzał tę drugą warstwę do zera.
>
> **Pułapka jest dwuwarstwowa i pierwsze podejście ją przegapiło.** Warstwa 1: `anon`
> dziedziczy `EXECUTE` po `PUBLIC`, więc `revoke … from anon` sam z siebie nie działa.
> Warstwa 2: Supabase ma `alter default privileges` nadające `EXECUTE` roli `anon`
> **jawnie** przy tworzeniu funkcji — więc odebranie `PUBLIC` też nie wystarcza.
> Funkcje dodane w migracji 0107 (`save_expo_push_token`, `delete_expo_push_token`),
> pisane właśnie w celu naprawy bezpieczeństwa, zostały przez to wywoływalne bez
> logowania aż do migracji 0108. Razem z nimi wyszło `driver_save` — zapisujące dane
> osobowe kierowcy — przeoczone przy układaniu listy w 0105.
>
> **Reguła: `revoke execute … from public, anon`, a skutek sprawdzać przez
> `has_function_privilege('anon', …)`** — nie przez obecność `revoke` w migracji.
>
> Naprawione w [migracji 0105](../supabase/migrations/0105_revoke_key_accessors_from_clients.sql):
> klucze odebrane `PUBLIC`/`anon`/`authenticated` (wołają je wyłącznie funkcje
> `SECURITY DEFINER` należące do `postgres`, więc aplikacja działa bez zmian),
> a 19 uprzywilejowanych RPC odebrane `PUBLIC` przy zachowaniu `authenticated`.

> ### Znane ograniczenie: matryca uprawnień nie jest granicą bezpieczeństwa
>
> `memberships.permissions` (matryca właściciela, #278) trzyma poziom `view`/`edit`
> per moduł. **Żadna polityka RLS jej nie czyta.** Kolumna jest używana wyłącznie
> przez `company_members()` i `create_invite`; reguły INSERT/UPDATE odwołują się
> do roli i przynależności, nie do poziomu.
>
> Ekrany mobilne respektują poziom `view` (chowają formularz), web nie, baza nie zna
> go w ogóle. Członek z poziomem `view` może dodać własne tankowanie przez panel albo
> wprost przez API. **Granicą pozostaje RLS: własne wiersze, własna firma** — i ta
> granica działa. Poziom z matrycy jest wygodą interfejsu.
>
> Komentarz w `apps/mobile/lib/usePermission.ts` twierdził wcześniej, że „serwerowe
> RLS i tak pilnuje zapisu" — sprostowane w `[#393]`. Fałszywa deklaracja
> zabezpieczenia jest groźniejsza niż jego brak, bo zniechęca do dołożenia kontroli.
>
> **Do decyzji przed wdrożeniem:** czy poziom rozstrzyga o INSERT, o UPDATE cudzych
> wierszy, czy o obu — i co zrobić z wpisami zakolejkowanymi offline, zanim
> uprawnienie odebrano. To decyzja produktowa, nie poprawka.

Obiekty należące do **rozszerzeń** (PostGIS: `spatial_ref_sys`, `st_*`) są pomijane
automatycznie (`pg_depend deptype='e'`) — zarządza nimi Supabase, nie nasze migracje.

## Tabele wspólnotowe (świadomy `USING (true)`)

Cztery tabele są czytane globalnie **z założenia** — to dane rynkowe/społecznościowe **bez
`company_id`**. Odczyt globalny jest poprawny; integralność opiera się na ograniczeniu **zapisów**
do autora/roli (krok 4 to egzekwuje). Lista jest jawna w skrypcie (`GLOBAL_READ_OK`) — dodanie
nowej pozycji wymaga świadomej decyzji.

| Tabela | Zawartość | Zapis ograniczony do |
|--------|-----------|----------------------|
| `fuel_prices` | ceny paliw (crowdsourcing) | `reported_by = auth.uid()` |
| `map_reports` | zgłoszenia na mapie (wypadki/policja/wagi) | autor lub `is_developer()` |
| `pois` | katalog POI (stacje, parkingi) | `is_developer()` |
| `poi_reviews` | opinie o POI | autor lub `is_developer()` |

## Ostatni wynik (2026‑06‑27, #195)

```
Tabele public: 41 (rozszerzeń: 1) · policy: 97 · SECDEF fn: 31
✓ Pokrycie RLS: 40/40 tabel (RLS + ≥1 policy); 4 oznaczone [wspólnotowa]
WYNIK: ✓ izolacja multi-tenant spójna (brak błędów)
```

Wszystkie tabele firmowe (`orders`, `invoices`, `invoice_items`, `documents`, `drivers`,
`vehicles`, `fuel_cards`, `fuel_logs`, …) izolują przez `is_member_of` (odczyt) i `has_role`
(zapis) — bezpośrednio przez `company_id` lub pośrednio przez firmę rodzica (np. `invoice_items`
→ `invoices.company_id`). Wszystkie 31 naszych funkcji `SECURITY DEFINER` mają przypięty
`search_path`.
