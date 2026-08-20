# 🔑 Rotacja sekretów — E‑Logistic

Runbook dla **jedynego otwartego ryzyka bezpieczeństwa** w repo: wartości, które kiedyś trafiły
do historii czatu (**token zarządczy Supabase `sbp_…`** i **token REST Upstash**). Pozycja
w [`BACKLOG.md`](BACKLOG.md) → *P3 Bezpieczeństwo*.

> ⚠️ **Tego nie da się wykonać z repozytorium.** Rotacja wymaga zalogowania do paneli Supabase,
> Upstash i Vercel — czyli działania właściciela. Dopóki checklista z §6 nie jest odhaczona,
> traktuj oba sekrety jako **skompromitowane**: sekret, który raz opuścił zaufany kanał, jest
> spalony niezależnie od tego, czy widać ślady nadużycia.

> 🔴 **Priorytet: token `sbp_` przed Upstash.** `sbp_` to token **zarządczy** — daje pełną kontrolę
> nad projektem Supabase (odczyt kluczy API, zmiana konfiguracji Auth, wykonywanie SQL). Token
> Upstash otwiera tylko licznik rate‑limitu. Jeżeli robisz to na raty, rób w tej kolejności.

---

## 1. Co dokładnie rotujemy i gdzie to jest używane

| Sekret | Gdzie się go wydaje | Gdzie żyje wartość | Co przestanie działać po unieważnieniu |
|---|---|---|---|
| **Supabase — token zarządczy `sbp_…`** | Supabase → awatar (prawy górny róg) → **Account Settings** → **Access Tokens** | tylko lokalnie (powłoka / `apps/web/.env.local`); **nie ma go w Vercel** | [`scripts/gen-types.mjs`](../scripts/gen-types.mjs) w trybie Management API (`SUPABASE_MGMT_TOKEN`) · konfiguracja polityki haseł z [`supabase/README.md`](../supabase/README.md) (`SUPABASE_ACCESS_TOKEN`) |
| **Upstash — token REST Redis** | Upstash Console → **Redis** → baza → sekcja **REST API** (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) | Vercel → projekt `e-logistic` (team `kraina-duchow`) → Environment Variables | rate‑limiting w [`apps/web/lib/ratelimit.ts`](../apps/web/lib/ratelimit.ts) — **degraduje**, nie pada (patrz §3) |

**Deklaracje nazw (nie wartości)** — nic tu nie zmieniasz, to tylko mapa:

- [`turbo.json`](../turbo.json) → `globalEnv` wymienia `SUPABASE_MGMT_TOKEN`, `SUPABASE_PROJECT_REF`,
  `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. To lista nazw, żeby Turbo nie przycinał ich
  przy buildzie — **wartości tam nie ma i nie może być**.
- [`.env.example`](../.env.example) — szablon dla `apps/web/.env.local`, same puste klucze.
- [`.gitlab-ci.yml`](../.gitlab-ci.yml) — wg repo pipeline używa wyłącznie `SUPABASE_DB_URL`
  (joby `db-types` i `rls`) i `GITLAB_TOKEN` (job `release`). **Ani `sbp_`, ani `UPSTASH_*` nie są tam
  potrzebne** — ale i tak zajrzyj do *Settings → CI/CD → Variables* i usuń je, jeśli ktoś je kiedyś dodał
  (repo nie widzi zmiennych CI, więc to jedyny sposób, żeby to sprawdzić).
- **Hasło bazy** nie jest osobnym sekretem w żadnym panelu — jest **zaszyte w connection stringu**,
  więc rotując je, rotujesz wszystkie poniższe naraz. To jedyne miejsce w tym runbooku, gdzie
  zapomnienie jednego wpisu nie objawia się od razu, tylko przy następnym MR-ze:
  | Gdzie leży | Kto czyta | Co pada po rotacji bez podmiany |
  |---|---|---|
  | GitLab → *Settings → CI/CD → Variables* → `SUPABASE_DB_URL` | joby `db-types` i `rls` w [`.gitlab-ci.yml`](../.gitlab-ci.yml) | bramka typów DB i **bramka RLS** czerwienią się na każdym pipelinie (błąd uwierzytelnienia pg) |
  | `apps/web/.env.local` → `SUPABASE_DB_PASSWORD` (gitignored) | [`gen-types.mjs`](../scripts/gen-types.mjs), [`apply-migration.mjs`](../scripts/apply-migration.mjs), [`audit-rls.mjs`](../scripts/audit-rls.mjs) | lokalne `pnpm gen:types`, `pnpm apply-migration`, `pnpm audit:rls` przestają się łączyć |
  | dokumentacja: [`SECURITY-RLS.md`](SECURITY-RLS.md) | operator ustawiający bramkę RLS | — (opis, nie wartość) |
- Nazewnictwo tokenu `sbp_` jest **niespójne**: `gen-types.mjs` czyta `SUPABASE_MGMT_TOKEN`,
  a `supabase/README.md` używa `SUPABASE_ACCESS_TOKEN`. To ta sama wartość — ustawiając nowy token
  pamiętaj o obu miejscach.

---

## 2. Supabase — token zarządczy `sbp_…`

Tokeny zarządcze Supabase mogą **istnieć równolegle**, więc rotacja jest bezprzerwowa: najpierw nowy,
dopiero na końcu kasujesz stary. Produkcja tego tokenu nie używa (Vercel go nie ma), więc ryzyko
przestoju jest zerowe — ryzykiem jest tu wyłącznie **zwlekanie**.

1. **Wystaw nowy token.** Supabase → awatar → *Account Settings* → *Access Tokens* → **Generate new token**.
   Nazwij go tak, by dało się go później rozpoznać (np. `e-logistic-local-2026-08`). Wartość widać **raz**.
2. **Podmień lokalnie.** W powłoce / menedżerze haseł podmień `SUPABASE_MGMT_TOKEN`
   (i `SUPABASE_ACCESS_TOKEN`, jeśli go używasz). Do repo **nie trafia**.
3. **Zweryfikuj nowy token** (§4.1) — dopiero po zielonej weryfikacji idź dalej.
4. **Unieważnij stary.** Ta sama lista → przy starym wpisie **Revoke**. Jeśli nie wiesz, który jest który,
   skasuj wszystkie poza właśnie utworzonym — token zarządczy nie ma prawa być długowieczny.
5. **Sprawdź, czy nie było nadużycia.** Supabase → *Logs* / *Reports*: zapytania i zmiany konfiguracji
   z okresu, w którym token był poza kontrolą.

> 🟠 **Rozważ eskalację.** Kto miał `sbp_`, mógł przez Management API odczytać klucze API projektu.
> Jeśli nie potrafisz wykluczyć, że token był w cudzych rękach, rotuj też **`SUPABASE_SERVICE_ROLE_KEY`**
> (Supabase → *Project Settings* → *API Keys*) i **hasło bazy**. **Uwaga:** to już dotyka produkcji —
> `SUPABASE_SERVICE_ROLE_KEY` jest w Vercel, więc obowiązuje procedura z §3 (najpierw podmiana + redeploy,
> potem unieważnienie starego klucza).
>
> **Hasło bazy ma trzech konsumentów poza Supabase** (tabela w §1) i żaden z nich nie jest w Vercelu:
> `SUPABASE_DB_URL` w *GitLab → Settings → CI/CD → Variables* (joby `db-types` i `rls`) oraz
> `SUPABASE_DB_PASSWORD` w lokalnym `apps/web/.env.local`. Podmień je **w tym samym podejściu**.
> Pominięcie nie da żadnego sygnału od razu: bramki padną dopiero na następnym MR-ze, długo po
> zamknięciu tego runbooka, i nikt nie skojarzy awarii z rotacją.

---

## 3. Upstash — token REST Redis

Token REST jest **jeden**: rotacja w miejscu unieważnia stary natychmiast, bez okna zakładki.
Dlatego domyślną ścieżką jest **nowa baza**, a nie rotacja w miejscu.

**Co się dzieje, gdy token jest chwilowo zły** — warto wiedzieć, zanim zaczniesz:
[`ratelimit.ts`](../apps/web/lib/ratelimit.ts) nie robi fail‑open. Degraduje do licznika
**in‑memory** (per instancja, okno 30/60 s) i raportuje to do Sentry **raz na proces, osobno dla
każdej przyczyny**:

| Co się stało | Komunikat w Sentry |
|---|---|
| brak `UPSTASH_REDIS_REST_URL`/`_TOKEN` na produkcji | `Rate-limit: brak konfiguracji Upstash na produkcji…` |
| zmienne są, ale wywołanie pada (zły token/URL, awaria Upstash) | `Rate-limit: wywołanie Upstash zakończone błędem…` |

Drugi wiersz to dokładnie przypadek rotacji z literówką — i to jest **jedyny** sygnał, jaki
dostaniesz, bo fallback in‑memory ma ten sam próg 30/60 s co Upstash i po odpowiedziach HTTP
degradacji nie widać. Czyli: **żadnego przestoju**, tylko słabsza ochrona (limit robi się
per instancja Vercela, czyli N×30/60 s) przez czas rotacji. To jest wbudowany bufor — nie powód,
by zostawić to na później.

### Ścieżka A (zalecana) — nowa baza, zero okna bez limitów

1. Upstash Console → **Create Database** (ten sam region co dotychczas, żeby nie dokładać opóźnienia).
2. Z nowej bazy skopiuj **REST URL** i **REST TOKEN**.
3. Vercel → projekt `e-logistic` → *Settings* → *Environment Variables* → podmień **obie** wartości
   `UPSTASH_REDIS_REST_URL` i `UPSTASH_REDIS_REST_TOKEN` we **wszystkich** zakresach (Production,
   Preview, Development). Z CLI:
   ```bash
   cd apps/web
   vercel env rm UPSTASH_REDIS_REST_URL production
   vercel env rm UPSTASH_REDIS_REST_TOKEN production
   printf '%s' 'https://NOWY.upstash.io' | vercel env add UPSTASH_REDIS_REST_URL production
   printf '%s' 'NOWY_TOKEN'              | vercel env add UPSTASH_REDIS_REST_TOKEN production
   ```
4. **Redeploy** — zmienne wchodzą dopiero przy nowym buildzie (`vercel --prod` albo *Deployments → ⋯ → Redeploy*).
5. **Zweryfikuj** (§4.2).
6. Dopiero teraz **usuń starą bazę** w Upstash. Liczniki rate‑limitu są ulotne (okno 60 s) — nie ma
   czego migrować, stan po prostu odbudowuje się z ruchu.

### Ścieżka B (szybsza) — rotacja tokenu w miejscu

Upstash Console → baza → *Details* → sekcja **REST API** / *Danger Zone* → rotacja poświadczeń
(zależnie od wersji panelu: **Rotate token** albo **Reset password** — token REST jest pochodną hasła bazy).
Stary token umiera od razu, więc kroki 3–5 ze ścieżki A wykonaj **natychmiast po** rotacji.
Przez czas między rotacją a redeployem działa fallback in‑memory z ostrzeżeniem w Sentry
(`Rate-limit: wywołanie Upstash zakończone błędem…`).

---

## 4. Weryfikacja — konkretne komendy z tego repo

### 4.1 Nowy token `sbp_` działa, stary nie

```bash
# Nowy token: generator typów idzie przez Management API i musi wypluć IDENTYCZNY plik.
SUPABASE_MGMT_TOKEN='sbp_NOWY' SUPABASE_PROJECT_REF='jcmqbqvsvtjtxvmopcxp' pnpm gen:types
git diff --stat packages/api/src/database.types.ts   # pusto = token OK i schemat bez zmian

# Stary token MUSI zwrócić 401 (jeśli 200 — nie został unieważniony).
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer sbp_STARY" https://api.supabase.com/v1/projects
```

Pusty `git diff` jest tu mocniejszym dowodem niż samo „200 OK": znaczy, że token ma realny dostęp
do introspekcji schematu, a nie tylko do listy projektów.

### 4.2 Nowy token Upstash działa

> 🔴 **Liczba 429 NIE jest dowodem — i nigdy nim nie była.** Fallback in‑memory w
> [`ratelimit.ts`](../apps/web/lib/ratelimit.ts) ma **ten sam próg** co Upstash
> (`memLimit(key, 30, 60_000)` ↔ `Ratelimit.slidingWindow(30, "60 s")`), a sekwencyjne `curl`
> w pętli trafiają w tę samą instancję lambdy, więc licznik procesowy się kumuluje. 31. żądanie
> dostaje 429 **identycznie** przy działającym Upstashu, przy złym tokenie i przy całkowicie
> nieustawionych zmiennych. Test, którego nie da się oblać, nie jest weryfikacją.
> Rozstrzyga **stan po stronie Upstash i Sentry**, nie kod odpowiedzi.

**Krok 1 — wygeneruj ruch** (to tylko „paliwo" dla dwóch kroków niżej, sam wynik nic nie znaczy):

```bash
# 31 żądań w minutę na endpoint z limitem 30/60 s.
# `lat=999` przepada na walidacji DOPIERO PO sprawdzeniu limitu, więc test nie woła
# płatnego API Tankerkönig — spodziewaj się serii 400, a na końcu 429.
for i in $(seq 1 31); do
  curl -s -o /dev/null -w '%{http_code} ' \
    'https://e-logistic-one.vercel.app/api/fuel-prices?lat=999'
done; echo
```

**Krok 2 — rozstrzygnięcie po stronie Upstash (test główny).** Konsola nowej bazy → *Data Browser*:
muszą **przybyć klucze z prefiksem `elog:rl`** (prefiks ustawiony w `ratelimit.ts`), a licznik
komend na wykresie podskoczyć o rząd wielkości ruchu z kroku 1.

- **Klucze `elog:rl` są** → limiter naprawdę chodzi przez Upstash. ✅
- **Brak kluczy / płaski licznik** → produkcja jest na fallbacku in‑memory: token albo URL jest zły
  (klasyk: podmieniony URL przy starym tokenie), albo redeploy nie wszedł. ❌

**Krok 3 — potwierdzenie po stronie Sentry.** Po redeployu **nie może** pojawić się ŻADEN
z dwóch komunikatów degradacji z tabeli w §3 — w szczególności
`"Rate-limit: wywołanie Upstash zakończone błędem"`, który powstaje właśnie przy złym tokenie.
Brak obu = potwierdzenie kroku 2 z drugiej strony.

### 4.3 Reszta produkcji stoi

```bash
curl -o /dev/null -w '%{http_code}\n' https://e-logistic-one.vercel.app/        # 200
curl -o /dev/null -w '%{http_code}\n' https://e-logistic-one.vercel.app/login   # 200
```

Crony (`/api/cron/notify`, `/api/cron/fx`, `/api/cron/chat-purge` — [`vercel.json`](../apps/web/vercel.json))
chroni `CRON_SECRET`, nie rotowane tu sekrety. Jeśli po rotacji zaczną zwracać 401, przyczyna leży
gdzie indziej.

---

## 5. Higiena po rotacji

- Nowe wartości **wyłącznie** w menedżerze haseł, Vercelu i lokalnym `.env.local` (gitignored).
  Nigdy w czacie, zgłoszeniu, opisie MR‑a ani zrzucie ekranu.
- `gitleaks` w [`.gitlab-ci.yml`](../.gitlab-ci.yml) skanuje **pełną historię** — po rotacji uruchom
  pipeline i upewnij się, że jest zielony.
- Uzupełnij lukę dokumentacyjną: `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` są w `turbo.json`,
  ale nie w [`.env.example`](../.env.example) — operator idący za szablonem nie włączy limitów i nawet
  się o tym nie dowie.
- Wpisz datę rotacji w §6 i ustaw przypomnienie na kolejną (token zarządczy: co ≤ 90 dni).

---

## 6. Checklista

**Supabase (`sbp_…`)**

- [ ] Nowy token wystawiony (*Account Settings → Access Tokens*), nazwa z datą
- [ ] Podmieniony lokalnie: `SUPABASE_MGMT_TOKEN` **oraz** `SUPABASE_ACCESS_TOKEN`
- [ ] Weryfikacja §4.1: `pnpm gen:types` przechodzi, `git diff` pusty
- [ ] Stare tokeny **Revoke** (zostaje wyłącznie nowy)
- [ ] Stary token zwraca **401** (§4.1)
- [ ] Logi/Reports Supabase przejrzane pod kątem nadużycia
- [ ] *(opcjonalnie, przy podejrzeniu użycia)* rotacja `SUPABASE_SERVICE_ROLE_KEY` + hasła bazy
- [ ] *(jeśli rotowano hasło bazy)* `SUPABASE_DB_URL` podmienione w **GitLab → Settings → CI/CD → Variables**
- [ ] *(jeśli rotowano hasło bazy)* `SUPABASE_DB_PASSWORD` podmienione w `apps/web/.env.local`
- [ ] *(jeśli rotowano hasło bazy)* pipeline zielony: joby `db-types` i `rls` przechodzą

**Upstash**

- [ ] Nowa baza utworzona (ścieżka A) **albo** token zrotowany w miejscu (ścieżka B)
- [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` podmienione w Vercel we wszystkich zakresach
- [ ] Redeploy produkcji wykonany
- [ ] Weryfikacja §4.2: **klucze `elog:rl` przybywają w nowej bazie** (test główny) i brak w Sentry obu ostrzeżeń o degradacji
- [ ] Stara baza / stary token usunięte
- [ ] Zużycie starej bazy sprawdzone pod kątem obcego ruchu

**Wspólne**

- [ ] GitLab *Settings → CI/CD → Variables* — brak `sbp_` i `UPSTASH_*`
- [ ] Weryfikacja §4.3 zielona
- [ ] `gitleaks` w pipeline zielony
- [ ] Data rotacji: `________`  ·  następna zaplanowana: `________`
- [ ] Pozycja w [`BACKLOG.md`](BACKLOG.md) odhaczona
