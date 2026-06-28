<div align="center">

# 📜 CHANGELOG &nbsp;·&nbsp; E‑LOGISTIC

![Updaty](https://img.shields.io/badge/updaty-222-E50914?style=for-the-badge&labelColor=0a0a0a)
![Wersja](https://img.shields.io/badge/wersja-1.78.0-E50914?style=for-the-badge&labelColor=0a0a0a)

</div>

Format wg [Keep a Changelog](https://keepachangelog.com) + **numeracja updatów** `[#NNN]`.
Wersjonowanie: [SemVer](https://semver.org). Najnowsze na górze.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## [1.78.0] — 🛡️ Idempotentny zapis offline (eliminacja ryzyka duplikatów)

- `[#222]` 🛡️ **Idempotentna synchronizacja outboxu** (pokłosie QA #221) — [insertFuelLog](packages/api/src/data/fuelLogs.ts)/[insertTripEvent](packages/api/src/data/tripEvents.ts): `insert` → `upsert(onConflict: "id", ignoreDuplicates: true)`. `id` to UUID klienta (PK), więc ponowny sync tego samego wpisu = `ON CONFLICT (id) DO NOTHING` — **brak duplikatu i brak błędu PK** (wcześniej re-sync rzucał 23505 → status „error" mimo poprawnie zapisanych danych).
  - Twarda gwarancja na poziomie bazy (defense‑in‑depth obok guardów statusu w outboxie) — chroni też przed wyścigiem *read‑modify‑write* w kolejce: utrata lokalnego statusu „synced" nie spowoduje już duplikatu. **Bez migracji** — PK `id` już istnieje. `maybeSingle`, bo `DO NOTHING` nie zwraca wiersza.
  - Testy kontraktu: `upsert` z `onConflict`/`ignoreDuplicates`, re-sync (konflikt) → `null` bez błędu, routing `adblue_logs`, realny błąd zapisu → rzut (fuelLogs +4, tripEvents +3) — **405 testów**.
  - **Bramki:** biome czysto · `tsc` ×7 · 405 testów (+1 skip) · build ✓ · docs:check ✓.

## [1.77.0] — 🧪 QA: testy brzegowe, scoping i integralność offline

- `[#221]` 🧪 **Sesja QA (audyt read-only + testy)** — [TEST_REPORT.md](TEST_REPORT.md). 0 defektów Krytycznych/Wysokich/Średnich; 1 Niski/latentny (guard scopingu push). **+55 testów (343 → 398)** + 1 pominięty (regresja hardening). **Bez zmian w kodzie aplikacji** — czerwony test = znalezisko.
  - **core:** granice diet (dokładnie 8h/12h oba tryby), wygasania (dzień terminu / `warnDays` / `warnKm`), limitu jazdy (`>` strict).
  - **api:** scoping multi-tenant `listPushSubscriptionsForDelivery` (firma/użytkownik) — funkcja była bez testów.
  - **maps:** geokoder (mock `fetch`, fallback MapTiler→Nominatim), haversine antymerydian/biegun, ścieżka sieciowa `route()` HERE/GraphHopper (konwersja FX myta, błędy).
  - **web:** open-redirect/CRLF (TAB/CR/NUL).
  - **mobile:** integralność outboxu — ochrona przed podwójnym zapisem przy ponownej synchronizacji.
  - Kluczowe testy zweryfikowane **mutacją** (psucie kodu → czerwony → przywrócenie).
  - **Bramki:** biome czysto · `tsc` ×7 · 398 testów (+1 skip) · build ✓ · docs:check ✓.

## [1.76.0] — 🔐 Rate-limit na pozostałych mutacjach (audyt)

- `[#220]` 🔐 **Rate-limiting na mutacjach bez limitu** (audyt — „Top usprawnień" #9, dot. usług Upstash):
  - [notify-assignment](apps/web/app/api/orders/notify-assignment/route.ts) (push do kierowcy) i [fakturownia/export](apps/web/app/api/fakturownia/export/route.ts) (eksport faktury VAT) — `rateLimit(request, …)` po kontroli sesji (jak `/api/push/send` w #214). 429 przy przekroczeniu (30 / 60 s na IP; Upstash sliding window + fallback in-memory).
  - Test fakturowni: dodany mock `server-only` (trasa wciąga teraz `@/lib/ratelimit`).
  - **Bramki:** biome czysto · `tsc` ×7 · 343 testy · build ✓ · docs:check ✓.

## [1.75.0] — 🧹 Domknięcie ustaleń audytu (higiena)

- `[#219]` 🧹 **Pozostałe ustalenia audytu (Niskie/Średni)** — domknięte:
  - **Nawigacja `/dev`** — warunkowy link „Panel developera" w sidebarze (tylko rola `developer`); dotąd dostęp wyłącznie przez URL. i18n `nav.dev` (PL/EN). [layout.tsx](apps/web/app/(app)/layout.tsx)
  - **`.claude/`** → `.gitignore` + odśledzenie `launch.json` (lokalna konfiguracja preview, auto-generowana).
  - **Wersjonowanie** udokumentowane: `apps/web` = root (bramka `docs:check`), **`apps/mobile` niezależnie** (rytm EAS/sklepy), `packages/*` wewnętrzne — [MOBILE-PLAN.md](docs/MOBILE-PLAN.md).
  - **`DataTable` vs karty** — dwa celowe wzorce udokumentowane (listy płaskie vs rozwijane) — [BACKLOG.md](docs/BACKLOG.md).
  - **Bramki:** biome czysto · `tsc` ×7 · 343 testy · build ✓ · docs:check ✓ · parytet i18n ✓.

## [1.74.0] — 🗺️ Tryb jasny dla paneli mapy (audyt)

- `[#218]` 🗺️ **Panele/kontrolki mapy reagują na tryb jasny** (audyt: „mapa ciemna w trybie jasnym"):
  - [mapUi.tsx](apps/web/app/(app)/map/mapUi.tsx) — wszystkie style paneli (panel, input, segment, primary, ghost, result, disruptions, priceRow) z `palette` (hex) → `cssPalette` (`var(--el-*)`). [page.tsx](apps/web/app/(app)/map/page.tsx) — 23 użycia w panelach DOM (≥ l. 900) na `cssPalette`.
  - **Render mapy świadomie ciemny w obu trybach** — `palette` (hex) zostaje w warstwach MapLibre/WebGL, markerach i kolorach POI (5 użyć ≤ l. 543; `var()` nie działa w WebGL). Jasne panele nad ciemną mapą (wzorzec Google/Apple Maps).
  - Weryfikacja: tokeny `--el-*` w light → `surface #fff` / `text #18181b` / `border #e3e3e8`; w dark bez zmian.
  - **Bramki:** biome czysto · `tsc` ×7 · 343 testy · build ✓ · docs:check ✓.

## [1.73.0] — 🧪 Testy komponentów UI (React Testing Library)

- `[#217]` 🧪 **Pierwsze testy React/UI** (audyt: największa luka jakościowa — dotąd 0 testów komponentów):
  - Setup: React Testing Library + jsdom + `@vitejs/plugin-react` w vitest. Testy `components/**/*.test.ts` używają `createElement` (tsconfig `jsx:"preserve"` dla Next blokuje JSX w transformie vite).
  - [DataTable.test.ts](apps/web/components/DataTable.test.ts) — render, sort (asc↔desc), filtr, `initialSort`, stan pustki (5 testów). [Toast.test.ts](apps/web/components/Toast.test.ts) — render wg rodzaju, auto-dismiss (fake timers), `aria-live` (3 testy).
  - **343 testy** (web 33 → 41).
  - **Bramki:** biome czysto · `tsc` ×7 · 343 testy · build ✓ · docs:check ✓.

## [1.72.0] — 🔐 Audyt: redukcja podatności zależności (7 → 1)

- `[#216]` 🔐 **Overrides bezpieczeństwa** ([pnpm-workspace.yaml](pnpm-workspace.yaml)):
  - `postcss` ≥8.5.10 (XSS, via `next`) + `@xmldom/xmldom` ^0.8.10 (**5× high** XML injection/DoS, via `expo`) — `pnpm audit` **7 → 1**.
  - Pozostaje 1 moderate: `uuid` <11.1.1 (transitive Expo, build-only) — świadomie nieadresowane (major 7→11 zepsułby SDK; czeka na bump Expo), udokumentowane w `pnpm-workspace.yaml`.
  - Overrides przeniesione do `pnpm-workspace.yaml` (pnpm 11 nie czyta już `pnpm.overrides` z `package.json`).
  - Weryfikacja: `tsc` ×7 + build (web i mobile) bez regresji po bumpie xmldom.
  - **Bramki:** biome czysto · `tsc` ×7 · 335 testów · build ✓ · docs:check ✓.

## [1.71.0] — 🔒 service-role twardo server-only

- `[#215]` 🔒 **Klient service-role wydzielony z barierą `server-only`** (naprawa z audytu):
  - Nowy moduł [admin.ts](packages/api/src/admin.ts) z `import "server-only"` → subpath `@e-logistic/api/admin` (osobno od głównego `@e-logistic/api`, którego używa też kod kliencki). Każda próba wciągnięcia do bundla klienta = błąd builda.
  - `createSupabaseAdminClient` usunięty z `client.ts` / głównego eksportu; **7 konsumentów** (push/send, cron, notify-assignment, passkey ×3, lib/push) + 2 testy przełączone na `@e-logistic/api/admin`.
  - **Bramki:** biome czysto · `tsc` ×7 · 335 testów · build ✓ · docs:check ✓.

## [1.70.0] — 🛡️ Audyt: naprawy bezpieczeństwa + higiena

- `[#214]` 🛡️ **Naprawy z [AUDIT_REPORT.md](AUDIT_REPORT.md)** (grupa bezpieczeństwo/higiena):
  - **Rate-limit na `/api/push/send`** ([route.ts](apps/web/app/api/push/send/route.ts)) — sliding window per IP+akcja (Upstash + fallback in-memory). Zamyka wektor spamu push do całej firmy.
  - **CSP `Report-Only`** ([next.config.ts](apps/web/next.config.ts)) — allowlista mapy (MapTiler/OSM/Overpass) + Supabase + routing; obserwacja naruszeń przed włączeniem enforce.
  - **Wersja `apps/web` ujednolicona z root** (mylące `1.7.1` → `1.70.0`) + nowa bramka `docs:check` pilnująca `apps/web` == root.
  - **Bramka unikalności numerów migracji** w `docs:check` (duplikat numeru = niejednoznaczna kolejność; historyczne `0017`/`0018` świadomie dozwolone).
  - **Bramki:** biome czysto · `tsc` ×7 · 335 testów · build ✓ · docs:check ✓.

## [1.69.0] — 🔔 Toasty: ostatnie komponenty (pełne 100%)

- `[#213]` 🔔 **Domknięcie toastów — DriverRoster, LiquidForm, PushToggle**:
  - Kartoteka kierowców, formularz paliwo/AdBlue, przełącznik push — ostatnie **komponenty** (nie strony) z inline `setMsg`/`setStatus` → `useToast`.
  - **Pełne 100%**: 16 widoków/komponentów na toastach. Inline „status" pozostaje tylko w publicznych `LoginForm`/`reset` (poza `ToastProvider` — celowo).
  - **Bramki:** biome czysto · `tsc` ×7 · **335 testów** · build ✓ · docs:check ✓.

## [1.68.0] — 🔔 Toasty: pozostałe formularze (100% pokrycia)

- `[#212]` 🔔 **Dopięcie toastów — wszystkie formularze**:
  - Migracja 7 ostatnich widoków: zlecenia, moje zlecenia, faktury (główne + pozycje), karta kierowcy, usterki, formularz Trip, ustawienia (2FA). Inline `setMsg`/`setStatus` + `<p>` → `useToast` (success/error/info).
  - **Wszystkie formularze CRUD/akcji na toastach** (13 widoków, #208–#212) — spójny, ulotny feedback w całej aplikacji.
  - **Bramki:** biome czysto · `tsc` ×7 · **335 testów** · build ✓ · docs:check ✓.

## [1.67.0] — 🌍 Naprawa i18n: strony respektują wybór języka

- `[#211]` 🌍 **Bugfix i18n — hardcoded `createTranslator("pl")` → `useT()`**:
  - 4 strony panelu (pojazdy, karty, kierowcy, formularz Trip) + `LiquidForm` renderowały zawsze PL mimo wyboru EN — ignorowały przełącznik języka. Zamiana na hook `useT()` z `LocaleProvider`.
  - QA wizualne (podgląd): cookie `locale=en` → „Vehicles" / „Drivers" / „Fuel form" zamiast „Pojazdy" / „Kierowcy" / „Paliwo" — zweryfikowane.
  - Publiczne strony (landing, reset) pozostają PL (poza `LocaleProvider`).
  - **Bramki:** biome czysto · `tsc` ×7 · **335 testów** · build ✓ · docs:check ✓.

## [1.66.0] — 🔔 Toasty: zespół + dokumenty (spójność)

- `[#210]` 🔔 **Toasty w kolejnych formularzach** (zespół, dokumenty):
  - **Zespół** ([team](<apps/web/app/(app)/team/page.tsx>)): zapis roli/modułów członka → toast. **Dokumenty** ([documents](<apps/web/app/(app)/documents/page.tsx>)): wgrywanie / otwieranie / usuwanie / walidacja (plik, rozmiar) → toast (success/error).
  - **6 formularzy** na toastach: kontrahenci, pojazdy, serwis, karty, zespół, dokumenty.
  - **Bramki:** biome czysto · `tsc` ×7 · **335 testów** · build ✓ · docs:check ✓.

## [1.65.0] — 🔔 Toasty: serwis + karty paliwowe (spójność)

- `[#209]` 🔔 **Toasty w kolejnych formularzach CRUD** (spójność z #208):
  - **Serwis** ([service](<apps/web/app/(app)/service/page.tsx>)) i **karty paliwowe** ([cards](<apps/web/app/(app)/cards/page.tsx>)): zapis / usuń / wykonanie / walidacja → `useToast` (success/error) zamiast inline `setStatus` + `<p>`.
  - Toasty obejmują teraz 4 formularze CRUD floty: kontrahenci, pojazdy, serwis, karty.
  - **Bramki:** biome czysto · `tsc` ×7 · **335 testów** · build ✓ · docs:check ✓.

## [1.64.0] — 🔔 Toasty w formularzach (feedback po zapisie)

- `[#208]` 🔔 **Toasty zamiast inline „status" w formularzach** (pilot CRUD):
  - **Migracja** kontrahentów ([contractors](<apps/web/app/(app)/contractors/page.tsx>)) i pojazdów ([vehicles](<apps/web/app/(app)/vehicles/page.tsx>)): zapis / usuń / walidacja → `useToast` (success/error) zamiast `setStatus`/`setMsg` + inline `<p>`. Ulotny feedback (auto-znika 3.5 s, `aria-live`, slide-up) bez przesuwania layoutu.
  - Wzorzec gotowy do reużycia na pozostałych formularzach (service/cards/damages/settings/…).
  - QA wizualne (podgląd): walidacja pustej nazwy → toast `el-toast-error` — zweryfikowane.
  - **Bramki:** biome czysto · `tsc` ×7 · **335 testów** · build ✓ · docs:check ✓.

## [1.63.0] — 📊 Tabela danych (DataTable): sort + filtr

- `[#207]` 📊 **DataTable — generyczny komponent tabeli** (sortowanie + filtr):
  - **Komponent** [DataTable.tsx](apps/web/components/DataTable.tsx): sort kliknięciem nagłówka (▲/▼, `aria-sort`), filtr tekstowy z licznikiem wyników, motyw red/black (tokeny `--el-*` — działa w trybie jasnym), poziomy scroll, dostępność.
  - **Logika** [lib/dataTable.ts](apps/web/lib/dataTable.ts): czyste `sortRows`/`filterRows` (`null` na końcu, sort wg locale PL z `numeric`) — **+6 testów** (335 łącznie).
  - **Adopcja**: lista kontrahentów ([contractors](<apps/web/app/(app)/contractors/page.tsx>)) jako tabela — sort po nazwie/NIP/kraju, filtr, akcje w kolumnie. Wzorzec gotowy do reużycia na kolejnych listach (zlecenia/faktury/pojazdy).
  - i18n PL/EN (`table.*`). QA wizualne (podgląd): render, sort asc↔desc, filtr (licznik 2/4), akcje, tryb jasny — zweryfikowane.
  - **Bramki:** biome czysto · `tsc` ×7 · **335 testów** (parytet i18n ✓) · build ✓ · docs:check ✓.

## [1.62.0] — ⌘ Paleta poleceń 2.0 (akcje + nawigacja)

- `[#206]` ⌘ **Command palette 2.0** — Ctrl/⌘+K to teraz launcher, nie tylko wyszukiwarka:
  - **Akcje** (od razu, bez Supabase): przełącz motyw (jasny/ciemny), drukuj / eksport PDF.
  - **Nawigacja**: skok do dowolnej strony z menu — lista z `navGroups` (respektuje uprawnienia roli).
  - **Encje** (leniwie): pojazd/kierowca/zlecenie/faktura jak dotąd; filtr łączy akcje + nawigację + encje.
  - **Refaktor**: logika motywu → [lib/theme.ts](apps/web/lib/theme.ts) (`getTheme`/`setTheme`/`toggleTheme`), współdzielona przez [ThemeToggle](apps/web/components/ThemeToggle.tsx) i paletę ([GlobalSearch](apps/web/components/GlobalSearch.tsx)).
  - **Fix**: `suppressHydrationWarning` na `<html>` — koniec ostrzeżenia hydratacji przy zapisanym trybie jasnym (skrypt anty-FOUC zmienia `data-theme` przed Reactem).
  - i18n PL/EN (`cmd.*`). QA wizualne (podgląd): 28 pozycji, akcja motywu przełącza + zapisuje, render natychmiastowy.
  - **Bramki:** biome czysto · `tsc` ×7 · **329 testów** (parytet i18n ✓) · build ✓ · docs:check ✓.

## [1.61.0] — 🌗 Tryb jasny (light mode) + przełącznik motywu

- `[#205]` 🌗 **Tryb jasny w całej aplikacji + przełącznik**:
  - **Jedno źródło motywu** ([theme.ts](packages/ui/src/theme.ts)): kontrakt `Theme` mapowany 1:1 na CSS vars `--el-*`; `darkTheme` (kanon red/black) + `lightTheme` (czerwień na bieli, kontrast WCAG AA). Oba wstrzykiwane w [layout.tsx](apps/web/app/layout.tsx) jako `:root[data-theme="dark|light"]`.
  - **`cssPalette`** (web): te same klucze co `palette`, lecz wartości `var(--el-*)` z fallbackiem hex — migracja **59 plików** z surowych hex na tokeny reagujące na motyw (jedna zmiana importu na plik). `palette` (hex) bez zmian dla mobile (RN), canvas, MapLibre i dokumentów drukowanych.
  - **Przełącznik** ([ThemeToggle.tsx](apps/web/components/ThemeToggle.tsx)) w sidebarze: zapis w `localStorage`, `data-theme` na `<html>`, etykiety i18n PL/EN; **skrypt anty-FOUC** (zero migotania przy wejściu) + respekt `prefers-color-scheme`.
  - **Powłoka** ([globals.css](apps/web/app/globals.css)): `.app-*` (sidebar/nawigacja/wyszukiwarka) na `var(--el-*)`; `color-scheme` per tryb. Mapa pozostaje ciemna w obu trybach (świadomie — MapLibre nie czyta `var()`, motyw 3D red/black).
  - **QA wizualne** (podgląd przeglądarki): pulpit, pojazdy, formularze, faktury — czytelne w obu trybach; przełącznik i persystencja zweryfikowane.
  - **Bramki:** biome czysto · `tsc` ×7 · **329 testów** (parytet i18n ✓) · build ✓ · docs:check ✓.

## [1.60.0] — 🔒 Audyt (viewer) + 🖨️ eksport PDF + mikrointerakcje

- `[#204]` 🔒 **Dziennik audytu + eksport PDF + dopracowanie UI**:
  - **Audit-log viewer** ([/audit](<apps/web/app/(app)/audit/page.tsx>), owner): odczyt `audit_log` (dostępy do PIN/PII, akcje krytyczne) + filtr akcji; warstwa [audit.ts](packages/api/src/data/audit.ts) (RLS owner/developer) + test; nawigacja + i18n PL/EN.
  - **Eksport PDF** (`PrintButton` w [ui.tsx](apps/web/components/ui.tsx) + `@media print`): druk/PDF bez „chrome" (sidebar/przyciski/toasty), motyw zachowany; przycisk na pulpicie.
  - **Mikrointerakcje**: karty pulpitu hover-lift (`.el-card`). Drill-down KPI już przez `href` w `KpiStrip`.
  - **Bramki:** biome czysto · `tsc` ×7 · **329 testów** (api 52) · build ✓ (47 tras) · docs:check ✓.

## [1.59.0] — ✨ Warstwa UI: animacje, przejścia, toasty, skeleton, dostępność

- `[#203]` ✨ **Ożywienie interfejsu (motion + a11y)** — pierwsza faza UI/UX z wizji:
  - **Tokeny CSS** ([globals.css](apps/web/app/globals.css)): zmienne motywu red/black — fundament pod tryb jasny i spójność.
  - **Ruch**: płynne hover/active na nawigacji i przyciskach · **focus-visible** (nawigacja klawiaturą) · **View Transitions API** (płynne przejścia stron, Next 16) · keyframes (fade/slide/scale/shimmer/spin/pulse) · `prefers-reduced-motion` (WCAG).
  - **Prymitywy** ([ui.tsx](apps/web/components/ui.tsx)): `Button` z hover/active/focus (klasy CSS zamiast inline), nowe `Skeleton` i `Spinner`, animowany `BarChart` (wzrost słupków).
  - **Toasty** ([Toast.tsx](apps/web/components/Toast.tsx)): `ToastProvider` + `useToast` (wpięte w layout, `aria-live`) — fundament feedbacku formularzy.
  - **Skeleton** zamiast „⏳ Ładowanie…" w [ListStatus](apps/web/components/ListStatus.tsx).
  - **Bramki:** biome czysto · `tsc` ×7 · 327 testów · build ✓ · docs:check ✓.

## [1.58.0] — 🧪 Dopełnienie pokrycia: reszta data/api, handlery tras, guard mobile

- `[#202]` 🧪 **Dopełnienie testów + dedup nawigacji mobile**:
  - **api `data/*`**: +service (`latestOdometers`), savedPlaces, documents, fuelCards (`getFuelCardPin` RPC), drivers (RPC PII + delete) → api **50 testów** (16 modułów).
  - **handlery tras web**: route (429/400), traffic (429/501/400/tooLarge), fakturownia/export (501/401/403/400 + 404 izolacja firm) → web **27 testów**.
  - **mobile**: `guardRedirect` (bramka tras) + `notificationTarget` (bezpieczny cel push) → [lib/navigation.ts](apps/mobile/lib/navigation.ts) + testy; [_layout.tsx](apps/mobile/app/_layout.tsx) używa czystych funkcji. Mobile **13 testów**.
  - **Łącznie 327 testów** (core 202 · api 50 · web 27 · maps 33 · mobile 13 · i18n 2).
  - **Bramki:** biome czysto · `tsc` ×7 · 327 testów · build ✓ · docs:check ✓.

## [1.57.0] — ♻️ Dedup walidacji Zod → core (web + mobile)

- `[#201]` ♻️ **Wspólne helpery błędów Zod w core** — koniec kopiowanej obsługi walidacji formularzy:
  - **Rdzeń** [core/zodErrors.ts](packages/core/src/zodErrors.ts): `zodFieldErrors(error)` → `Record<pole, komunikat>` (formularze web) oraz `firstZodError(error)` → pierwszy komunikat (proste UI mobile). Czyste, **4 testy**.
  - **Podmiana 8 miejsc**: web (DriverRoster, LiquidForm, vehicles, cards, reports, forms/trip) używa `zodFieldErrors`; mobile (LiquidForm, trip) używa `firstZodError`. Identyczna logika, jedno źródło prawdy.
  - Testy core 198 → 202; **łącznie 293**.
  - **Bramki:** biome czysto · `tsc` ×7 · 293 testów · build ✓ · docs:check ✓.

## [1.56.0] — 🧪 Testy: reszta warstwy danych api + outbox mobile

- `[#200]` 🧪 **Pokrycie api i mobile** — domknięcie luki testów warstwy danych:
  - **api**: +`vehicleCosts`, `perDiemTrips`, `workTimeEntries`, `contractors` → **35 testów** (11 modułów `data/*`).
  - **mobile** ([apps/mobile](apps/mobile)): vitest + test [lib/outbox.ts](apps/mobile/lib/outbox.ts) — kolejka offline-first (enqueue/sync/error, fuel/adblue/trip, flushQueued, filtr/usuwanie) z mockiem AsyncStorage/Supabase = **6 testów** (było 0).
  - **Łącznie 289 testów** (core 198 · maps 33 · api 35 · web 15 · mobile 6 · i18n 2) — **wszystkie 6 pakietów pokryte**.
  - **Bramki:** biome czysto · `tsc` ×7 · 289 testów · build ✓ · docs:check ✓.

## [1.55.0] — 🧪 Rozszerzenie testów warstwy danych api

- `[#199]` 🧪 **Więcej testów `packages/api`** (mock Supabase) — kolejne moduły `data/*`:
  - **orders** (`listOrders`: company_id/from/to/limit; `listMyOrders`: RLS po `assigned_to`) · **tripEvents** (`tripEventToRow` czysta + `listTripEvents`) · **vehicles** (`vehicleToRow` czysta + `listVehicles`) · **driverPayouts** (filtr `driver_name` + limit) · **damageClaims** (limit/sort/błąd).
  - Testy api 11 → **27**; łącznie **275 testów**.
  - **Bramki:** biome czysto · `tsc` ×7 · 275 testów · build ✓ · docs:check ✓.

## [1.54.0] — 🧪 Testy handlerów tras API (auth-guard + izolacja firm)

- `[#198]` 🧪 **Pełne testy handlerów tras** — domknięcie luki testów API z audytu 360°:
  - **Setup web** ([vitest.config.ts](apps/web/vitest.config.ts)): katalog `tests/` + alias `@`; mock `server-only`/`next/server`/`getServerSupabase`/`@e-logistic/api`/`@/lib/push` (handlery testowane bez runtime Next/Supabase).
  - **`/api/push/send`** ([test](apps/web/tests/api/push-send.test.ts)): 503 (brak VAPID) · 401 (brak sesji) · 403 (rola kierowcy) · 400 (open-redirect `url`) · 200 (owner/dispatcher → `sendPushTo`) — 5 testów.
  - **`/api/orders/notify-assignment`** ([test](apps/web/tests/api/notify-assignment.test.ts)): 401 · 403 · 400 (orderId nie-UUID) · **404 dla zlecenia z innej firmy** (izolacja multi-tenant) — 4 testy.
  - Testy web 6 → 15; **łącznie 259 testów** (core 198 · maps 33 · api 11 · web 15 · i18n 2).
  - **Bramki:** biome czysto · `tsc` ×7 · **259 testów** · build ✓ · docs:check ✓.

## [1.53.0] — 🧪 Testy (api/walidacja) + ujednolicenie tras (EN) + przygotowanie mobile

- `[#197]` 🧪 **Pokrycie testowe + porządki** — dalsze domknięcie planu z audytu 360°:
  - **Testy `api`** ([packages/api](packages/api)): vitest + mock chainable Supabase ([test-utils.ts](packages/api/src/test-utils.ts)); `fuelLogToRow` (czysta) + kształt zapytań `listFuelLogs`/`listInvoices`/`listInvoiceItems` — **11 testów** (było 0).
  - **Testy `web`** ([apps/web](apps/web)): vitest + ekstrakcja walidacji URL push do [lib/pushUrl.ts](apps/web/lib/pushUrl.ts) (czysta, testowalna); open-redirect / traversal / znaki kontrolne odrzucane — **6 testów** (było 0). Łącznie **250 testów**.
  - **Trasy PL→EN** ([next.config.ts](apps/web/next.config.ts)): `/szkody→/damages`, `/diety→/per-diem`, `/wyplaty→/payouts`, `/czas-pracy→/work-time` (`git mv`, historia zachowana) + **redirecty 308** ze starych ścieżek (zero martwych linków/zakładek); linki w `layout`/`AttentionPanel`/`KpiStrip` zaktualizowane.
  - **Mobile**: zweryfikowane przygotowanie do publikacji — `eas.json`/`app.json` gotowe poza `eas.projectId` (`eas init`), runbook [apps/mobile/README.md](apps/mobile/README.md) aktualny. Kroki eas init/build/QA/grafika wg runbooka (wymaga urządzenia + kont sklepów).
  - **Bramki:** biome czysto · `tsc` ×7 · **250 testów** · build ✓ (46 tras + 4 redirecty) · docs:check ✓.

## [1.52.0] — 🔧 Naprawy z audytu 360°: hardening, wersje, dedup

- `[#196]` 🔧 **Realizacja planu napraw z audytu 360°** (po #195) — wyłącznie zmiany bezpieczne, zweryfikowane bramkami:
  - **Bezpieczeństwo (hardening):** `rateLimit` z fallbackiem in-memory zamiast czystego fail-open ([ratelimit.ts](apps/web/lib/ratelimit.ts)); twardsza walidacja `url` w [push/send](apps/web/app/api/push/send/route.ts) (odrzuca `..`, backslash, znaki kontrolne).
  - **Wersje (web/root):** biome 2.5.0→2.5.1, turbo 2.9.18→2.10.0, pg 8.13.1→8.22.0, `@simplewebauthn/*`, `@upstash/ratelimit`+`redis`, `@types/node`. *(react/react-dom i pakiety mobile pominięte — zarządza Expo SDK przez `expo install --fix`.)*
  - **Jakość:** `setupMessage` wyekstrahowane do [core/setup.ts](packages/core/src/setup.ts) (+4 testy) — koniec 3 inline kopii komunikatu onboardingu; `listInvoiceItems` z `.limit(500)`; naprawa polskich znaków w `package.json` (mojibake); usunięto przestarzałą regułę „faza bieżąca: dokumentacja" w [CLAUDE.md](CLAUDE.md).
  - **Bramki:** biome czysto · `tsc` ×7 · **233 testy** · build ✓ · docs:check ✓.
  - ⏸️ *Świadomie odłożone (wymaga QA na urządzeniu / zasobów / decyzji): rozbicie `map/page.tsx`, testy warstwy `api`+routes, publikacja mobile (eas/grafika), KSeF, zmiana tras PL→EN — spis w [BACKLOG.md](docs/BACKLOG.md). Zweryfikowane jako nieaktualne: indeks `invoice_items` (istnieje od 0034), lazy-CSS mapy (route-scoped w App Router).*

## [1.51.0] — 📚 Synchronizacja dokumentacji z kodem + bramka `docs-check`

- `[#195]` 📚 **Dokumentacja zsynchronizowana z kodem (audyt 360°)** — usunięcie rozjazdów dokument↔kod i bramka, by nie wracały:
  - **Model danych** ([DATA-MODEL.md](docs/DATA-MODEL.md)): nagłówek → v1.51.0; nowa sekcja **0.3** (migracje 0047–0051: `per_diem_trips`, `work_time_entries`, `drivers.psychotech_expiry`, `driver_payouts`, `damage_claims`); liczba tabel 31 → **40**.
  - **Roadmapa** ([ROADMAP.md](docs/ROADMAP.md)): nagłówek → v1.51.0; Fazy 0–2 odhaczone `[x]`, status Faz 3–4; sekcja „ponad pierwotny plan (v1.0–1.50)".
  - **Plan mobile** ([MOBILE-PLAN.md](docs/MOBILE-PLAN.md)): przepisany — aplikacja kierowcy to **MVP** (M1/M2/M4 ✅), nie „szkielet"; zostało M3 (mapa) + publikacja.
  - **Architektura** ([ARCHITECTURE.md](docs/ARCHITECTURE.md)): nagłówek → v1.51.0; usunięto nieistniejące `packages/config` i `supabase/functions` (rolę pełni `/api`); offline = **outbox**; moduły v1.5–1.50.
  - **README** ([README.md](README.md)): struktura repo bez `supabase/functions`; tabela modułów +7 (zlecenia, faktury, rentowność, HR kierowcy, szkody/serwis, dokumenty/kontrahenci).
  - **Backlog** ([BACKLOG.md](docs/BACKLOG.md)): przepisany na wynik audytu (P1 testy · P2 wydajność/mobile · P3 jakość/bezpieczeństwo · P5 KSeF/AI). **CLAUDE / INTEGRATIONS / SECURITY-RLS**: Stack obecny vs docelowy; Fakturownia ✅; audyt RLS → **40/40 tabel, 97 policy**.
  - **Bramka** [docs-check.mjs](scripts/docs-check.mjs) + skrypt `docs:check` + krok w CI ([ci.yml](.github/workflows/ci.yml)): waliduje wersje (SYNC/badge/CHANGELOG) i nieistniejące katalogi-duchy.
  - **Bramki:** biome czysto · `tsc` ×7 · 229 testów · build ✓ · **`docs:check` ✓** · audyt RLS ✓ (40 tabel).

## [1.50.0] — 🔧 Wykres kosztów pozostałych (6 mies.) na karcie pojazdu

- `[#194]` 🔧 **Trend kosztów (bez paliwa) na karcie pojazdu** — obok wykresu paliwa:
  - **Karta pojazdu** ([vehicles/[id]](apps/web/app/(app)/vehicles/[id]/page.tsx)): w sekcji kosztów wykres `BarChart` kosztów EUR (naprawy/leasing/ubezpieczenie itd., bez paliwa) per miesiąc — ostatnie 6 mies.; ukrywa się przy zerowych kosztach. Agregacja rdzeniem `fuelByMonth` (suma per miesiąc, współdzielona z wykresem paliwa).
  - Manager widzi na karcie pełny obraz kosztów pojazdu w czasie: paliwo + pozostałe.
  - **Bramki:** biome czysto · `tsc` ×7 · 194 testy · build ✓ (`/vehicles/[id]`).

## [1.49.0] — ⛽ Wykres wydatku na paliwo (6 mies.) na karcie pojazdu

- `[#193]` ⛽ **Trend paliwa na karcie pojazdu** — wykres słupkowy wydatku 6 mies. w sekcji „Paliwo":
  - **Rdzeń** [core/fuelTrend.ts](packages/core/src/fuelTrend.ts): `fuelByMonth(entries, months)` — sumuje litry i wydatek per miesiąc (zera dla pustych, ujemne→0). Czyste, **3 testy (194 łącznie)**.
  - **Karta pojazdu** ([vehicles/[id]](apps/web/app/(app)/vehicles/[id]/page.tsx)): pod statystykami paliwa wykres `BarChart` wydatku €/mies. (ostatnie 6 mies.); ukrywa się przy zerowym wydatku.
  - **Bramki:** biome czysto · `tsc` ×7 · 194 testy · build ✓ (`/vehicles/[id]`).

## [1.48.0] — 📈 Mini-wykres przychodu (6 mies.) na pulpicie

- `[#192]` 📈 **Trend przychodu na `/dashboard`** — wykres słupkowy 6 miesięcy dla owner/dispatcher:
  - **Komponent** ([RevenueTrend](apps/web/components/RevenueTrend.tsx)): przychód EUR ze zleceń dostarczonych/zafakturowanych per miesiąc, liczony rdzeniem `monthlyFleetTrend` (paliwo/AdBlue pominięte — tylko przychód), wyświetlany przez `BarChart`. Pod paskiem KPI; ukrywa się przy zerowym przychodzie / dla kierowcy.
  - Manager widzi tendencję bez wchodzenia w „Zestawienie msc.".
  - **Bramki:** biome czysto · `tsc` ×7 · 191 testów · build ✓ (`/dashboard`).

## [1.47.0] — 🎨 Presety stylów: zlecenia, faktury‑msc, raporty, ustawienia

- `[#191]` 🎨 **Dalsza migracja na `formStyles`** — kolejne strony korzystają z presetów, mniej powielonego CSS:
  - **Zlecenia** ([orders](apps/web/app/(app)/orders/page.tsx)), **Raporty** ([reports](apps/web/app/(app)/reports/page.tsx)), **Ustawienia** ([settings](apps/web/app/(app)/settings/page.tsx)): `input` + `label` z presetów (1:1, bez zmian wizualnych).
  - **Zestawienie msc.** ([monthly](apps/web/app/(app)/monthly/page.tsx)): `label` z presetu (input kompaktowy pozostaje świadomie).
  - **Bramki:** biome czysto · `tsc` ×7 · 191 testów · build ✓ (`/orders`, `/reports`, `/settings`, `/monthly`).

## [1.46.0] — 🛠️ Otwarte szkody w panelu „Co wymaga uwagi"

- `[#190]` 🛠️ **Otwarte szkody jako alerty** — domknięcie modułu [#189]: szkody w toku nie umkną:
  - **Panel** ([AttentionPanel](apps/web/components/AttentionPanel.tsx)): szkody o statusie **zgłoszona** (czerwone) / **w likwidacji** (pomarańczowe) liczone na żywo i pokazywane obok terminów pojazdów, kart, serwisu, dokumentów, faktur i kierowców. Tytuł = pojazd · rodzaj; szczegół = status + koszt; klik → `/szkody`. Starsze otwarte szkody wyżej. Etykieta prawej kolumny „otwarta".
  - **Bramki:** biome czysto · `tsc` ×7 · 191 testów · build ✓ (`/dashboard`).

## [1.45.0] — 🛠️ Rejestr szkód / OC

- `[#189]` 🛠️ **Nowy moduł: rejestr szkód** — zgłoszenia szkód pojazdów ze statusem i kosztem:
  - **Rdzeń** [core/damageClaims.ts](packages/core/src/damageClaims.ts): statusy (zgłoszona/w likwidacji/naprawiona/zamknięta/odrzucona), rodzaje (kolizja/kradzież/szyby/żywioł/wandalizm/inne) + `summarizeDamageClaims` (liczba, otwarte, koszt per waluta). Czyste, **3 testy (191 łącznie)**.
  - **Migracja** [0051_damage_claims.sql](supabase/migrations/0051_damage_claims.sql): tabela `damage_claims` (pojazd, kierowca, data, rodzaj, status, koszt, ubezpieczyciel, nr szkody, opis) + indeksy + **RLS multi-tenant**. Na prod, audyt RLS czysty (40 tabel).
  - **Warstwa danych** [damageClaims.ts](packages/api/src/data/damageClaims.ts): `listDamageClaims` / `insertDamageClaim` / `setDamageClaimStatus` / `deleteDamageClaim`.
  - **Strona** ([szkody](apps/web/app/(app)/szkody/page.tsx)): formularz zgłoszenia (pojazd z floty, rodzaj, status, koszt, ubezpieczyciel, nr), lista ze zmianą statusu i kolorami, podsumowanie (otwarte + koszt per waluta), eksport CSV. Nawigacja „Szkody / OC" + i18n `nav.damages` PL/EN.
  - **Bramki:** biome czysto · `tsc` ×7 · 191 testów · parytet i18n · audyt RLS ✓ (40 tabel) · build ✓ (`/szkody`).

## [1.44.0] — 🧾 PDF rozliczenia kierowcy (diety + wypłaty + saldo)

- `[#188]` 🧾 **Drukowalne „Rozliczenie kierowcy"** — domknięcie modułu HR: jeden dokument do podpisu, jak POD/CMR:
  - **Dokument** ([PayoutDoc](apps/web/components/PayoutDoc.tsx)): nagłówek (firma + kierowca + data), sekcja **diety** (per waluta), **rozliczenie** (pozycje + rozbicie należność/zaliczki/potrącenia/wypłaty = saldo), pieczęć **„Do wypłaty" = diety + saldo rozliczeń per waluta** oraz linie podpisów. Druk/PDF przez `window.print()`. Dane ładowane po nazwisku (diety + wypłaty).
  - **`/wyplaty`**: przycisk **„🖨️ Rozliczenie (PDF)"** (aktywny po wpisaniu kierowcy w filtrze) → dokument dla danego kierowcy.
  - **Bramki:** biome czysto · `tsc` ×7 · 188 testów · build ✓ (`/wyplaty`).
  - ⚠️ *Wydruk do PDF zależy od przeglądarki/OS; złożenie dokumentu jest deterministyczne. Bez przeliczeń kursowych — kwoty osobno per waluta.*

## [1.43.0] — 💸 Saldo do wypłaty na pulpicie KPI

- `[#187]` 💸 **Saldo do wypłaty w pasku KPI** — domknięcie modułu rozliczeń [#186]: na pulpicie obok diet:
  - **Pasek KPI** ([KpiStrip](apps/web/components/KpiStrip.tsx)): nowa karta **„Saldo do wypłaty"** (bieżące saldo per waluta, liczone rdzeniem `settleDriverPayouts`) → klik do `/wyplaty`. Karta ukrywa zerowe saldo.
  - Manager widzi na start dnia komplet: zlecenia w toku, do zafakturowania, wynik miesiąca, diety i należności kierowców.
  - **Bramki:** biome czysto · `tsc` ×7 · 188 testów · build ✓ (`/dashboard`).

## [1.42.0] — 💸 Rozliczenia kierowcy (zaliczki / wypłaty)

- `[#186]` 💸 **Nowy moduł: rozliczenia kierowcy** — ewidencja należności, zaliczek, potrąceń i wypłat z saldem:
  - **Rdzeń** [core/payouts.ts](packages/core/src/payouts.ts): `settleDriverPayouts(entries)` — saldo do wypłaty = należność − zaliczki − potrącenia − wypłaty, osobno per waluta (bez kursów). Czyste, **4 testy (188 łącznie)**.
  - **Migracja** [0050_driver_payouts.sql](supabase/migrations/0050_driver_payouts.sql): tabela `driver_payouts` (kierowca, typ, kwota, waluta, data, notatka) + indeksy + **RLS multi-tenant**. Na prod, audyt RLS czysty (39 tabel).
  - **Warstwa danych** [driverPayouts.ts](packages/api/src/data/driverPayouts.ts): `listDriverPayouts` / `insertDriverPayout` / `deleteDriverPayout`.
  - **Strona** ([wyplaty](apps/web/app/(app)/wyplaty/page.tsx)): wprowadzanie pozycji (typ/kwota/waluta/data) + zapis, ewidencja z usuwaniem, **saldo do wypłaty per waluta** i eksport CSV; filtr po kierowcy. Nawigacja „Rozliczenia kier." + i18n `nav.payouts` PL/EN.
  - **Bramki:** biome czysto · `tsc` ×7 · 188 testów · parytet i18n · audyt RLS ✓ (39 tabel) · build ✓ (`/wyplaty`).

## [1.41.0] — 🪪 Przypomnienia o badaniach kierowców (panel + psychotechniczne)

- `[#185]` 🪪 **Terminy kierowców w panelu „Co wymaga uwagi"** + nowy typ badania:
  - **Migracja** [0049_driver_psychotech_expiry.sql](supabase/migrations/0049_driver_psychotech_expiry.sql): kolumna `psychotech_expiry` (badania psychotechniczne) + aktualizacja RPC `list_drivers`, `driver_save`, `generate_expiry_notifications`. Na prod, audyt RLS czysty (38 tabel).
  - **Panel** ([AttentionPanel](apps/web/components/AttentionPanel.tsx)): terminy kierowcy (**prawo jazdy / kod 95 / badania lekarskie / psychotechniczne / ADR**) liczone na żywo i pokazywane jako alerty (po terminie / wkrótce), obok pojazdów, kart, serwisu, dokumentów i faktur. Wcześniej terminy kierowcy szły tylko do powiadomień cron, nie do panelu.
  - **Kartoteka** ([DriverRoster](apps/web/components/DriverRoster.tsx), [drivers/[id]](apps/web/app/(app)/drivers/[id]/page.tsx)): pole „Psychotechniczne do" w formularzu + kolumna w liście, karcie i CSV; `psychotechExpiry` w schemacie `core` i warstwie danych.
  - **Bramki:** biome czysto · `tsc` ×7 · 184 testy · audyt RLS ✓ (38 tabel) · build ✓ (`/drivers`, `/dashboard`).

## [1.40.0] — 💾 Czas pracy: trwała ewidencja w bazie (RLS)

- `[#184]` 💾 **Persystencja czasu pracy** — domknięcie modułu [#182]: dni pracy zapisują się do bazy i wracają jako ewidencja:
  - **Migracja** [0048_work_time_entries.sql](supabase/migrations/0048_work_time_entries.sql): tabela `work_time_entries` (kierowca, data, jazda, inna praca, odpoczynek, notatka) + indeksy. **RLS multi-tenant** (członek czyta, owner/dispatcher zarządza). Na prod, audyt RLS czysty (38 tabel).
  - **Warstwa danych** [workTimeEntries.ts](packages/api/src/data/workTimeEntries.ts): `listWorkTimeEntries` / `insertWorkTimeEntry` / `deleteWorkTimeEntry` + typy; regeneracja `database.types.ts`.
  - **Strona** ([czas-pracy](apps/web/app/(app)/czas-pracy/page.tsx)): „💾 Zapisz do ewidencji" + sekcja **„Ewidencja"** (odczyt z bazy, usuwanie, CSV, podsumowanie liczone rdzeniem `summarizeWorkTime`).
  - **Bramki:** biome czysto · `tsc` ×7 · 184 testy · audyt RLS ✓ (38 tabel) · build ✓ (`/czas-pracy`).

## [1.39.0] — 🔎 Globalne wyszukiwanie: lepszy ranking (rdzeń + testy)

- `[#183]` 🔎 **Ulepszenie wyszukiwarki Ctrl/⌘+K** — istniejące globalne wyszukiwanie (pojazdy/kierowcy/zlecenia/faktury) przeniesione na przetestowany silnik:
  - **Rdzeń** [core/search.ts](packages/core/src/search.ts): `searchEntities(query, items, limit)` — dopasowanie wielo‑tokenowe (wszystkie słowa muszą wystąpić) + ranking „tytuł zaczyna się od frazy → zawiera → reszta". Generyczne, zachowuje typ wejścia. **5 testów (184 łącznie)**.
  - **Komponent** ([GlobalSearch](apps/web/components/GlobalSearch.tsx)): filtr zastąpiony `searchEntities`; zlecenia szukane teraz **także po nadawcy/odbiorcy** (wcześniej tylko trasa/nr), pojazdy po **VIN** — przez pole `keywords`. Lepsza kolejność wyników.
  - **Bramki:** biome czysto · `tsc` ×7 · 184 testy · build ✓.

## [1.38.0] — ⏱️ Ewidencja czasu pracy kierowcy

- `[#182]` ⏱️ **Nowy moduł: czas pracy** — godziny jazdy / innej pracy / odpoczynku z podsumowaniem:
  - **Rdzeń** [core/workTime.ts](packages/core/src/workTime.ts): `summarizeWorkTime(entries, {dailyDrivingLimit})` — wiersze dzienne (praca łącznie = jazda + inna praca, flaga przekroczenia jazdy) + podsumowanie okresu (sumy, średnia jazda/dzień, liczba dni z przekroczeniem). Limit konfigurowalny (domyślnie 10 h). Czyste, **5 testów (179 łącznie)**.
  - **Strona** ([czas-pracy](apps/web/app/(app)/czas-pracy/page.tsx)): kalkulator wielu dni (data, jazda, inna praca, odpoczynek) z natychmiastowym podsumowaniem, oznaczaniem przekroczeń i **eksportem CSV** (owner/dispatcher).
  - **Nawigacja + i18n** ([layout](apps/web/app/(app)/layout.tsx)): pozycja „Czas pracy"; klucz `nav.workTime` PL/EN (parytet).
  - **Bramki:** biome czysto · `tsc` ×7 · 179 testów · parytet i18n · build ✓ (`/czas-pracy`).
  - *Sygnalizacja limitu (10 h) to nie interpretacja prawna (561/2006 / Pakiet Mobilności) — limit jest konfigurowalny.*

## [1.37.0] — 🎨 Presety stylów: serwis, rozliczenia, dokumenty, zespół

- `[#181]` 🎨 **Dokończenie migracji na `formStyles`** — spójność do końca, dalsze odchudzenie CSS:
  - **Serwis** ([service](apps/web/app/(app)/service/page.tsx)) i **Dokumenty** ([documents](apps/web/app/(app)/documents/page.tsx)): `input` + `label` z presetów (1:1, bez zmian wizualnych).
  - **Rozliczenia** ([settlements](apps/web/app/(app)/settlements/page.tsx)): `label` z presetu (input kompaktowy pozostaje świadomie).
  - **Zespół** ([team](apps/web/app/(app)/team/page.tsx)): `card` z presetu (zachowany padding; znormalizowany promień).
  - Inputy kompaktowe (settlements/team-select) zostawione bez zmiany szerokości — bez ryzyka wizualnego.
  - **Bramki:** biome czysto · `tsc` ×7 · 174 testy · build ✓ (`/service`, `/settlements`, `/documents`, `/team`).

## [1.36.0] — 🎨 Ujednolicenie stylów: pojazdy i kierowcy na presetach

- `[#180]` 🎨 **Migracja stron na presety `formStyles`** — mniej powielonego CSS, spójniejszy wygląd:
  - **Pojazdy** ([vehicles](apps/web/app/(app)/vehicles/page.tsx)): formularz/lista korzystają z presetów (`formWrap`, `grid`, `field`, `label`, `input`, `card`, `listRow`, `cell`, `meta`); usunięto duplikaty i **martwe style** (`primary`/`ghost`/`danger`).
  - **Kierowcy** ([drivers](apps/web/app/(app)/drivers/page.tsx)): `input`/`card` z presetów; usunięto cały lokalny obiekt `styles` (martwe `primary`/`ghost`).
  - Bez zmian zachowania — czysta kosmetyka/porządki.
  - **Bramki:** biome czysto · `tsc` ×7 · 174 testy · build ✓ (`/vehicles`, `/drivers`).

## [1.35.0] — 🗂️ Wyszukiwarka, filtr i sortowanie zleceń

- `[#179]` 🔎 **Szybkie znajdowanie zleceń** przy rosnącej liczbie:
  - **Rdzeń** [core/orderFilter.ts](packages/core/src/orderFilter.ts): `filterSortOrders(orders, {text, status, sort})` — wyszukiwanie tekstowe (referencja/nadawca/odbiorca/trasa, bez wielkości liter), filtr statusu i sortowanie (data ↓/↑, stawka ↓/↑). Czyste, generyczne (zachowuje typ wejścia). **6 testów (174 łącznie)**.
  - **Zlecenia** ([orders](apps/web/app/(app)/orders/page.tsx)): pole **🔎 Szukaj** + select sortowania nad chipami statusu. Wyszukiwanie/sort obejmuje też podsumowanie i eksporty (CSV, giełda).
  - **Bramki:** biome czysto · `tsc` ×7 · 174 testy · build ✓ (`/orders`).

## [1.34.0] — 🚚 Ranking rentowności floty (P&L per pojazd)

- `[#178]` 🏆 **Zysk wszystkich pojazdów obok siebie** — rozszerzenie P&L [#177] z pojedynczego pojazdu na całą flotę:
  - **Rdzeń** [core/vehiclePnl.ts](packages/core/src/vehiclePnl.ts): `fleetPnlByVehicle(orders, fuelByVehicle, costsByVehicle)` — przychód EUR (zlecenia zrealizowane) − paliwo − koszty dla każdego pojazdu, malejąco wg zysku; obejmuje też pojazdy z kosztem bez przychodu. Reużywa `vehiclePnl`. **3 testy (168 łącznie)**.
  - **Statystyki** ([stats](apps/web/app/(app)/stats/page.tsx)): sekcja **„🚚 Ranking rentowności floty (per pojazd)"** — tabela Pojazd / Przychód / Paliwo / Koszty / Zysk / Marża (kolor wg znaku), pod zbiorczym P&L floty.
  - **Bramki:** biome czysto · `tsc` ×7 · 168 testów · build ✓ (`/stats`).

## [1.33.0] — 🚚 Karta pojazdu: mini P&L (zysk per pojazd)

- `[#177]` 💰 **Zysk pojazdu w jednym miejscu** — karta pojazdu spina przychód, paliwo i koszty w prosty rachunek wyniku:
  - **Rdzeń** [core/vehiclePnl.ts](packages/core/src/vehiclePnl.ts): `vehiclePnl({revenueEur, fuelEur, costsEur})` → przychód − paliwo − koszty = **zysk** + **marża %** (null bez przychodu; ujemne wejścia jak zero). Czyste, **5 testów (165 łącznie)**.
  - **Karta pojazdu** ([vehicles/[id]](apps/web/app/(app)/vehicles/[id]/page.tsx)): sekcja **„💰 Zysk pojazdu (P&L)"** u góry — przychód / − paliwo / − koszty / zysk / marża (kolor wg znaku). Składowe były już liczone osobno; teraz domknięte w wynik.
  - **Bramki:** biome czysto · `tsc` ×7 · 165 testów · build ✓ (`/vehicles/[id]`).
  - *EUR: zlecenia dostarczone/zafakturowane + paliwo + koszty (inne waluty pomijane — bez kursów).*

## [1.32.0] — 📤 Eksport zleceń na giełdę transportową (CSV)

- `[#176]` 📤 **Eksport frachtu do publikacji na giełdach** (Trans.eu / Timocom itp.) — szybkie wystawienie zlecenia jako ogłoszenia:
  - **Rdzeń** [core/freightExport.ts](packages/core/src/freightExport.ts): `freightExportRows` / `toFreightRow` / `freightRowCells` + `FREIGHT_EXPORT_HEADERS` — mapuje zlecenie na uniwersalny zestaw pól frachtu (referencja, załadunek/rozładunek + daty, ładunek, **waga kg→t**, stawka, waluta, uwagi); pomija pozycje bez trasy. **Czyste, 4 testy (160 łącznie)**.
  - **Zlecenia** ([orders](apps/web/app/(app)/orders/page.tsx)): przycisk **„📤 Giełda (CSV)"** eksportuje aktualnie filtrowaną listę zleceń w formacie frachtowym (obok zwykłego CSV).
  - **Bramki:** biome czysto · `tsc` ×7 · 160 testów · build ✓ (`/orders`).
  - *Uwaga: to wspólny mianownik pól frachtowych (CSV do wklejenia/importu), nie format konkretnego API giełdy.*

## [1.31.0] — 📊 Pulpit KPI (operacyjny skrót na start dnia)

- `[#175]` 📊 **Pasek KPI na pulpicie** ([KpiStrip](apps/web/components/KpiStrip.tsx)) — dla owner/dispatcher, liczony na żywo, spina dotychczasowe moduły w jeden widok:
  - **Zlecenia w toku** (nowe/przypisane/w trakcie) i **do zafakturowania** (dostarczone) → `/orders`.
  - **Wynik bieżącego miesiąca (EUR)** (przychód − paliwo − AdBlue, kolor wg znaku) + przychód → `/monthly`.
  - **Diety (mies.)** — należne diety bieżącego miesiąca per waluta → `/diety`.
  - Karty klikalne (deep-link), dla kierowcy pasek się nie renderuje; uzupełnia istniejący panel „Co wymaga uwagi" (terminy).
  - **Bramki:** biome czysto · `tsc` ×7 · 156 testów · build ✓ (`/dashboard`).

## [1.30.0] — 📅 Diety w zestawieniu miesięcznym + data podróży

- `[#174]` 📅 **Diety wpięte w „Zestawienie msc."** — koszty rozliczane w jednym miejscu, z poprawną wielowalutowością:
  - **Data podróży** ([diety](apps/web/app/(app)/diety/page.tsx)): pole „Data podróży" (domyślnie dziś) zapisywane do `trip_date`; data widoczna w ewidencji i CSV (nowa kolumna).
  - **Zestawienie** ([monthly](apps/web/app/(app)/monthly/page.tsx)): sekcja **„Diety kierowców — <miesiąc>"** z należnymi dietami filtrowanymi po dacie podróży, **osobno per waluta** (nie sumowane do wyniku EUR — bez kursów). Diety dołączone też do CSV „Rejestr kosztów (księgowość)" jako oddzielny blok per waluta.
  - **Bramki:** biome czysto · `tsc` ×7 · 156 testów · build ✓ (`/monthly`, `/diety`).

## [1.29.0] — 💾 Diety kierowcy — trwała ewidencja w bazie (RLS)

- `[#173]` 💾 **Persystencja diet** — domknięcie modułu [#172]: zapisane podróże trafiają do bazy i wracają jako ewidencja do rozliczeń:
  - **Migracja** [0047_per_diem_trips.sql](supabase/migrations/0047_per_diem_trips.sql): tabela `per_diem_trips` (kierowca, cel, typ, czas, stawka dobowa, waluta, data, notatka) + indeksy. **RLS multi-tenant**: członek czyta, owner/dispatcher zarządza (jak `vehicle_costs`). Zastosowana na prod, audyt RLS czysty (37 tabel).
  - **Warstwa danych** [perDiemTrips.ts](packages/api/src/data/perDiemTrips.ts): `listPerDiemTrips` / `insertPerDiemTrip` / `deletePerDiemTrip` + typy; regeneracja `database.types.ts`.
  - **Strona** ([diety](apps/web/app/(app)/diety/page.tsx)): „💾 Zapisz do ewidencji" zapisuje wprowadzone podróże; sekcja **„Ewidencja diet"** ładuje zapisane (kwoty liczone rdzeniem), pozwala usuwać i eksportować CSV; podsumowanie należnych diet per waluta z bazy.
  - **Bramki:** biome czysto · `tsc` ×7 · 156 testów · audyt RLS ✓ (37 tabel) · build ✓ (`/diety`).

## [1.28.0] — 🧮 Diety kierowcy (per diem) — kalkulator + zestawienie

- `[#172]` 🧮 **Moduł diet z podróży służbowych** — krajowych i zagranicznych, pod rozliczenie wynagrodzeń kierowców:
  - **Rdzeń** [core/perDiem.ts](packages/core/src/perDiem.ts): `computePerDiem(trip)` + `sumPerDiem(results)` — należna liczba „dób" wg reguł czasowych (krajowa: ≤doby <8h=0 · 8–12h=½ · >12h=1; wielodobowa: pełna doba=1, niepełna ≤8h=½, >8h=1 · zagraniczna: ≤8h=⅓ · 8–12h=½ · >12h=1, pełna doba=1) × stawka, suma per waluta. **Czyste, 13 testów (156 łącznie)**.
  - **Strona** ([diety](apps/web/app/(app)/diety/page.tsx)): kalkulator wielu podróży (cel, typ, czas, stawka/dobę, waluta) z natychmiastowym wynikiem per wiersz, podsumowaniem per waluta i **eksportem CSV** zestawienia (owner/dispatcher). Stawki dobowe ustala owner (silnik nie zaszywa stawek urzędowych).
  - **Nawigacja + i18n** ([layout](apps/web/app/(app)/layout.tsx)): pozycja „Diety kierowcy" w sekcji finansów; klucz `nav.perDiem` w PL/EN (parytet).
  - **Bramki:** biome czysto · `tsc` ×7 · 156 testów · parytet i18n · build ✓ (`/diety`).

## [1.27.0] — 🧾 Samodzielny „Dowód dostawy" (POD) do druku/PDF

- `[#171]` 🧾 **Lekki dokument dowodu dostawy** — krótszy niż pełny list CMR, do szybkiej wysyłki klientowi po dostarczeniu:
  - **Dokument** ([PodDoc](apps/web/components/PodDoc.tsx)): „DOWÓD DOSTAWY / Proof of Delivery" — trasa (załadunek/rozładunek + daty), strony (nadawca/odbiorca), towar + waga, przewoźnik + pojazd, pieczęć „DOSTARCZONO" (status delivered/invoiced) oraz **podpis odbiorcy** (e-podpis ze zlecenia lub pusta linia na podpis odręczny). Druk/PDF przez `window.print()`.
  - **Wspólny hook** ([usePodSignature](apps/web/lib/usePodSignature.ts)): wczytanie najnowszego podpisu POD zlecenia (podpisany URL 30 min) — współdzielony przez `PodDoc` i `CmrDoc` (DRY; refaktor `CmrDoc` na hook).
  - **Akcja** ([orders](apps/web/app/(app)/orders/page.tsx)): przy każdym zleceniu przycisk **„🧾 POD"** obok „📄 CMR".
  - **Bramki:** biome czysto · `tsc` ×7 · 143 testy · build ✓ (`/orders`).
  - ⚠️ *Sam wydruk do PDF zależy od przeglądarki/OS; złożenie dokumentu jest deterministyczne.*

## [1.26.0] — 📱 Podpis odbiorcy (POD) w aplikacji kierowcy (mobile)

- `[#170]` 📱 **POD na telefonie** — kierowca zbiera podpis odbiorcy w terenie, bez panelu web i bez nowych natywnych modułów:
  - **Pole podpisu** ([SignaturePadMobile](apps/mobile/components/SignaturePadMobile.tsx)): `PanResponder` zbiera punkty, podgląd to realne segmenty‑linie (obrót `View`), eksport do **wektorowego SVG** (białe „tło", czarny tusz). Próbkowanie z progiem dystansu, blokada zapisu pustego podpisu.
  - **Załączniki mobile** ([CargoPhotosMobile](apps/mobile/components/CargoPhotosMobile.tsx)): przycisk **„✍️ Podpis"** + pole odbiorcy → upload SVG przez `uploadOrderPhotoBinary` (`image/svg+xml`) z `caption` w formacie POD (wspólny z web). POD na liście jako etykieta „✍️ POD — odbiorca · data" (RN `<Image>` nie renderuje SVG; podgląd rysunku jest na web/CMR).
  - **Spójność web↔mobile:** ten sam format `caption` i te same helpery z `core` ([#169]); podpis z telefonu wpina się w poz. 24 listu CMR i eksport PDF na web.
  - **Bramki:** biome czysto · `tsc` ×7 (mobile włącznie) · 143 testy. *(Web bez zmian — brak redeployu; build aplikacji mobilnej: EAS po stronie właściciela.)*
  - ⚠️ *Interakcję rysowania należy przeklikać na urządzeniu dotykowym; budowa SVG i upload są deterministyczne.*

## [1.25.0] — 🧾 Podpis odbiorcy (POD) wpięty w dokument CMR → PDF

- `[#169]` 🧾 **Realny e-podpis odbiorcy na liście CMR** — domknięcie POD [#168]: drukowalny CMR zawiera teraz faktyczny podpis ze zlecenia, gotowy do „Drukuj / Zapisz PDF":
  - **Rdzeń** [core/pod.ts](packages/core/src/pod.ts): `isPodCaption` / `parsePodCaption` / `buildPodCaption` — wspólny format `caption` podpisu (`POD: <odbiorca> · <data>`), czysty i współdzielony. **7 testów (143 łącznie)**.
  - **Dokument CMR** ([CmrDoc](apps/web/components/CmrDoc.tsx)): wczytuje najnowszy podpis POD zlecenia (podpisany URL, ważny 30 min) i wstawia go w **poz. 24 „Podpis odbiorcy"** wraz z nazwiskiem i datą; brak podpisu → pusta linia jak dawniej. Wydruk/PDF przez `window.print()`.
  - **Załączniki** ([CargoPhotos](apps/web/components/CargoPhotos.tsx)): przejście na wspólne helpery z `core` (spójny zapis/odczyt podpisu, etykieta odbiorcy/daty pod miniaturą).
  - **Bramki:** biome czysto · `tsc` ×7 · 143 testy · build ✓ (`/orders`).
  - ⚠️ *Sam wydruk do PDF zależy od przeglądarki/OS; logika złożenia dokumentu jest deterministyczna.*

## [1.24.0] — 🧾 e-CMR / dowód dostawy (POD) — podpis odbiorcy

- `[#168]` 🧾 **Podpis odbiorcy przy zleceniu (Proof of Delivery)** — elektroniczny dowód odbioru ładunku, bez nowej tabeli (reużycie infrastruktury załączników):
  - **Pole podpisu** ([SignaturePad](apps/web/components/SignaturePad.tsx)): canvas „papier" (białe tło, czarny tusz), High-DPI + Pointer Events (mysz · dotyk · rysik), eksport do PNG, „Wyczyść"/„Anuluj"/„Zapisz". Blokada zapisu pustego podpisu.
  - **Załączniki zlecenia** ([CargoPhotos](apps/web/components/CargoPhotos.tsx)): przycisk **„✍️ Podpis (POD)"** → pole „odbiorca" + podpis; zapis jako załącznik PNG do bucketu `cargo-photos` z `caption = "POD: <odbiorca> · <data/godz.>"`. POD wyróżniony w siatce (badge „✍️ POD", czerwona ramka, podpis pod miniaturą). Działa wszędzie, gdzie są załączniki — **panel spedytora (`/orders`)** i **panel kierowcy (`/my-orders`)**.
  - **Bez migracji / RLS bez zmian:** podpis to obraz w istniejącej tabeli `order_photos` (upload: członek firmy; usuwanie: owner/dispatcher).
  - **Bramki:** biome czysto · `tsc` ×7 · 136 testów · build ✓ (`/orders`, `/my-orders`).
  - ⚠️ *Interakcję pisaka należy przeklikać na urządzeniu dotykowym; logika rysowania i eksport są deterministyczne.*

## [1.23.0] — 🌱 Emisje CO₂ per klient (atrybucja jak rentowność)

- `[#167]` 🌱 **Ślad węglowy w rozbiciu na nadawców** — pod raporty CO₂ przesyłek dla klientów:
  - **Rdzeń** [core/co2.ts](packages/core/src/co2.ts): `co2ByClient(orders, vehicleLiters)` — litry paliwa pojazdu dzielone na jego zrealizowane zlecenia EUR proporcjonalnie do przychodu (ten sam model atrybucji co `clientProfitability`), sumowane per nadawca → CO₂. Malejąco. **2 testy (136 łącznie)**.
  - **Statystyki** ([EmissionsSection](apps/web/app/(app)/stats/EmissionsSection.tsx)): pod tabelą per‑pojazd druga tabela **„👥 Wg klienta (nadawcy)"** (litry przypisane + CO₂); eksport CSV rozszerzony o sekcję klientów.
  - **Bramki:** biome czysto · `tsc` ×7 · 136 testów · build ✓ (`/stats`).

## [1.22.0] — 💶 Eksport księgowy: rejestr kosztów miesiąca

- `[#166]` 💶 **Rejestr kosztów dla biura rachunkowego** — symetrycznie do rejestru VAT sprzedaży [#165]; zbiorczy CSV kosztów miesiąca:
  - **Rdzeń** [core/accounting.ts](packages/core/src/accounting.ts): `costRegister(entries)` — grupuje koszty wg kategorii (malejąco wg kwoty) + suma + liczności. Czyste, **2 testy (134 łącznie)**.
  - **Zestawienie miesięczne** ([monthly](apps/web/app/(app)/monthly/page.tsx)): ładuje też `vehicle_costs`; przycisk **„🧮 Rejestr kosztów (księgowość)"** → CSV: pozycje (data, pojazd, kategoria, kwota EUR) z **paliwa + AdBlue + kosztów pojazdu** (naprawa/leasing/ubezpieczenie/…) za wybrany miesiąc + sekcja „Podsumowanie wg kategorii" + RAZEM. Pozycje w walutach ≠ EUR pomijane.
  - **Bramki:** biome czysto · `tsc` ×7 · 134 testy · build ✓ (`/monthly`).

## [1.21.0] — 💶 Eksport księgowy: rejestr VAT sprzedaży (miesiąc)

- `[#165]` 💶 **Rejestr VAT dla biura rachunkowego** — jeden plik CSV z fakturami miesiąca + podsumowaniem wg stawek:
  - **Rdzeń** [core/accounting.ts](packages/core/src/accounting.ts): `monthlyVatRegister(invoices, month)` — filtruje faktury wystawione (≠ anulowane) z `issue_date` w miesiącu, grupuje wg stawki VAT (netto/VAT/brutto/liczba), zwraca sumy. Czyste, **3 testy (132 łącznie)**.
  - **Faktury** ([invoices](apps/web/app/(app)/invoices/page.tsx)): wybór miesiąca (`<input type="month">`) + przycisk **„🧮 Rejestr VAT (księgowość)"** → CSV: pozycje (nr, data, nabywca, NIP, stawka, netto, VAT, brutto, waluta) + sekcja „Podsumowanie wg stawek VAT" + wiersz RAZEM. Owner/dispatcher.
  - **Bramki:** biome czysto · `tsc` ×7 · 132 testy · build ✓ (`/invoices`).

## [1.20.0] — 🌱 Emisje CO₂ per pojazd + eksport CSV (raport ESG)

- `[#164]` 🌱 **Rozszerzenie raportu CO₂** o rozbicie na pojazdy i eksport — pod sprawozdawczość ESG/CSRD:
  - **Rdzeń** [core/co2.ts](packages/core/src/co2.ts): `co2ByVehicle(vehicles)` → wiersze (rejestracja, litry, CO₂ kg, CO₂/100km), posortowane malejąco wg emisji. 2 testy (**129 łącznie**).
  - **Sekcja** [stats/EmissionsSection.tsx](apps/web/app/(app)/stats/EmissionsSection.tsx): tabela „🌱 Emisje CO₂" per pojazd + sumy floty (ślad węglowy, litry) + **eksport „⬇️ CSV"** (pojazd/litry/CO₂/CO₂‑100km + wiersz RAZEM). Tylko owner/dispatcher. Reużywa policzone agregaty floty.
  - **Bramki:** biome czysto · `tsc` ×7 · 129 testów · build ✓ (`/stats`).

## [1.19.0] — 🌱 Ślad węglowy floty (CO₂) na statystykach

- `[#163]` 🌱 **Raport emisji CO₂** — pod wymagania ESG/CSRD w transporcie, liczony z już zbieranych danych paliwowych (bez nowej infrastruktury):
  - **Rdzeń** [core/co2.ts](packages/core/src/co2.ts): `dieselCo2Kg(liters)` (współczynnik tank-to-wheel **2,64 kg CO₂/L**), `co2PerHundredKm(L/100km)` (intensywność), `formatCo2(kg)` (kg/tony). Funkcje czyste, **4 testy (127 łącznie)**.
  - **Statystyki** ([stats](apps/web/app/(app)/stats/page.tsx)): w pulpicie floty dwa kafelki — **„🌱 Ślad węglowy (CO₂)"** (suma z paliwa) i **„CO₂ / 100 km"** (intensywność ze średniego spalania). Reużywa policzone już agregaty floty.
  - **Bramki:** biome czysto · `tsc` ×7 · 127 testów · build ✓ (`/stats`).

## [1.18.3] — 🎨 Wspólne tokeny + presety stylów (spłata długu [P3] z audytu)

- `[#162]` 🎨 **Koniec powielania styli** — realizacja [P3] z [audytu v1.18](docs/AUDIT-v1.18.md):
  - **Tokeny w `@e-logistic/ui`** [tokens.ts](packages/ui/src/tokens.ts): `radius` (sm/md/lg/xl/pill), `space` (xs…xxl), `fontSize` (xs…xl) — liczby **współdzielone web (px) ↔ mobile (dp)**, jeden kanon skali obok `palette`.
  - **Presety web** [components/formStyles.ts](apps/web/components/formStyles.ts) (CSSProperties z palety + tokenów): `field`, `label`, `input`, `grid`, `formWrap`, `card`, `listRow`, `cell`, `meta` — koniec kopiowania tych samych obiektów `styles` na każdej stronie.
  - **Adopcja**: [kontrahenci](apps/web/app/(app)/contractors/page.tsx) korzystają z presetów (lokalny `styles` = referencje do `formStyles`) — identyczne wartości, zero zmiany wizualnej; wzorzec do migracji kolejnych stron przyrostowo.
  - **Architektura:** `CSSProperties` jest DOM-owe, więc presety web są w aplikacji web; mobile reużywa same tokeny liczbowe (RN StyleSheet).
  - **Bramki:** biome czysto · `tsc` ×7 · 158 testów · build ✓ (`/contractors`).

## [1.18.2] — 🧹 Rozbicie `map/page.tsx` (spłata długu [P2] z audytu)

- `[#161]` 🧹 **Dekompozycja największego pliku** ([map/page.tsx](apps/web/app/(app)/map/page.tsx)) — realizacja [P2] z [audytu v1.18](docs/AUDIT-v1.18.md). Czysty refaktor: kod modułowy (stałe, typy, buildery, style) wyniesiony do współlokowanych plików, bez zmiany zachowania:
  - [mapTypes.ts](apps/web/app/(app)/map/mapTypes.ts) — `RouteResponse`, `Stop`, `Report`, `BasemapKey`, `MaplibreModule`.
  - [mapTheme.ts](apps/web/app/(app)/map/mapTheme.ts) — `MAPTILER_KEY`, `OSM_STYLE`, `BASEMAPS`, `basemapStyle`, etykiety/kolory zgłoszeń, `SAVED_CAT_ICON`, `TRAFFIC_COLOR`, `DISRUPTION_RADIUS_KM`, `POI_LABEL`.
  - [mapFeatures.ts](apps/web/app/(app)/map/mapFeatures.ts) — buildery GeoJSON (`routeFeature`/`poiFeatures`/`reportFeatures`).
  - [mapUi.tsx](apps/web/app/(app)/map/mapUi.tsx) — komponent `Row` + obiekt `styles`.
  - **Efekt:** `page.tsx` **1694 → 1388 linii** (−306, ~18%); stateful `MapPage` bez zmian (świadomie — rozbijanie ciała komponentu ryzykowne bez testu wizualnego).
  - **Bramki:** biome czysto · `tsc` ×7 · 158 testów · build ✓ (`/map`). Zachowanie identyczne (relokacja kodu).

## [1.18.1] — 🔍 Trzeci audyt całościowy (v1.18, przed publikacją mobile)

- `[#160]` 🔍 **Pełny audyt web + mobile** ([docs/AUDIT-v1.18.md](docs/AUDIT-v1.18.md)) — po dołożeniu aplikacji mobilnej (v1.13–v1.18). Werdykt: brak P0/P1; web produkcyjny, mobile gotowy do EAS build po finalnej grafice i QA na urządzeniu.
  - **Oceny:** Bezpieczeństwo **A** · Jakość **A** · Wydajność **B+** · Docs **A−** · Gotowość mobile **B+**.
  - **Bramki:** biome czysto (218 plików) · `tsc` ×7 · 158 testów · `next build` ✓ (30 stron, 12 API) · `audit:rls` ✓ (36 tabel). **0 TODO/FIXME · 0 `as any` · 0 sekretów w repo.**
  - **Backlog:** [P2] `map/page.tsx` (1694 l.) do rozbicia; [P2] QA mobile na urządzeniu; [P3] finalna grafika + presety stylów `@e-logistic/ui`. Checklista przed sklepami w raporcie.

## [1.18.0] — 🏪 Mobile gotowy do publikacji: ikony, splash, EAS

- `[#159]` 🏪 **Przygotowanie aplikacji mobilnej do sklepów** (most do App Store / Google Play):
  - **Ikony i splash** w barwach marki (czerwień `#E50914` na czerni `#0a0a0a`): [icon](apps/mobile/assets/icon.png) 1024², [adaptive-icon](apps/mobile/assets/adaptive-icon.png) (Android), [splash-icon](apps/mobile/assets/splash-icon.png), [favicon](apps/mobile/assets/favicon.png). Generowane skryptem [scripts/gen-assets.mjs](apps/mobile/scripts/gen-assets.mjs) (poprawne PNG bez zależności, przez `zlib`) — **placeholdery do zastąpienia finalną grafiką**.
  - **app.json**: `icon`, `splash` (contain, tło `#0a0a0a`), `android.adaptiveIcon`, `web.favicon`, `assetBundlePatterns`.
  - **[eas.json](apps/mobile/eas.json)**: profile build (`development`/`preview`/`production`) + `submit`.
  - **Runbook publikacji** w [apps/mobile/README.md](apps/mobile/README.md): `eas init` (też nadaje `projectId` do tokenów push), `expo install --fix`, `eas build`, `eas submit`; sekrety (`EXPO_ACCESS_TOKEN`, `EXPO_PUBLIC_*`).
  - **Uwaga:** sam build/submit wymaga realnej maszyny + kont Apple/Google (poza tym środowiskiem). Konfiguracja zweryfikowana: biome czysto · `tsc` (mobile) ✓ · PNG-i poprawne (sygnatura + wymiary).

## [1.17.0] — 🔔 Push o przypisaniu zlecenia (mobile, Expo)

- `[#158]` 🔔 **Powiadomienia push do aplikacji mobilnej** — kierowca dostaje push, gdy spedytor przypisze mu zlecenie:
  - **[Migracja 0046](supabase/migrations/0046_expo_push_tokens.sql)** (na prod): tabela `expo_push_tokens` (`user_id`, `company_id`, `token` unikalny, `platform`) — osobno od `push_subscriptions` (Web Push/VAPID), bo Expo używa pojedynczego tokenu. RLS: właściciel zarządza swoimi. `audit:rls` ✓ (36 tabel, `expo_push_tokens` RLS + 3 polityki).
  - **api** [data/expoPush.ts](packages/api/src/data/expoPush.ts): `saveExpoPushToken` (upsert po tokenie), `deleteExpoPushToken`, `listExpoPushTokensForUsers` (do wysyłki serwerowej).
  - **Mobile** [lib/push.ts](apps/mobile/lib/push.ts): rejestracja `expo-notifications` (zgoda + `getExpoPushTokenAsync`) → zapis tokenu po zalogowaniu ([AuthProvider](apps/mobile/components/AuthProvider.tsx)); tap w powiadomienie → przejście do „Moje zlecenia" ([_layout](apps/mobile/app/_layout.tsx)). Plugin `expo-notifications` w [app.json](apps/mobile/app.json). Best-effort: brak zgody/`projectId` w dev → push nieaktywny bez crasha.
  - **Wysyłka** [lib/expoPush.ts](apps/web/lib/expoPush.ts) `sendExpoPush` (Expo Push API) wpięta w [/api/orders/notify-assignment](apps/web/app/api/orders/notify-assignment/route.ts) **obok** Web Push — trasa wysyła teraz oboma kanałami (Expo działa bez VAPID; opcjonalny `EXPO_ACCESS_TOKEN` na wyższe limity).
  - **Bramki:** biome czysto · `tsc` (api + mobile) ✓ · web build ✓ (`/api/orders/notify-assignment`) · 158 testów rdzenia · `audit:rls` ✓. Mobile weryfikowane typecheckiem.

## [1.16.0] — 📸 Zdjęcia towaru z aparatu na telefonie (mobile)

- `[#157]` 📸 **Kierowca robi zdjęcia ładunku z telefonu** — domyka dowód zabezpieczenia po stronie mobilnej (backend `order_photos`/bucket `cargo-photos` z [#151]):
  - **api** [data/orderPhotos.ts](packages/api/src/data/orderPhotos.ts): `uploadOrderPhotoBinary(client, companyId, orderId, data, opts)` — wariant dla React Native (brak `File`): przyjmuje `ArrayBuffer`/`Uint8Array` + `contentType`/`ext`/`sizeBytes`. Upload do Storage + metadane, z rollbackiem przy błędzie.
  - **Mobile** [components/CargoPhotosMobile.tsx](apps/mobile/components/CargoPhotosMobile.tsx): podgląd miniatur (podpisane URL-e) + **„📷 Zrób zdjęcie"** (`expo-image-picker` `launchCameraAsync`) i **„🖼️ Z galerii"**; zdjęcie → `base64` → `decode` (`base64-arraybuffer`) → `uploadOrderPhotoBinary`. Wpięte w kartę zlecenia na [Moje zlecenia](apps/mobile/app/my-orders.tsx).
  - **Uprawnienia:** plugin `expo-image-picker` w [app.json](apps/mobile/app.json) z opisami zgody na aparat i galerię (iOS/Android).
  - **Bezpieczeństwo:** upload przez tę samą warstwę `packages/api` + bucket prywatny + RLS (członek dodaje, owner/dispatcher kasuje) — identycznie jak web.
  - **Następny krok mobile:** push (`expo-notifications`) o przypisaniu zlecenia.
  - **Bramki:** biome czysto · `tsc` (api + mobile) ✓ · web build ✓ · 158 testów rdzenia bez zmian. Mobile weryfikowane typecheckiem.

## [1.15.0] — 📱 „Moje zlecenia" w aplikacji mobilnej (lista + status)

- `[#156]` 📱 **Kierowca obsługuje zlecenia z telefonu** — trzeci increment mobilny:
  - **Ekran** [apps/mobile/app/my-orders.tsx](apps/mobile/app/my-orders.tsx): lista zleceń przypisanych do zalogowanego kierowcy (`listMyOrders` — RLS zawęża do niego), z numerem, statusem (plakietka w kolorze), trasą, ładunkiem/wagą, rejestracją pojazdu i datą załadunku. Pull-to-refresh.
  - **Zmiana statusu**: „▶️ W trakcie" (z `new`/`assigned`) i „✅ Dostarczone" (z `in_progress`) przez `setOrderStatus` (serwer i tak utwardza dozwolone przejścia kierowcy).
  - Wpięte w nawigację ([_layout](apps/mobile/app/_layout.tsx)) + pozycja **„📋 Moje zlecenia"** jako główny przycisk na pulpicie ([index](apps/mobile/app/index.tsx)). Reużycie `useFleet` (rejestracje) i klienta z `packages/api`.
  - **Następny krok:** zdjęcia towaru z aparatu (`expo-image-picker` + upload do bucketu `cargo-photos`) — backend gotowy z [#151].
  - **Bramki:** biome czysto · `tsc` (mobile) ✓ · 158 testów rdzenia bez zmian. Mobile weryfikowane typecheckiem.

## [1.14.0] — 📱 Mobilne formularze → Supabase (offline outbox)

- `[#155]` 📱 **Formularze mobilne zapisują realnie do bazy** (paliwo, AdBlue, trasa) — koniec zapisu „tylko lokalnie do pamięci ekranu":
  - **Outbox offline-first** [apps/mobile/lib/outbox.ts](apps/mobile/lib/outbox.ts) — odpowiednik webowego, na **AsyncStorage**: `enqueue`/`trySync`/`flushQueued`/`listOutbox`. Zapis najpierw lokalnie (status `queued`), potem best-effort sync do Supabase (`insertFuelLog`/`insertTripEvent` z `packages/api`); brak sieci/sesji → wpis czeka w kolejce i synchronizuje się przy następnym wejściu na ekran.
  - **Realny wybór pojazdu** — hook [useFleet](apps/mobile/lib/useFleet.ts) (`getActiveMembership` + `listVehicles`) + komponent [VehiclePicker](apps/mobile/components/VehiclePicker.tsx); koniec z `DEMO_VEHICLE`.
  - **Wspólny formularz cieczy** [LiquidForm](apps/mobile/components/LiquidForm.tsx) dla paliwa i AdBlue (ta sama walidacja `fuelLogSchema`); [trasa](apps/mobile/app/trip.tsx) z akcjami i wagą. Każdy ekran pokazuje status ostatnich wpisów (⏳ w kolejce / ✅ zsynchronizowane / ⚠️ błąd).
  - **Bezpieczeństwo:** zapisy idą przez tę samą warstwę `packages/api` co web — RLS (kierowca pisze do swojej firmy) działa identycznie.
  - **Bramki:** biome czysto · `tsc` (mobile) ✓ · 158 testów rdzenia bez zmian. Mobile weryfikowane typecheckiem (urządzenie/symulator poza tym środowiskiem).

## [1.13.0] — 📱 Aplikacja mobilna: logowanie + sesja (fundament iOS/Android)

- `[#154]` 📱 **Start budowy realnej aplikacji mobilnej** (Expo) — dotąd `apps/mobile` miał tylko offline'owe formularze bez backendu; teraz to uwierzytelniona aplikacja na bazie współdzielonych pakietów:
  - **Klient Supabase RN** — [packages/api](packages/api/src/client.ts) `createSupabaseMobileClient(storage)` (sesja w AsyncStorage, `autoRefreshToken`, bez detekcji sesji w URL). Warstwa danych pozostaje niezależna od platformy (te same funkcje co web).
  - **Mobile** ([apps/mobile](apps/mobile)): `lib/supabase.ts` (leniwy klient + `react-native-url-polyfill` + AsyncStorage), `components/AuthProvider.tsx` (kontekst sesji + `onAuthStateChange`), [ekran logowania](apps/mobile/app/login.tsx) (e-mail/hasło), **bramka tras** w [_layout](apps/mobile/app/_layout.tsx) (bez sesji → `/login`, z sesją → pulpit), pulpit pokazuje zalogowany e-mail + „Wyloguj".
  - **Konfiguracja:** `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` ([apps/mobile/.env.example](apps/mobile/.env.example)); brak konfiguracji → czytelny komunikat zamiast crasha. Wersje `apps/mobile` i `app.json` zrównane do **1.13.0**.
  - **macOS:** obsługiwany przez responsywną aplikację web (PWA-ready); natywny wrapper desktop to osobny, późniejszy krok. Ten increment to fundament **iOS/Android** (Expo).
  - **Następne kroki:** wpięcie formularzy paliwo/AdBlue/trasa do zapisu w Supabase (offline outbox), „Moje zlecenia" mobilnie, push.
  - **Bramki:** biome czysto · `tsc` ×3 (mobile/api/web) · 158 testów (bez regresji) · web build ✓. Mobile weryfikowane typecheckiem (uruchomienie na urządzeniu/symulatorze poza tym środowiskiem).

## [1.12.0] — 🚦 Ruch na żywo: utrudnienia ze zgłoszeń (1) + HERE Traffic (2)

- `[#153]` 🚦 **Ruch i utrudnienia na mapie** (zgłoszone — zrobione obie wersje: darmowa + płatna):
  - **Wersja 1 — utrudnienia na trasie ze zgłoszeń (darmowa):** [maps/disruptions.ts](packages/maps/src/disruptions.ts) `pointToRouteKm` + `itemsNearRoute` (czyste; 4 testy) wykrywają zgłoszenia społeczności (korki/wypadki/zamknięcia) **≤ 5 km od wyznaczonej trasy**. Panel „🚧 Utrudnienia na trasie" na [mapie](apps/web/app/(app)/map/page.tsx) listuje je z rodzajem i odległością; aktualizacja po wyznaczeniu trasy i realtime przy nowych zgłoszeniach. Zero kosztów (reużywa `map_reports`).
  - **Wersja 2 — HERE Traffic (płatna, łagodna degradacja):** [maps/heretraffic.ts](packages/maps/src/heretraffic.ts) `buildHereTrafficUrl`/`parseHereTraffic`/`jamSeverity` (4 testy) + trasa serwerowa [/api/traffic](apps/web/app/api/traffic/route.ts) (klucz `HERE_API_KEY` tylko serwerowo; brak klucza → `501`, plan bez Traffic/błąd → `{unavailable}`; ograniczenie wielkości bbox). Na mapie przełącznik **„🚦 Ruch na żywo (HERE)"** rysuje kolorowe odcinki wg natężenia (zielony→żółty→pomarańczowy→czerwony), odświeżane przy przesuwaniu mapy; legenda + komunikat, gdy ruch niedostępny.
  - **Bramki:** biome czysto · `tsc` ×3 · **33 testy map** (8 nowych) · build ✓ (`/map`, `/api/traffic`).

## [1.11.0] — 📌 Zapisane miejsca (POI) + delta trasy po dodaniu punktu

- `[#152]` 📌 **Ulubione punkty floty na mapie** (zgłoszone: zapisywać stacje/porty/odprawy/firmy → klik dodaje do trasy + info ile krótsza/dłuższa/tańsza/droższa):
  - **[Migracja 0045](supabase/migrations/0045_saved_places.sql)** (na prod): tabela `saved_places` (`name`, `category`, `lat`, `lng`, `created_by` `default auth.uid()`) — **współdzielona w firmie** (zastępuje lokalny `localStorage`, per-urządzenie). RLS: członek czyta i dodaje; kasowanie — autor lub owner/dispatcher. `audit:rls` ✓ (35 tabel, `saved_places` RLS + 3 polityki).
  - **Rdzeń** [core/savedPlaces.ts](packages/core/src/savedPlaces.ts): kategorie (stacja/port/odprawa/firma/parking/inne) + etykiety; **`routeDelta(before, after)`** — różnica dystans/czas/myto + flagi `longer`/`negligible`. 5 testów (123 łącznie).
  - **api** [data/savedPlaces.ts](packages/api/src/data/savedPlaces.ts): `listSavedPlaces`, `insertSavedPlace`, `deleteSavedPlace`. Typy DB przegenerowane (35 tabel).
  - **Mapa** ([map](apps/web/app/(app)/map/page.tsx)): zapisane miejsca z bazy (ikona kategorii), wybór kategorii przy „⭐ Zapisz start"; klik **„➕ do trasy"** wstawia punkt przed celem i — gdy trasa jest już wyznaczona — **przelicza i pokazuje deltę** („Dodano „X": dłuższa o 45 km, dłużej o 38 min, drożej o 12 € myta").
  - **Bramki:** biome czysto · `tsc` ×3 · 123 testy · build ✓ (`/map`) · `audit:rls` ✓.

## [1.10.0] — 📸 Zdjęcia towaru przy zleceniu (dowód zabezpieczenia)

- `[#151]` 📸 **Dobrowolne zdjęcia ładunku** (zgłoszone: dowód, że towar był zabezpieczony):
  - **[Migracja 0044](supabase/migrations/0044_order_photos.sql)** (na prod): tabela `order_photos` (`order_id`, `path`, `mime`, `size_bytes`, `caption`, `uploaded_by` `default auth.uid()`) + **prywatny bucket `cargo-photos`** (ścieżka `{company_id}/{order_id}/{uuid}`). RLS: członek czyta; **upload — każdy aktywny członek** (kierowca dokumentuje ładunek); kasowanie — owner/dispatcher (integralność dowodu). `audit:rls` ✓ (34 tabele, `order_photos` RLS + 3 polityki).
  - **api** [data/orderPhotos.ts](packages/api/src/data/orderPhotos.ts): `listOrderPhotos`, `uploadOrderPhoto` (rollback Storage przy błędzie), `getOrderPhotoUrl` (podpisany URL — bucket prywatny), `deleteOrderPhoto`. Typy DB przegenerowane (34 tabele).
  - **Komponent** [CargoPhotos](apps/web/components/CargoPhotos.tsx): miniatury (podpisane URL-e), upload z aparatu (`capture="environment"`, wiele plików), usuwanie dla owner/dispatcher. Samodzielny (firma/rola z membership).
  - **Wpięcie:** karta zlecenia kierowcy ([my-orders](apps/web/app/(app)/my-orders/page.tsx)) — robi zdjęcie przy załadunku; lista zleceń dyspozytora ([orders](apps/web/app/(app)/orders/page.tsx)) — podgląd/zarządzanie.
  - **Bramki:** biome czysto · `tsc` ×2 · 118 testów · build ✓ (`/my-orders`, `/orders`) · `audit:rls` ✓.

## [1.9.0] — 💰 Koszty pojazdu → dokładny zysk floty (P&L)

- `[#150]` 💰 **Pełny rachunek zysków i strat** (zgłoszone: dodać koszty napraw/leasingu/ubezpieczenia → dokładny przychód/dochód/zysk):
  - **[Migracja 0043](supabase/migrations/0043_vehicle_costs.sql)** (na prod): tabela `vehicle_costs` — koszty pojazdu inne niż paliwo (`category`: naprawa/leasing/ubezpieczenie/podatek/mandat/parking/opony/inne, `amount`, `currency`, `cost_date`, `description`). RLS: członek czyta, owner/dispatcher zarządza — `audit:rls` ✓ (33 tabele).
  - **Rdzeń** [core/vehicleCosts.ts](packages/core/src/vehicleCosts.ts): kategorie + etykiety, `sumCostsByCategory`, `sumCostsByVehicle`, **`fleetPnl`** (przychód − paliwo − pozostałe = zysk + marża). Schema Zod `vehicleCostSchema`. 6 testów (118 łącznie).
  - **api** [data/vehicleCosts.ts](packages/api/src/data/vehicleCosts.ts): `listVehicleCosts` (filtr pojazd/data), `insertVehicleCost`, `deleteVehicleCost`. Typy DB przegenerowane (33 tabele).
  - **Karta pojazdu** ([vehicles/[id]](apps/web/app/(app)/vehicles/[id]/page.tsx)): sekcja „Koszty" — dodawanie/usuwanie (kategoria, kwota, data, opis), suma i rozbicie na kategorie. Owner/dispatcher.
  - **Statystyki** ([stats](apps/web/app/(app)/stats/page.tsx)): kafelek **„Rachunek zysków i strat (P&L)"** (przychód · paliwo · pozostałe koszty · zysk netto · marża) + rozbicie kategorii. Koszty pozostałe **wliczone do rentowności klientów i trendu** (atrybucja proporcjonalna jak paliwo). Pozycje w walutach ≠ EUR pomijane w sumach.
  - **Bramki:** biome czysto · `tsc` ×3 · 118 testów · build ✓ (`/stats`, `/vehicles/[id]`) · `audit:rls` ✓.

## [1.8.2] — 🃏 Karty paliwowe: ważność jako mies./rok (bez dnia)

- `[#149]` 🃏 **Ważność karty = MM/RRRR** (zgłoszone) — na kartach flotowych data ważności jest tylko miesiąc/rok, więc pole z pełną datą myliło:
  - **Rdzeń** [core/cardExpiry.ts](packages/core/src/cardExpiry.ts): `monthInputToDate` (MM/RRRR → ostatni dzień miesiąca, np. `2026-03` → `2026-03-31`), `dateToMonthInput`, `formatCardExpiry` (→ `03/2026`). 6 testów (m.in. luty przestępny). Bez migracji — kolumna `valid_until date` zostaje, normalizujemy do **końca miesiąca** (karta ważna do końca tego miesiąca).
  - **Formularz kart** ([cards](apps/web/app/(app)/cards/page.tsx)): `<input type="date">` → `type="month"`; etykieta „Ważna do (mies./rok)".
  - **Wyświetlanie**: lista kart, [CardArt](apps/web/components/CardArt.tsx) (grafika karty) i [karta pojazdu](apps/web/app/(app)/vehicles/[id]/page.tsx) pokazują `MM/RRRR` zamiast pełnej daty.
  - **Bramki:** biome czysto · `tsc` ×2 · 112 testów · build ✓ (`/cards`).

## [1.8.1] — 🐛 Mapa: czytelne dymki (koniec „białego tła")

- `[#148]` 🐛 **Fix: białe, nieczytelne dymki pinezek** (zgłoszone) — kliknięcie pinezki/POI pokazywało biały prostokąt bez widocznej treści (nazwa, typ, GPS, „Nawiguj", „Dodaj jako przystanek"):
  - **Przyczyna:** domyślny dymek MapLibre ma **białe tło**, a strona dziedziczy jasny tekst (`#f5f5f5`) → biały tekst na białym tle = nic nie widać.
  - **Rozwiązanie:** motyw dymków dopasowany do aplikacji (ciemne tło `#141414`, jasny tekst, czerwone akcenty, strzałka i przycisk zamknięcia) — [globals.css](apps/web/app/globals.css). Przycisk „➕ Dodaj jako przystanek" w stylu czerwieni, `<code>` GPS z ramką. Czysto CSS — bez zmian logiki mapy.
  - **Bramki:** biome czysto · build ✓ (`/map`).

## [1.8.0] — 📇 Rejestr kontrahentów (etap 2: zlecenia + zarządzanie)

- `[#147]` 📇 **Domknięcie rejestru kontrahentów** — brakujące połowy [#144] (autouzupełnianie i strona CRUD):
  - **Zlecenia** ([orders](apps/web/app/(app)/orders/page.tsx)): pola „Nadawca" i „Odbiorca" z podpowiedziami (`<datalist>`) z rejestru firmy; zapis zlecenia **dopisuje nowe nazwy do rejestru** (rośnie organicznie, best-effort — bez blokowania zapisu). Wczytywanie kontrahentów tylko dla owner/dispatcher.
  - **Strona zarządzania** [/contractors](apps/web/app/(app)/contractors/page.tsx) — lista + dodawanie/edycja/usuwanie (nazwa/NIP/adres/kraj), eksport CSV, dostęp owner/dispatcher. Wpis w nawigacji (sekcja Finanse) + klucz i18n `nav.contractors` (PL/EN, parytet ✓).
  - **api** [data/contractors.ts](packages/api/src/data/contractors.ts): dodane `updateContractor(id, input)` (edycja po id, w tym zmiana nazwy). Reużyte `listContractors`/`upsertContractor`/`deleteContractor` z [#144]; tabela `contractors` i RLS bez zmian.
  - **Bramki:** biome czysto · `tsc` ×3 · 133 testy · build ✓ (`/contractors`, `/orders`).

## [1.7.1] — 🗺️ Mapa: czytelny czas (d/h/min) + realniejszy czas TIR i myto

- `[#146]` 🗺️ **Poprawki wyceny trasy** (zgłoszone: zły czas i zawyżone myto):
  - **Czas w d/h/min** — [core/duration.ts](packages/core/src/duration.ts) `formatDuration` (np. `1 d 9 h 30 min` zamiast `1990 min`); wpięte w panel trasy na [mapie](apps/web/app/(app)/map/page.tsx).
  - **Realny czas TIR** — [estimateTruckDurationMin](packages/maps/src/toll.ts) (średnia 68 km/h: limiter 90 + postoje/ruch/granice). [/api/route](apps/web/app/api/route/route.ts) używa go, gdy dostawca nie liczy trasy TIR (mock lub GraphHopper na profilu „car" — profil truck wymaga planu płatnego); czas oznaczony „(szac.)".
  - **Niższe, uczciwsze myto** — [estimateTollEur](packages/maps/src/toll.ts): myto liczone tylko od **~60% dystansu** (nie cała trasa jest płatna: miasta, drogi krajowe, kraje bez myta), zamiast 100%. Korekta zawyżenia; wynik dalej oznaczony „(szac.)".
  - Etykieta „Czas" → „Czas jazdy". 6 nowych testów rdzenia/map (133 łącznie).
  - **Bramki:** biome czysto · `tsc` ×7 · 133 testy · build ✓ (`/map`, `/api/route`).

## [1.7.0] — 📤 Integracja z Fakturownią: eksport faktury VAT

- `[#145]` 📤 **Eksport faktury do Fakturowni** (legalna faktura VAT + numeracja + PDF) — nasza faktura jest „uproszczona"; Fakturownia daje dokument urzędowy:
  - **Mapper rdzenia** [core/fakturownia.ts](packages/core/src/fakturownia.ts) `toFakturowniaInvoice` — faktura E-Logistic → ładunek `POST /invoices.json` (`kind:"vat"`, sprzedawca z NIP/bankiem, nabywca z NIP/adresem, pozycje `total_price_gross`+`tax`, waluta, `payment_to`). Czysty, 4 testy.
  - **Trasa serwerowa** [/api/fakturownia/export](apps/web/app/api/fakturownia/export/route.ts) — token i subdomena **wyłącznie po stronie serwera** (`FAKTUROWNIA_API_TOKEN`/`FAKTUROWNIA_DOMAIN`); autoryzacja sesją + owner/dispatcher; faktura tylko z własnej firmy (RLS). Zwraca **publiczny link do PDF** (token udostępniania — bez ujawniania `api_token`). Bez kluczy → `501` + łagodna degradacja.
  - **UI:** przycisk „📤 Fakturownia" w dokumencie faktury (owner/dispatcher, faktura niezanulowana).
  - **Wzorzec:** sekret w env jak GraphHopper (`/api/route`); [.env.example](.env.example) + [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) zaktualizowane.
  - **Bramki:** biome czysto · `tsc` ×7 · 128 testów · build ✓ (`/api/fakturownia/export`, `/invoices`).

## [1.6.0] — 📇 Rejestr kontrahentów (etap 1: autouzupełnianie nabywcy na fakturze)

- `[#144]` 📇 **Kontrahenci zamiast wolnego tekstu** — fundament rejestru + headline autouzupełnianie:
  - **[Migracja 0042](supabase/migrations/0042_contractors.sql)** (na prod): tabela `contractors` (`name`/`tax_id`/`address`/`country`) per firma, unikalność `(company_id, name)` pod upsert, RLS (członek czyta, owner/dispatcher zarządza) — `pnpm audit:rls` ✓.
  - **api** [data/contractors.ts](packages/api/src/data/contractors.ts): `listContractors`, `upsertContractor` (onConflict (company_id, name)), `deleteContractor`. Typy DB przegenerowane (32 tabele).
  - **Faktury** ([invoices](apps/web/app/(app)/invoices/page.tsx)): pole „Nabywca" z podpowiedziami (`<datalist>`) z rejestru; wybór znanego kontrahenta **auto-uzupełnia NIP i adres**. Wystawienie faktury **dopisuje nabywcę do rejestru** (rośnie organicznie).
  - **Etap 2 (kolejny increment):** autouzupełnianie nadawcy/odbiorcy na zleceniach + strona zarządzania kontrahentami (edycja/usuwanie).
  - **Bramki:** biome czysto · `tsc` ×7 · 124 testy · build ✓ (`/invoices`) · `audit:rls` ✓.

## [1.5.0] — 🧾 Faktura: formatowanie kwot + podsumowanie VAT (dopracowanie wydruku/PDF)

- `[#143]` 🧾 **Dokument faktury bliżej standardu** (druk/PDF działał już przez `window.print` — teraz wygląda poprawnie):
  - **Formatowanie kwot** — [core/money.ts](packages/core/src/money.ts) `formatMoney(value, currency?)`: 2 miejsca, spacja jako separator tysięcy, przecinek dziesiętny (`1 234,50 EUR`). Zastosowane do wszystkich kwot na [fakturze](apps/web/app/(app)/invoices/page.tsx) (pozycje, sumy) — koniec surowych `1234.5`.
  - **Podsumowanie VAT wg stawek** — [core/invoice.ts](packages/core/src/invoice.ts) `vatSummary(items)` grupuje pozycje po stawce (netto/VAT/brutto), sortuje malejąco; tabela „Podsumowanie VAT" pod pozycjami (wymagane na fakturze przy wielu stawkach).
  - 7 nowych testów rdzenia (`formatMoney`, `round2`, `vatSummary`) — łącznie 124.
  - **Bramki:** biome czysto · `tsc` ×7 · 124 testy · build ✓ (`/invoices`).

## [1.4.4] — ⚙️ Ujednolicenie `engines.node` → >=26 (P3 z audytu)

- `[#142]` ⚙️ **`engines.node`: `>=22` → `>=26`** ([package.json](package.json)) — realizacja #6 z [backlogu poaudytowego](docs/AUDIT-2026-06-22.md). Spójność z resztą deklaracji (CLAUDE.md „Node 26", README badge, `@types/node` 26, CI `setup-node` 26). Środowisko lokalne i CI już na Node 26 — zmiana wyłącznie porządkowa.
  - **Domyka backlog poaudytowy** (P0/P1/P2/P3): ✅ wydajność · ✅ docs · ✅ indeks+hardening · ✅ rozbicie stats · ✅ engines. Pozostaje świadomie odłożone: rozbicie `map/page.tsx` (ryzyko bez testu wizualnego) i presety stylów w `@e-logistic/ui`.
  - **Bramki:** biome czysto · `tsc` ×7 · 117 testów (zmiana konfiguracji, bez wpływu na kod).

## [1.4.3] — 🧹 Rozbicie strony statystyk na moduły (P2 jakość z audytu)

- `[#141]` 🧹 **Dekompozycja `stats/page.tsx`** — realizacja #5 z [backlogu poaudytowego](docs/AUDIT-2026-06-22.md). Najdłuższa strona analityczna (876 linii) rozbita na skupione moduły współlokowane w trasie `(app)/stats/`:
  - [shared.tsx](apps/web/app/(app)/stats/shared.tsx) — wspólne typy (`FuelRaw`/`TripRaw`), helpery (`entry`, `monthlyCost`), prymitywy (`FleetStat`, `Stat`) i obiekt `styles`.
  - [ProfitabilitySection.tsx](apps/web/app/(app)/stats/ProfitabilitySection.tsx), [VehicleDetail.tsx](apps/web/app/(app)/stats/VehicleDetail.tsx) (+ `FuelBlock`), [AlertsBanner.tsx](apps/web/app/(app)/stats/AlertsBanner.tsx).
  - [page.tsx](apps/web/app/(app)/stats/page.tsx): **876 → 337 linii**; każdy moduł poniżej progu ~400 z audytu.
  - **Czysty refaktor** — przeniesienie kodu bez zmiany logiki, zweryfikowane `tsc` + `next build` (zachowanie identyczne).
  - Pozostaje w backlogu: rozbicie `map/page.tsx` (1380 l., wymaga ostrożnej, ręcznie testowanej refaktoryzacji) oraz wspólne presety stylów w `@e-logistic/ui`.
  - **Bramki:** biome czysto (0 ostrzeżeń) · `tsc` ×7 · 117 testów · build ✓ (`/stats`).

## [1.4.2] — 🗂️ Indeks faktura↔zlecenie + utwardzenie statusu zlecenia (P2 z audytu)

- `[#140]` 🗂️ **Migracja [0041](supabase/migrations/0041_invoice_order_idx_and_status_guard.sql)** (na prod) — realizacja #3 z [backlogu poaudytowego](docs/AUDIT-2026-06-22.md):
  - **Indeks `invoices(order_id)`** — RPC łączą faktury po `order_id` (dotąd tylko `invoices_company_idx`); koniec seq scan przy dużej liczbie faktur.
  - **Utwardzenie `order_set_status`** — przypisany kierowca może ustawić **tylko statusy w przód** (`in_progress`/`delivered`); usunięto możliwość cofnięcia na `assigned`. UI kierowcy (`/my-orders`) i tak oferuje wyłącznie „W trakcie"/„Dostarczone" — bez zmiany UX, samo domknięcie po stronie serwera. Funkcja pozostaje `SECURITY DEFINER` z `search_path`; zmiana audytowana.
  - **Weryfikacja:** indeks obecny ✓, guard zaktualizowany ✓, `pnpm audit:rls` ✓.
  - **Bramki:** biome czysto · `tsc` ×7 · 117 testów (bez zmian w kodzie — migracja SQL).

## [1.4.1] — 📚 Aktualizacja docs do v1.4.0 (P0 z audytu)

- `[#139]` 📚 **Dokumentacja zgodna z kodem** — realizacja #2 z [backlogu poaudytowego](docs/AUDIT-2026-06-22.md) (jedyna ocena „D"):
  - [docs/DATA-MODEL.md](docs/DATA-MODEL.md): nagłówek v0.51 → **v1.4.0 (migracje 0001–0040)**; nowa sekcja **0.1** opisująca moduły dodane po v0.51 (`service_tasks`, `orders` + `assigned_to`, `invoices` + status/płatność/bank, `invoice_items`, `documents`/sejf, rozszerzenia `companies`/`drivers`, RPC); diagram encji uzupełniony o zlecenia/faktury/pozycje/dokumenty/serwis; nota o analityce bez tabel (rentowność/alerty w core).
  - [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): nagłówek → v1.4.0; sekcja „Stan implementacji" rozszerzona o **moduły biznesowe v1.0–1.4**; sprostowane „i18n ×14" → **PL/EN (docelowo ×14)** (3 miejsca); rozstrzygnięte decyzje otwarte #4 (PIN) i #5 (i18n).
  - **Bramki:** biome czysto · `tsc` ×7 · 117 testów (bez zmian w kodzie — aktualizacja dokumentacji).

## [1.4.0] — 🚀 Okno czasu na stronach analitycznych (P1 z audytu)

- `[#138]` 🚀 **Koniec pobierania całych tabel firmy klient‑side** — realizacja #1 z [backlogu poaudytowego](docs/AUDIT-2026-06-22.md):
  - **api**: `listOrders`/`listInvoices` przyjmują teraz `{ from?, to?, limit? }` (filtr po `created_at`) — analogicznie do `listFuelLogs`/`listTripEvents` ([orders.ts](packages/api/src/data/orders.ts), [invoices.ts](packages/api/src/data/invoices.ts)). Wstecznie zgodne (bez opcji = jak dotąd).
  - **Zestawienie miesięczne** ([monthly](apps/web/app/(app)/monthly/page.tsx)): ładuje **tylko okno 6 miesięcy** kończące na wybranym (zamiast `limit: 5000` ×2 + całej historii zleceń) i **przeładowuje przy zmianie miesiąca**. ~10k wierszy → ≤6 mies.
  - **Statystyki** ([stats](apps/web/app/(app)/stats/page.tsx)): okno **ostatnich 24 miesięcy** (pokrywa trend 6 mies., alerty m/m i wykresy) z limitem bezpieczeństwa, zamiast arbitralnego `limit: 2000`. Podtytuł jasno informuje o oknie.
  - **Bramki:** biome czysto · `tsc` ×7 · 117 testów · build ✓ (`/monthly`, `/stats`).

## [1.3.1] — 🔍 Drugi audyt całościowy (v1.3.0) + 0 ostrzeżeń Biome

- `[#137]` 🔍 **Pełny audyt po ~90 wydaniach** ([docs/AUDIT-2026-06-22.md](docs/AUDIT-2026-06-22.md)) — 4 równoległe analizy + bramki deterministyczne. Werdykt: kod dojrzały i bezpieczny (brak P0/P1), główne ryzyka to wydajność stron analitycznych (listy bez okna czasu) i zamrożona `docs/`. Raport zawiera priorytetyzowany backlog poaudytowy.
  - **Bezpieczeństwo A−** (RLS gate ✓, PII/PIN szyfrowane, brak sekretów) · **Jakość A−** (0 TODO, 0 `as any`) · **Wydajność C+** · **Docs D** (DATA-MODEL/ARCHITECTURE zamrożone).
- 🧹 **Biome → 0 ostrzeżeń**: optional chain w [DriverActiveOrder](apps/web/components/DriverActiveOrder.tsx) + udokumentowany `biome-ignore` dla zapisu ciasteczka języka w [LocaleSwitcher](apps/web/components/LocaleSwitcher.tsx).
- **Bramki:** biome czysto (0 ostrzeżeń) · `tsc` ×7 · 117 testów · `audit:rls` ✓.

## [1.3.0] — 🔔 Alerty progowe floty (marża / spalanie / koszt paliwa)

- `[#136]` 🔔 **Sygnały „coś wymaga reakcji"** na ekranie statystyk (zarząd), liczone z danych już załadowanych — bez nowej infrastruktury:
  - [core/alerts.ts](packages/core/src/alerts.ts): `fleetAlerts(input)` — czyste reguły progowe nad policzonymi agregatami: **ujemna marża** klienta (krytyczne), **niska marża** poniżej progu (domyślnie 5%), **anomalie spalania** pojazdu (z `detectFuelAnomalies`), **skok kosztu paliwa m/m** powyżej progu (domyślnie 30%). Progi konfigurowalne; sort: krytyczne → ostrzeżenia.
  - **UI** ([stats](apps/web/app/(app)/stats/page.tsx)): baner „🔔 Alerty" nad pulpitem floty (owner/dispatcher) — kropka severity, rodzaj, cel (klient/pojazd/miesiąc), wartość. Reużywa policzonej rentowności, anomalii i miesięcznych kosztów paliwa.
  - 9 testów rdzenia (progi, pomijanie, sortowanie) — łącznie 117. +5 kluczy i18n (`alerts.*`).
  - Świadomie: alerty „przeglądowe" w aplikacji (nie push) — generowanie powiadomień push wymaga osobnej infrastruktury serwerowej (kolejny krok).
  - **Bramki:** biome czysto · `tsc` ×7 · 117 testów (parytet i18n ✓) · build ✓ (`/stats`).

## [1.2.0] — 📈 Trend rentowności klienta w czasie

- `[#135]` 📈 **Zysk/marża nadawcy miesiąc po miesiącu** — rozszerzenie rentowności klientów ([#126]) o wymiar czasowy:
  - [core/profitability.ts](packages/core/src/profitability.ts): `clientProfitTrend(client, orders, vehicleCosts, months)` — dla każdego miesiąca uruchamia model atrybucji na danych z tego miesiąca (koszt paliwa pojazdu dzielony na jego zlecenia proporcjonalnie do przychodu) i zwraca punkt (przychód/koszt/zysk/marża) wskazanego klienta; miesiące bez aktywności = punkt zerowy (seria bez dziur).
  - **UI** ([stats](apps/web/app/(app)/stats/page.tsx)): w sekcji rentowności selektor klienta + tabela ostatnich 6 miesięcy (miesiąc · przychód · koszt · zysk · marża, kolor wg znaku). Zlecenia bucketowane wg daty załadunku (fallback: utworzenia), koszty paliwa wg daty wpisu.
  - 3 nowe testy rdzenia (punkt/miesiąc, miesiące bez aktywności, izolacja klienta) — łącznie 108 testów. +2 klucze i18n (`profit.trend.title`, `profit.col.month`).
  - **Bramki:** biome czysto · `tsc` ×7 · 108 testów (parytet i18n ✓) · build ✓ (`/stats`).

## [1.1.1] — 📊 Dwujęzyczne nagłówki eksportów finansowych (CSV)

- `[#134]` 📊 **Eksporty wysyłane na zewnątrz po PL/EN** — nagłówki CSV przez `t()` tam, gdzie język ma realne znaczenie:
  - **Faktury** ([invoices](apps/web/app/(app)/invoices/page.tsx)): numer, data, nabywca, NIP, netto, VAT, brutto, waluta (eksport dla zagranicznego nabywcy).
  - **Zestawienie miesięczne** ([monthly](apps/web/app/(app)/monthly/page.tsx)): pojazd, przychód, paliwo, AdBlue, wynik + wiersz „RAZEM" (eksport dla księgowości).
  - +12 kluczy (`invoices.csv.*`, `monthly.csv.*`, `common.date/total`), z dużym reużyciem istniejących (`common.vehicle`, `orders.csv.currency`). Parytet i18n wymuszony typem i testem.
  - Świadomie poza zakresem: eksporty wewnętrzne (rozliczenia per pojazd, pojazdy, dokumenty, usterki, kierowcy) — dane operacyjne dla floty PL, niski zysk z tłumaczenia.
  - **Bramki:** biome czysto · `tsc` ×7 · 105 testów (parytet i18n ✓) · build ✓ (`/invoices`, `/monthly`).

## [1.1.0] — 🧾 Eksport rentowności klientów do CSV (+ sekcja dwujęzyczna)

- `[#133]` 🧾 **CSV dla rentowności klientów** ([stats](apps/web/app/(app)/stats/page.tsx)): przycisk „⬇️ CSV" w sekcji rentowności (owner/dispatcher) — eksport per nadawca (klient, zlecenia, przychód, koszt, zysk, marża) przez wspólny [downloadCsv](apps/web/lib/csv.ts) (BOM UTF-8, Excel-friendly), spójny z resztą eksportów. Domyka [#126].
- Przy okazji **sekcja rentowności w pełni dwujęzyczna** (była zaszyta po polsku): tytuł, totale, nagłówki tabeli, nota o modelu i przybliżeniach — przez `useT()` + 16 kluczy `profit.*`. Parytet i18n wymuszony typem i testem.
- **Bramki:** biome czysto · `tsc` ×7 · 105 testów (parytet i18n ✓) · build ✓ (`/stats`).

## [1.0.0] — 🏁 Kamień milowy: pierwsza pełna wersja

- `[#132]` 🏁 **E-Logistic 1.0.0** — domknięcie spójnej, kompletnej wersji platformy dla kierowców, spedytorów i firm transportowych. Wydanie zamykające serię: flota, formularze offline-first, mapa TIR, statystyki, rozliczenia, **faktury** (numeracja bez luk, status, płatność, bank/IBAN, pozycje), **zlecenia** (przypisania, statusy, CMR), **rentowność klientów**, **sejf dokumentów**, role/RLS, powiadomienia, **dwujęzyczność PL/EN całego UI widokowego**.
  - **Audyt domknięcia (deterministyczny):** biome czysto · `tsc` ×7 (exit 0) · 105 testów (w tym parytet i18n) · `next build` ✓ · **`pnpm audit:rls` ✓** (izolacja multi-tenant spójna: 31/31 tabel firmowych, wszystkie funkcje `SECURITY DEFINER` z `search_path`).
  - **Smoke produkcyjny:** kluczowe trasy odpowiadają poprawnie (publiczne `200`, chronione `307`).
  - **Bezpieczeństwo:** RLS multi-tenant + szyfrowanie PII/PIN (Vault/pgcrypto, odczyt audytowany) + bramka RLS w CI + gitleaks/CodeQL.
  - **Dokumentacja:** README (badge wersji `1.0.0`, status „produkcja”) i CHANGELOG zsynchronizowane.
  - Świadomie poza 1.0.0 (dalszy rozwój): tłumaczenie etykiet w formularzach CRUD i nagłówków pozostałych eksportów CSV; profil truck w routingu (płatny tier GraphHopper); aplikacja mobilna (Expo) — szkielet.

## [0.101.0] — 🌍 i18n etap 5 (historia formularzy + eksport CSV zleceń)

- `[#131]` 🌍 **Ostatnia w pełni polska strona widokowa + dwujęzyczny eksport zleceń**:
  - **Historia formularzy** ([forms/history](apps/web/app/(app)/forms/history/page.tsx)) zmigrowana z `createTranslator("pl")` na `useT()` i przełożona w całości: nagłówek/źródło, filtry rodzaju i pojazdu, statusy synchronizacji (reuse `sync.*`), akcje trasy (`tripActionLabel`), przyciski (edytuj/ponów/usuń), nagłówki CSV.
  - **Eksport CSV zleceń** ([orders](apps/web/app/(app)/orders/page.tsx)): nagłówki i wartość statusu idą teraz przez `t()` (dotąd zaszyte po polsku) — domyka pozycję odkładaną od etapu 3.
  - +26 kluczy (`history.*`, `orders.csv.*`, wspólne `common.retry/status/vehicle`); parytet wymuszony typem i testem.
  - **Cały UI widokowy jest dwujęzyczny.** Pozostają jedynie nagłówki CSV w pozostałych eksportach (faktury/rozliczenia/pojazdy/usterki itd.) oraz pełne tłumaczenie etykiet w formularzach CRUD — naturalny dalszy, większy zakres.
  - **Bramki:** biome czysto · `tsc` ×7 · 105 testów (parytet i18n ✓) · build ✓ (`/forms/history`, `/orders`).

## [0.100.0] — 🌍 i18n etap 4 (ustawienia + stan floty)

- `[#130]` 🌍 **Strona ustawień w pełni dwujęzyczna** + dokończenie etykiet floty:
  - **Ustawienia** ([settings](apps/web/app/(app)/settings/page.tsx)) zmigrowane z `createTranslator("pl")` na `useT()` i przełożone w całości: dane firmy (nazwa/NIP/adres/kraj/VAT/termin/bank/IBAN), 2FA (włącz/wyłącz, instrukcja QR, statusy, komunikaty), passkeye (opis, prompt nazwy, komunikaty). ~35 nowych kluczy `settings.*` + wspólne `common.active/disabled/loading/saving/error`.
  - **Stan floty** ([fleet-status](apps/web/app/(app)/fleet-status/page.tsx)): etykiety `FleetVehicleState` (w trasie / zaplanowane / wolny) przez `fleet.state.*` — domyka stronę zaczętą w etapie 3.
  - +43 klucze w PL i EN; parytet wymuszony typem (`Record<MessageKey>`) i testem. Pozostałość (nagłówki eksportu CSV, `forms/history`) — ostatni drobny etap.
  - **Bramki:** biome czysto · `tsc` ×7 · 105 testów (parytet i18n ✓) · build ✓ (`/settings`).

## [0.99.0] — 🌍 i18n etap 3 (etykiety enumów: statusy zleceń + akcje trasy)

- `[#129]` 🌍 **Statusy i akcje po angielsku wszędzie** — najczęstsze etykiety (badge'e, listy, wyszukiwarka) były zaszyte po polsku nawet w trybie EN; teraz idą przez i18n:
  - **Wspólny helper** [lib/labels.ts](apps/web/lib/labels.ts): `orderStatusLabel(t, status)` (klucze `order.status.*`) i `tripActionLabel(t, action)` (`trip.action.*`, z fallbackiem dla nieznanych wartości z DB).
  - **Statusy zleceń** zlokalizowane w 6 miejscach: [orders](apps/web/app/(app)/orders/page.tsx) (badge, filtr, select), [my-orders](apps/web/app/(app)/my-orders/page.tsx), [DriverActiveOrder](apps/web/components/DriverActiveOrder.tsx), [GlobalSearch](apps/web/components/GlobalSearch.tsx), [drivers/[id]](apps/web/app/(app)/drivers/[id]/page.tsx), [vehicles/[id]](apps/web/app/(app)/vehicles/[id]/page.tsx).
  - **Akcje trasy** w [stats](apps/web/app/(app)/stats/page.tsx) (przy okazji migracja z `createTranslator("pl")` na `useT()`) i [fleet-status](apps/web/app/(app)/fleet-status/page.tsx).
  - +7 kluczy PL/EN (`order.status.*`, `common.all`); akcje korzystają z istniejących `trip.action.*`. Parytet wymuszony typem i testem.
  - Świadomie odłożone na kolejny etap: eksport CSV (nagłówki PL), strona ustawień, `forms/history`, etykiety stanu floty (`FleetVehicleState`).
  - **Bramki:** biome czysto · `tsc` ×7 · 105 testów (parytet i18n ✓) · build ✓.

## [0.98.0] — 🌍 i18n etap 2 (kontekst kliencki + powłoka + pulpit)

- `[#128]` 🌍 **Dwujęzyczność dla komponentów klienckich** — etap 1 dawał język serwerowo; teraz dowolny komponent kliencki tłumaczy bez własnego wrappera:
  - **[LocaleProvider](apps/web/components/LocaleProvider.tsx)** (kontekst + hooki `useT()`/`useLocale()`) zasilany językiem czytanym serwerowo w [layoucie](apps/web/app/(app)/layout.tsx) — bez migotania, reaguje na zmianę języka (`router.refresh`).
  - **Powłoka aplikacji** dwujęzyczna: [SignOutButton](apps/web/components/SignOutButton.tsx) i [GlobalSearch](apps/web/components/GlobalSearch.tsx) (przycisk, modal, placeholder, typy wyników: pojazd/kierowca/zlecenie/faktura) przez `useT()`.
  - **Pulpit** ([dashboard](apps/web/app/(app)/dashboard/page.tsx)) — nagłówek + kafelki (formularze/mapa/statystyki) serwerowo przez `t()`.
  - +27 kluczy w PL i EN (dashboard.\*, search.\*, common.noNumber); parytet wymuszony typem i testem. Kolejne moduły (ustawienia, formularze, widżety pulpitu, etykiety enumów) w następnych etapach.
  - **Bramki:** biome czysto · `tsc` ×7 · 105 testów (parytet i18n ✓) · build ✓ (`/dashboard`).

## [0.97.0] — 🌍 i18n etap 1 (przełącznik PL/EN + nawigacja + logowanie)

- `[#127]` 🌍 **Realne przełączanie języka** — fundament i18n istniał (katalogi PL/EN, parytet), ale aplikacja była zaszyta na PL (`createTranslator("pl")`). Teraz język wybiera użytkownik:
  - **Wzorzec (ciasteczko + RSC):** [lib/locale.ts](apps/web/lib/locale.ts) czyta język **serwerowo** z ciasteczka `locale` → komponenty serwerowe (nawigacja) renderują się od razu w wybranym języku, bez migotania. [LocaleSwitcher](apps/web/components/LocaleSwitcher.tsx) (PL/EN) zapisuje ciasteczko i `router.refresh()` — przeładowuje RSC bez pełnego reloadu.
  - **Nawigacja:** cały pasek ([layout](apps/web/app/(app)/layout.tsx)) przez `t()` — dołożone klucze nav (zlecenia, status floty, moje zlecenia, serwis, sejf, faktury, zestawienie, ceny diesla, zespół) + tytuły grup; przełącznik w stopce sidebara ([AppSidebar](apps/web/components/AppSidebar.tsx)).
  - **Moduł logowania:** [LoginForm](apps/web/components/LoginForm.tsx) (klient) dostaje język propsem z serwerowego [login/page.tsx](apps/web/app/login/page.tsx) (`getLocale`) — pełne PL/EN + przełącznik na karcie (zmiana języka przed zalogowaniem).
  - Parytet kluczy wymuszony typem (`Record<MessageKey>`) i testem; +14 kluczy w PL i EN. Kolejne moduły (pulpit, ustawienia, formularze) w następnych etapach.
  - **Bramki:** biome czysto · `tsc` ×7 · 105 testów (parytet i18n ✓) · build ✓ (`/login`, `/dashboard`).

## [0.96.0] — 💸 Rentowność klientów (przychód − przypisany koszt)

- `[#126]` 💸 **Który klient naprawdę zarabia** — sekcja „Rentowność klientów" na [statystykach](apps/web/app/(app)/stats/page.tsx) (tylko owner/dispatcher):
  - [core/profitability.ts](packages/core/src/profitability.ts): `clientProfitability(orders, vehicleCosts)` — przychód EUR per nadawca minus **przypisany** koszt paliwa. Model atrybucji (jawne przybliżenie): koszt paliwa pojazdu rozdzielany na jego zlecenia **proporcjonalnie do przychodu**, sumowany per nadawca. Zwraca przychód/koszt/zysk/marżę + `unattributedCostEur` (paliwo pojazdów bez przychodu EUR) i `noVehicleRevenueEur` (przychód bez pojazdu) — żeby nie udawać dokładności, której nie ma.
  - Liczy tylko zlecenia **zrealizowane w EUR** (`delivered`/`invoiced`). Pomija puste przebiegi, myto, pensje, AdBlue, leasing — wskaźnik względny, nie księgowość (jasno zaznaczone w UI).
  - Tabela: klient · zlecenia · przychód · koszt · zysk (kolor wg znaku) · marża %, sortowana wg zysku; totale floty na górze.
  - 8 nowych testów ([profitability.test.ts](packages/core/src/profitability.test.ts)): proporcjonalna atrybucja, marża, sortowanie, filtr statusu/waluty, koszt nieprzypisany, brak pojazdu, pusty nadawca.
  - **Bramki:** biome czysto · `tsc` ×7 · 105 testów · build ✓ (`/stats`).

## [0.95.2] — 🧪 Audyt RLS w CI (gate przy każdym PR)

- `[#125]` 🧪 **Bramka RLS odpala się automatycznie** — audyt z #124 wpięty w GitHub Actions, więc regresję izolacji wyłapie PR, nie produkcja:
  - [.github/workflows/ci.yml](.github/workflows/ci.yml): nowy job **Audyt RLS** (`push`/`pull_request` → main) — instaluje zależności i odpala `pnpm audit:rls` z sekretem `SUPABASE_DB_URL`. Brak sekretu → job pomija się z ostrzeżeniem (nie blokuje PR przed konfiguracją).
  - [scripts/audit-rls.mjs](scripts/audit-rls.mjs): ścieżka `SUPABASE_DB_URL` rozkłada URL ręcznie i wymusza `ssl: rejectUnauthorized:false` — pooler Supabase ma self-signed chain, a `sslmode` w stringu nadpisywał opcję ssl pg-a (CI łączy się tak samo jak lokalnie).
  - Sekret `SUPABASE_DB_URL` ustawiony w repo (Actions). Weryfikacja lokalna obu form URL (z `?sslmode=require` i bez) — ✓ łączy się i zwraca zielony wynik. Runnery wiszą w kolejce (znany problem z billingiem), więc gate potwierdzony lokalnie.
  - [docs/SECURITY-RLS.md](docs/SECURITY-RLS.md): sekcja CI + format sekretu.
  - **Bramki:** biome czysto · `tsc` ×7 · 97 testów · `audit:rls` ✓ (lokalnie, oba tryby połączenia).

## [0.95.1] — 🔒 Audyt RLS (bramka izolacji multi-tenant)

- `[#124]` 🔒 **Powtarzalna kontrola izolacji między firmami** — po 40 migracjach aplikowanych wprost na prod realnym ryzykiem jest rozjazd żywych polityk z plikami; teraz wyłapie go jeden skrypt:
  - [scripts/audit-rls.mjs](scripts/audit-rls.mjs) (tylko odczyt, `pnpm audit:rls`): RLS na każdej tabeli, ≥1 policy, brak `USING(true)` na SELECT/ALL, zapisy ograniczone do autora/roli, `search_path` na `SECURITY DEFINER`, helpery `is_member_of`/`has_role`. Kod wyjścia do CI; obiekty rozszerzeń (PostGIS) pomijane automatycznie.
  - [docs/SECURITY-RLS.md](docs/SECURITY-RLS.md): reguły, tabele wspólnotowe (`fuel_prices`/`map_reports`/`pois`/`poi_reviews` — globalny odczyt z założenia, zapis do autora) i ostatni wynik.
  - **Wynik audytu:** ✓ czysto — 31/31 tabel firmowych izoluje (`is_member_of`/`has_role`), wszystkie 31 funkcji `SECURITY DEFINER` z `search_path`. Zero zmian w schemacie — to weryfikacja, nie naprawa.
  - **Bramki:** biome czysto · `tsc` ×7 · 97 testów · `audit:rls` ✓.

## [0.95.0] — 🏦 Dane do przelewu na fakturze (bank / IBAN)

- `[#123]` 🏦 **Bank i numer konta na fakturze** (z ustawień firmy):
  - [Migracja 0040](supabase/migrations/0040_invoice_bank.sql): `companies.bank_name`, `companies.bank_account` + snapshot na fakturze (`invoices.seller_bank`, `seller_account`) — wypełniany przy wystawianiu (ze zlecenia i ręcznie), więc faktura zachowuje dane z momentu wystawienia.
  - **Ustawienia** ([settings](apps/web/app/(app)/settings/page.tsx)): pola **Bank** i **Nr konta (IBAN)** w karcie firmy (owner).
  - **Faktura** ([invoices](apps/web/app/(app)/invoices/page.tsx)): bank i nr konta w bloku sprzedawcy (druk/PDF).
  - api [data/companies.ts](packages/api/src/data/companies.ts) + [data/invoices.ts](packages/api/src/data/invoices.ts): nowe pola.
  - **Bramki:** biome czysto · `tsc` ×7 · 97 testów · build ✓ (`/settings`, `/invoices`).

## [0.94.0] — 👤 Pulpit kierowcy (Twoje zlecenie)

- `[#122]` 👤 **Sensowny ekran startowy dla kierowcy**:
  - [DriverActiveOrder](apps/web/components/DriverActiveOrder.tsx) na pulpicie (tylko rola driver): **aktywne** (w trakcie) lub **najbliższe** (przypisane) zlecenie — nr, status, trasa, data załadunku + skrót „Otwórz/Moje zlecenia"; licznik kolejnych przypisanych.
  - **Panel „Co wymaga uwagi"** ([AttentionPanel](apps/web/components/AttentionPanel.tsx)) ograniczony do owner/dispatcher (terminy floty/faktur to sprawa zarządcza) — kierowca go nie widzi.
  - **Bramki:** biome czysto · `tsc` ×7 · 97 testów · build ✓ (`/dashboard`).

## [0.93.2] — 🧭 Nawigacja wg roli (kierowca bez narzędzi zarządczych)

- `[#121]` 🧭 **Pasek dopasowany do roli** ([layout](apps/web/app/(app)/layout.tsx)): linki zarządcze (**Zlecenia, Status floty, Faktury, Serwis**) widoczne tylko dla **owner/dispatcher**. Kierowca widzi spójny zestaw: Pulpit, **Moje zlecenia**, Mapa, Formularze, Usterki, Ceny diesla, Sejf dokumentów, Ustawienia.
  - Dostęp i tak egzekwują RLS/role na stronach — to odchudzenie i porządek w UI (mniej mylących pozycji dla kierowcy).
  - **Bramki:** biome czysto · `tsc` ×7 · 97 testów · build ✓.

## [0.93.1] — 🖨️ Czysty PDF rozliczenia miesięcznego

- `[#120]` 🖨️ **Drukowalny układ zestawienia miesięcznego** ([monthly](apps/web/app/(app)/monthly/page.tsx)):
  - Print stylesheet: **białe tło, czarny tekst**, ukryty sidebar/kontrolki/wykres; tabela z obramowaniem — czytelny PDF dla księgowej.
  - **Nagłówek tylko do druku**: nazwa firmy + miesiąc (firma z `getCompany`).
  - **Bramki:** biome czysto · `tsc` ×7 · 97 testów · build ✓ (`/monthly`).

## [0.93.0] — 🔢 Analiza zleceń (top klienci / trasy / średnia stawka)

- `[#119]` 🔢 **Analiza zleceń na statystykach** ([stats](apps/web/app/(app)/stats/page.tsx)):
  - core [orderAnalytics](packages/core/src/orders.ts) (funkcja czysta, +4 testy): **top nadawcy** wg przychodu EUR, **najczęstsze trasy** wg liczby, **średnia stawka EUR** — pomija anulowane.
  - **Sekcja na /stats**: dwie karty — „🏆 Top klienci (przychód EUR)" i „📍 Najczęstsze trasy" + średnia stawka. Liczone w `useMemo` z już wczytanych zleceń.
  - **Bramki:** biome czysto · `tsc` ×7 · **97 testów** · build ✓ (`/stats`).

## [0.92.0] — 💰 Pasek należności + filtr statusu płatności (faktury)

- `[#118]` 💰 **Należności na liście faktur** ([invoices](apps/web/app/(app)/invoices/page.tsx)):
  - **Pasek podsumowania** (EUR, bez anulowanych): zafakturowane / opłacone / przeterminowane — liczone w `useMemo`.
  - **Filtr statusu płatności** (chipy): Wszystkie / Nieopłacone / Przeterminowane / Opłacone / Anulowane + licznik „X z Y".
  - Reużycie [invoicePaymentStatus](packages/core/src/invoice.ts) z #117; bez zmian w API/DB.
  - **Bramki:** biome czysto · `tsc` ×7 · 93 testy · build ✓ (`/invoices`).

## [0.91.0] — 💳 Status płatności faktury + przeterminowane na pulpicie

- `[#117]` 💳 **Kontrola należności**:
  - [Migracja 0039](supabase/migrations/0039_invoice_paid.sql): `invoices.paid_at` (null = nieopłacona) + trigger audytujący oznaczenie/cofnięcie płatności.
  - core [invoicePaymentStatus](packages/core/src/invoice.ts) (funkcja czysta, +5 testów): `paid` / `overdue` (po terminie, nieopłacona, niezanulowana) / `unpaid`.
  - **Faktury** ([invoices](apps/web/app/(app)/invoices/page.tsx)): plakietka **Opłacona / Przeterminowana / Nieopłacona** + przycisk **„💰 Opłacona / ↩︎ Cofnij"** (owner/dispatcher). api `setInvoicePaid`, `Invoice.paid_at`.
  - **Pulpit „Co wymaga uwagi"** ([AttentionPanel](apps/web/components/AttentionPanel.tsx)): **przeterminowane faktury** dołączone do listy (z terminem i kwotą), sortowane wg pilności.
  - **Bramki:** biome czysto · `tsc` ×7 · **93 testy** · build ✓ (`/invoices`, `/dashboard`).

## [0.90.0] — 🧾 Domyślny VAT + termin płatności (z ustawień firmy)

- `[#116]` 🧾 **Fakturowe ustawienia firmy** zamiast sztywnego VAT 23%:
  - [Migracja 0038](supabase/migrations/0038_invoice_defaults.sql): `companies.default_vat_rate`, `companies.payment_due_days`, `invoices.due_date`. `create_invoice`/`create_blank_invoice` biorą **VAT i termin płatności z firmy** (gdy nie podano); `due_date = data wystawienia + dni`.
  - **Ustawienia** ([settings](apps/web/app/(app)/settings/page.tsx)): właściciel ustawia **domyślny VAT (%)** i **termin płatności (dni)** obok danych firmy.
  - **Faktura**: dokument pokazuje **„Termin płatności"**; wystawianie ze zlecenia nie wymusza już 23% (bierze domyślny z firmy).
  - api [data/companies.ts](packages/api/src/data/companies.ts): `Company` + `updateCompany` z nowymi polami; [data/invoices.ts](packages/api/src/data/invoices.ts): `Invoice.due_date`, `createInvoiceFromOrder` z opcjonalnym VAT.
  - **Bramki:** biome czysto · `tsc` ×7 · 88 testów · build ✓ (`/settings`, `/invoices`).

## [0.89.1] — ♻️ Porządki: wspólny eksport CSV (mniej duplikacji)

- `[#115]` ♻️ **Ujednolicenie eksportu CSV** — `orders`, `settlements`, `monthly` używają teraz wspólnego helpera [lib/csv.ts](apps/web/lib/csv.ts) (`downloadCsv` + `csvDateStamp`) zamiast lokalnych, powielonych funkcji `download()`. Zachowanie bez zmian (BOM UTF-8), mniej kodu i jeden punkt prawdy dla wszystkich list. Bez zmian w API/DB.
  - **Bramki:** biome czysto · `tsc` ×7 · 88 testów · build ✓.

## [0.89.0] — 🔔 Centrum powiadomień: pojedyncze przeczytane + filtr

- `[#114]` 🔔 **Lepsze centrum powiadomień** ([NotificationBell](apps/web/components/NotificationBell.tsx)):
  - Otwarcie dzwonka **nie oznacza już wszystkiego jako przeczytane** — można je przejrzeć.
  - Każde nieprzeczytane ma przycisk **„✓"** (oznacz pojedyncze); przeczytane są wyszarzone (●/○).
  - Filtr **„tylko nieprzeczytane"** + przycisk **„Oznacz wszystkie"** w nagłówku panelu. Aktualizacja optymistyczna.
  - api [data/notifications.ts](packages/api/src/data/notifications.ts): `markNotificationRead` (pojedyncze; obok `markNotificationsRead`).
  - **Bramki:** biome czysto · `tsc` ×7 · 88 testów · build ✓.

## [0.88.0] — 🗑️ Anulowanie faktury (zamiast usuwania)

- `[#113]` 🗑️ **Status faktury `anulowana`** zamiast twardego usuwania ([invoices](apps/web/app/(app)/invoices/page.tsx)):
  - [Migracja 0037](supabase/migrations/0037_invoice_status.sql): `invoices.status` (issued/cancelled) + check; trigger **audytujący zmianę statusu** (tylko realna zmiana). Anulowanie **zachowuje numer** → brak luk w numeracji FV/ROK/NNNN.
  - **Lista faktur**: zamiast „🗑️" jest **„✖ Anuluj"** (zachowuje numer); anulowane wyszarzone z plakietką „Anulowana". Drukowalny dokument pokazuje znak **ANULOWANA**.
  - api [data/invoices.ts](packages/api/src/data/invoices.ts): `setInvoiceStatus`; `Invoice.status`. Typy DB (31 tabel).
  - **Bramki:** biome czysto · `tsc` ×7 · 88 testów · build ✓ (`/invoices`).

## [0.87.0] — 🏢 Dane firmy do edycji w Ustawieniach

- `[#112]` 🏢 **Edycja danych firmy** (sprzedawca na fakturach/CMR) w [Ustawieniach](apps/web/app/(app)/settings/page.tsx):
  - Karta „Dane firmy": nazwa, NIP, adres, kraj. **Edycja tylko dla właściciela** (RLS `companies_update` = owner); pozostali widzą dane w trybie odczytu.
  - Dzięki temu sprzedawca na fakturach (`create_invoice`/ręczna) i przewoźnik na CMR są poprawne bez wchodzenia do bazy.
  - api [data/companies.ts](packages/api/src/data/companies.ts): `updateCompany`.
  - **Bramki:** biome czysto · `tsc` ×7 · 88 testów · build ✓ (`/settings`).

## [0.86.0] — 📑 Ujednolicony eksport CSV (faktury, kierowcy, pojazdy, dokumenty)

- `[#111]` 📑 **Spójny eksport „⬇️ CSV"** na kolejnych listach (jak w zleceniach/rozliczeniach):
  - Wspólny helper [lib/csv.ts](apps/web/lib/csv.ts) (`downloadCsv` z BOM UTF-8 + `csvDateStamp`) — koniec z duplikowaniem funkcji `download` po stronach.
  - **Faktury** ([invoices](apps/web/app/(app)/invoices/page.tsx)): numer, data, nabywca, NIP, netto/VAT/brutto, waluta.
  - **Kierowcy** ([DriverRoster](apps/web/components/DriverRoster.tsx)): nazwisko/imię, kategorie, uprawnienia, terminy (prawo jazdy/kod 95/badania/ADR).
  - **Pojazdy** ([vehicles](apps/web/app/(app)/vehicles/page.tsx)): rejestracja, marka/model/typ, VIN, rok, przegląd/OC/leasing, ubezpieczyciel.
  - **Sejf dokumentów** ([documents](apps/web/app/(app)/documents/page.tsx)): nazwa, kategoria, pojazd, rozmiar, termin, data (eksport wg aktywnego filtra).
  - **Bramki:** biome czysto · `tsc` ×7 · 88 testów · build ✓.

## [0.85.0] — 🧮 Faktura ręczna (bez zlecenia)

- `[#110]` 🧮 **Wystawianie faktur bez zlecenia** ([invoices](apps/web/app/(app)/invoices/page.tsx)):
  - [Migracja 0036](supabase/migrations/0036_blank_invoice.sql): RPC `create_blank_invoice` — pusta faktura z **dowolnym nabywcą** (nazwa/NIP/adres/waluta), numeracja FV/ROK/NNNN (blokada advisory), sprzedawca z danych firmy, audyt. owner/dispatcher.
  - **Strona Faktury**: przycisk **„➕ Nowa faktura (ręczna)"** → formularz nabywcy → tworzy fakturę i od razu otwiera dokument, gdzie dodaje się **pozycje** (sumy liczy trigger, jak przy fakturze ze zlecenia).
  - api [data/invoices.ts](packages/api/src/data/invoices.ts): `createBlankInvoice`. Typy DB (31 tabel, 26 funkcji).
  - **Bramki:** biome czysto · `tsc` ×7 · 88 testów · build ✓ (`/invoices`).

## [0.84.0] — 🔍 Globalna wyszukiwarka (Ctrl/⌘+K)

- `[#109]` 🔍 **Paleta wyszukiwania** ([GlobalSearch](apps/web/components/GlobalSearch.tsx)) w bocznym pasku + skrót **Ctrl/⌘+K**:
  - Szybki skok do **pojazdu** (→ karta 360°), **kierowcy** (→ karta 360°), **zlecenia** (→ Zlecenia) i **faktury** (→ Faktury).
  - Indeks pobierany leniwie przy pierwszym otwarciu (jeden `Promise.all`, źródła bez dostępu pomijane), filtr po stronie klienta po nazwie/szczegółach/typie.
  - Pełna obsługa klawiatury: Ctrl/⌘+K otwiera, ↑/↓ wybór, Enter przejście, Esc/klik tła zamyka. Przycisk **„🔍 Szukaj… Ctrl K"** w pasku (także na mobile).
  - **Bramki:** biome czysto · `tsc` ×7 · 88 testów · build ✓.

## [0.83.0] — 🚀 Lista startowa „Pierwsze kroki" na pulpicie

- `[#108]` 🚀 **Onboarding checklist dla nowej firmy** ([OnboardingChecklist](apps/web/components/OnboardingChecklist.tsx)):
  - Na pulpicie (owner/dispatcher) lista 4 kroków: **pojazd → kierowca → karta paliwowa → pierwsze zlecenie**, każdy linkuje do modułu, ze stanem ✅/⬜ i licznikiem postępu.
  - **Znika automatycznie**, gdy wszystkie kroki wykonane (sprawdzane na żywo z bazy). Nie pokazuje się kierowcom.
  - **Bramki:** biome czysto · `tsc` ×7 · 88 testów · build ✓ (`/dashboard`).

## [0.82.0] — 🚛 Karta pojazdu 360° (dokumenty + serwis + paliwo + zlecenia)

- `[#107]` 🚛 **Karta pojazdu 360°** ([/vehicles/[id]](apps/web/app/(app)/vehicles/[id]/page.tsx)) — symetria do karty kierowcy, **bez migracji** (agregacja istniejących danych):
  - **Dokumenty/terminy**: przegląd / OC / leasing ze statusem ważności + ubezpieczyciel/VIN.
  - **Serwis**: zadania wg przebiegu z `serviceStatus` względem bieżącego licznika (max z tankowań).
  - **Karty paliwowe** przypisane do pojazdu.
  - **Paliwo**: tankowań, litry, wydatek, średnie spalanie (full-to-full), liczba **anomalii**.
  - **Zlecenia**: liczba, dostarczone, przychód EUR + ostatnie zlecenia pojazdu.
  - Wejście: przycisk **„📇 Karta"** przy pojeździe na liście ([vehicles](apps/web/app/(app)/vehicles/page.tsx)).
  - **Bramki:** biome czysto · `tsc` ×7 · 88 testów · build ✓ (`/vehicles/[id]`).

## [0.81.0] — 👤 Karta kierowcy 360° (dokumenty + historia zleceń)

- `[#106]` 👤 **Karta kierowcy 360°** ([/drivers/[id]](apps/web/app/(app)/drivers/[id]/page.tsx)):
  - [Migracja 0035](supabase/migrations/0035_driver_user_link.sql): `drivers.user_id` → powiązanie kartoteki z **kontem aplikacji**; `list_drivers` zwraca `user_id`; RPC `driver_link_user` (owner/dispatcher, walidacja członkostwa, audyt).
  - **Jedna karta** łączy: dokumenty i terminy (prawo jazdy / kod 95 / badania / ADR ze statusem ważności), uprawnienia (kategorie, kwalifikacje), notatki, **powiązane konto** (dropdown) oraz **historię zleceń** (liczba, dostarczone, przychód EUR + ostatnie zlecenia) — gdy konto powiązane.
  - Wejście z kartoteki: przycisk **„📇 Karta"** przy kierowcy ([DriverRoster](apps/web/components/DriverRoster.tsx)).
  - api [data/drivers.ts](packages/api/src/data/drivers.ts): `DriverRow.user_id`, `linkDriverUser`. Typy DB (31 tabel, 25 funkcji).
  - **Bramki:** biome czysto · `tsc` ×7 · 88 testów · build ✓ (`/drivers/[id]`).

## [0.80.0] — 🧾 Faktury wieloliniowe + duplikat

- `[#105]` 🧾 **Pozycje na fakturze + duplikowanie**:
  - [Migracja 0034](supabase/migrations/0034_invoice_items.sql): tabela `invoice_items` (opis, ilość, cena, VAT) + RLS (przez firmę faktury). **Kwoty pozycji** liczone triggerem BEFORE; **sumy faktury** (netto/VAT/brutto) przeliczane triggerem AFTER = suma pozycji. `create_invoice` dokłada pozycję startową ze zlecenia.
  - **RPC `duplicate_invoice`** — kopia faktury z pozycjami pod nowym numerem (numeracja FV/ROK/NNNN, blokada advisory), audyt.
  - api [data/invoices.ts](packages/api/src/data/invoices.ts): `listInvoiceItems`, `addInvoiceItem`, `deleteInvoiceItem`, `duplicateInvoice`. Typy DB (31 tabel, 24 funkcje).
  - **Strona [/invoices](apps/web/app/(app)/invoices/page.tsx)**: dokument pokazuje **pozycje** (ilość/cena/netto/VAT/brutto) z sumą; owner/dispatcher **dodaje i usuwa pozycje** (sumy przeliczają się na żywo). Przycisk **„⧉ Duplikat"** na liście. Faktury starsze (bez pozycji) renderują się jak dotąd (jednoliniowo).
  - **Bramki:** biome czysto · `tsc` ×7 · 88 testów · build ✓ (`/invoices`).

## [0.79.1] — 🧭 Zwijane sekcje w bocznym pasku (kompaktowa nawigacja)

- `[#104]` 🧭 **Boczny pasek pogrupowany w zwijane sekcje** ([SidebarNav](apps/web/components/SidebarNav.tsx)) — wcześniej ~18 płaskich linków zajmowało dużo miejsca:
  - Sekcje: **Zlecenia** (Zlecenia, Status floty, Moje zlecenia, Mapa), **Formularze** (Paliwo, AdBlue, Trip), **Flota** (Pojazdy, Kierowcy, Karty, Serwis, Sejf dokumentów, Usterki), **Finanse** (Faktury, Rozliczenia, Zestawienie msc., Ceny diesla, Statystyki). Pulpit i Ustawienia/Zespół poza sekcjami.
  - Domyślnie zwinięte; **rozwija się sekcja zawierająca bieżącą stronę**, nagłówek aktywnej sekcji podświetlony na czerwono. Klik nagłówka rozwija/zwija.
  - Gating modułów zachowany (sekcje/pozycje znikają bez uprawnień; puste sekcje pomijane).
  - **Bramki:** biome czysto · `tsc` ×7 · 88 testów · build ✓.

## [0.79.0] — 🚚 Status floty na żywo

- `[#103]` 🚚 **Operacyjny pulpit „Status floty"** ([fleet-status](apps/web/app/(app)/fleet-status/page.tsx)):
  - Każdy pojazd z aktualnym stanem: **W trasie** (aktywne zlecenie `in_progress`), **Zaplanowane** (zlecenie `assigned`) lub **Wolny** — z trasą, kierowcą, datami i **ostatnim zdarzeniem trasy** (załadunek/rozładunek/serwis…).
  - Liczniki stanów (w trasie / zaplanowane / wolne), sortowanie jadące → zaplanowane → wolne, przycisk **„🗺️ Mapa"** dla aktywnej trasy, odświeżanie.
  - core [buildFleetStatus](packages/core/src/fleet.ts) (funkcja czysta, +3 testy): klasyfikacja stanu + dołączenie najnowszego zdarzenia per pojazd.
  - **Bramki:** biome czysto · `tsc` ×7 · **88 testów** · build ✓ (`/fleet-status`).

## [0.78.0] — 📊 Trend m/m w zestawieniu miesięcznym

- `[#102]` 📊 **Porównanie miesiąc-do-miesiąca + mini-wykres** ([monthly](apps/web/app/(app)/monthly/page.tsx)):
  - Karty podsumowania pokazują **Δ vs poprzedni miesiąc** (▲/▼ + kwota): przychód i wynik „w górę = dobrze", koszty (paliwo/AdBlue) „w dół = dobrze" (kolor zielony/czerwony wg kierunku).
  - **Mini-wykres słupkowy przychodu** z ostatnich 6 miesięcy (BarChart), kończący na wybranym miesiącu.
  - core [monthlyFleetTrend](packages/core/src/billing.ts) + [monthsEndingAt](packages/core/src/billing.ts) (funkcje czyste, +4 testy): sumy per miesiąc dla listy miesięcy + generator listy „YYYY-MM" z przeniesieniem roku.
  - **Bramki:** biome czysto · `tsc` ×7 · **85 testów** · build ✓ (`/monthly`).

## [0.77.0] — 🗺️ „Pokaż na mapie" ze zlecenia (prefill trasy)

- `[#101]` 🗺️ **Trasa zlecenia jednym kliknięciem na mapie**:
  - Przycisk **„🗺️ Mapa"** na zleceniu ([orders](apps/web/app/(app)/orders/page.tsx)) i w **„Moje zlecenia"** ([my-orders](apps/web/app/(app)/my-orders/page.tsx)) — otwiera `/map?from=…&to=…` (skąd → dokąd ze zlecenia).
  - **Mapa** ([map](apps/web/app/(app)/map/page.tsx)) czyta parametry `from`/`to`, **geokoduje** oba punkty, ustawia start/koniec i **automatycznie wyznacza trasę** (routing TIR + myto). Gdy geokoder nie znajdzie punktu — wstawia samą etykietę do dokończenia ręcznie.
  - `plan()` przyjmuje opcjonalne współrzędne (prefill bez czekania na stan); jednorazowy prefill po gotowości mapy.
  - **Bramki:** biome czysto · `tsc` ×7 · 81 testów · build ✓ (`/map`, `/orders`, `/my-orders`).

## [0.76.0] — 🔔 Powiadomienie kierowcy o przypisaniu zlecenia

- `[#100]` 🔔 **Kierowca dostaje powiadomienie o nowym zleceniu**:
  - [Migracja 0033](supabase/migrations/0033_notify_order_assignment.sql): trigger na `orders` tworzy powiadomienie w aplikacji dla przypisanego kierowcy (nowy rekord lub zmiana `assigned_to`). Trafia do **dzwonka (realtime)** i — przez cron — jako **web push**. Nie powiadamia o przypisaniu samego siebie; dedup per (zlecenie, kierowca).
  - **Natychmiastowy push** (nie czeka na cron): endpoint [/api/orders/notify-assignment](apps/web/app/api/orders/notify-assignment/route.ts) — owner/dispatcher, zlecenie w obrębie firmy; wysyła push do subskrypcji kierowcy (link do `/my-orders`). Wywoływany przez stronę Zleceń przy zmianie przypisania (best-effort).
  - **Bramki:** biome czysto · `tsc` ×7 · 81 testów · build ✓ (`/api/orders/notify-assignment`).

## [0.75.0] — 📈 Zestawienie miesięczne floty (przychód vs koszty)

- `[#099]` 📈 **Miesięczne rozliczenie floty dla księgowości**:
  - core [monthlyFleetSummary](packages/core/src/billing.ts) (funkcja czysta + 3 testy): przychód ze zleceń (status `delivered`/`invoiced`, EUR) zestawiony z kosztami **paliwa** i **AdBlue** — **per pojazd**, z atrybucją po miesiącu (`YYYY-MM`). Pozycje bez pojazdu → wiersz „Bez pojazdu"; inne waluty świadomie pomijane (bez kursów).
  - **Nowa strona [/monthly](apps/web/app/(app)/monthly/page.tsx)** — wybór miesiąca, tabela per pojazd (przychód / paliwo / AdBlue / wynik) + wiersz RAZEM, karty podsumowania, **eksport CSV** (Excel) i wydruk/PDF. Dane liczone na bieżąco (`useMemo`) bez ponownego pobierania przy zmianie miesiąca.
  - Strażnik modułu **Rozliczenia** (jak `/settlements`); link w nawigacji widoczny przy dostępie do modułu.
  - **Bramki:** biome czysto · `tsc` ×7 · **81 testów** · build ✓ (`/monthly`).

## [0.74.0] — 👤 Przypisanie kierowcy do zlecenia + „Moje zlecenia"

- `[#098]` 👤 **Przypisanie kierowcy + samoobsługowy widok kierowcy**:
  - [Migracja 0032](supabase/migrations/0032_order_assignment.sql): kolumna `orders.assigned_to` (→ `auth.users`) + RPC `order_set_status` z kontrolą uprawnień: **owner/dispatcher → dowolny status**, **przypisany kierowca → tylko operacyjny** (w trakcie / dostarczone). Audytowane.
  - **Zlecenia** ([orders](apps/web/app/(app)/orders/page.tsx)): pole **„Kierowca"** w formularzu (lista aktywnych kierowców firmy), widoczny przypisany kierowca na karcie zlecenia.
  - **Nowa strona [/my-orders](apps/web/app/(app)/my-orders/page.tsx)** — kierowca widzi **swoje** zlecenia (bez modułu zleceń): trasa, ładunek, pojazd, daty; oznacza „▶️ W trakcie" / „✅ Dostarczone" i drukuje **CMR**. Link w nawigacji.
  - **Refaktor:** `CmrDoc` wyniesiony do współdzielonego [komponentu](apps/web/components/CmrDoc.tsx) (używany przez /orders i /my-orders); api `listMyOrders`, `setOrderStatus` przez RPC.
  - **Bramki:** biome czysto · `tsc` ×7 · 78 testów · build ✓ (`/orders`, `/my-orders`).

## [0.73.0] — ⚠️ Pulpit „Co wymaga uwagi" (zbiorczy panel terminów)

- `[#097]` ⚠️ **Zbiorczy panel terminów na pulpicie** ([AttentionPanel](apps/web/components/AttentionPanel.tsx)):
  - Jeden widok agregujący **wszystkie terminy i progi** wymagające reakcji: dokumenty pojazdów (przegląd/OC/leasing), karty paliwowe (ważność), serwis wg przebiegu (km), dokumenty z sejfu (termin ważności).
  - Liczony **na żywo** (niezależnie od crona/powiadomień), z jednego `Promise.all`; pokazuje tylko pozycje „po terminie / wkrótce", **posortowane wg pilności** (po terminie → najbliższe), z licznikami i klikalnym przejściem do modułu.
  - Zastępuje wcześniejszy `RemindersWidget` (był tylko dla pojazdów) — pełny superset.
  - Anomalie spalania pozostają na [/stats](apps/web/app/(app)/stats/page.tsx) (pulpit floty).
  - **Bramki:** biome czysto · `tsc` ×7 · 78 testów · build ✓ (`/dashboard`).

## [0.72.0] — 📄 List przewozowy CMR ze zlecenia

- `[#096]` 📄 **Generator CMR (list przewozowy)** — domknięcie przepływu zlecenie → CMR → faktura:
  - Przycisk **„📄 CMR"** na każdym zleceniu ([orders](apps/web/app/(app)/orders/page.tsx)) otwiera **drukowalny międzynarodowy list przewozowy** (druk/PDF, `window.print()`).
  - Dane wypełniane automatycznie ze zlecenia: nadawca, odbiorca, miejsce/data załadunku i rozładunku, rodzaj towaru, waga brutto, nr rejestracyjny pojazdu, uwagi. **Przewoźnik** = dane firmy (nazwa, adres, NIP).
  - Klasyczny układ ponumerowanych pól CMR + miejsca na podpisy (nadawca/przewoźnik/odbiorca).
  - api [data/companies.ts](packages/api/src/data/companies.ts): `getCompany` (dane firmy do dokumentu, RLS = własna firma).
  - Uwaga: dokument **uproszczony** — nie zastępuje urzędowego formularza; pełną zgodność (konwencja CMR) potwierdza przewoźnik.
  - **Bramki:** biome czysto · `tsc` ×7 · 78 testów · build ✓ (`/orders`).

## [0.71.0] — 🔐 Sejf dokumentów (Supabase Storage)

- `[#095]` 🔐 **Sejf dokumentów** (nowy moduł — bezpieczne przechowywanie plików):
  - [Migracja 0031](supabase/migrations/0031_document_vault.sql): prywatny bucket Storage `documents` (pliki pod ścieżką `{company_id}/…`), tabela `documents` (metadane: nazwa, kategoria, pojazd, rozmiar, **termin ważności**) + RLS. Polityki na `storage.objects` gating po `company_id` z pierwszego segmentu ścieżki (porównanie tekstowe z `memberships` — bez ryzyka rzutowania uuid). **Odczyt: każdy aktywny członek firmy; wgrywanie/kasowanie: owner/dispatcher.**
  - **Przypomnienia o terminach** dokumentów dołączone do `generate_expiry_notifications` (typ `document_expiry`, dedup po dacie).
  - api [data/documents.ts](packages/api/src/data/documents.ts): `listDocuments`, `uploadDocument` (z rollbackiem osieroconego obiektu), `getDocumentUrl` (podpisany URL — bucket prywatny), `deleteDocument`. Typy DB (30 tabel).
  - **Strona [/documents](apps/web/app/(app)/documents/page.tsx)** — wgrywanie (plik max 25 MB, nazwa, kategoria, pojazd, termin), lista z filtrem kategorii, pobieranie (podpisany link), badge ważności (przeterminowany/wkrótce/ok), kasowanie. Link w nawigacji.
  - core [catalog.ts](packages/core/src/catalog.ts): `DOCUMENT_CATEGORIES` (OC, przegląd, leasing, dowód rej., licencja, CMR…).
  - **Bramki:** biome czysto · `tsc` ×7 · 78 testów · build ✓ (`/documents`).

## [0.70.0] — 📊 Zlecenia → pulpit floty (przychód)

- `[#094]` 📊 **Przychód ze zleceń w statystykach floty** ([stats](apps/web/app/(app)/stats/page.tsx)):
  - Pasek floty pokazuje teraz **„Przychód (zlecenia EUR)"** — suma wartości zleceń **dostarczonych i zafakturowanych** (waluta EUR), liczona w `useMemo` (zielony akcent).
  - Dane pobierane razem z resztą (`listOrders` w jednym `Promise.all`), bez dodatkowego round-tripu; przeliczenie tylko przy zmianie zleceń/kafelków.
  - Domyka widok floty: koszty (paliwo) i przychody (zlecenia) w jednym miejscu.
  - **Bramki:** biome czysto · `tsc` ×7 · 78 testów · build ✓.

## [0.69.0] — 🧾 Fakturowanie ze zleceń (domknięcie pętli zlecenie→pieniądze)

- `[#093]` 🧾 **Faktury generowane ze zleceń** (nowy moduł):
  - [Migracja 0030](supabase/migrations/0030_invoices.sql): tabela `invoices` (snapshot sprzedawcy z firmy, nabywca, netto/VAT/brutto, waluta) + RLS. RPC `create_invoice` z **numeracją FV/ROK/NNNN per firma** (blokada `pg_advisory_xact_lock` → bez kolizji), ustawia zlecenie na `invoiced`, audyt.
  - api [data/invoices.ts](packages/api/src/data/invoices.ts): `listInvoices`, `createInvoiceFromOrder`, `deleteInvoice`. Typy DB (29 tabel, 22 funkcje).
  - **Strona [/invoices](apps/web/app/(app)/invoices/page.tsx)** — lista + **drukowalny dokument faktury** (sprzedawca/nabywca, pozycja, netto/VAT/brutto, druk/PDF). Link w nawigacji.
  - **Zlecenia**: przycisk **„🧾 Faktura"** na dostarczonym zleceniu (owner/dispatcher, VAT 23%) → tworzy fakturę i oznacza zlecenie zafakturowane.
  - Uwaga: dokument **uproszczony** — pełną zgodność (stawki/odwrotne obciążenie, dane nabywcy) potwierdza wystawca.
  - **Bramki:** biome czysto · `tsc` ×7 · 78 testów · build ✓.

## [0.68.0] — 💶 Zlecenia: podsumowanie przychodów + eksport CSV

- `[#092]` 💶 **Dopracowanie modułu Zleceń** ([orders](apps/web/app/(app)/orders/page.tsx)):
  - **Pasek podsumowania**: liczba zleceń, łączna wartość (EUR), „do zafakturowania" (dostarczone, czekają na fakturę) — w `useMemo`.
  - **Eksport CSV** przefiltrowanej listy (nr, status, nadawca/odbiorca, trasa, ładunek, waga, stawka, waluta, pojazd, daty) — BOM dla Excela.
  - **Bramki:** biome czysto · `tsc` ×7 · 78 testów · build ✓.

## [0.67.0] — 📑 Zlecenia / ładunki (rdzeń spedytora)

- `[#091]` 📑 **Nowy moduł Zleceń** — największe rozszerzenie produktowe (rdzeń pracy spedytora):
  - [Migracja 0029](supabase/migrations/0029_orders.sql): enum `order_status` (new/assigned/in_progress/delivered/invoiced/cancelled) + tabela `orders` (nadawca, odbiorca, trasa, ładunek, waga, stawka+waluta, pojazd, daty zał./rozł., status) + RLS (członek czyta, owner/dispatcher zarządza).
  - core: `ORDER_STATUSES` + etykiety ([catalog](packages/core/src/catalog.ts)) + `orderSchema` Zod ([schemas](packages/core/src/schemas.ts)).
  - api [data/orders.ts](packages/api/src/data/orders.ts): CRUD + `setOrderStatus`. Typy DB (28 tabel, 9 enumów).
  - **Strona [/orders](apps/web/app/(app)/orders/page.tsx)** — formularz zlecenia, lista kart ze statusem (kolory), zmiana statusu, **filtr statusu** + licznik, edycja/usuwanie (manager). Link w nawigacji.
  - **Bramki:** biome czysto · `tsc` ×7 · 78 testów · build ✓.

## [0.66.0] — 🔧 Plan serwisowy wg przebiegu

- `[#090]` 🔧 **Plan serwisowy pojazdu** (nowa funkcja produktowa, nowy moduł danych):
  - [Migracja 0028](supabase/migrations/0028_service_tasks.sql): tabela `service_tasks` (interwał km i/lub miesięczny, ostatni serwis) + RLS (odczyt: członek; zapis: owner/dispatcher). Blok serwisowy w `generate_expiry_notifications` — **alert km-owy** (bieżący przebieg ≥ cel − 2000 km), dedup po docelowym przebiegu.
  - core [`serviceStatus`](packages/core/src/expiry.ts) — status wg przebiegu (po przebiegu / zbliża się / ok). **+4 testy** (łącznie 78).
  - api [data/service.ts](packages/api/src/data/service.ts): CRUD + `latestOdometers` (bieżący przebieg = max licznika z tankowań).
  - **Nowa strona [/service](apps/web/app/(app)/service/page.tsx)** — zadania per pojazd ze statusem (za X km / po przebiegu), „✓ Wykonano" (ustawia ostatni serwis na bieżący przebieg), edycja/usuwanie (manager). Link w nawigacji.
  - **Bramki:** biome czysto · `tsc` ×7 · **78 testów** · build ✓.

## [0.65.0] — 📊 Anomalie spalania + pulpit floty

- `[#089]` 📊 **Wykrywanie anomalii spalania + pulpit floty** (nowa funkcja, dane już były):
  - Silnik [`detectFuelAnomalies`](packages/core/src/billing.ts) — flaguje odcinki istotnie powyżej **mediany** pojazdu (odporne na outliery; domyślnie ≥20% ponad). Możliwy wyciek/kradzież/usterka. **+3 testy** (łącznie 74).
  - [Statystyki](apps/web/app/(app)/stats/page.tsx): **pasek floty** (pojazdy, paliwo, wydatek, śr. spalanie, trasy, liczba anomalii) nad kafelkami; badge „⚠️ N anomalii" na kafelku; **ostrzeżenie z listą odcinków** w widoku pojazdu (km, L/100km, +% vs mediana).
  - Wszystko w `useMemo` (bez kosztu per render).
  - **Bramki:** biome czysto · `tsc` ×7 · **74 testy** · build ✓.

## [0.64.0] — 🪪 Terminy dokumentów kierowcy (compliance)

- `[#088]` 🪪 **Compliance kierowcy** — daty ważności **prawa jazdy / Kod 95 / badań lekarskich / ADR** z przypomnieniami (nowa funkcja produktowa):
  - [Migracja 0027](supabase/migrations/0027_driver_document_expiry.sql): kolumny `*_expiry` (daty, jawne — sama data nie jest wrażliwa); rozszerzone RPC `list_drivers`/`driver_save`; **blok kierowców w `generate_expiry_notifications`** (powiadomienia + push przez istniejący cron).
  - **PII-safe:** powiadomienia **bez nazwiska** (tylko „sprawdź kartotekę") — nazwiska szyfrowane; pokazywane tylko w [kartotece](apps/web/components/DriverRoster.tsx) (deszyfrowane w pamięci, owner/dispatcher).
  - UI: 4 pola dat w formularzu kierowcy + **badge'e terminów** (po terminie/ile dni) na liście.
  - Reszta (NotificationBell, cron push, `expiryStatus`) bez zmian — generyczna.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.63.0] — 📱 Mobilny drawer nawigacji (P2)

- `[#087]` 📱 **Hamburger + drawer na telefonie** ([AppSidebar](apps/web/components/AppSidebar.tsx)):
  - Desktop (>820px): pełny sidebar boczny (bez zmian).
  - Mobile (≤820px): kompaktowy pasek z logo + **hamburger ☰**; menu (nawigacja + konto) rozwijane po kliknięciu, **zwijane po wyborze pozycji** (`onNavigate` w [SidebarNav](apps/web/components/SidebarNav.tsx)). Zamiast wcześniejszego poziomego paska, który zajmował dużo wysokości przy wielu pozycjach.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.62.0] — ⬇️ Eksport CSV w Historii (P2 #9)

- `[#086]` ⬇️ **Eksport CSV w Historii formularzy** ([forms/history](apps/web/app/(app)/forms/history/page.tsx)) — przycisk w pasku filtrów eksportuje **przefiltrowaną** listę (Typ, Pojazd, Opis, Szczegóły, Status) do CSV (BOM dla Excela). Domknięcie wzorca filtry+eksport (Usterki #085, Rozliczenia #045).
  - Uwaga responsywność: app‑shell jest już responsywny (`@media ≤820px`: sidebar → górny pasek) — pozycja P2 „mobile" w praktyce dowieziona wcześniej.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.61.0] — 🔎 Filtry i eksport CSV w Usterkach (P2 #9)

- `[#085]` 🔎 **Usterki — filtrowanie + eksport** ([reports](apps/web/app/(app)/reports/page.tsx)):
  - **Filtr statusu** (chipy: Wszystkie / Zgłoszone / W naprawie / Naprawione) + **filtr pojazdu** (select przy >1 pojeździe).
  - **Eksport CSV** widocznej (przefiltrowanej) listy zgłoszeń (pojazd, część, strona, pilność, status, kontrolka, opis, data) — BOM dla Excela.
  - Licznik „N z M"; filtrowanie po stronie klienta (`useMemo`).
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.60.1] — 🧱 Wspólne prymitywy UI: SetupNotice + dedup Field (P2)

- `[#084]` 🧱 **Porządki UI (mniej duplikacji):**
  - Nowy [`SetupNotice`](apps/web/components/ui.tsx) (komunikat brak‑firmy/brak‑pojazdów) — wpięty w [Rozliczenia](apps/web/app/(app)/settlements/page.tsx) (czysty przypadek renderowy).
  - [LiquidForm](apps/web/components/LiquidForm.tsx) używa wspólnego [`Field`](apps/web/components/Field.tsx) zamiast lokalnej kopii (usunięte ~18 linii duplikatu).
  - Uwaga: w Usterkach/Trip `setupMsg` steruje też logiką (blokada/submit), więc tam pozostaje — to nie czysta duplikacja.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.60.0] — 🔐 Rozliczenia jako osobny moduł uprawnień (P2 #12)

- `[#083]` 🔐 **Wydzielenie modułu `settlements`** (dotąd gatowane modułem `stats`):
  - [core](packages/core/src/catalog.ts): nowy moduł `settlements` (label „Rozliczenia") w `APP_MODULES`; owner/dispatcher/manager dostają go domyślnie (spread), kierowca nie.
  - [Migracja 0026](supabase/migrations/0026_settlements_module.sql): istniejącym członkom z **własną** listą `modules` zawierającą `stats` dopisuje `settlements` (nikt nie traci dostępu). Zastosowano na prod — 0 wierszy (wszyscy na domyślnych, settlements już obejmuje).
  - [Nawigacja](apps/web/app/(app)/layout.tsx): `/settlements` pod własny moduł.
  - [Strona Rozliczenia](apps/web/app/(app)/settlements/page.tsx): **strażnik modułu** (nie tylko RLS) — brak modułu → „Brak dostępu". Zespół (UI zarządzania) automatycznie pokazuje nowy przełącznik.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.59.2] — ⚡ Mapa: memo + odporność rozliczeń (P1/P2)

- `[#082]` ⚡ **Drobne optymalizacje i odporność:**
  - [Mapa](apps/web/app/(app)/map/page.tsx): `cardOptions` (marki kart do filtra) w `useMemo` — nowa tablica tylko przy zmianie kart, nie co render.
  - [Rozliczenia](apps/web/app/(app)/settlements/page.tsx): dodana obsługa błędu (`try/catch`) — nieudane „Przelicz" pokazuje komunikat zamiast cichej porażki.
  - Weryfikacja pozostałych obaw P1 mapy: Overpass **już ograniczony** (`out center 120`), korytarz trasy **ograniczony** (≤120 POI × ≤300 próbek, on-demand) — bez realnego problemu, bez zmian.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.59.1] — 📄 Sync dokumentacji (ARCHITECTURE/ROADMAP) + backlog

- `[#081]` 📄 **Domknięcie rozbieżności dokumentacji (P5):**
  - [ARCHITECTURE.md](docs/ARCHITECTURE.md): nagłówek „propozycja 0.1.0" → „w realizacji v0.59"; dodany blok **Stan implementacji** (zaimplementowane vs planowane — PowerSync/shadcn/TanStack/Zustand/Sentry/mobile jasno oznaczone jako plan).
  - [ROADMAP.md](docs/ROADMAP.md): nagłówek zaktualizowany; banner **stanu dostarczenia** (Fazy 0–2 zrealizowane, wyjątki: offline przez outbox nie PowerSync, zaproszenia link/QR); Faza 0 odhaczona.
  - [BACKLOG.md](docs/BACKLOG.md): odhaczone #079/#080/#081; oznaczone pozycje już‑gotowe/by‑design (mobile tsconfig ma strict flagi; Node `>=22` celowy Vercel‑safe floor; DATA‑MODEL/README/DEPLOY w sync).
  - Weryfikacja: DATA‑MODEL/README/DEPLOY/`.env.example` sprawdzone — **już zgodne** z kodem (audyt był nieaktualny).
  - **Bramki:** biome czysto (docs). Bez zmian w kodzie.

## [0.59.0] — 🔔 Test push + ikona powiadomień (P3 #11)

- `[#080]` 🔔 **Domknięcie pętli powiadomień push:**
  - **Ikona `icon-192.png`** ([apps/web/public/icon-192.png](apps/web/public/icon-192.png)) — była referowana w `sw.js` (`icon`/`badge`), ale plik nie istniał (404 → domyślna ikona). Wygenerowana brandowo (czerwone „E" na czerni, 192×192).
  - **„Wyślij testowe powiadomienie"** w [PushToggle](apps/web/components/PushToggle.tsx) (Ustawienia) — dla owner/dispatcher, gdy push aktywny. POST do `/api/push/send` (zwalidowany w #073), komunikat z liczbą urządzeń.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.58.1] — ⚡ Wydajność: memoizacja statystyk (P1)

- `[#079]` ⚡ **Optymalizacja statystyk i rozliczeń** (backlog P1):
  - [Statystyki](apps/web/app/(app)/stats/page.tsx): agregaty per pojazd (spalanie/litry/zdarzenia) liczone w `useMemo` — raz na zmianę danych, nie przy każdym renderze (wybór pojazdu nie przelicza wszystkich kafelków). Wykresy detalu (koszty miesięczne, seria spalania) też w `useMemo`.
  - [Rozliczenia](apps/web/app/(app)/settlements/page.tsx): usunięty redundantny filtr dat w JS — zakres `created_at` już zawężany w zapytaniu (`gte`/`lte`).
  - Uwaga: filtry `from`/`to`/`limit` w `listFuelLogs`/`listTripEvents` były już dostępne; ten release domyka wykorzystanie + memoizację.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.58.0] — ⛽ Ceny diesla w Europie (OpenVan.camp, darmowe)

- `[#078]` ⛽ **Nowa strona „Ceny diesla — Europa"** ([/fuel-prices](apps/web/app/(app)/fuel-prices/page.tsx)) — ranking średnich krajowych cen oleju napędowego, **przeliczonych na €/L** (porównywalne PL/CZ/HU vs strefa euro):
  - Źródło: **[OpenVan.camp](https://openvan.camp)** — otwarte API, **bez klucza** (wzorzec env-free), licencja CC BY 4.0 (atrybucja w stopce).
  - Serwerowy [/api/fuel-eu](apps/web/app/api/fuel-eu/route.ts): pobiera ceny + kursy, przelicza na EUR (`local / rate`), filtruje ~29 krajów europejskich, sortuje rosnąco. Cache 6 h (`next.revalidate`, TTL źródła) + rate-limit.
  - UI: `BarChart` 12 najtańszych (€/L) + pełny ranking z ceną lokalną i walutą; `ListStatus` (ładowanie/błąd/Ponów); link w nawigacji.
  - **Pierwsza zrealizowana integracja partnerska** (z 4 przeanalizowanych źródeł — DKV/Eurowag/SNAP wymagają umów/kluczy; OpenVAN otwarte).
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.57.1] — 🔐 Utwardzenie polityki haseł (Auth)

- `[#077]` 🔐 **Domknięcie audytu P1 #6** — silniejsza polityka haseł w Supabase Auth (Management API):
  - `password_min_length`: **6 → 12**.
  - `password_hibp_enabled`: **true** — odrzucanie haseł z wycieków (Have I Been Pwned).
  - Bez wymogu klas znaków — zgodnie z NIST (długość + sprawdzanie wycieków skuteczniejsze niż reguły kompozycji).
  - Zweryfikowane na żywym projekcie (PATCH 200 → GET potwierdza). Reprodukowalne polecenie + opis w [supabase/README.md](supabase/README.md). Zmiana konfiguracji chmury (bez kodu).
  - **Bramki:** biome czysto (docs). Bez zmian w kodzie.

## [0.57.0] — 🔎 Filtry w Historii formularzy

- `[#076]` 🔎 **Filtrowanie listy historii** (funkcja produktowa z audytu, #9) na [stronie Historia](apps/web/app/(app)/forms/history/page.tsx):
  - **Filtr typu** (chipy): Wszystkie / Paliwo / AdBlue / Trip — spójne z motywem (aktywny = czerwony).
  - **Filtr pojazdu** (select, pojawia się przy >1 pojeździe) — po rejestracji.
  - **Licznik** „N z M" pokazuje liczbę wyników; pusty wynik → czytelny komunikat.
  - Filtrowanie po stronie klienta na już załadowanych danych (`useMemo`, zero dodatkowych zapytań). Pole `vehicle` dodane do wiersza.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.56.0] — 🧬 Generowane typy DB (koniec rozjazdu typ↔schemat)

- `[#075]` 🧬 **Otypowanie warstwy danych schematem z żywej bazy** — eliminacja ryzyka rozjazdu typ↔schemat (jakość z audytu):
  - **Generator** [scripts/gen-types.mjs](scripts/gen-types.mjs) (`pnpm gen:types`) — introspekcja przez `pg`, bez Dockera (CLI `supabase gen types` go wymaga). Emituje [packages/api/src/database.types.ts](packages/api/src/database.types.ts): `Database` (26 tabel Row/Insert/Update, 8 enumów, 21 funkcji RPC). Reprodukowalny (regeneracja = identyczny plik).
  - **Typowany klient**: `createSupabaseBrowserClient/Admin/Server` → `SupabaseClient<Database>` (eksport `TypedSupabaseClient`, `Database`, `Json`). Wszystkie 12 plików warstwy danych przełączone na typowanego klienta → `.from(...).select(...)` i `.rpc(...)` zwracają typy ze schematu.
  - **Usunięte redundantne casty mapowania DB**: lokalne typy `Db*`/`*Row` w stronach (pojazdy, usterki, kierowcy, przypomnienia, karty) zastąpione aliasem `Awaited<ReturnType<typeof listX>>[number]` — jedno źródło prawdy = schemat. Pozostałe `as` to świadome zawężenia view-model (przy `select('*')`) lub legalne narrowing (enumy/DOM/fetch/body/localStorage).
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.55.2] — 🧹 Porządki P3 z audytu (guard PIN, RLS, numeracja migracji)

- `[#074]` 🧹 **Domknięcie pozycji porządkowych P3 audytu:**
  - **P3 #12** — [`0025`](supabase/migrations/0025_fuel_card_pin_guard.sql): przywrócony guard `if cid is null` w `fuel_card_pin` (przy nieistniejącej karcie zwraca „Karta nie istnieje" zamiast mylącego „Brak uprawnień"). Polityki `drivers` bez `is_developer` **zweryfikowane na żywej bazie** (poprawnie nadpisane w 0013) — historycznych migracji nie edytowano (forward-only).
  - **P3 #11** — już domknięte w `0021` (`to authenticated` na wszystkich politykach `push_subscriptions`).
  - **P3 #13** — kolizja numeracji `0017`/`0018` (po 2 pliki) **udokumentowana** w [supabase/README.md](supabase/README.md): pliki dotykają różnych obiektów, kolejność alfabetyczna poprawna; dodana konwencja niezmienności migracji.
  - 📄 Aktualizacja [supabase/README.md](supabase/README.md): migracje 0001–0025, `pii_key` obok `card_key`, sprostowanie dostępu do PIN-u (developer **odcięty** od 0013).
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓ (zmiana DB-only + docs).

## [0.55.1] — 🛡️ Walidacja wejścia API + ochrona przed open-redirect

- `[#073]` 🛡️ **Domknięcie audytu P2 #8 — pełna walidacja wejścia w route'ach API** (`/api/route` był już zwalidowany):
  - [`/api/fuel-prices`](apps/web/app/api/fuel-prices/route.ts) — schema Zod: `lat` ∈ ⟨-90,90⟩, `lng` ∈ ⟨-180,180⟩, **`radius` ograniczony 1–25 km** (anty-abuse zewnętrznego API Tankerkönig).
  - [`/api/push/send`](apps/web/app/api/push/send/route.ts) — schema Zod (`title`/`body`/`url` z limitami). **`url` musi być ścieżką względną** (`^/` bez `//`) — eliminuje ryzyko **open-redirect** przy kliknięciu powiadomienia (SW `notificationclick`).
  - [`/api/passkey/register/verify`](apps/web/app/api/passkey/register/verify/route.ts) + [`/api/passkey/auth/verify`](apps/web/app/api/passkey/auth/verify/route.ts) — walidacja kształtu body (czyste `400` zamiast `500` przy złym wejściu; bez Zod, by nie obciąć pól odpowiedzi WebAuthn). Krypto WebAuthn pozostaje główną ochroną.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.55.0] — 🔐 Szyfrowanie PII at-rest (profil, kierowcy, zaproszenia)

- `[#072]` 🔐 **Domknięcie audytu P1 #4 — dane osobowe szyfrowane w bazie.** Migracja [0024](supabase/migrations/0024_pii_encryption.sql): kolumny PII w `profiles` (imię/telefon/e-mail), `driver_profiles` (telefon/e-mail/`company_data`) i `invites` (e-mail) zamienione na `*_enc` (pgcrypto `pgp_sym_encrypt` + Supabase Vault). Martwa kolumna `invites.phone` usunięta.
  - **Osobny klucz `pii_key`** (≠ `card_key` dla PIN-ów kart) — segmentacja klas danych, częściowo adresuje też P1 #5.
  - **Pisarze przepięci w migracji:** trigger rejestracji `handle_new_user` (e-mail szyfrowany od razu; `search_path` rozszerzony o `extensions`) oraz RPC `create_invite`. Nowy RPC `list_invites()` (owner/dispatcher, deszyfrowanie + audyt) na przyszły podgląd zaproszeń.
  - **Zero zmian w kodzie web/api** — mapa kodu potwierdziła brak jakichkolwiek odczytów tych kolumn (kanoniczny e-mail żyje w `auth.users`). Brak wyszukiwania po e-mail/telefonie → blind-index (HMAC) zbędny.
  - **Weryfikacja na produkcji:** migracja w transakcji (commit), brak jawnych kolumn PII, `pii_key` ≠ `card_key`, round-trip szyfrowania OK, **test triggera** (insert do `auth.users` → profil z `email_enc` odszyfrowany → rollback) — rejestracje działają.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓ (kod aplikacji bez zmian).

## [0.54.6] — 🎨 Kosmetyka UI: Button na pozostałych stronach

- `[#071]` 🎨 **Domknięcie adopcji `Button`** na ostatnich stronach z lokalnymi przyciskami — spójne warianty primary/ghost/danger w całym panelu:
  - [Pojazdy](apps/web/app/(app)/vehicles/page.tsx) — zapis/anuluj/edycja/usuwanie.
  - [Kierowcy](apps/web/app/(app)/drivers/page.tsx) — generowanie/kopiowanie linku.
  - [Historia](apps/web/app/(app)/forms/history/page.tsx) — Ponów/Usuń.
  - [Mapa](apps/web/app/(app)/map/page.tsx) — planowanie trasy.
  - [Ustawienia](apps/web/app/(app)/settings/page.tsx) — 2FA (włącz/weryfikuj/wyłącz) + passkey (dodaj/usuń).
  - [DriverRoster](apps/web/components/DriverRoster.tsx) — kwalifikacje/zapis/anuluj/dokumenty/edycja/usuwanie.
  - [PushToggle](apps/web/components/PushToggle.tsx) — włącz/wyłącz powiadomienia.
  - Osierocone style (`primary`/`ghost`/`danger`/`btn`) pozostawione w obiektach `styles` jako nieszkodliwe (niepodlinkowane); przyciski specjalne (segmenty mapy, chipy, rozwijanie) bez zmian — celowo.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.54.5] — 🎨 Kosmetyka UI: Button w Rozliczeniach i Zespole

- `[#070]` 🎨 **Adopcja `Button`** w [Rozliczeniach](apps/web/app/(app)/settlements/page.tsx) (Przelicz, Eksport CSV, Drukuj/PDF) i [Zespole](apps/web/app/(app)/team/page.tsx) (Zapisz). Kontynuacja porządkowania (po Usterkach i Kartach) — spójne przyciski w motywie. Pozostają jeszcze: Pojazdy, Kierowcy, Historia, Ustawienia, Mapa.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.54.4] — 🎨 Kosmetyka UI: Button w Kartach

- `[#069]` 🎨 **Adopcja `Button` na stronie Karty** — przyciski zapisu/anuluj/PIN/edycji/usuwania → `Button` (warianty primary/ghost/danger); usunięte 3 osierocone style. Kontynuacja porządkowania (po Usterkach).
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.54.3] — 📱 Plan dojścia mobile do parytetu

- `[#068]` 📱 **Fazowany plan wdrożenia mobile** — [docs/MOBILE-PLAN.md](docs/MOBILE-PLAN.md). M1 (sesja+dane), M2 (formularze offline na realnych danych), M3 (mapa/POI), M4 (push natywny), M5 (PowerSync opcjonalnie) — z dependami i krokami. Implementacja wymaga emulatora/urządzenia Expo (weryfikacja runtime), więc dowieziona jako konkretny plan, nie kod „na ślepo".
  - **Bramki:** biome czysto (docs). Bez zmian w kodzie.

## [0.54.2] — 🎨 Kosmetyka UI: Button/Badge (start adopcji)

- `[#067]` 🎨 **Adopcja prymitywów `Button`/`Badge`** (porządkowa — koniec lokalnych `styles`). Strona [Usterki](apps/web/app/(app)/reports/page.tsx) przepięta w całości: badge'y pilności/statusu → `Badge`, przyciski akcji/usuwania/zgłaszania → `Button` (usunięte 4 osierocone style). Wzorzec ustalony; pozostałe strony przyrostowo.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.54.1] — 🔌 Specyfikacja integracji partnerów

- `[#066]` 🔌 **Plan podłączenia integracji zależnych od kluczy/umów** — [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md). Dla DKV/Eurowag (akceptacja kart) i Travis/SNAP (płatności) opisano dokładnie: wymagane env, punkty wpięcia w kodzie, model bezpieczeństwa. Bez martwych atrap — gotowe do realizacji, gdy dostarczysz dostępy (wzorzec env‑gated jak push/rate‑limiting). Tankerkönig (ceny DE) pozostaje wdrożone.
  - **Bramki:** biome czysto (docs). Bez zmian w kodzie.

## [0.54.0] — 🚦 Rate‑limiting endpointów (Upstash, kod gotowy)

- `[#065]` 🚦 **Ochrona endpointów przed nadużyciem/kosztami** (P2 z audytu). Nowy [`rateLimit`](apps/web/lib/ratelimit.ts) (Upstash sliding‑window 30/min na IP+akcję) wpięty w [`/api/route`](apps/web/app/api/route/route.ts), [`/api/fuel-prices`](apps/web/app/api/fuel-prices/route.ts) i logowanie passkey [`/api/passkey/auth/verify`](apps/web/app/api/passkey/auth/verify/route.ts) — przekroczenie → 429. **Bez kluczy Upstash = no‑op** (build/lokalnie działa bez limitów); fail‑open przy awarii limitera. Włączenie: [DEPLOY.md §7b](DEPLOY.md).
  - **Env** — `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` ([turbo.json](turbo.json)). **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.53.1] — ✋ Ostylowany modal potwierdzeń (zamiast window.confirm)

- `[#064]` ✋ **Dostępne, spójne potwierdzenia akcji destrukcyjnych** (a11y z audytu — koniec blokującego `window.confirm`). Nowy [`ConfirmProvider`](apps/web/components/ConfirmProvider.tsx) + hook `useConfirm()` (modal red/black, `role="dialog"`/`aria-modal`, Esc=anuluj, Enter=potwierdź), wpięty w [layout](apps/web/app/(app)/layout.tsx). Podmienione wszystkie `window.confirm`: usuwanie karty, usterki, kierowcy, pojazdu, klucza passkey i wyłączanie 2FA.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.53.0] — 📈 Wykresy w statystykach (koszty, spalanie)

- `[#063]` 📈 **Wykresy słupkowe per pojazd** (UX z audytu — dane już pobierane). Nowy lekki [`BarChart`](apps/web/components/ui.tsx) (CSS, bez zależności, motyw red/black). W widoku pojazdu ([/stats](apps/web/app/(app)/stats/page.tsx)): **„Koszty miesięczne"** (suma paliwo+AdBlue per miesiąc, ostatnie 6) i **„Spalanie wg tankowań"** (L/100km z `fuelConsumptionSeries`).
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.52.7] — ⏳ ListStatus na flocie + pusta kartoteka kierowców

- `[#062]` ⏳ **Dokończenie stanów list.** `ListStatus` (ładowanie/błąd/„Ponów") dodany w [Pojazdy](apps/web/app/(app)/vehicles/page.tsx) (błąd sieci nie udaje już „brak pojazdów"). W [Kartotece kierowców](apps/web/components/DriverRoster.tsx) dodany komunikat „Brak kierowców w kartotece". Łącznie stany list pokrywają główne listy CRUD: Karty, Usterki, Zespół, Pojazdy, Kierowcy.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.52.6] — 🧩 PageHeader na wszystkich stronach + ListStatus (zespół)

- `[#061]` 🧩 **Rollout wspólnych prymitywów UI.** `PageHeader` zastąpił powtarzany nagłówek (h1+podtytuł) na stronach: Statystyki, Pojazdy, Kierowcy, Zespół (łącznie z wcześniejszymi: Usterki, Rozliczenia, Karty = 7 stron). `ListStatus` (ładowanie/błąd/pusto + „Ponów") dodany w [Zespół](apps/web/app/(app)/team/page.tsx). Mniej duplikacji, spójniejszy wygląd.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.52.5] — 🚀 Cache członkostwa na wszystkich stronach

- `[#060]` 🚀 **Pełny rollout `getCachedMembership`** — wszystkie strony i komponenty klienckie wołające rolę/firmę przepięte na cache (stats, historia, zespół, kierowcy, pojazdy, trip, dev, RemindersWidget, PushToggle). Zostają na bezpośrednim `getActiveMembership` tylko konteksty serwerowe (layout, `/api/push/send`), outbox (zapis) i bramka onboardingu (CompanyBanner). Domyka rekomendację wydajnościową z audytu (z ~23 odpytań robi się minimum).
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.52.4] — 🧩 Wspólne prymitywy UI (start)

- `[#059]` 🧩 **Fundament pod koniec duplikacji stylów** (z audytu — 21× własny `styles`). Nowy [`components/ui.tsx`](apps/web/components/ui.tsx): `PageHeader`, `Button` (primary/ghost/danger), `Badge` — motyw red/black, web/DOM (osobno od `packages/ui` współdzielonego z mobile). Adopcja `PageHeader` w [Usterki](apps/web/app/(app)/reports/page.tsx), [Rozliczenia](apps/web/app/(app)/settlements/page.tsx), [Karty](apps/web/app/(app)/cards/page.tsx); reszta przyrostowo (najlepiej z podglądem apki).
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.52.3] — 🚀 Cache członkostwa (mniej zapytań)

- `[#058]` 🚀 **Mniej zbędnych zapytań o rolę/firmę** (wydajność z audytu — `getActiveMembership` bywało wołane 4–5× na jedno wejście). Nowy [`getCachedMembership`](apps/web/lib/membership.ts) (TTL 20 s + dedup zapytania w locie) wpięty w [`useFleet`](apps/web/lib/useFleet.ts) (większość stron), [NotificationBell](apps/web/components/NotificationBell.tsx) (layout), [Karty](apps/web/app/(app)/cards/page.tsx) i [Usterki](apps/web/app/(app)/reports/page.tsx). Unieważnianie cache po onboardingu firmy ([CompanyBanner](apps/web/components/CompanyBanner.tsx)) i po zaproszeniu ([join](apps/web/app/join/page.tsx)) — zachowuje świeżość. Pozostałe strony można przepiąć przyrostowo.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.52.2] — ⏳ Stany ładowania/błędu na listach

- `[#057]` ⏳ **Listy odróżniają „ładowanie", „błąd" i „pusto"** (UX z audytu — wcześniej błąd sieci wyglądał jak brak danych). Nowy [`ListStatus`](apps/web/components/ListStatus.tsx) (spinner / komunikat błędu z **„Ponów"** / pusto) wpięty w [Karty](apps/web/app/(app)/cards/page.tsx) i [Usterki](apps/web/app/(app)/reports/page.tsx); `catch` ustawia realny komunikat zamiast po cichu czyścić listę. Komponent gotowy do rozszerzenia na pozostałe listy.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.52.1] — 🎯 Podświetlenie aktywnej nawigacji

- `[#056]` 🎯 **Aktywna pozycja menu jest podświetlona** (UX z audytu — wcześniej brak wskazania bieżącej strony). Nowy [`SidebarNav`](apps/web/components/SidebarNav.tsx) (klient, `usePathname`) z klasą `app-navlink-active` (czerwone tło) i `aria-current="page"` dla czytników ekranu. Layout przepięty na komponent.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.52.0] — 📱 Responsywna powłoka aplikacji (mobile)

- `[#055]` 📱 **Aplikacja działa na telefonie** (UX z audytu — wcześniej 0 media queries, sidebar 240px zasłaniał ekran).
  - [`globals.css`](apps/web/app/globals.css): klasy powłoki `app-shell/app-sidebar/app-nav/app-navlink/app-main` + **media query ≤820px** — sidebar zmienia się w górny pasek, nawigacja pozioma (zawijana), mniejsze paddingi; `min-width:0` na `main` (koniec przepełnień flexa).
  - [`layout`](apps/web/app/(app)/layout.tsx) przepięty z inline‑styli na klasy (CSS może nadpisać w media query) + hover na linkach nawigacji.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.51.2] — 🧰 Infra: wyrównanie rygoru TS w mobile

- `[#054]` 🧰 **Mobile dziedziczy ostrzejsze reguły TS** (P z audytu — infra). [`apps/mobile/tsconfig.json`](apps/mobile/tsconfig.json): dodane `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch` (parytet jakości z web). Typecheck mobile zielony.
  - **Świadomie zostawione:** `engines.node ">=22"` (floor zgodny z Vercelem; `.nvmrc 26` to pin dev — nie zmieniamy, by nie ryzykować deployu). Rate‑limiting endpointów oraz większy refaktor UI (`packages/ui`, responsywność, modale, `useMembership`) — kolejny zaplanowany etap (wymaga weryfikacji z uruchomioną apką).
  - **Bramki:** biome czysto · `tsc` ×7 (web+mobile) · 71 testów.

## [0.51.1] — 📚 Synchronizacja dokumentacji ze stanem kodu

- `[#053]` 📚 **Domknięcie rozjazdów dokumentacji wykrytych w audycie.**
  - [`.env.example`](.env.example) przepisany 1:1 wg [`turbo.json`](turbo.json) (usunięte nieużywane POWERSYNC/TWILIO/OAuth/SENTRY; dodane HERE/MAPTILER/SITE_URL/VAPID/CRON/FUEL_PRICE).
  - [`DEPLOY.md`](DEPLOY.md): tabela env uzupełniona (HERE, MapTiler, SITE_URL, VAPID/CRON, FUEL_PRICE) + nota o nazwie repo.
  - [`README.md`](README.md): tabela modułów zaktualizowana (Usterki, Rozliczenia, Powiadomienia push, ceny paliwa, PII szyfrowane, 2FA egzekwowane) — statusy „gotowe".
  - [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md): sekcja **„Aktualny schemat (v0.51.0)"** — wszystkie tabele/kolumny/RPC z migracji 0001–0023 + nota o kolizjach numeracji.
  - **Bramki:** biome czysto (docs). Bez zmian w kodzie.

## [0.51.0] — 🛡️ Bezpieczeństwo P2: nagłówki, walidacja Zod, anty‑spam cen

- `[#052]` 🛡️ **Utwardzenie warstwy aplikacyjnej (P2 z audytu).**
  - **Nagłówki bezpieczeństwa** [`next.config.ts`](apps/web/next.config.ts): `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (geolocation tylko `self`), `X-DNS-Prefetch-Control`. Bez sztywnego CSP (by nie zepsuć mapy).
  - **Walidacja wejścia Zod** [`/api/route`](apps/web/app/api/route/route.ts): schema waypoints/profile/options (min. 2, maks. 25 punktów, poprawne współrzędne) → 400 dla śmieci. Chroni płatne API HERE/GraphHopper przed nadużyciem. Dodano `zod` do zależności web.
  - **DB** [`0023`](supabase/migrations/0023_fuel_prices_reporter.sql): `fuel_prices.reported_by` + insert tylko jako autor (`reported_by = auth.uid()`) + delete własnych — koniec `with check (true)` (anty‑spam cen).
  - **Pozostaje (wymaga Upstash/Vercel KV):** rate‑limiting endpointów — udokumentowane jako kolejny krok.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓. Migracja 0023 na produkcji.

## [0.50.0] — ⚡ Wydajność: filtry zakresu dat + limity zapytań

- `[#051]` ⚡ **Koniec ładowania całych tabel do pamięci** (P z audytu — wydajność).
  - **`packages/api`** — [`listFuelLogs`](packages/api/src/data/fuelLogs.ts)/[`listTripEvents`](packages/api/src/data/tripEvents.ts) przyjmują `from`/`to` (zakres `created_at`) i `limit`; [`listDefects`](packages/api/src/data/defects.ts) przyjmuje `limit`. Wstecznie kompatybilne.
  - **Web** — [Rozliczenia](apps/web/app/(app)/settlements/page.tsx) filtrują **zakres dat po stronie bazy** (zamiast w JS); [Statystyki](apps/web/app/(app)/stats/page.tsx)/[Historia](apps/web/app/(app)/forms/history/page.tsx)/[Usterki](apps/web/app/(app)/reports/page.tsx) ograniczone limitem (2000/1000/500) — mniejszy transfer i szybsze wejście na stronę.
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓.

## [0.49.0] — 🔒 Szyfrowanie tożsamości kierowcy (PII at‑rest)

- `[#050]` 🔒 **Imię, nazwisko i data urodzenia kierowcy szyfrowane at‑rest** (P1 z audytu) — wzorem numerów dokumentów (0015).
  - **DB** [`0022`](supabase/migrations/0022_driver_identity_encryption.sql): kolumny `first_name_enc/last_name_enc/birth_date_enc` (`pgp_sym_encrypt` + klucz z Vault), kolumny jawne **usunięte**. Odczyt przez RPC [`list_drivers`] (deszyfrowanie, owner/dispatcher), zapis przez [`driver_save`] (insert/update, audytowane). RLS i SECURITY DEFINER jak w 0015.
  - **`packages/api`** [drivers](packages/api/src/data/drivers.ts): `listDrivers`/`insertDriver`/`updateDriver` przepięte na RPC — **sygnatury i kształt danych bez zmian**, UI ([DriverRoster](apps/web/components/DriverRoster.tsx)) bez modyfikacji.
  - Efekt: wyciek backupu/bazy nie odsłania danych osobowych kierowców (czytelne tylko po deszyfrowaniu dla uprawnionych ról; każdy zapis audytowany). AES‑256 (pgcrypto) jest odporne na Grovera — właściwy poziom także „post‑kwantowo".
  - **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓. Migracja 0022 zastosowana na produkcji.

## [0.48.0] — 🔐 Hotfix bezpieczeństwa P0 + raport audytu

- `[#049]` 🔐 **Naprawa trzech krytycznych luk wykrytych w audycie ([docs/AUDIT-2026-06-21.md](docs/AUDIT-2026-06-21.md)).**
  - **DB** [`0021`](supabase/migrations/0021_push_sub_company_check.sql): polityki `push_subscriptions` walidują `company_id` (`is_member_of`) przy insert/update + spójne `to authenticated` + jawna polityka update. **Zamyka cross‑tenant wyciek powiadomień push.**
  - **WebAuthn** [`lib/passkey.ts`](apps/web/lib/passkey.ts): `rpID`/`origin` ze **stałej zaufanej domeny** `NEXT_PUBLIC_SITE_URL` (nie z nagłówków `x-forwarded-*` sterowanych przez klienta) — przywraca ochronę antyphishingową passkey.
  - **2FA** [`layout`](apps/web/app/(app)/layout.tsx): **serwerowe egzekwowanie AAL2** — konto z TOTP w sesji aal1 jest przekierowane do kroku 2FA (`/login?mfa=1`); [login](apps/web/app/login/page.tsx) wznawia krok TOTP po redirekcie (także dla magic‑link/OAuth/passkey). Wcześniej 2FA było tylko po stronie klienta.
  - **Audyt:** pełny raport jakości/bezpieczeństwa/wydajności/dokumentacji/infrastruktury — [docs/AUDIT-2026-06-21.md](docs/AUDIT-2026-06-21.md).
  - **Env** — `NEXT_PUBLIC_SITE_URL` ([turbo.json](turbo.json), Vercel). **Bramki:** biome czysto · `tsc` ×7 · 71 testów · build ✓. Migracja 0021 zastosowana na produkcji.

## [0.47.0] — ⛽ Ceny paliwa na mapie (Tankerkönig, DE)

- `[#048]` ⛽ **Realne ceny paliwa w okolicy (adapter Tankerkönig, Niemcy) za flagą env.**
  - **`packages/maps`** — [fuelprice](packages/maps/src/fuelprice.ts): `buildTankerkonigUrl`/`parseTankerkonig`/`fetchFuelPrices` (normalizacja, ceny ≤ 0 → null, promień ≤ 25 km). **+3 testy**.
  - **Web** [`/api/fuel-prices`](apps/web/app/api/fuel-prices/route.ts): klucz `FUEL_PRICE_API_KEY` czytany po stronie serwera; bez klucza `configured:false`. [`/map`](apps/web/app/(app)/map/page.tsx): przycisk **„⛽ Ceny paliwa (DE)"** → lista najtańszych stacji (diesel) wokół środka mapy, klik = lot do stacji.
  - **Pozostałe integracje partnerów** (akceptacja kart DKV/Eurowag, Travis/SNAP) wymagają umów/API — udokumentowane w [DEPLOY.md §8](DEPLOY.md) jako gotowe do podpięcia.
  - **Env** — `FUEL_PRICE_API_KEY` ([turbo.json](turbo.json)). **Bramki:** biome czysto · `tsc` ×7 · **71 testów** · build ✓.

## [0.46.0] — 🔔 Powiadomienia push (Web Push) — kod gotowy

- `[#047]` 🔔 **Push w przeglądarce/OS (service worker + VAPID + cron).** Kod kompletny; włączenie wymaga kluczy VAPID + migracji (instrukcja: [DEPLOY.md §7](DEPLOY.md)).
  - **DB** [`0020`](supabase/migrations/0020_push_subscriptions.sql): tabela `push_subscriptions` (endpoint, p256dh, auth) + RLS (użytkownik zarządza tylko swoimi).
  - **`packages/api`** — [push](packages/api/src/data/push.ts): `savePushSubscription`/`deletePushSubscription`/`listPushSubscriptionsForDelivery`.
  - **Web** — [service worker](apps/web/public/sw.js) (push + klik), [`PushToggle`](apps/web/components/PushToggle.tsx) w [Ustawieniach](apps/web/app/(app)/settings/page.tsx) (zgoda + subskrypcja), endpoint wysyłki [`/api/push/send`](apps/web/app/api/push/send/route.ts) (owner/spedytor) i **cron** [`/api/cron/notify`](apps/web/app/api/cron/notify/route.ts) dosyłający nieprzeczytane powiadomienia (przeładowanie/terminy/usterki) — [`vercel.json`](apps/web/vercel.json) 07:00.
  - **Env** — `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` ([turbo.json](turbo.json)). Bez kluczy UI pokazuje „skonfiguruj VAPID" (build‑safe).
  - **Bramki:** biome czysto · `tsc` ×7 · **68 testów** · build ✓.

## [0.45.0] — 💸 Podpowiedź ceny paliwa/AdBlue z historii

- `[#046]` 💸 **Auto‑podpowiedź ceny przy tankowaniu (paliwo i AdBlue) na bazie historii pojazdu.**
  - **`packages/core`** — [`latestUnitPrice`](packages/core/src/billing.ts): ostatnia cena jednostkowa [waluta/L] z historii (pierwszy wpis z dodatnią kwotą i litrami). +2 testy.
  - **Web** [Formularz Paliwo/AdBlue](apps/web/components/LiquidForm.tsx): pod polem kwoty pokazuje **„Ostatnia cena: X /l · stacja · data"** + przycisk **„Przelicz kwotę"** (kwota = litry × ostatnia cena). Bez zewnętrznych API — alternatywa dla zaciągania cen z partnera (Tankerkönig itp. pozostaje opcją na później).
  - **Bramki:** biome czysto · `tsc` ×7 · **68 testów** · build ✓.

## [0.44.0] — 🧾 Rozliczenia tras + eksport CSV/PDF

- `[#045]` 🧾 **Okresowe rozliczenie pojazdu (koszty + zysk) z eksportem CSV (Excel) i wydrukiem/PDF.**
  - **`packages/core`** — [silnik rozliczeń](packages/core/src/billing.ts) `buildSettlement()` (dystans z liczników, koszt paliwa/AdBlue, serwis/inne ze zdarzeń trasy, myto, przychód wg stawki za km → koszt całkowity, zysk, marża, spalanie full‑to‑full); generator [CSV](packages/core/src/csv.ts) `toCsv()`/`csvEscape()` (RFC 4180, separator `;` dla Excela PL). **+4 testy** ([settlement.test.ts](packages/core/src/settlement.test.ts)).
  - **Web** [`/settlements`](apps/web/app/(app)/settlements/page.tsx): wybór pojazdu + zakres dat (domyślnie bieżący miesiąc) + stawka €/km + myto; kafelki (dystans, spalanie, koszt, **zysk**, marża), tabela pozycji (paliwo/AdBlue/trasa) i przyciski **⬇️ Eksport CSV** (z BOM) oraz **🖨️ Drukuj / PDF** (`@media print`).
  - **Nawigacja** — pozycja **„Rozliczenia"** (moduł `stats`) + i18n PL/EN.
  - **Bramki:** biome czysto · `tsc` ×7 · **66 testów** · build ✓.

## [0.43.0] — 🚛 Mapa: wymiary TIR + ruch na żywo + filtr stacji wg kart

- `[#044]` 🚛 **Routing wg pełnych wymiarów TIR, ruch na żywo i filtr stacji akceptujących karty flotowe.**
  - **`packages/maps`** — [profil pojazdu](packages/maps/src/types.ts) o pole `axleCount`; [HERE](packages/maps/src/here.ts) wysyła konfigurowalną liczbę osi (`truck[axleCount]`). Routing HERE jest już **świadomy ruchu** (`departureTime` = teraz → ETA z korkami).
  - **`packages/core`** — [katalog](packages/core/src/catalog.ts) `FUEL_CARD_STATION_BRANDS` (orientacyjne marki stacji per karta) + `stationMatchesProviders()`/`stationBrandsForProviders()`; **8 testów** ([catalog.test.ts](packages/core/src/catalog.test.ts)).
  - **Web** [`/map`](apps/web/app/(app)/map/page.tsx): panel **„Wymiary i tonaż"** (masa, osie, wys./szer./dł.) przekazywany do routingu TIR; **filtr „tylko stacje akceptujące moje karty"** — chipy z markami kart floty ([`useFleet`](apps/web/lib/useFleet.ts) dorzuca `provider`), POI stacji filtrowane po marce (parkingi bez zmian, przeliczenie bez ponownego pobierania z Overpass).
  - **Uwaga:** filtr akceptacji kart jest **poglądowy** (dane OSM `brand`/`operator`) — wiążąca akceptacja wymaga API partnerów (Eurowag/DKV).
  - **Bramki:** biome czysto · `tsc` ×7 · **62 testy** · build ✓.

## [0.42.0] — 🔧 Moduł usterek + graficzny schemat auta

- `[#043]` 🔧 **Zgłaszanie usterek/uszkodzeń przez kierowców z auto‑zaznaczaniem na schemacie pojazdu.**
  - **DB** [`0019`](supabase/migrations/0019_vehicle_defects.sql): tabela `vehicle_defects` (część, strona, pilność `low|medium|high`, kontrolka na desce, opis, status `open|in_progress|resolved`, autor/rozwiązujący). **RLS**: kierowca widzi/zgłasza usterki swojego auta i własne; **owner/spedytor (mechanik)** zmienia status i usuwa.
  - **`packages/core`** — [enums](packages/core/src/enums.ts) `DEFECT_SEVERITIES`/`DEFECT_STATUSES`; [katalog](packages/core/src/catalog.ts) `DEFECT_PARTS` (hamulce/opony/zawieszenie/światła…), `DEFECT_SIDES`, **`guessDefectPart()`** (rozpoznaje układ z opisu — klocki/tarcze, opony, kontrolka…); [schema](packages/core/src/schemas.ts) `defectSchema`. Nowy moduł aplikacji **`reports`** (domyślnie dla kierowcy).
  - **`packages/api`** — [defects](packages/api/src/data/defects.ts): `listDefects`/`insertDefect`/`updateDefectStatus`/`deleteDefect`.
  - **Web** — [`/reports`](apps/web/app/(app)/reports/page.tsx): formularz (pojazd, część, strona, pilność, kontrolka, opis) + **interaktywny [schemat ciężarówki](apps/web/components/VehicleDiagram.tsx)** (widok z góry) — strefa **podświetla się automatycznie wg opisu** (np. „klocki z lewej” → koła + lewa strona), klik strefy ustawia stronę/koła. Lista zgłoszeń ze statusami; mechanik: **W naprawie / Naprawione / Otwórz / Usuń**. Pozycja **„Usterki”** w nawigacji + i18n.
  - **Bramki:** biome czysto · `tsc` ×7 · 52 testy · build ✓.

## [0.41.0] — 📊 Statystyki per‑pojazd + pojemności zbiorników

- `[#042]` 📊 **Statystyki uporządkowane wg pojazdu + pola pojemności zbiorników.**
  - **DB** [`0018`](supabase/migrations/0018_vehicle_tanks.sql): `vehicles.fuel_tank_l`, `adblue_tank_l`.
  - **Web** [`/vehicles`](apps/web/app/(app)/vehicles/page.tsx): pola **pojemność zbiornika paliwa i AdBlue** (formularz + szczegóły auta).
  - **Web** [`/stats`](apps/web/app/(app)/stats/page.tsx): **kafelki pojazdów** → klik wchodzi w pojazd → **rozwinięcie z poszczególnymi tankowaniami** (paliwo/AdBlue z oznaczeniem „do pełna/częściowe") i zdarzeniami trasy. Spalanie „od pełna do pełna", a **tankowania częściowe wliczane** do litrów/kosztów.
  - **Bramki:** biome czysto · `tsc` ×7 · build ✓.

## [0.40.0] — ✏️ Edycja formularzy (paliwo / AdBlue / Trasa)

- `[#041]` ✏️ **Edycja wcześniej zapisanych formularzy, nie tylko dodawanie/usuwanie.**
  - **`packages/api`** — [`getFuelLog`/`updateFuelLog`](packages/api/src/data/fuelLogs.ts), [`getTripEvent`/`updateTripEvent`](packages/api/src/data/tripEvents.ts) (RLS: autor lub owner; geo nadpisywane tylko gdy podane).
  - **Web** — formularze [Paliwo/AdBlue](apps/web/components/LiquidForm.tsx) i [Trasa](apps/web/app/(app)/forms/trip/page.tsx) obsługują tryb `?edit=<id>` (wczytanie + aktualizacja + powrót do historii).
  - **Web** [Historia](apps/web/app/(app)/forms/history/page.tsx): przy zsynchronizowanych wpisach przycisk **„Edytuj"**.
  - **Bramki:** biome czysto · `tsc` ×7 · 54 testy · build ✓.

## [0.39.0] — ⛽ „Do pełna" + statystyki AdBlue i Tras

- `[#040]` ⛽ **Flaga „do pełna" przy tankowaniu + rozszerzone statystyki.**
  - **DB** [`0017`](supabase/migrations/0017_fuel_full_tank.sql): kolumna `is_full` (fuel_logs + adblue_logs).
  - **`packages/core`** — `fuelLogSchema.isFull`; nowa funkcja [`consumptionFullToFull`](packages/core/src/billing.ts) — spalanie liczone **od pełna do pełna** (uwzględnia tankowania częściowe). +2 testy.
  - **Web** [Formularz paliwa](apps/web/components/LiquidForm.tsx): checkbox **„Zatankowano do pełna"**.
  - **Web** [`/stats`](apps/web/app/(app)/stats/page.tsx): sekcje **⛽ Paliwo** (spalanie full‑to‑full), **💧 AdBlue** (zużycie L/100km, litry, koszt) i **🚚 Trasy** (zdarzenia wg typu, załadowano/rozładowano kg, koszt serwis/inne).
  - **Bramki:** biome czysto · `tsc` ×7 · **54 testy** · build ✓.

## [0.38.1] — 🐞 Fix: synchronizacja formularzy (demo-pojazdy + ukryty błąd)

- `[#039]` 🐞 **Naprawa „Błąd synchronizacji" w formularzach (paliwo/AdBlue/Trasa).**
  - Przyczyna: zalogowanemu bez firmy/pojazdu [`useFleet`](apps/web/lib/useFleet.ts) podsuwał **dane DEMO** (np. WL5145U), których ID nie istnieje w bazie → zapis nie mógł się zsynchronizować; dodatkowo prawdziwy błąd Supabase był ukryty (obiekt, nie `Error`).
  - **Fix:** `useFleet` zwraca stan `no-company` / `no-vehicles` (bez demo dla zalogowanych); formularze [Paliwo/AdBlue](apps/web/components/LiquidForm.tsx) i [Trasa](apps/web/app/(app)/forms/trip/page.tsx) pokazują **baner „utwórz firmę / dodaj pojazd"** i blokują zapis; [outbox](apps/web/lib/outbox.ts) pokazuje **realny komunikat** błędu; w [Historii](apps/web/app/(app)/forms/history/page.tsx) przycisk **„Usuń"** czyści błędne wpisy z kolejki.
  - **Weryfikacja:** wszystkie ścieżki zapisu (paliwo gotówka/karta, trasa, AdBlue) działają E2E jako właściciel z firmą+pojazdem. Bramki: biome czysto · `tsc` ×7 · build ✓.

## [0.38.0] — 🚛 Routing TIR przez HERE (wymiary/tonaż + realne myto + ruch)

- `[#038]` 🚛 **Prawdziwy routing ciężarowy: HERE Routing v8 jako `RoutingProvider`.**
  - **`packages/maps`** — pełny [adapter HERE](packages/maps/src/here.ts): tryb `truck` z wymiarami (tonaż/wysokość/szerokość/długość/osie), omijanie myta/promów, `exclude[countries]`, ruch (`departureTime` ISO), **realne myto** (z normalizacją walut PLN/CZK/… → EUR) i dekoder **flexible polyline**.
  - **Web** [`/api/route`](apps/web/app/api/route/route.ts): priorytet **HERE → GraphHopper → mock**; przy HERE myto jest realne (`tollEstimated:false`).
  - **Env** — `HERE_API_KEY` (Vercel + `turbo.json`). 
  - **Weryfikacja E2E na żywo:** TIR Berlin→Warszawa 574,5 km, myto **349 €** (Maut DE + PL), geometria 4163 pkt; auto myto 31,7 €. Testy: dekoder na wektorze referencyjnym + budowa URL TIR. **Bramki:** biome czysto (114) · `tsc` ×7 · **51 testów** · build ✓.

## [0.37.0] — 📍 Geokoder w formularzu Trasa

- `[#037]` 📍 **Wyszukiwarka miejsc (adres → GPS) także w formularzu Trasa** — domknięcie pełnego wsparcia geolokalizacji we wszystkich formularzach ([trip](apps/web/app/(app)/forms/trip/page.tsx), reuse [`PlaceSearch`](apps/web/components/PlaceSearch.tsx)). Bramki: biome czysto · `tsc` ×7 · build ✓.

## [0.36.0] — 🧭 Samouczek + pomoc kontekstowa na każdym panelu

- `[#036]` 🧭 **Interaktywne oprowadzenie po aplikacji + pomoc „?” zawsze pod ręką.**
  - **Web** [`HelpCenter`](apps/web/components/HelpCenter.tsx) w [layoucie](apps/web/app/(app)/layout.tsx): pływający przycisk **„?”** na każdym panelu → szuflada z opisem panelu i **wyjaśnieniem każdej funkcji** (co robi, jak działa), kontekstowo wg trasy.
  - **Oprowadzenie krok‑po‑kroku** przy pierwszym wejściu (6 kroków; flaga w `localStorage`) + przycisk „Pokaż oprowadzenie ponownie".
  - **Bramki:** biome czysto (114) · `tsc` (×7) · `next build` ✓.

## [0.35.0] — 🔔 Powiadomienia w aplikacji (przeładowanie + terminy)

- `[#035]` 🔔 **Centrum powiadomień: dzwonek + realtime, alert przeładowania, wygasające terminy.**
  - **DB** [`0017`](supabase/migrations/0017_notifications.sql) + [`0018`](supabase/migrations/0018_fix_expiry_onconflict.sql): tabela `notifications` + RLS (czytasz tylko swoje), realtime; RPC `notify_company` (powiadom kadrę) i `generate_expiry_notifications` (idempotentne, OC/przegląd/leasing/karta ≤30 dni).
  - **`packages/api`** — [`listNotifications`, `markNotificationsRead`, `notifyCompany`, `generateExpiryNotifications`](packages/api/src/data/notifications.ts).
  - **Web** — [`NotificationBell`](apps/web/components/NotificationBell.tsx) w menu (badge + realtime + oznaczanie przeczytanych); **alert przeładowania** w [formularzu Trip](apps/web/app/(app)/forms/trip/page.tsx) (waga > ładowność → powiadomienie dla kadry); terminy generowane przy wejściu (owner/dispatcher).
  - **Weryfikacja E2E na żywej bazie:** `notify_company` 204 ×3, `generate_expiry` 204 + powiadomienie + idempotencja (2× → 1). ✅
  - **Bramki:** biome czysto (113) · `tsc` (×7) · `next build` ✓.
  - ⏳ Web push (telefon przy zamkniętej apce) jako kolejny krok.

## [0.34.0] — 🧩 Uprawnienia modułowe + panel Zespół

- `[#034]` 🧩 **Modułowy dostęp — właściciel decyduje, kto widzi które panele.**
  - **DB** [`0016`](supabase/migrations/0016_member_modules.sql): `memberships.modules text[]` + RPC `company_members` (lista członków z e‑mailem, owner/dispatcher).
  - **`packages/core`** — katalog [`APP_MODULES` + `DEFAULT_MODULES` + `effectiveModules`](packages/core/src/catalog.ts) (pojazdy/kierowcy/karty/formularze/mapa/statystyki).
  - **`packages/api`** — `getActiveMembership` z modułami; `listCompanyMembers`, `updateMember`.
  - **Web** [`/team`](apps/web/app/(app)/team/page.tsx): właściciel nadaje rolę (spedytor=pełny wgląd / kierowca=tylko swoje) i przełącza moduły per osoba; menu [`layout`](apps/web/app/(app)/layout.tsx) filtruje panele wg uprawnień.
  - Twarda izolacja danych nadal po stronie RLS (role); moduły sterują widocznością paneli/funkcji.
  - **Bramki:** biome czysto (111) · `tsc` (×7) · `next build` ✓.

## [0.33.0] — 🎨 Grafika kart flotowych + geokoder w formularzach

- `[#033]` 🎨 **Wizualne karty flotowe + wyszukiwanie miejsc (adres → GPS) w formularzach.**
  - **Web** [`CardArt`](apps/web/components/CardArt.tsx): stylizowana grafika karty w barwach dostawcy (DKV/Eurowag/IQ Card/Shell/…); pokazywana na liście [`/cards`](apps/web/app/(app)/cards/page.tsx).
  - **Web** [`PlaceSearch`](apps/web/components/PlaceSearch.tsx): wpisanie miasta/adresu → podpowiedzi → ustawienie **współrzędnych GPS** (MapTiler; fallback Nominatim). Wpięte w formularz [Paliwo/AdBlue](apps/web/components/LiquidForm.tsx) (auto‑uzupełnia miasto, kraj, GPS).
  - **Bramki:** biome czysto (110) · `tsc` (×7) · `next build` ✓.
  - ℹ️ Grafiki to własna kolorystyka marek (bez kopiowania logotypów — bezpiecznie prawnie).

## [0.32.0] — 🔒 Szyfrowanie danych wrażliwych kierowcy (PII)

- `[#032]` 🔒 **Numery dowodu/paszportu/prawa jazdy kierowcy szyfrowane at‑rest (pgcrypto + Vault).**
  - **DB** [`0015`](supabase/migrations/0015_driver_pii_encryption.sql): kolumny `*_enc bytea`, usunięte plaintextowe `*_number`; RPC `driver_set_documents` (zapis+szyfrowanie) i `driver_documents` (odczyt+deszyfrowanie) — **tylko owner/dispatcher, audytowane**.
  - **`packages/api`** — [`setDriverDocuments`, `getDriverDocuments`](packages/api/src/data/drivers.ts); `listDrivers`/`driverToRow` bez danych wrażliwych.
  - **Web** [`/drivers`](apps/web/components/DriverRoster.tsx): dokumenty zapisywane przez szyfrowany RPC; przycisk **„🔓 Dokumenty"** odsłania je na żądanie (z audytem); w edycji pola dokumentów są puste (puste = bez zmian).
  - **Weryfikacja E2E na żywej bazie:** owner zapis→odczyt odszyfrowany OK; w tabeli **szyfrogram (152 B, bez plaintextu)**; kierowca → „Brak uprawnień". ✅
  - **Bramki:** biome czysto (108) · `tsc` (×7) · `next build` ✓.

## [0.31.0] — 🛡️ Hardening RLS: izolacja danych i prywatność ról

- `[#031]` 🛡️ **Pełna izolacja danych wg ról — właściciel widzi wszystko, kierowca tylko swoje, developer nic wrażliwego.**
  - **DB** [`0013`](supabase/migrations/0013_rls_hardening.sql) + [`0014`](supabase/migrations/0014_fix_vehicles_recursion.sql):
    - **Developer** usunięty z polityk danych firmowych — widzi **wyłącznie agregaty** (`dev_stats`), nie dane firm/kierowców/wrażliwe.
    - **Kierowca** widzi **tylko przypisane auto** (`driver_assignments`, fn `is_assigned_to_vehicle`) i **tylko swoje formularze** (`driver_id`); nie widzi innych kierowców.
    - **Rabaty kart ukryte przed kierowcą** — RPC `list_fuel_cards_for_user` (rabat tylko dla owner/dispatcher; kierowca → karta swojego auta bez rabatu); bezpośredni odczyt `fuel_cards` tylko owner/dispatcher.
    - **PIN** czyta członek firmy (kierowca też — automaty), **nie** developer; ustawia tylko owner.
  - **Web** — `/cards` i formularze przez RPC (kierowca widzi kartę auta bez rabatu, może odsłonić PIN); `/vehicles` ukrywa edycję/usuwanie dla kierowcy; `/dev` pokazuje tylko liczniki (bez audytu).
  - **Weryfikacja E2E na żywej bazie:** kierowca → rabat `null`, `fuel_cards`=[], tylko swoje auto; obcy → []; właściciel → rabat 7%. ✅
  - **Bramki:** biome czysto (108) · `tsc` (×7) · `next build` ✓.
  - ⏳ *Następny krok:* szyfrowanie‑at‑rest danych PII kierowcy (dowód/paszport) — obecnie chronione RLS, do zaszyfrowania jak PIN-y.

## [0.30.0] — ⛽ Mapa: koszt paliwa trasy, POI wzdłuż trasy, lokalizacja, udostępnianie

- `[#030]` ⛽ **Mapa praktyczna dla kierowcy — koszt paliwa, korytarz POI, „moja lokalizacja", zapisane miejsca, link do trasy.**
  - **Koszt paliwa trasy** ([`/map`](apps/web/app/(app)/map/page.tsx)) — z silnika [`billing.fuelCost`](packages/core/src/billing.ts): spalanie l/100km × cena × rabat karty; w wynikach „Paliwo (szac.)" + **Razem (myto+paliwo)**.
  - **POI wzdłuż trasy** — korytarz ≤6 km od linii ([`haversineKm`](packages/maps/src/geo.ts)).
  - **📍 Moja lokalizacja** (geolokalizacja jako Start), **⭐ zapisane miejsca** (localStorage) z szybkim dodaniem jako przystanek.
  - **🔗 Udostępnij trasę** — link `?r=…` (kopiowany do schowka), wczytywany przy wejściu.
  - **Bramki:** biome czysto (108) · `tsc` (×7) · `next build` ✓.

## [0.29.0] — 🧑‍✈️ Kartoteka kierowców (dane + uprawnienia)

- `[#029]` 🧑‍✈️ **Ręczna kartoteka kierowców z danymi osobowymi i uprawnieniami.**
  - **DB** [`0012`](supabase/migrations/0012_drivers_roster.sql): tabela `drivers` (imię, nazwisko, data ur., nr prawa jazdy/dowodu/paszportu, kategorie, uprawnienia, notatki) + RLS — **PII tylko dla owner/dispatcher**.
  - **`packages/core`** — `driverSchema`, katalogi [`LICENSE_CATEGORIES` + `DRIVER_QUALIFICATIONS`](packages/core/src/catalog.ts) (AM…D+E, kod 95, ADR, wózki, HDS…).
  - **`packages/api`** — [`listDrivers/insertDriver/updateDriver/deleteDriver`](packages/api/src/data/drivers.ts).
  - **Web** [`/drivers`](apps/web/components/DriverRoster.tsx): formularz + lista (dodawanie/edycja/usuwanie), kategorie i uprawnienia jako „chipy" + własne wpisy.
  - **Bramki:** biome czysto (108) · `tsc` (×7) · `next build` ✓.

## [0.28.0] — 🚚 Flota: edycja/usuwanie + licencja + karty↔pojazd

- `[#028]` 🚚 **Pełne zarządzanie flotą i powiązanie kart z pojazdami.**
  - **DB** [`0011`](supabase/migrations/0011_vehicle_license_card_link.sql): `vehicles.license_number`, `fuel_cards.vehicle_id` (FK).
  - **`packages/api`** — [`updateVehicle`, `deleteVehicle`](packages/api/src/data/vehicles.ts); karty: `vehicle_id` w zapisie/edycji, [`listFuelCardsByVehicle`](packages/api/src/data/fuelCards.ts), rejestracja pojazdu w liście kart.
  - **Web `/vehicles`** — **edycja i usuwanie** pojazdów (nie tylko dodawanie), pole **numer licencji**, **rozwijany panel** auta ze szczegółami i **kartami przypisanymi** do pojazdu.
  - **Web `/cards`** — **przypisanie karty do pojazdu** (dropdown) + rejestracja widoczna na liście kart.
  - **Formularz paliwa** — karty zaciągane z bazy (czytelna nazwa marki + rejestracja).
  - **Bramki:** biome czysto (106) · `tsc` (×7) · `next build` ✓.

## [0.27.0] — 🔑 Passkey (logowanie bez hasła, WebAuthn)

- `[#027]` 🔑 **Klucze dostępu (passkey) — logowanie odciskiem/Face ID/kluczem sprzętowym.**
  - **DB** [`0010`](supabase/migrations/0010_passkeys.sql): tabela `passkeys` (credential_id, public_key, counter, transports) + RLS (użytkownik zarządza tylko swoimi).
  - **`packages/api`** — `createSupabaseAdminClient` (service-role, tylko serwer).
  - **API** [`/api/passkey/*`](apps/web/app/api/passkey): `register/options`, `register/verify`, `auth/options`, `auth/verify` (`@simplewebauthn/server`). Discoverable credentials; sesja mintowana po weryfikacji asercji przez magic-link → `verifyOtp` (token zwracany tylko po poprawnym kluczu).
  - **Web** — [`/settings`](apps/web/app/(app)/settings/page.tsx): dodawanie/usuwanie kluczy; [`/login`](apps/web/app/login/page.tsx): „Zaloguj kluczem (passkey)" (`@simplewebauthn/browser`).
  - **Weryfikacja:** runtime endpointu `auth/options` zwraca `challenge`/`rpId` (200). Logowanie kluczem do potwierdzenia na realnym urządzeniu (biometria). **Bramki:** biome czysto (106) · `tsc` (×7) · `next build` ✓ (4 trasy passkey).

## [0.26.0] — 🔐 Reset hasła + weryfikacja dwuetapowa (2FA)

- `[#026]` 🔐 **Bezpieczeństwo konta: reset hasła z e-maila + 2FA (TOTP).**
  - **Reset hasła** — link „Nie pamiętasz hasła?" na [`/login`](apps/web/app/login/page.tsx) (`resetPasswordForEmail`), strona [`/reset`](apps/web/app/reset/page.tsx) do ustawienia nowego hasła; [`/auth/callback`](apps/web/app/auth/callback/route.ts) obsługuje param `next` (ochrona przed open-redirect).
  - **2FA (TOTP)** — strona [`/settings`](apps/web/app/(app)/settings/page.tsx): włącz/wyłącz, kod QR + sekret, weryfikacja kodem (Google Authenticator/Authy/1Password). Logowanie wymusza krok 2FA, gdy włączone (sprawdzenie AAL → `mfa.challenge`/`verify`).
  - Logowanie hasłem przekierowuje na pulpit; nowa pozycja **„Ustawienia"** w menu.
  - **`packages/i18n`** — klucze auth (PL/EN, parytet). Supabase MFA TOTP włączone (enroll+verify).
  - **Bramki:** biome czysto (101) · `tsc` (×7) · parytet i18n · `next build` ✓ (`/reset`, `/settings`).

## [0.25.0] — 🗺️ Mapa 3D (MapTiler) + wyszukiwarka miejsc

- `[#025]` 🗺️ **Mapa: dowolne miejsce z wyszukiwarki, podkład 3D (satelita/teren/budynki), współrzędne POI.**
  - **`packages/maps`** — [`geocode`](packages/maps/src/geocode.ts): zamiana nazwy miasta/adresu/POI na współrzędne (MapTiler; fallback Nominatim).
  - **Web** [`/map`](apps/web/app/(app)/map/page.tsx): pola Start/Cel/Przystanki to **wyszukiwarka miejsc** z podpowiedziami (dowolny kraj). Podkład: **Ciemna / Satelita / Teren** (MapTiler), **teren 3D + budynki 3D + globus**, pochylenie/obrót. Znaczniki przystanków z **GPS**; dymek POI/firmy pokazuje **współrzędne + „Nawiguj"**.
  - **Env** — `NEXT_PUBLIC_MAPTILER_KEY` (Vercel + `turbo.json` globalEnv). Bez klucza działa fallback OSM.
  - **Weryfikacja:** geokoder MapTiler 200 (Rotterdam), style dark/hybrid + terrain-rgb 200. **Bramki:** biome czysto (99) · `tsc` (×7) · `next build` ✓.

## [0.24.0] — 🚚 Pojazdy: marka, VIN, waga własna, przegląd/OC

- `[#024]` 🚚 **Rozbudowa kartoteki pojazdu — marka z listy, VIN, waga własna, terminy i ubezpieczyciel.**
  - **DB** [`0009`](supabase/migrations/0009_vehicle_make_vin_insurer.sql): kolumny `make`, `vin`, `insurer`.
  - **`packages/core`** — katalog [`VEHICLE_MAKE_GROUPS` + `INSURERS`](packages/core/src/catalog.ts) (segmenty: dostawcze / ciężarowe / pickupy); `vehicleSchema` + `make`/`vin` (walidacja 17 znaków)/`insurer`.
  - **`packages/api`** — `vehicleToRow`/`listVehicles` z nowymi polami.
  - **Web** [`/vehicles`](apps/web/app/(app)/vehicles/page.tsx): marka z listy (grupy + „Inna"), VIN, **waga na pusto (z dowodu)**, data przeglądu, data OC, **ubezpieczyciel z listy** (PZU/Warta/Allianz/…); lista floty pokazuje markę+model, terminy i ubezpieczyciela.
  - **Bramki:** biome czysto (98) · `tsc` (×7) · 49 testów · `next build` ✓.

## [0.23.0] — 💳 Karty: nowi dostawcy + edycja i usuwanie

- `[#023]` 💳 **Karty paliwowe — TankPool24, Morgan Fuels, IQ Card + pełna edycja i usuwanie.**
  - **DB** [`0008`](supabase/migrations/0008_card_providers.sql): nowe wartości enuma `fuel_card_provider`.
  - **`packages/core`** — czytelne nazwy marek [`FUEL_CARD_PROVIDER_LABELS`](packages/core/src/enums.ts).
  - **`packages/api`** — [`updateFuelCard`, `deleteFuelCard`](packages/api/src/data/fuelCards.ts) (RLS: owner).
  - **Web** [`/cards`](apps/web/app/(app)/cards/page.tsx): tryb edycji (PIN można zostawić bez zmian), przycisk usuwania z potwierdzeniem, ładne nazwy dostawców.
  - **Bramki:** biome czysto (97) · `tsc` (×7) · 49 testów · `next build` ✓.

## [0.22.0] — 🆕 Rejestracja konta (e-mail + hasło)

- `[#022]` 🆕 **Rejestracja na ekranie logowania — przełącznik „Zaloguj się ⇄ Zarejestruj się".**
  - **Web** [`/login`](apps/web/app/login/page.tsx): tryb `signup` (`auth.signUp`), przycisk „Utwórz konto", przekierowanie na `/dashboard` po sukcesie, obsługa potwierdzenia e-mail (komunikat „sprawdź skrzynkę", gdy wymagane). Logowanie hasłem też przekierowuje na pulpit.
  - **`packages/i18n`** — nowe klucze auth (PL/EN, parytet): `signUp`, `createAccount`, `toSignUp`, `toSignIn`, `signInSub`, `signUpSub`, `checkEmail`.
  - **Supabase Auth** — wyłączone potwierdzanie e-mail (`mailer_autoconfirm`) → rejestracja od razu loguje (decyzja na etap startu; docelowo własny SMTP).
  - **Onboarding** — nowy użytkownik bez firmy widzi baner „Utwórz firmę" ([`CompanyBanner`](apps/web/components/CompanyBanner.tsx)).
  - **Weryfikacja E2E na żywej bazie:** rejestracja → sesja od razu (`confirmed_at` ustawione) → sprzątanie usera 200. ✅
  - **Bramki:** biome czysto (97) · `tsc` (×7) · parytet i18n · `next build` ✓.

## [0.21.0] — ☁️ Wdrożenie produkcyjne (Vercel + Supabase)

- `[#021]` ☁️ **WebApp na żywo: [e-logistic-one.vercel.app](https://e-logistic-one.vercel.app).**
  - **Vercel** — projekt `e-logistic` (Root Directory `apps/web`, framework Next.js), 4 zmienne środowiskowe (public + sekrety), deploy przez CLI. Dokument [`DEPLOY.md`](DEPLOY.md).
  - **Strona startowa** [`/`](apps/web/app/page.tsx) — usunięty placeholder „v0.2.0 · Faza 0"; dodany przycisk **„Wejdź do aplikacji" → `/login`** i opis dla kogo.
  - **Supabase Auth** — `Site URL` + lista redirectów ustawione na domenę Vercel (z zachowaniem `localhost` dla dev).
  - **`turbo.json`** — `globalEnv` deklaruje zmienne (Supabase/GraphHopper), by Turbo nie przycinał ich w buildzie.
  - **`engines.node`** poluzowane do `>=22` (kompatybilność z Vercelem; lokalnie dev na Node 26). `.vercel/` w `.gitignore`.
  - **Weryfikacja na żywej domenie:** `/` 200 · `/login` 200 · `POST /api/route` → trasa Berlin→Warszawa **570 km** (GraphHopper w runtime, bez mock‑fallbacku). ✅
  - **Bramki:** `next build` ✓ (17 tras) · sekrety poza repo.

## [0.20.0] — 🛠️ Panel developera (diagnostyka)

- `[#020]` 🛠️ **Panel developera — liczniki encji i ostatni audyt (dostęp tylko dla roli developer).**
  - **DB** [`0007`](supabase/migrations/0007_dev_stats.sql): RPC `dev_stats` (json z licznikami, `security definer` + `is_developer`).
  - **`packages/api`** — [`getDevStats`, `listRecentAudit`](packages/api/src/data/dev.ts).
  - **Web** [`/dev`](apps/web/app/(app)/dev/page.tsx): kafelki liczników (firmy/użytkownicy/pojazdy/tankowania/…) + lista ostatnich wpisów `audit_log`. Strona ukryta (dostęp przez URL, rola developer).
  - **Weryfikacja E2E na żywej bazie:** nie-developer → odmowa (400), developer → liczniki (200). ✅
  - **Bramki:** biome czysto (97 plików) · `tsc` exit 0 (×7) · **49 testów** · `next build` ✓ (15 tras).

## [0.19.0] — 📡 Zgłoszenia na mapie (realtime: wypadek/policja/waga…)

- `[#019]` 📡 **Społecznościowe zgłoszenia na mapie z aktualizacją na żywo (Supabase Realtime).**
  - **DB** [`0006`](supabase/migrations/0006_map_reports_latlng.sql): `lat`/`lng` w `map_reports` (łatwy odczyt; `geo` zostaje do zapytań przestrzennych).
  - **`packages/api`** — [`insertMapReport`, `listActiveMapReports`](packages/api/src/data/mapReports.ts).
  - **Web** [`/map`](apps/web/app/(app)/map/page.tsx): „Tryb zgłoszeń" → klik na mapie dodaje zgłoszenie (typ: wypadek/policja/zamknięcie/korek/waga/zagrożenie), markery kolorowane wg typu + popup; **subskrypcja realtime** (INSERT) odświeża markery u wszystkich na żywo.
  - **Weryfikacja E2E na żywej bazie:** insert zgłoszenia przez RLS (`reported_by=auth.uid()`) → 201, lista aktywnych → 200. ✅
  - **Bramki:** biome czysto (95 plików) · `tsc` exit 0 (×7) · **49 testów** · `next build` ✓.

## [0.18.0] — ⏰ Przypomnienia (przegląd/OC/leasing) + AdBlue na mobile

- `[#018]` ⏰ **Przypomnienia o wygasających dokumentach pojazdu + ekran AdBlue na telefonie.**
  - **`packages/core`** — [`expiryStatus`](packages/core/src/expiry.ts) (dni do terminu + poziom expired/soon/ok) + 4 testy (**29 w core**).
  - **`packages/api`** — [`listVehiclesExpiry`](packages/api/src/data/vehicles.ts) (daty przegląd/OC/leasing).
  - **Web** — [`RemindersWidget`](apps/web/components/RemindersWidget.tsx) na pulpicie: pojazdy z dokumentami po terminie lub wygasającymi ≤30 dni (kolory: czerwony/żółty).
  - **Mobile** — ekran [`adblue.tsx`](apps/mobile/app/adblue.tsx) (walidacja `fuelLogSchema`) + wejście z ekranu startowego.
  - **Bramki:** biome czysto (94 pliki) · `tsc` exit 0 (×7) · **49 testów** · `next build` ✓.

## [0.17.0] — 🎟️ Zaproszenia kierowców (link + kod QR)

- `[#017]` 🎟️ **Właściciel/spedytor zaprasza kierowcę linkiem lub QR; kierowca dołącza do firmy po loginie.**
  - **DB** [`0005`](supabase/migrations/0005_invites.sql): RPC `create_invite` (token, hash SHA-256 w bazie, ważność 7 dni, opcjonalny pojazd) i `accept_invite` (token → membership + ewentualny `driver_assignment`).
  - **`packages/api`** — [`createInvite`, `acceptInvite`](packages/api/src/data/invites.ts).
  - **Web** — [`/drivers`](apps/web/app/(app)/drivers/page.tsx): generowanie zaproszenia + **kod QR** (`qrcode`) + link do skopiowania; [`/join`](apps/web/app/join/page.tsx): akceptacja po loginie. Nawigacja: „Kierowcy".
  - **Weryfikacja E2E na żywej bazie:** owner `create_invite` → token (64 zn.) → kierowca `accept_invite` → członkowie firmy: owner + driver. ✅
  - **Bramki:** biome czysto (90 plików) · `tsc` exit 0 (×7) · **45 testów** · `next build` ✓ (14 tras).
  - **Pozostaje (wymaga Ciebie/środowiska):** OAuth Google/Apple (panel Supabase), wysyłka zaproszeń SMS/WhatsApp (klucz Twilio), mapa na mobile (dev build Expo).

## [0.16.0] — 📊 Statystyki i historia z bazy (z fallbackiem offline)

- `[#016]` 📊 **Statystyki i historia czytane z bazy dla zalogowanej firmy; offline → dane lokalne.**
  - **Statystyki** ([`/stats`](apps/web/app/(app)/stats/page.tsx)): spalanie/wydatek per pojazd liczone silnikiem `core` na `fuel_logs` z bazy (RLS), etykiety pojazdów z bazy; fallback do outboxu offline. Wskaźnik źródła (baza/lokalne).
  - **Historia** ([`/forms/history`](apps/web/app/(app)/forms/history/page.tsx)): scala rekordy z bazy (`fuel_logs` + `adblue_logs` + `trip_events`) z lokalnymi **niezsynchronizowanymi** (status + „Ponów"); offline → pełny outbox.
  - **Bramki:** biome czysto (87 plików) · `tsc` exit 0 (×7) · **45 testów** · `next build` ✓ (12 tras).
  - **Pozostaje (wymaga Ciebie/środowiska):** OAuth Google/Apple (panel Supabase), mapa na mobile (dev build Expo).

## [0.15.0] — 💳 Karty paliwowe + PIN dla kierowcy (Vault, audyt)

- `[#015]` 💳 **Karty paliwowe z PIN-em — kierowca odsłania PIN, by zapłacić w automacie. Szyfrowanie + audyt.**
  - **DB** [`0003`](supabase/migrations/0003_card_pin.sql) + [`0004`](supabase/migrations/0004_pin_searchpath_fix.sql): **Supabase Vault** (sekret `card_key`), `_card_key()` z Vault, `fuel_card_pin()` dostępny dla **członków firmy** (kierowca) + audyt; `fuel_card_set_pin()` tylko owner. Fix: pgcrypto w schemacie `extensions`.
  - **`packages/api`** — [`insertFuelCard`, `setFuelCardPin`, `getFuelCardPin`](packages/api/src/data/fuelCards.ts).
  - **Web** [`/cards`](apps/web/app/(app)/cards/page.tsx): lista kart, dodawanie z PIN (owner), **„🔓 Pokaż PIN"** (członek firmy). Nawigacja rozszerzona.
  - **Weryfikacja E2E na żywej bazie:** owner ustawia PIN (`set_pin` 204) → owner odczytuje („4321") → **kierowca odczytuje („4321")** → audit_log: `set_pin` + 2× `read_pin`. ✅
  - **Korekta modelu:** PIN dostępny dla kierowcy (nie tylko owner) — zgodnie z realnym użyciem (automaty); zaktualizowano CLAUDE.md, ARCHITECTURE, DATA-MODEL.
  - **Bramki:** biome czysto · `tsc` exit 0 (×7) · **45 testów** · `next build` ✓ · sekrety poza repo.
  - **Następne (#016):** OAuth Google/Apple (panel Supabase), statystyki/historia z bazy, mapa na mobile.

## [0.14.0] — 🚚 Flota z bazy w formularzach (pętla domknięta)

- `[#014]` 🚚 **Pojazdy i karty w formularzach ciągnięte z bazy — „dodaj pojazd → pojawia się w formularzu paliwa".**
  - **Hook** [`useFleet`](apps/web/lib/useFleet.ts): pojazdy + karty z bazy wg membershipu (RLS); fallback do danych demo w trybie offline/bez firmy.
  - **Formularze** ([`LiquidForm`](apps/web/components/LiquidForm.tsx) — paliwo/AdBlue, [`/forms/trip`](apps/web/app/(app)/forms/trip/page.tsx)) wybierają pojazd/kartę z realnej floty.
  - **Pojazdy** ([`/vehicles`](apps/web/app/(app)/vehicles/page.tsx)) — lista „Flota" z bazy, odświeżana po dodaniu; tryb offline pokazuje wpisy lokalne.
  - **Weryfikacja E2E na żywej bazie:** odczyt floty przez RLS (user token) zwraca dodany pojazd (200). ✅
  - **Bramki:** biome czysto (86 plików) · `tsc` exit 0 (×7) · **45 testów** · `next build` ✓.
  - **Następne (#015):** OAuth Google/Apple (panel Supabase), zarządzanie kartami + PIN (Vault), mapa na mobile, statystyki z bazy.

## [0.13.0] — 🏢 Onboarding firmy + realny zapis danych do bazy (RLS)

- `[#013]` 🏢 **Dane formularzy i pojazdów realnie lądują w bazie — z poprawnym `company_id` i RLS.**
  - **`packages/api`** — [`getActiveMembership`](packages/api/src/data/memberships.ts) (firma + rola zalogowanego usera) i `bootstrapCompany` (RPC onboardingu).
  - **Onboarding** — [`CompanyBanner`](apps/web/components/CompanyBanner.tsx) na pulpicie: gdy user nie ma firmy, pokazuje formularz „Utwórz firmę" (`bootstrap_company`).
  - **Realny zapis** — [`outbox.trySync`](apps/web/lib/outbox.ts) i [`/vehicles`](apps/web/app/(app)/vehicles/page.tsx) używają `company_id` z membershipu (zamiast `user.id`) → insert przechodzi RLS.
  - **Weryfikacja E2E na żywej bazie:** signup → firma → pojazd (201) → **zapis tankowania przez RLS (201)** → rekord potwierdzony w bazie → sprzątanie. ✅
  - **Bramki:** biome czysto (85 plików) · `tsc` exit 0 (×7) · **45 testów** · `next build` ✓.
  - **Następne (#014):** lista pojazdów/kart z bazy (zamiast danych demo), OAuth Google/Apple, `app.card_key` (Vault), mapa na mobile.

## [0.12.0] — 🟢 Supabase „na żywo": projekt, migracje, auth zweryfikowane E2E

- `[#012]` 🟢 **Backend Supabase działa na żywej bazie — schema, RLS i logowanie potwierdzone end-to-end.**
  - **Projekt** `E-Logistic` utworzony przez Management API (ref `jcmqbqvsvtjtxvmopcxp`, eu-central-1, `ACTIVE_HEALTHY`).
  - **Migracje 0001 + 0002 zastosowane** na żywej bazie — **24 tabele** w `public`, RLS aktywne; **realtime** dla `map_reports`.
  - **Weryfikacja E2E:** rejestracja usera → trigger `handle_new_user` (profil) → logowanie hasłem → RPC `bootstrap_company` (firma + membership `owner`) → sprzątanie. Wszystko ✓.
  - **Integracja web:** apka wstaje z realnym Supabase — `/login` 200, `/dashboard` 307→`/login` (bramka auth egzekwowana), `/api/route` nadal 200.
  - **Bezpieczeństwo:** token zarządczy i `service_role` **nie trafiają do repo**; klucze w `apps/web/.env.local` (gitignored). [`supabase/README.md`](supabase/README.md) zaktualizowane o stan wdrożenia.
  - ⏳ **Znane TODO:** `app.card_key` (Management API odmawia `alter database set`) → Vault/tabela config przy UI kart; rozpoznanie `company_id` przy zapisie formularzy (onboarding) → kolejny przyrost, by sync formularzy do bazy działał.
  - **Bramki:** biome czysto · `tsc` exit 0 (×7) · **45 testów** · `next build` ✓.

## [0.11.0] — 📌 Faza 2: POI jako przystanek trasy (klik na mapie)

- `[#011]` 📌 **Parking/stacja z mapy jako przystanek trasy — spięcie POI z trasowaniem.**
  - **Web** [`/map`](apps/web/app/(app)/map/page.tsx): model przystanku rozszerzony o dowolne współrzędne (miasto **lub** POI). Popup POI ma przycisk **„➕ Dodaj jako przystanek"** → punkt wpada do trasy (przed celem), trasa przelicza się przez niego.
  - Wiersze przystanków rozróżniają miasto (select) od POI (📍 etykieta) z możliwością usunięcia.
  - **Bramki:** biome czysto (83 pliki) · `tsc` exit 0 (×7) · **45 testów** · `next build` ✓ (10 tras).
  - **Następne (#012):** udogodnienia POI w popupie (prysznic/WC/woda) z tagów OSM, Supabase „na żywo", profil TIR (HERE/plan GH), mapa na mobile.

## [0.10.0] — 🛑 Faza 2: trasa z przystankami + myto z podziałem na odcinki

- `[#010]` 🛑 **Trasa przez przystanki (dostawa + stopy) z wyceną myta per odcinek — wymóg ze specyfikacji.**
  - **`packages/maps`** — [`routeMultiLeg`](packages/maps/src/multileg.ts): liczy trasę przez N punktów jako sumę odcinków (per-leg dystans/myto/geometria), niezależnie od dostawcy. **+2 testy (18 w maps)**.
  - **Serwerowy** [`/api/route`](apps/web/app/api/route/route.ts) — używa `routeMultiLeg` + **myto doszacowane per odcinek** (suma = całość).
  - **Web** [`/map`](apps/web/app/(app)/map/page.tsx) — lista waypointów (Start / Przystanki / Cel) z **dodawaniem i usuwaniem przystanków**, tabela **odcinków** (dystans + myto każdego).
  - **Weryfikacja na żywo:** Berlin→Wiedeń→Warszawa = **2 odcinki**, 1346,78 km, myto 363,63 EUR (szac.), trasy realne GraphHopper (200 OK).
  - **Bramki:** biome czysto (83 pliki) · `tsc` exit 0 (×7) · **45 testów** · `next build` ✓.
  - **Następne (#011):** profil TIR (plan płatny GH / HERE), wybór POI jako przystanku z mapy, Supabase „na żywo", mapa na mobile.

## [0.9.0] — 🧭 Faza 2: realny routing GraphHopper (serwerowo) + szacowanie myta

- `[#009]` 🧭 **Podłączenie GraphHoppera — realne trasy po drogach, klucz bezpiecznie po stronie serwera.**
  - **Serwerowy** [`/api/route`](apps/web/app/api/route/route.ts): klucz `GRAPHHOPPER_API_KEY` czytany z env **po stronie serwera (nigdy w bundlu)**; bez klucza → provider mock; walidacja (400 dla <2 punktów); fallback na mock przy błędzie dostawcy.
  - **`packages/maps`** — adapter GraphHopper z flagą `truckProfile` (free tier = profil `car`; TIR wymaga planu płatnego — API to potwierdziło), `toll.ts` [`estimateTollEur`](packages/maps/src/toll.ts) (doszacowanie myta, bo GraphHopper free go nie zwraca), refaktor mock. **+3 testy (16 w maps)**.
  - **Web** [`/map`](apps/web/app/(app)/map/page.tsx) — woła `/api/route`, pokazuje realny dystans/czas + myto „(szac.)".
  - **🐛 Fix (wykryty testem na żywo):** [`proxy.ts`](apps/web/proxy.ts) wywalało 500 bez env Supabase — teraz **pass-through** gdy brak konfiguracji; `(app)` layout działa w **trybie offline** (mapa/formularze/statystyki dostępne bez logowania), a wymusza auth dopiero gdy Supabase skonfigurowane. `/api` wykluczone z proxy.
  - **Weryfikacja na żywo:** `/api/route` zwraca Berlin→Warszawa **570,5 km**, myto **154 EUR (szac.)**, 3171 pkt trasy (200 OK); walidacja 400 ✓.
  - **Bramki:** biome czysto (82 pliki) · `tsc` exit 0 (×7) · **43 testy** · `next build` ✓ · klucz **poza repo** (`.env.local` w .gitignore).
  - **Następne (#010):** profil TIR po upgradzie planu GraphHopper lub adapter HERE; trasa z przystankami; mapa na mobile.

## [0.8.0] — 📍 Faza 2: POI na mapie z OpenStreetMap (parkingi TIR + stacje)

- `[#008]` 📍 **Warstwa POI z OSM — bez kluczy. Parkingi dla ciężarówek i stacje paliw na mapie.**
  - **`packages/maps`** — moduł [`poi.ts`](packages/maps/src/poi.ts): typy `Poi`/`BBox`, `buildOverpassQuery` (parkingi `hgv=yes` + stacje `amenity=fuel`), `parseOverpass` (node + way/center, pomija braki), `fetchPois` (Overpass API, CORS, bez klucza). **+3 testy (13 w maps)**.
  - **Web** [`/map`](apps/web/app/(app)/map/page.tsx) — przycisk „POI w widoku": pobiera POI dla bieżącego obszaru mapy, rysuje znaczniki (🔴 stacje, 🟢 parkingi) z **popupem** (nazwa/typ), licznik znalezionych.
  - **Bramki:** biome czysto (80 plików) · `tsc` exit 0 (×7) · **40 testów** · `next build` ✓ (10 tras) · mobile typecheck ✓.
  - **Następne (#009):** udogodnienia POI (prysznic/WC/woda) z tagów OSM, styl wektorowy red/black (MapTiler), włączenie HERE/GraphHopper z kluczem, mapa na mobile.

## [0.7.0] — 🗺️ Faza 2: mapa (MapLibre) + abstrakcja RoutingProvider

- `[#007]` 🗺️ **Start warstwy map — render MapLibre i routing TIR za abstrakcją dostawcy (bez płatnych kluczy).**
  - **`packages/maps`** — typy ([`types.ts`](packages/maps/src/types.ts): `LatLng`, `VehicleProfile`, `RouteOptions`, `RouteRequest`, `RouteResult` z mytem per odcinek), interfejs `RoutingProvider`, [`haversine`](packages/maps/src/geo.ts), **`MockRoutingProvider`** ([`mock.ts`](packages/maps/src/mock.ts): dystans + przybliżone myto wg masy), adapter [`GraphHopper`](packages/maps/src/graphhopper.ts) (builder + fetch) i szkielet [`HERE`](packages/maps/src/here.ts), [`createRoutingProvider`](packages/maps/src/factory.ts). **10 testów**.
  - **Web** [`/map`](apps/web/app/(app)/map/page.tsx) — render **MapLibre GL** (dynamiczny import, kafelki OSM, tło red/black), formularz: start/cel, profil pojazdu, **omijanie myta/promów/Szwajcarii**, „Wytycz trasę" → `RoutingProvider` (mock) → rysowanie trasy + odczyt **dystans/czas/myto**.
  - Nawigacja i pulpit rozszerzone o Mapę.
  - **Bramki:** biome czysto (79 plików) · `tsc` exit 0 (×7) · **37 testów** · `next build` ✓ (10 tras) · mobile typecheck ✓.
  - **Następne (#008):** styl wektorowy red/black (MapTiler), POI (parkingi/stacje z OSM), włączenie adaptera HERE/GraphHopper z kluczem, mapa na mobile (MapLibre Native).

## [0.6.0] — ⛽🚚 Formularze AdBlue i Trip (web + mobile)

- `[#006]` ⛽🚚 **Komplet formularzy operacyjnych — AdBlue i Trip, na wspólnym rdzeniu, web i mobile.**
  - **`packages/api`** — [`insertTripEvent`/`tripEventToRow`/`listTripEvents`](packages/api/src/data/tripEvents.ts) (mapowanie akcji + WKT PostGIS).
  - **Outbox** [`outbox.ts`](apps/web/lib/outbox.ts) — uogólniony na rodzaje (`fuel`/`adblue`/`trip`) z dispatchem w `trySync`.
  - **Web** — wspólny [`LiquidForm`](apps/web/components/LiquidForm.tsx) (paliwo+AdBlue), nowe [`/forms/adblue`](apps/web/app/(app)/forms/adblue/page.tsx) i [`/forms/trip`](apps/web/app/(app)/forms/trip/page.tsx) (pola warunkowe wg akcji: waga dla za/rozładunku, kwota dla serwisu/inne, komentarz wymagany dla serwisu/inne), współdzielony [`Field`](apps/web/components/Field.tsx), generyczna [`/forms/history`](apps/web/app/(app)/forms/history/page.tsx) dla wszystkich rodzajów.
  - **Mobile** — ekran [`trip.tsx`](apps/mobile/app/trip.tsx) (akcje + walidacja `tripEventSchema`), wejście z ekranu startowego.
  - Nawigacja i pulpit rozszerzone (AdBlue, Trip, Statystyki); statystyki filtrują tylko paliwo/AdBlue.
  - **Bramki:** biome czysto (67 plików) · `tsc` exit 0 (×6) · **27 testów** · `next build` ✓ (9 tras) · mobile typecheck ✓.
  - **Następne (#007):** podłączenie Supabase na żywo (`db push` + env, auth na mobile), PowerSync (wspólny outbox), zarządzanie kartami + PIN (RPC).

## [0.5.0] — 📱 Mobile: inicjalizacja Expo (apka kierowcy) + formularz na wspólnym rdzeniu

- `[#005]` 📱 **Aplikacja mobilna Expo działa w monorepo — wspólny rdzeń web↔mobile potwierdzony.**
  - **Workspace + hoisting**: `apps/mobile` włączony do instalacji ([`pnpm-workspace.yaml`](pnpm-workspace.yaml)), [`.npmrc`](.npmrc) `node-linker=hoisted` (wymóg Metro w pnpm).
  - **Wersje natywne** zreconciliowane do SDK 56 (`expo install --fix`): **react 19.2.3** (wyrównany też w web), react-native 0.85.3, reanimated 4.3.1, gesture-handler, safe-area-context, screens, expo-status-bar.
  - **Konfiguracja monorepo**: [`metro.config.js`](apps/mobile/metro.config.js) (watch root + nodeModulesPaths), [`babel.config.js`](apps/mobile/babel.config.js) (preset-expo + worklets).
  - **Ekrany**: [`index.tsx`](apps/mobile/app/index.tsx) (start, motyw red/black) + [`fuel.tsx`](apps/mobile/app/fuel.tsx) — **Formularz Paliwowy walidowany współdzielonym `fuelLogSchema`** z `@e-logistic/core` (ten sam kod co web).
  - **Bramki:** biome czysto (61 plików) · `tsc` exit 0 (×6, w tym mobile) · **27 testów** · `next build` ✓ (regresja po wyrównaniu Reacta) · `expo config` ✓ (SDK 56.0.0).
  - **Uwaga:** uruchomienie `expo start` wymaga środowiska natywnego (symulator/Expo Go) — instrukcja w [`apps/mobile/README.md`](apps/mobile/README.md).
  - **Następne (#006):** logowanie Supabase na mobile (adapter sesji RN), PowerSync (wspólny outbox), `supabase db push`, formularze AdBlue/Trip.

## [0.4.0] — 📊 Faza 1: statystyki, historia formularzy, pojazdy (web)

- `[#004]` 📊 **Domknięcie weba Fazy 1 — statystyki na silniku rozliczeń, historia formularzy i zarządzanie pojazdami.**
  - **`packages/core`** — [`summarizeFuel`](packages/core/src/billing.ts) (litry, dystans, śr. spalanie, wydatek) + 2 testy (**razem 25 testów w core**).
  - **`packages/api`** — [`listFuelLogs`](packages/api/src/data/fuelLogs.ts), [`insertVehicle`/`vehicleToRow`](packages/api/src/data/vehicles.ts), [`listFuelCardsSafe`](packages/api/src/data/fuelCards.ts) (bez PIN-u).
  - **Statystyki** ([`/stats`](apps/web/app/(app)/stats/page.tsx)) — spalanie/wydatek per pojazd liczone silnikiem `core` na danych z outboxu (działa offline).
  - **Historia formularzy** ([`/forms/fuel/history`](apps/web/app/(app)/forms/fuel/history/page.tsx)) — lista wysłanych formularzy ze statusem + ponowna synchronizacja (wymóg podglądu własnych formularzy).
  - **Pojazdy** ([`/vehicles`](apps/web/app/(app)/vehicles/page.tsx)) — dodawanie z walidacją `vehicleSchema`, best-effort zapis do Supabase, lista sesyjna.
  - **Wspólne dane demo** wydzielone do [`lib/demo.ts`](apps/web/lib/demo.ts); nawigacja dashboardu rozszerzona (pojazdy, statystyki).
  - **Bramki:** biome czysto (58 plików) · `tsc` exit 0 (×5) · **27 testów** · `next build` ✓ (9 tras).
  - **Następne (#005):** inicjalizacja Expo (mobile), `supabase db push`, lista pojazdów/kart z bazy zamiast danych demo, formularze AdBlue/Trip, zarządzanie kartami + PIN (RPC).

## [0.3.0] — 🔐 Faza 1: logowanie + Formularz Paliwowy end-to-end (web)

- `[#003]` 🔐 **Pierwsze funkcje operacyjne na web — warstwa danych, logowanie i formularz paliwowy offline-first.**
  - **`packages/api`** — warstwa danych Supabase: build-safe fabryki klientów ([`client.ts`](packages/api/src/client.ts), leniwe — klient nigdy na top-level), funkcje danych ([`fuelLogs.ts`](packages/api/src/data/fuelLogs.ts) z mapowaniem input→wiersz + WKT dla PostGIS, [`vehicles.ts`](packages/api/src/data/vehicles.ts)).
  - **`packages/core`** — helper [`newId()`](packages/core/src/ids.ts) (id rekordów offline-first, niezależny od lib DOM/Node).
  - **Logowanie** ([`/login`](apps/web/app/login/page.tsx)): e-mail+hasło, **magic link**, **Google/Apple** (OAuth), util klienta/serwera ([`server.ts`](apps/web/lib/supabase/server.ts)), **proxy** odświeżające sesję ([`proxy.ts`](apps/web/proxy.ts), Next 16), [callback OAuth](apps/web/app/auth/callback/route.ts).
  - **Chroniony dashboard** ([`(app)/layout.tsx`](apps/web/app/(app)/layout.tsx), `force-dynamic` + redirect do `/login`), nawigacja wg roli, wylogowanie.
  - **Formularz Paliwowy** ([`/forms/fuel`](apps/web/app/(app)/forms/fuel/page.tsx)): walidacja na współdzielonym `fuelLogSchema` (core), wybór pojazdu/karty/gotówki, **autouzupełnianie GPS**, komunikaty błędów per pole.
  - **Offline-first**: [`outbox.ts`](apps/web/lib/outbox.ts) — zapis najpierw lokalnie (`queued`), best-effort sync do Supabase po połączeniu (fundament pod PowerSync).
  - **Bramki:** biome czysto (53 pliki) · `tsc` exit 0 (×5) · **25 testów** · `next build` ✓ (bez deprecation warning) · parytet i18n.
  - **Następne (#004):** inicjalizacja Expo (mobile), `supabase db push`, lista pojazdów/kart z bazy, historia+edycja formularzy, statystyki.

## [0.2.0] — 🧱 Faza 0: scaffold monorepo, rdzeń rozliczeń, schema RLS, web build

- `[#002]` 🧱 **Fundament kodu E‑Logistic — monorepo gotowe do pracy, web zbudowany, rdzeń przetestowany.**
  - **Monorepo** (Turborepo + pnpm): [`package.json`](package.json), [`pnpm-workspace.yaml`](pnpm-workspace.yaml), [`turbo.json`](turbo.json), [`biome.json`](biome.json), [`tsconfig.base.json`](tsconfig.base.json), [`.env.example`](.env.example), [`.gitattributes`](.gitattributes), [`.nvmrc`](.nvmrc).
  - **`packages/core`** — typy, enumy, schematy Zod (formularze Paliwo/AdBlue/Trip 1:1 ze specyfikacją, walidacja warunkowa per akcja) i **silnik rozliczeń** ([`billing.ts`](packages/core/src/billing.ts): spalanie, koszt po rabacie karty, zysk z trasy). **23 testy** ([`billing.test.ts`](packages/core/src/billing.test.ts), [`schemas.test.ts`](packages/core/src/schemas.test.ts)).
  - **`packages/ui`** — tokeny motywu red/black (`#E50914`/`#0a0a0a`), tryb dzień/noc, generator CSS vars ([`theme.ts`](packages/ui/src/theme.ts)).
  - **`packages/i18n`** — katalogi PL/EN z **parytetem kluczy** wymuszonym typami + test ([`parity.test.ts`](packages/i18n/src/parity.test.ts)).
  - **Supabase** — migracje [`0001_init_schema.sql`](supabase/migrations/0001_init_schema.sql) (PostGIS, enumy, encje, indeksy, triggery) i [`0002_rls.sql`](supabase/migrations/0002_rls.sql) (RLS dla ról owner/spedytor/kierowca/developer, bezpieczny PIN z audytem, `bootstrap_company`). Do wgrania `supabase db push` ([`supabase/README.md`](supabase/README.md)).
  - **`apps/web`** (Next.js 16 · React 19 · Tailwind 4) — szkielet panelu, motyw red/black, wpięte `core`/`ui`/`i18n`. **`next build` ✓**.
  - **`apps/mobile`** (Expo 56 · Expo Router · RN New Arch) — szkielet ekranów współdzielący rdzeń; finalizacja Expo (wersje natywne, Metro, EAS) w `[#003]` ([`apps/mobile/README.md`](apps/mobile/README.md)).
  - **CI/CD** — [`ci.yml`](.github/workflows/ci.yml) (biome, typecheck, testy, build web, gitleaks), [`codeql.yml`](.github/workflows/codeql.yml), [`dependabot.yml`](.github/dependabot.yml).
  - **Bramki:** biome czysto (36 plików) · `tsc` exit 0 (×4) · **25 testów** · `next build` ✓ · parytet i18n PL/EN. Migracje SQL napisane (walidacja na żywej bazie po `supabase link`).

## [0.1.0] — 🧠 Fundament: komplet dokumentacji architektury (do akceptacji)

- `[#001]` 🧠 **Start projektu E‑Logistic — pełna dokumentacja architektury przed pierwszą linią kodu.**
  - **README** [`README.md`](README.md): konwencja GH0ST EMPIRE (SYNC header, badge'y red/black `#E50914`/`#0a0a0a`, tabela modułów, diagram mermaid, stack, docelowa struktura repo).
  - **Architektura** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): monorepo (Turborepo+pnpm), web (Next.js 16) + mobile (Expo) równolegle, współdzielony `packages/core`, offline-first przez **PowerSync ↔ Supabase**, hybrydowa warstwa map (**MapLibre** render + abstrakcja `RoutingProvider` → adaptery **HERE/GraphHopper**), auth (OAuth/passkey/magic-link/2FA), bezpieczeństwo (RLS, szyfrowanie PIN-ów kart).
  - **Model danych** [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md): encje (firmy, użytkownicy, role, pojazdy, karty, formularze Paliwo/AdBlue/Trip, POI, zgłoszenia, stawki), multi-tenant + role Owner/Spedytor/Kierowca/Developer, polityki RLS, model historii edycji formularzy.
  - **Roadmapa** [`docs/ROADMAP.md`](docs/ROADMAP.md): Fazy 0–4 (Fundament → Rdzeń właściciela → Mapa → Społeczność → Premium nawigacja) z kryteriami ukończenia.
  - **Analiza** [`docs/ANALIZA.md`](docs/ANALIZA.md): right-sizing pełnej wizji, co kosztuje (płatne API map), co budujemy sami (zgłoszenia, ceny paliw), kolejność dająca produkt zarobkowy bez drogich API.
  - **CLAUDE.md** [`CLAUDE.md`](CLAUDE.md): zasady pracy w repo (konwencja commitów/changelogu, bramki jakości, stack).
  - **Decyzje wstępne** (od właściciela): start od dokumentacji architektury · strategia mapy = hybryda MapLibre + HERE/GraphHopper · platformy web+mobile równolegle.
  - **Otwarte:** ewentualna zmiana nazwy repo `E-Map` → `E-Logistic`; akceptacja dokumentów przed scaffoldem kodu.
