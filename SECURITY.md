# Polityka bezpieczeństwa — E‑Logistic

Bezpieczeństwo danych kierowców i firm transportowych traktujemy priorytetowo
(multi‑tenant przez RLS, szyfrowanie PII, PIN‑y kart w Vault). Dziękujemy za
odpowiedzialne zgłaszanie podatności.

## Inwarianty — co musi być prawdą zawsze

Nie „dobre praktyki", tylko warunki, których złamanie jest błędem blokującym wydanie.
Przy każdym podano, **jak to sprawdzić** — inwariant bez sposobu weryfikacji jest życzeniem.

| Inwariant | Stan | Jak zweryfikować |
|:--|:--|:--|
| Każda tabela ma włączone RLS | **62/62** | [`audit:rls`](scripts/audit-rls.mjs) na żywej bazie |
| Każda funkcja `SECURITY DEFINER` ma przypięty `search_path` | **91/91** | skan migracji + `audit:rls` |
| Klucz `service_role` nigdy nie trafia do bundla klienta | ✅ | `import "server-only"` w `@e-logistic/api/admin` — build **blokuje** wciągnięcie |
| Każda trasa API ma rate-limit | **16/16** | przegląd `apps/web/app/api/**/route.ts` |
| Sekrety nie występują w repo ani w historii | ✅ | `gitleaks` z `GIT_DEPTH: 0` |
| Płatne API zewnętrzne wołane dopiero po uwierzytelnieniu | ✅ | `authenticateRequest` przed wywołaniem dostawcy |

**Dlaczego `search_path` jest na tej liście:** funkcja `SECURITY DEFINER` bez przypiętej
ścieżki wyszukiwania jest klasycznym wektorem eskalacji — atakujący podstawia własny schemat
i przejmuje wykonanie z uprawnieniami właściciela funkcji.

**Dlaczego rate-limit jest inwariantem, a nie optymalizacją:** chroni logowanie kluczem
passkey przed atakiem siłowym oraz płatne API map przed wydrenowaniem budżetu. Degradacja
tej warstwy musi być **głośna** — brak konfiguracji Upstash na produkcji schodzi na licznik
lokalny procesu i raportuje to do Sentry, zamiast po cichu wyłączać ochronę.

## Klasyfikacja sekretów

Rozróżnienie, którego brak wywołuje najwięcej fałszywych alarmów:

**Publiczne z założenia** — bezpieczne w repo i w bundlu, chronione przez RLS:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_*` (klucz `anon` trafia do artefaktu aplikacji mobilnej — inaczej się nie da)

Klucz `anon` **nie jest sekretem**. Jest identyfikatorem projektu, a całe bezpieczeństwo
stoi na politykach RLS. Jeśli klucz `anon` daje dostęp do cudzych danych, błędem jest
polityka, nie klucz.

**Prawdziwe sekrety** — nigdy w repo, nigdy w logach, nigdy w bundlu klienta:
- `SUPABASE_SERVICE_ROLE_KEY` — **omija RLS**, pełny dostęp do danych wszystkich firm
- `sbp_…` (token zarządczy Supabase) — pełna kontrola nad projektem, łącznie z kasowaniem
- `SUPABASE_DB_PASSWORD` / `SUPABASE_DB_URL`
- `VAPID_PRIVATE_KEY`, `CRON_SECRET`, `UPSTASH_REDIS_REST_TOKEN`
- `FAKTUROWNIA_API_TOKEN`, klucze dostawców map, `EXPO_ACCESS_TOKEN`
- poświadczenia sklepów: `*.p8`, `*.p12`, `play-service-account.json`

**Wrażliwe, ale nie sekrety** — identyfikatory, które same nie dają dostępu, a obniżają próg
w połączeniu z wyciekiem klucza: `ascApiKeyId`, `ascApiKeyIssuerId`, `appleTeamId`.
Docelowo w zmiennych EAS, nie w `eas.json`.

## Bramki bezpieczeństwa

| Bramka | Co robi | Gdzie |
|:--|:--|:--|
| `gitleaks` | skan sekretów po **pełnej historii** (`GIT_DEPTH: 0`) | [`.gitlab-ci.yml`](.gitlab-ci.yml) |
| `semgrep-sast` | statyczna analiza (szablon GitLab SAST) | [`.gitlab-ci.yml`](.gitlab-ci.yml) |
| `audit:rls` | izolacja multi-tenant na żywej bazie | [`scripts/audit-rls.mjs`](scripts/audit-rls.mjs) |
| `pnpm audit` | podatności zależności (doradczy) | [`.gitlab-ci.yml`](.gitlab-ci.yml) |
| Dependabot | podbicia zależności i akcji GitHub | [`dependabot.yml`](.github/dependabot.yml) |

**Płytki klon fałszuje skan sekretów.** Domyślny klon GitLaba to ~20 commitów; `gitleaks`
skanuje historię, więc bez `GIT_DEPTH: 0` sekret sprzed trzydziestu commitów przechodzi
gładko, a job świeci na zielono.

**Dependabot jest jedynym mechanizmem podbić** — konfiguracja Renovate została usunięta
w `[#428]`, bo aplikacja nigdy nie była zainstalowana i nie otworzyła ani jednego MR-a.
Konfiguracja bez działającego bota jest gorsza niż jej brak: sugeruje, że ktoś pilnuje
wersji zależności.

Konfiguracja allowlisty: [`.gitleaks.toml`](.gitleaks.toml). **Nie dodawaj tam prawdziwych
sekretów** — allowlista jest na szablony i wartości publiczne z założenia.

## Zasady w kodzie

- **Nigdy nie loguj** PII ani PIN-ów — także w Sentry (`beforeSend` ma je odsiewać).
- **Nigdy nie umieszczaj danych osobowych w URL** (query string trafia do logów serwera,
  historii przeglądarki i nagłówka `Referer`).
- **Odczyt PIN-u karty jest audytowany** — każdy dostęp zostawia wpis w `audit_log`.
- Klient `service-role` wyłącznie w trasach serwerowych, przez subpath `@e-logistic/api/admin`.
- Nowa tabela = polityka RLS **w tej samej migracji**. Tabela bez polityki jest dostępna
  wyłącznie właścicielowi, więc brak polityki objawia się jako „nic nie działa" — i bywa
  naprawiany przez wyłączenie RLS. To jest najgorsze możliwe wyjście.
- Nowa funkcja `SECURITY DEFINER` = `set search_path` **w tej samej definicji**.

## Podpisywanie commitów

Commity mają być podpisane (`git config --global commit.gpgsign true`). Podpis wiąże zmianę
z autorem — bez niego dowolna osoba z prawem zapisu może wypchnąć commit z cudzym `user.email`.

Stan faktyczny: **nic w repo tego nie wymusza**. Egzekwowanie wymaga ochrony gałęzi po stronie
hostingu (GitLab: *Settings → Repository → Protected branches* + *Push rules → Reject unsigned
commits*). Do czasu włączenia — `[dyscyplina]`.

## Gdy sekret wycieknie

Kolejność jest istotna i **nieintuicyjna**:

1. **Najpierw rotacja, potem sprzątanie historii.** Usunięcie sekretu z historii git go
   **nie unieważnia** — kopie zdążyły powstać (fork, cache CI, klon, skan bota). Dopóki
   wartość jest ważna, wyciek trwa.
2. Nowy sekret → podmiana we wszystkich konsumentach → **weryfikacja, że nowy działa** →
   dopiero wtedy unieważnienie starego. Odwrotna kolejność to przerwa w działaniu produkcji.
3. Sprawdź **wszystkie** miejsca użycia: `.env` na Vercel, zmienne CI, `turbo.json`
   (`globalEnv`), konfiguracja EAS. Pominięte miejsce = produkcja padnięta po rotacji.
4. Runbook z kolejnością i sposobem weryfikacji: [`docs/SECRET-ROTATION.md`](docs/SECRET-ROTATION.md).

## Jak zgłosić podatność

**Nie otwieraj publicznego zgłoszenia (issue) dla luk bezpieczeństwa.**

Preferowane kanały:
1. **E‑mail:** `admin@e-logistic.app` — w temacie dopisz `[SECURITY]`.
2. **GitLab:** poufne zgłoszenie (issue z zaznaczoną opcją *Confidential*)
   w repozytorium źródłowym `gitlab.com/Gh0s777tt/e-logistic`.

W zgłoszeniu opisz: wektor, kroki reprodukcji, wpływ i (jeśli możliwe) sugestię
naprawy. Nie testuj na cudzych danych produkcyjnych ani nie eksfiltruj danych.

## Czego oczekiwać

- **Potwierdzenie** przyjęcia zgłoszenia: do 72 h.
- **Wstępna ocena** i klasyfikacja istotności: do 7 dni.
- **Naprawa**: krytyczne — możliwie najszybciej; pozostałe wg priorytetu.
- Po naprawie i wdrożeniu — uznanie autora zgłoszenia (jeśli sobie życzy).

## Zakres

- Kod w tym repozytorium (`apps/*`, `packages/*`, `supabase/*`).
- Aplikacja web (Vercel) i mobilna (iOS/Android).

Poza zakresem: ataki wymagające dostępu fizycznego do odblokowanego urządzenia,
socjotechnika, DoS/wolumetria, raporty z automatycznych skanerów bez dowodu wpływu.

## Ujawnianie

Prosimy o **skoordynowane ujawnianie**: nie publikuj szczegółów przed wydaniem
poprawki i uzgodnieniem terminu. Repozytorium jest publiczne poglądowo, ale
szczegóły podatności (w tym wewnętrzne raporty audytowe) nie są upubliczniane.
