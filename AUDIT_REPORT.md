<!-- Raport audytu — wygenerowany READ-ONLY. Stan na 2026-06-28, main @ 575fe35 (v1.69.0). -->

# 🔍 AUDIT_REPORT — E‑Logistic

> Audyt techniczny (read-only). Branch `main`, commit `575fe35`, tag `v1.69.0`.
> Metoda: analiza statyczna kodu, uruchomienie testów, `pnpm audit`, audyt RLS na żywej bazie, start dev servera.
> Sekrety: podane wyłącznie nazwy zmiennych — żadnych wartości.

---

## 1. Podsumowanie

Projekt jest **dojrzały i w dobrej kondycji jak na zakres** (monorepo Turborepo: Next 16 web + Expo mobile + 5 pakietów współdzielonych). Architektura bezpieczeństwa multi‑tenant jest **realnie wdrożona i zweryfikowana** — audyt RLS uruchomiony na żywej bazie zwrócił `✓ izolacja spójna` (41 tabel, 97 policy, 31 funkcji SECURITY DEFINER z przypiętym `search_path`, zero tabel bez RLS). Sekrety nie wyciekły do repo ani historii git, a `service_role` nie pojawia się w kodzie webowym. Testy przechodzą (335/335), `tsc` i `biome` czyste, build produkcyjny działa.

Trzy najważniejsze ryzyka: **(1)** higiena repozytorium wymknęła się spod kontroli — ~80 lokalnych i ~180 zdalnych branchy, wszystkie zmergowane, zaśmiecają repo; **(2)** 7 podatności w zależnościach (5× high `xmldom`, 2× moderate `postcss`/`uuid`) — transitive, ale nieadresowane; **(3)** duplikaty numerów migracji (`0017`, `0018`) tworzą niejednoznaczną kolejność stosowania na świeżej bazie.

Nie znalazłem wpisów **Krytycznych** (brak otwartych tabel, brak sekretów w repo, auth‑guard działa). Większość ustaleń to **Średnie/Niskie** — dług higieniczny i niespójności, nie błędy blokujące. Projekt jest **blisko „produkcyjnego"** dla części webowej (jest już deployowany na Vercel); mobile pozostaje przed publikacją. Główny dług to **brak testów warstwy UI** (komponenty React nie mają żadnych testów) i **rozjazd wersjonowania** między pakietami.

---

## 2. Tabela ustaleń

| Severity | Obszar | Problem | Dowód | Rekomendacja |
|---|---|---|---|---|
| Wysoki | Higiena repo | ~80 lokalnych + ~180 zdalnych branchy, **wszystkie zmergowane** do `main` — repo nieczytelne, ryzyko pracy na martwym branchu | `git branch -a` (≈260 pozycji); `git branch --no-merged main` → pusto | Prune zmergowanych: `git branch -d` lokalnie + `git push origin --delete` / okresowe czyszczenie. Ustalić politykę kasowania po merge PR |
| Wysoki | Zależności | 7 podatności: **5× high `xmldom`** (XML injection / DoS), 2× moderate (`postcss` <8.5.10 XSS via `next`, `uuid` <11.1.1 via `expo`) | `pnpm audit` (tło, exit 0): „Severity: 2 moderate \| 5 high"; ścieżki `apps__web>next>postcss`, `apps__mobile>expo>…>uuid` | `pnpm why xmldom` → ustalić źródło (najpewniej toolchain Expo); `pnpm.overrides` na załatane wersje lub bump SDK; powtórzyć audyt. Większość to dep dev/build, nie runtime web |
| Średni | Baza danych | **Duplikaty numerów migracji**: `0017_notifications` + `0017_fuel_full_tank`, `0018_fix_expiry_onconflict` + `0018_vehicle_tanks` — kolejność zależna od sortowania nazw, nie numeru | `supabase/migrations/` (glob): dwa pliki `0017_*`, dwa `0018_*` | Renumerować przyszłe migracje unikalnie; udokumentować, że historyczne `0017/0018` są stosowane alfabetycznie i są już na prod (nie zmieniać zastosowanych) |
| Średni | Bezpieczeństwo / API | `/api/push/send` **bez rate‑limitingu** — zalogowany owner/spedytor może spamować push całej firmy | `apps/web/app/api/push/send/route.ts` (ma auth+rolę+walidację, brak `Ratelimit`); rate‑limit jest w 5 innych tras (`/api/route`, `/api/traffic`, `/api/fuel-eu`, `/api/fuel-prices`, `/api/passkey/auth/verify`) | Dodać `rateLimit` jak w `/api/route` (np. N/min na user/firmę) |
| Średni | Bezpieczeństwo | `createSupabaseAdminClient` (service‑role, omija RLS) **bez `import "server-only"`** — brak twardej bariery przed wciągnięciem do bundla klienta; chroni tylko brak prefiksu `NEXT_PUBLIC_` w env + konwencja | `packages/api/src/client.ts:72-81` (brak `server-only`) | Dodać `import "server-only"` do modułu eksportującego klienta admin (lub wydzielić go do `*.server.ts`) |
| Średni | Wersjonowanie | **Rozjazd wersji pakietów**: root `1.69.0`, `apps/web` `1.7.1`, `apps/mobile` `1.26.0`, pakiety `0.2.0–0.10.0` — mylące, `docs:check` pilnuje tylko roota | `package.json` (root) vs `apps/web/package.json:3` (`"1.7.1"`) vs `apps/mobile/package.json:3` (`"1.26.0"`) | Ujednolicić do wersji roota **albo** jawnie udokumentować niezależne wersjonowanie i objąć `apps/web` bramką `docs:check` |
| Średni | Testy | **Zero testów komponentów React/UI** — pokryta tylko logika (core/api/lib/maps). Toasty, `DataTable`, strony, formularze niesprawdzone testem. Brak metryki pokrycia | `apps/web` = 33 testy = tylko `tests/api/*` + `lib/pushUrl` + `lib/dataTable`; brak `*.test.tsx`; brak konfiguracji `--coverage` | Dodać testy komponentów (React Testing Library) dla `DataTable`, `Toast`, kluczowych formularzy; włączyć coverage w CI z progiem |
| Średni | UX / Spójność | **Mapa nie reaguje na tryb jasny** — moduł `map/*` celowo wykluczony z migracji na tokeny (#205), więc w light mode panel mapy jest ciemny na jasnym tle aplikacji | `apps/web/app/(app)/map/*` używa `palette` (hex), nie `cssPalette`; decyzja świadoma, ale powstaje wizualny rozjazd | Albo light‑wariant `mapTheme.ts` + panele na `var(--el-*)`, albo udokumentować jako celowe (mapa zawsze ciemna) i wizualnie oddzielić |
| Niski | Spójność UI | `DataTable` zaadoptowany **tylko na 1 liście** (`contractors`); pozostałe listy to wzorzec kart — niespójny pattern list | `DataTable` importowany jedynie w `apps/web/app/(app)/contractors/page.tsx`; reszta list (vehicles, orders, …) = `.map` na kartach | Albo rozszerzyć na listy płaskie (faktury/rozliczenia), albo udokumentować, że karty są celowe dla list z rozwijaniem |
| Niski | Nawigacja | Panel `/dev` istnieje, ale **nie ma linku w nawigacji** (dostęp tylko przez URL) | `apps/web/app/(app)/dev/page.tsx` istnieje; `apps/web/app/(app)/layout.tsx:61-118` (`navGroups`) go nie zawiera | Potwierdzić celowość (developer‑only). Jeśli celowe — OK, jeśli nie — dodać warunkowy link |
| Niski | Repo | `.claude/launch.json` zacommitowany (narzędzie dev preview) | `git ls-files .claude/` → `.claude/launch.json` | Rozważyć `.gitignore` na `.claude/` (lokalne narzędzie) lub świadomie zostawić dla zespołu |
| Niski | Bezpieczeństwo | **Brak CSP** (Content‑Security‑Policy) — świadomie pominięty z uwagi na mapę (wiele źródeł) | `apps/web/next.config.ts:3-18` (komentarz wyjaśnia); są HSTS, X‑Frame DENY, nosniff, Permissions‑Policy | Rozważyć CSP `report-only` z allowlistą (MapTiler/OSM/Overpass/blob) → docelowo enforce |

---

## 3. Macierz rozbieżności dashboard ↔ kod

Weryfikacja oparta na: nawigacji w `apps/web/app/(app)/layout.tsx` (`navGroups`), plikach `page.tsx`, oraz potwierdzeniu auth‑guard. Panele `(app)` nie były weryfikowane na żywych danych (brak sesji — patrz Luki).

| Funkcja | W UI (nav)? | W kodzie? | Aktualna? | Uwagi |
|---|---|---|---|---|
| Pulpit / KPI | ✅ | ✅ `dashboard/page.tsx` | ✅ | Eksport PDF (`PrintButton`), hover‑lift kart |
| Pojazdy (+ karta `[id]`) | ✅ | ✅ `vehicles/`, `vehicles/[id]` | ✅ | Toasty (#208) |
| Kierowcy (+ karta `[id]`) | ✅ | ✅ `drivers/`, `drivers/[id]`, `DriverRoster` | ✅ | Toasty (#213 dla `DriverRoster`) |
| Karty paliwowe | ✅ | ✅ `cards/page.tsx` | ✅ | PIN szyfrowany (Vault) |
| Zlecenia / Status floty / Moje zlecenia | ✅ | ✅ `orders`, `fleet-status`, `my-orders` | ✅ | Toasty (#212) |
| Faktury (+ pozycje) | ✅ | ✅ `invoices/page.tsx` (2 komponenty) | ✅ | Fakturownia export (`/api/fakturownia`) |
| Kontrahenci | ✅ | ✅ `contractors/page.tsx` | ✅ | **Jedyna lista na `DataTable`** |
| Serwis / Usterki / Dokumenty | ✅ | ✅ `service`, `reports`, `documents` | ✅ | Toasty (#209/#212) |
| Diety / Czas pracy / Wypłaty / Rozliczenia / Miesięczne | ✅ | ✅ `per-diem`, `work-time`, `payouts`, `settlements`, `monthly` | ✅ | Trasy PL→EN z redirectami 308 (`next.config.ts:33`) |
| Statystyki | ✅ | ✅ `stats/page.tsx` + sekcje | ✅ | Drill‑down, emisje CO₂, rentowność |
| Mapa (TIR/myto/POI/3D) | ✅ | ✅ `map/page.tsx` (~1700 l.) | ✅ | **Nie reaguje na light mode** (świadome) |
| Ceny diesla | ✅ | ✅ `fuel-prices/page.tsx` | ✅ | Crowd + Tankerkönig |
| Formularze (Paliwo/AdBlue/Trip) | ✅ | ✅ `forms/{fuel,adblue,trip}`, `LiquidForm` | ✅ | Offline outbox; toasty (#212/#213) |
| Audyt (dziennik) | ✅ (owner) | ✅ `audit/page.tsx` | ✅ | RLS owner/developer |
| Ustawienia (2FA/push) / Zespół | ✅ | ✅ `settings`, `team` | ✅ | Toasty (#212/#213) |
| Panel developera | ❌ **brak w nav** | ✅ `dev/page.tsx` | ⚠️ | Dostęp tylko przez URL — potwierdzić celowość |
| Przełącznik motywu jasny/ciemny | ✅ (sidebar) | ✅ `ThemeToggle`, `lib/theme` | ✅ | Anty‑FOUC, persystencja |
| Paleta poleceń (Ctrl/⌘+K) | ✅ (sidebar) | ✅ `GlobalSearch` | ✅ | Akcje + nawigacja + encje |

Nie wykryto „guzika bez akcji" ani „akcji bez guzika" w analizie statycznej. Jedyna rozbieżność strukturalna: `/dev` bez linku.

---

## 4. Stan usług

### Vercel
- `apps/web/vercel.json`: jedna konfiguracja — cron `/api/cron/notify` o `0 7 * * *` (codziennie 7:00). Cron chroniony `CRON_SECRET` (`.env.example:31`).
- Security headers w `next.config.ts` (HSTS, X‑Frame‑Options DENY, nosniff, Referrer‑Policy, Permissions‑Policy). Redirecty PL→EN (308).
- **Niesprawdzone** (brak Vercel CLI): status deployów, błędy buildów, zgodność env w konsoli z repo. → Luki.

### Supabase
- **RLS — zweryfikowane na żywej bazie** (`node scripts/audit-rls.mjs`, read‑only): `✓ izolacja multi‑tenant spójna (brak błędów)`. 41 tabel `public`, **40 niesystemowych — wszystkie z RLS + ≥1 policy** (97 policy łącznie). 4 tabele wspólnotowe (`fuel_prices`, `map_reports`, `pois`, `poi_reviews`) z `USING(true)` na odczyt — świadome (`GLOBAL_READ_OK`).
- 31 funkcji SECURITY DEFINER — wszystkie z przypiętym `search_path`. Helpery `is_member_of`/`has_role` istnieją i są SECURITY DEFINER.
- `service_role`: używany **tylko** w `packages/api/src/client.ts:72` (server), zero wystąpień w `apps/web` (grep). Env `SUPABASE_SERVICE_ROLE_KEY` oznaczony „NIGDY w kliencie" (`.env.example:10`). **Słabość**: brak `server-only` (patrz tabela).
- Migracje: 53 pliki (`0001`–`0051`, z duplikatami `0017`/`0018`). Typy DB generowane (`database.types`).

### Upstash (Redis / rate‑limit)
- Użyty w 5 trasach: `/api/route`, `/api/traffic`, `/api/fuel-eu`, `/api/fuel-prices`, `/api/passkey/auth/verify`.
- **Brak** w: `/api/push/send`, `/api/orders/notify-assignment`, `/api/fakturownia/export`, `/api/cron/notify`, passkey register. `push/send` to najpoważniejsza luka (mutacja/wysyłka).
- Klucze po stronie serwera (`@upstash/*` w trasach server). `rateLimit` ma fallback in‑memory (z poprzedniego hardeningu).

### Inne integracje (z `.env.example`)
- HERE / GraphHopper (routing TIR + myto + ruch) — serwerowo (`/api/route`, `/api/traffic`).
- MapTiler (`NEXT_PUBLIC_MAPTILER_KEY`) — klient (render mapy).
- Web Push (VAPID — `VAPID_PRIVATE_KEY` sekret) + Expo Push (`EXPO_ACCESS_TOKEN`).
- Fakturownia (`FAKTUROWNIA_API_TOKEN` sekret) — serwerowo. Tankerkönig (`FUEL_PRICE_API_KEY`) — serwerowo.

---

## 5. Bugi / ryzyka do odtworzenia

> Nie znaleziono krytycznych błędów runtime (crash/utrata danych) w czasie audytu. Poniżej ryzyka z dowodem i krokami.

1. **Spam push (brak rate‑limit)** — `apps/web/app/api/push/send/route.ts`.
   Kroki: zaloguj się jako owner/spedytor → wyślij wielokrotnie `POST /api/push/send`. Oczekiwane: throttling. Faktyczne: brak limitu, każde żądanie wysyła push do całej firmy.

2. **Mapa ciemna w trybie jasnym** — `apps/web/app/(app)/map/`.
   Kroki: włącz tryb jasny (przełącznik w sidebarze) → wejdź `/map`. Oczekiwane: panel spójny z jasnym motywem. Faktyczne: panel/kontrolki mapy pozostają ciemne (moduł wykluczony z tokenów).

3. **Niejednoznaczna kolejność migracji** — `supabase/migrations/0017_*`, `0018_*`.
   Kroki: zastosuj migracje na świeżej bazie. Ryzyko: dwa pliki o tym samym numerze stosowane wg sortowania nazwy (`fuel_full_tank` przed `notifications`), nie wg intencji. Na obecnym prod już zastosowane — ryzyko dotyczy odtworzenia bazy od zera.

4. **`service_role` bez bariery `server-only`** — `packages/api/src/client.ts:72`.
   Kroki: zaimportuj `createSupabaseAdminClient` w komponencie `"use client"`. Oczekiwane: błąd build (server‑only). Faktyczne: kompiluje się; chroni jedynie brak env `SUPABASE_SERVICE_ROLE_KEY` w kliencie (rzut w runtime).

---

## 6. Top usprawnień (wg korzyść/koszt)

1. **Prune branchy** (S) — usunąć ~260 zmergowanych branchy lokalnie i na origin. Natychmiastowa czytelność repo, zero ryzyka (zmergowane).
2. **Adresować `pnpm audit`** (S/M) — `pnpm.overrides` dla `xmldom`/`postcss`/`uuid` lub bump Expo SDK; powtórzyć audyt. Zamyka 7 podatności.
3. **Rate‑limit na `/api/push/send`** (S) — skopiować wzorzec z `/api/route`. Zamyka wektor spamu.
4. **`import "server-only"` przy kliencie admin** (S) — twarda bariera dla service‑role. Defense‑in‑depth.
5. **Ujednolicić wersje pakietów** (S) — albo do roota, albo udokumentować + objąć `apps/web` bramką `docs:check`. Koniec mylących „1.7.1".
6. **Testy komponentów UI** (M) — RTL dla `DataTable`, `Toast`, 2–3 formularzy + coverage w CI. Największa luka jakościowa po serii zmian UI.
7. **Dekompozycja `map/page.tsx`** (M/L) — ~1700 linii w jednym pliku; rozbić na komponenty (wymaga QA wizualnego mapy).
8. **Light‑wariant mapy lub decyzja** (M) — domknąć tryb jasny albo udokumentować wyjątek.
9. **Rate‑limit na pozostałych mutacjach** (S) — `notify-assignment`, `fakturownia/export`.
10. **Konwencja unikalnych numerów migracji** (S) — lint/skrypt sprawdzający duplikaty numerów w `supabase/migrations` (do bramki `docs:check`/CI).

---

## 7. Higiena repo

- **Branche**: ~80 lokalnych + ~180 `origin/*`. `git branch --no-merged main` → puste (wszystkie zmergowane). **Do zamknięcia praktycznie wszystkie** poza `main`. Przykłady martwych: `feat/faza-0-scaffold`, `feat/here-routing`, `refactor/ui-button-*`, `test/coverage-*`, `docs/sync-v1.51`, dziesiątki `remotes/origin/feat/*`.
- **Tagi**: `v1.50.0`–`v1.69.0` — ciągłe, chronologiczne, bez luk. OK.
- **CHANGELOG.md**: aktualny (nagłówek `1.69.0`, updaty `213`), format Keep a Changelog, wpisy `[#NNN]` ciągłe. Pilnowany bramką `docs:check`.
- **README.md / docs**: SYNC‑headery i badge wersji pilnowane przez `scripts/docs-check.mjs` (CI). `docs:check` → `✓ spójna z kodem (v1.69.0)`. **Uwaga**: bramka sprawdza wersję/SYNC, nie treść merytoryczną — rozjazdy opisowe możliwe (niesprawdzone tu zdanie po zdaniu).
- **Backlog** (`docs/BACKLOG.md`): aktualny, odhaczane pozycje #205–#213 odpowiadają kodowi.
- **Working tree**: czysty (`git status` pusty).

---

## 8. Luki w audycie

- **Vercel — brak dostępu do konsoli/CLI**: nie zweryfikowano statusu deployów, logów buildów ani zgodności zmiennych env w projekcie Vercel (sprawdzono tylko `vercel.json` + `.env.example`).
- **Brak zalogowanej sesji**: panele `(app)` nie zostały zweryfikowane wizualnie na żywych danych. Potwierdzono jedynie działanie auth‑guard (`/dashboard` → `opaqueredirect` do `/login`) i render stron publicznych (landing). Macierz dashboard↔kod oparta na analizie kodu, nie na klikaniu. (Auth nie obchodzony — zgodnie z trybem read‑only nie tworzono plików env do obejścia.)
- **Coverage testów**: nieznane — brak konfiguracji `--coverage`; raportuję liczbę testów (335), nie procent pokrycia.
- **Źródło `xmldom`**: `pnpm why xmldom` nie zwrócił czytelnego wyniku w czasie audytu; źródło wnioskowane jako toolchain Expo (analogicznie do `uuid`) — do potwierdzenia.
- **Mobile (Expo)**: aplikacja mobilna nie była uruchomiona (brak urządzenia/emulatora) — ocena wyłącznie z kodu.
- **GitHub**: `gh` niezainstalowany — nie sprawdzono PR/Release/Actions po stronie GitHub (tylko lokalny git).
- **Treść dokumentacji**: zweryfikowano spójność wersji (bramka), nie audytowano każdego zdania docs pod kątem zgodności z zachowaniem kodu.

---

*Koniec raportu. Wygenerowano w trybie read‑only — nie wprowadzono żadnych zmian w kodzie, repozytorium ani usługach.*
