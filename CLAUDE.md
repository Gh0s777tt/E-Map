# CLAUDE.md — E‑Logistic

Zasady pracy nad tym repo. Trzymaj się ich, aby repo było zawsze spójne,
zsynchronizowane i w jednej stylistyce.

## Zasada nadrzędna: reguła bez bramki gnije

Ten dokument opisywał kiedyś stan, którego nie było. Mówił „bramki muszą być zielone przed
PR", a job `quality` miał w historii projektu **12 uruchomień i 12 porażek — ani jednego
sukcesu**. Mówił „dokumenty zawsze zgodne z kodem", a `ARCHITECTURE.md` odsyłał do plików,
których w repo nie ma. Reguły były prawdziwe jako intencja i fałszywe jako opis
rzeczywistości — przez co ich czytanie **wprowadzało w błąd**.

Stąd wymóg twardszy niż każda reguła z osobna:

> **Każda reguła w tym pliku ma wskazaną bramkę, która ją egzekwuje. Reguła bez bramki
> jest oznaczona jako `[dyscyplina]` — i wiadomo, że nikt jej nie pilnuje poza człowiekiem.**

Dodając regułę, dodaj bramkę. Jeśli nie da się jej zautomatyzować — napisz to wprost.
Reguła udająca gwarancję jest gorsza niż jej brak, bo zielony znaczek czyta się jako
potwierdzenie.

## Język i styl
- Dokumentacja, changelog i opisy commitów/PR — **po polsku**.
- Motyw wizualny: **czerwień `#E50914` na czerni `#0a0a0a`** (styl Netflix). Bez wyjątków w UI/badge'ach.
- Konwencja nazw repo: `E-<Nazwa>`.
- **Komentarz UZASADNIA decyzję, nie opisuje kodu.** Dobry komentarz mówi, co było zepsute
  i dlaczego akurat tak; zły powtarza sygnaturę. To jest podstawa wartości tego repo.

## Stack (✅ = w kodzie · 🔜 = docelowe; szczegóły w docs/ARCHITECTURE.md)
> Znacznik opisuje **obecność w kodzie**, nie kompletność adopcji: technologia wpięta falami
> zostaje ✅ od pierwszej fali, a zakres kolejnej jest dopisany w tej samej linii. Bramka
> [`docs:check`](scripts/docs-check.mjs) pilnuje, żeby nic oznaczonego 🔜 nie leżało już
> w `package.json` — to ten rozjazd sprawił, że lista trzy razy kłamała naraz.
- ✅ Node 26 · TypeScript 6 (strict) · **pnpm** · **Turborepo** · **Biome** (lint+format, NIE ESLint/Prettier).
- ✅ Web: Next.js 16 · React 19 · Tailwind 4 · własne prymitywy UI. 🔜 shadcn/ui.
- ✅ Mobile: Expo SDK 56 · React Native New Architecture · Expo Router.
- ✅ Backend: Supabase (Postgres 17 + PostGIS · Auth · Realtime · Storage). 🔜 Edge Functions/Deno (dziś rolę pełnią trasy `/api` Next.js/Vercel).
- ✅ Offline: **outbox** (localStorage web / AsyncStorage mobile) · ✅ **PowerSync** — fala 1 w mobile ([`lib/powersync.ts`](apps/mobile/lib/powersync.ts)): sam odczyt, bez `EXPO_PUBLIC_POWERSYNC_URL` pełny no-op. Zapisy dalej idą outboxem — przepięcie ich to fala 2.
- ✅ Mapy: MapLibre GL (render) + abstrakcja `RoutingProvider` (adaptery HERE/TomTom/GraphHopper + mock).
- ✅ Walidacja: Zod (współdzielona web↔mobile w `packages/core`).
- ✅ Stan serwera: **TanStack Query** — [`QueryProvider`](apps/web/components/QueryProvider.tsx) opakowuje cały panel `(app)`, ekrany przepinane falami (nie hurtem — każdy ma własny kształt zapytań). 🔜 Zustand (stan klienta; dziś React hooks).
- ✅ Obserwowalność: **Sentry** — web ([`instrumentation.ts`](apps/web/instrumentation.ts) · [`instrumentation-client.ts`](apps/web/instrumentation-client.ts) · [`global-error.tsx`](apps/web/app/global-error.tsx) · crony i rate-limit) + mobile ([`_layout.tsx`](apps/mobile/app/_layout.tsx), `ErrorBoundary`); bez DSN pełny no-op.

## Rytm pracy — „na bieżąco"

Nie „na koniec sprintu", tylko **w tym samym commicie co zmiana**. Rozjazd powstaje w chwili,
w której kod idzie dalej niż jego opis — a nadrabianie tygodnia wstecz nie jest możliwe,
bo nikt nie pamięta uzasadnień.

| Co | Kiedy | Bramka |
|:--|:--|:--|
| **Dokumentacja** (`docs/*.md`) | z każdą zmianą, której dotyczy | `docs:check` — kontrole 4–8 |
| **README** (badge + nagłówek SYNC) | z każdym bumpem wersji | `docs:check` — kontrole 1–2 |
| **CHANGELOG** (wpis `[#NNN]` na górze) | z każdą istotną zmianą | `docs:check` — kontrola 3 |
| **ROADMAP** (status faz) | gdy faza rusza albo się domyka | `[dyscyplina]` — treści nie da się sprawdzić maszynowo |
| **Commit** | po każdej domkniętej zmianie, nie zbiorczo | hook `pre-commit` (Biome) |
| **Push** | po każdym commicie, na **oba** remote'y | `[dyscyplina]` — patrz „Git" |
| **Release + tag** | po każdym wydaniu | job `release` w [`.gitlab-ci.yml`](.gitlab-ci.yml) |
| **Weryfikacja gałęzi** | przed każdym commitem | `[dyscyplina]` — nigdy nie commituj na `main` |
| **Audyt / security check** | przed każdym wydaniem | `gitleaks` + `semgrep-sast` + [`audit:rls`](scripts/audit-rls.mjs) |
| **Spójność numerów** (wersja ↔ `[#NNN]` ↔ tag) | z każdym bumpem | `docs:check` — kontrole 1–3 |
| **Podpisy commitów** | zawsze | `[dyscyplina]` — patrz „Git" |
| **Sekrety poza repo** | zawsze | `gitleaks` (pełna historia, `GIT_DEPTH: 0`) |

**Numeracja `[#NNN]` jest ciągła i chronologiczna — bez luk i bez powtórzeń.** Numer
przypisujesz w chwili pisania wpisu, nie planowania zadania.

## Wersjonowanie i changelog (KRYTYCZNE)
- **SemVer** + numeracja updatów `[#NNN]` (kolejne, bez luk, chronologicznie).
- Każda istotna zmiana = wpis na górze [`CHANGELOG.md`](CHANGELOG.md) w formacie *Keep a Changelog*,
  z linkami do zmienionych plików i sekcją „Bramki".
- Po wydaniu: **tag** `vX.Y.Z` + **Release** z treścią z changelogu.
- Nagłówek `<!-- SYNC: vX.Y.Z · #NNN · DATA -->` w README aktualizowany razem z wersją.
- Wersja `apps/web` **musi** równać się wersji w korzeniu (`docs:check`). `apps/mobile`
  wersjonuje się **niezależnie** — wynika to z cyklu wydawniczego sklepów (EAS), nie z niedbałości.
- Nagłówek wersji w dokumencie podbijasz **tylko wtedy, gdy zmieniłeś jego treść**.
  Podbicie „dla porządku" zamienia ostrzeżenie bramki w kłamstwo.
- Gdy CHANGELOG przekroczy ~2000 linii — starsze wydania idą do [`docs/changelog/`](docs/changelog).
  Plik przepisywany przy każdym wydaniu jest największym pojedynczym źródłem wzrostu repo.

## Bramki jakości (przed commitem/PR)

Jedno polecenie, to samo lokalnie i w CI — żeby nie istniały dwie różne definicje „zielonego":

```
pnpm check     # = biome (lint+format) · tsc ×7 · testy · docs:check
```

Osobno, bo nie wchodzi do `pnpm check`:

```
cd apps/web && pnpm build     # next build — musi przejść BEZ ostrzeżeń
```

- `biome` czysto (lint + format) — **nie ESLint/Prettier**.
- `tsc` exit 0 w **każdym** z 7 pakietów.
- Parytet i18n: web PL/EN, mobile PL/EN/DE/UK. **Uwaga:** klucz usunięty ze *wszystkich*
  katalogów naraz przechodzi test parytetu i wywala się dopiero w runtime — przy usuwaniu
  klucza sprawdź, czy kod go nie woła.
- `docs:check` exit 0.
- Migracje Supabase i polityki RLS spójne ze schematem (patrz [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md)).
- **Zero** `any`, `as any`, `@ts-ignore`, `@ts-expect-error`, `TODO`, `FIXME`, `HACK`
  w nowym kodzie. Repo ma tego zero i ma zachować. Nie wyciszaj błędu — napraw przyczynę.

**Gdzie co chodzi:** bramka jakości na [GitHub Actions](.github/workflows/ci.yml) (publiczne
repo = darmowe minuty), a skany wymagające sekretów lub pełnej historii — `gitleaks`, SAST,
`db-types`, `rls`, `release`, `pages` — w [`.gitlab-ci.yml`](.gitlab-ci.yml). Granica przebiega
**po sekretach**: bramka bez sekretów nie może stać na budżecie, bramka z sekretami nie może
stać na publicznym repo.

## Git
- Praca na branchach (`feat/…`, `fix/…`, `docs/…`, `refactor/…`), MR/PR do `main`.
  **Sprawdź gałąź przed pierwszym commitem** — `git rev-parse --abbrev-ref HEAD`.
  Nigdy nie commituj bezpośrednio na `main`.
- Commity opisowe, powiązane z `[#NNN]`. Treść po polsku, **bez znaków diakrytycznych**
  (konwencja repo), z uzasadnieniem — nie samą listą plików.
- Każdy commit kończy się linią `Co-Authored-By:` autora wspomagającego.
- **Podpisy:** commity mają być podpisane. Włącz raz:
  ```
  git config --global commit.gpgsign true
  ```
  `[dyscyplina]` — GitLab i GitHub pokazują „Verified", ale **nic w repo tego nie wymusza**.
  Docelowo: ochrona gałęzi z wymogiem podpisu (ustawienie po stronie hostingu, nie repo).
- Push na **oba** remote'y (`gitlab` = źródło prawdy, `origin` = publiczny mirror).
  Rozjazd mirrorów jest niewidoczny do momentu, w którym ktoś sklonuje ten gorszy.
- Bramki muszą być zielone **przed** MR — nie merguj z czerwonymi.

## Reguły wykute na błędach

Każda z nich kosztowała osobne śledztwo. Nie są teoretyczne.

- **Komentarz, który kłamie, jest błędem — nie kosmetyką.** To repo opiera się na tym, że
  komentarz uzasadniający mówi prawdę. Fałszywe uzasadnienie jest gorsze niż jego brak, bo
  zniechęca następną osobę do sprawdzenia. Znaleziono m.in. „domyślnie skanujemy komplet"
  nad zapytaniem bez `limit` i bez `order`.
- **Nigdy cichego obcięcia.** PostgREST tnie odpowiedź na `api.max_rows` (1000) **bez błędu**.
  Każde zapytanie listujące ma mieć jawny sufit, a wynik — sygnał kompletności
  ([`PagedRows.complete`](packages/api/src/data/pagination.ts)). Limit wyższy od sufitu serwera
  niczego nie chroni; detektor `rows.length >= 5000` nie mógł zadziałać nigdy.
- **Stronicuj keysetem, nie offsetem.** Zbiory sortowane malejąco po dacie przesuwają offsety
  przy każdej wstawce — ten sam wiersz wraca na dwóch stronach i **kwota liczy się dwa razy**.
- **Bramka na jednym zbiorze z pięciu jest gorsza niż jej brak.** Milczenie przy pozostałych
  czyta się jako potwierdzenie ich kompletności. Przepinając ekran, wypisz **wszystkie** jego
  zapytania i odhacz każde.
- **Nowy wariant bez konsumenta to martwy kod.** Funkcja z testami, której nikt nie woła,
  daje zielone bramki i zero wartości. Po dodaniu — pokaż, kto ją wywołuje.
- **Kod nie może wymuszać kolejności wdrożenia.** Migracja i deploy jadą osobno. Kod zależny
  od nowego RPC ma mieć ścieżkę awaryjną rozpoznawaną **wąsko** (po kodzie błędu), inaczej
  odwrotna kolejność wywraca ekrany. Łapanie każdego błędu zamienia awarię sieci w ciche
  zejście na wolniejszy tor — to ta sama choroba.
- **Sufit renderowania to nie sufit pobrania.** Sumy, filtry i eksport liczą się z kompletu;
  w DOM idzie porcja. I sprawdź, **od którego końca** okno obcina — lista sortowana rosnąco
  pokaże najstarsze wiersze zamiast najpilniejszych.
- **Formularz musi odpowiadać na tapnięcie.** Brak wibracji, brak koloru błędu i komunikat
  renderowany pod przyciskiem (czyli pod krawędzią ekranu) dają „przycisk nie reaguje" —
  zgłaszane jako awaria zapisu, choć zapis działał.
- **Zielony pipeline ma znaczyć „bramki przeszły".** Jeśli reguły CI przepuszczają tylko
  jeden job z sześciu, znaczek kłamie skuteczniej niż jego brak.

## Bezpieczeństwo

Polityka, zakres zgłoszeń i inwarianty — [`SECURITY.md`](SECURITY.md). W skrócie:

- Multi-tenant przez **RLS** — kierowca widzi tylko swoje dane, właściciel tylko swoją firmę.
  **100 % tabel ma włączone RLS**; nowa tabela bez polityki to błąd blokujący.
- Każda funkcja `SECURITY DEFINER` ma **przypięty `search_path`**. Bez wyjątków.
- **PIN-y kart paliwowych i dane wrażliwe**: szyfrowane (Supabase Vault/pgcrypto). **Ustawia**
  owner; **odczyt** dla aktywnych członków firmy (kierowca musi znać PIN, by zapłacić
  w automacie) — każdy odczyt audytowany. Nigdy w logach, nigdy w repo.
- Sekrety wyłącznie w env (`.env.example` jako szablon), skan `gitleaks` po **pełnej historii**.
- Rotacja sekretów: [`docs/SECRET-ROTATION.md`](docs/SECRET-ROTATION.md).
