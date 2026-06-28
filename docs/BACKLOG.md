<!-- SYNC: po v1.73.0 · #217 · 2026-06-28 -->

# 📋 BACKLOG — E‑Logistic

Otwarte zadania, priorytetyzowane. Źródło: **audyt 360°** (2026‑06‑27, v1.69.0) + bieżący stan kodu.
Autorytatywny stan dostarczenia: [CHANGELOG.md](../CHANGELOG.md).

> **Świadomie pominięte (parking):** integracje **kart/płatności partnerskich** — DKV, Eurowag, SNAP, Travis.
> Czekają na dane/umowy/klucze (decyzja właściciela). Specyfikacja wpięcia w [INTEGRATIONS.md](INTEGRATIONS.md).

> **✅ Domknięte od poprzedniej listy (#080 → #204):** limit + zakres dat w zapytaniach · paginacja/limity w stats/history ·
> `useMemo` w stats · `ListStatus` na listach · settlements jako moduł · test push + `icon-192.png` · ceny diesla EU na mapie/`fuel-prices` ·
> ujednolicenie Node ≥26 · `apps/mobile/tsconfig` (strict) · **sync dokumentacji do v1.51 (#195)** · cała seria modułów v1.0–1.50
> (zlecenia, faktury, CMR/POD, rentowność, diety, czas pracy, wypłaty, szkody, serwis, dokumenty, kontrahenci, mapa 3D, aplikacja mobilna).
>
> **Od #196 (naprawy z audytu):** `rateLimit` fallback in-memory · hardening walidacji URL w push · `setupMessage` w core (dedup + testy) ·
> aktualizacja wersji (biome/turbo/pg/upstash/simplewebauthn/@types/node) · `listInvoiceItems` z `.limit()`.
> *Zweryfikowane jako nieaktualne (audyt mylił się): indeks `invoice_items` istnieje od 0034; lazy-CSS mapy bez sensu (route-scoped w App Router); `React.memo` na liście kierowców — znikomy zysk przy małych listach.*
>
> **Od #197:** testy `api` (mock Supabase, 11) + walidacja push (`pushUrl`, 6) = **250 testów** · trasy **PL→EN** z redirectami 308 · weryfikacja przygotowania mobile (runbook + lokalny `.env.local`).
>
> **Od #198:** pełne testy handlerów tras (`/api/push/send`, `/api/orders/notify-assignment`) — auth-guard 401/403, walidacja 400, izolacja firm 404 = **259 testów**.
>
> **Od #199:** rozszerzone testy `api` (orders, tripEvents, vehicles, driverPayouts, damageClaims) — api 11→27, **275 testów**.
>
> **Od #200:** reszta testów `api` (vehicleCosts, perDiemTrips, workTimeEntries, contractors → 35) + **testy mobile `outbox`** (6) = **289 testów** — wszystkie 6 pakietów pokryte.
>
> **Od #201:** dedup walidacji Zod → core (`zodFieldErrors`/`firstZodError`, 8 miejsc web+mobile) = **293 testów**.
>
> **Od #202:** reszta `data/*` (service/savedPlaces/documents/fuelCards/drivers) + handlery tras (route/traffic/fakturownia) + guard mobile (`guardRedirect`/`notificationTarget`) = **327 testów**.
>
> **Od #203 (UI/UX faza 1):** warstwa motion (tokeny CSS, animacje/przejścia, View Transitions, focus-visible, reduced-motion) · prymitywy (Button hover, Skeleton, Spinner, animowany BarChart) · toasty · skeleton w ListStatus.
>
> **Od #204:** **audit-log viewer** (`/audit`, owner) · **eksport PDF** (`PrintButton` + `@media print`) · hover-lift kart pulpitu.
>
> **Od #205 (UI/UX faza 2):** **tryb jasny** (light mode) w całej aplikacji + przełącznik w sidebarze (localStorage, anty-FOUC, i18n PL/EN) · jedno źródło motywu (`Theme`→CSS vars, dark+light) · `cssPalette` (migracja **59 plików** hex→tokeny `var(--el-*)`) · powłoka `.app-*` na tokenach. Mapa świadomie ciemna w obu trybach.
>
> **Od #206 (UI/UX faza 3):** **paleta poleceń 2.0** — Ctrl/⌘+K jako launcher: akcje (motyw, druk) + nawigacja do stron (z `navGroups`, wg uprawnień) + encje; logika motywu → `lib/theme.ts` (reuse z `ThemeToggle`); fix `suppressHydrationWarning` (FOUC↔hydratacja). i18n `cmd.*`.
>
> **Od #207 (UI/UX faza 4):** **DataTable** — generyczny komponent tabeli (sort klik-nagłówek ▲/▼ z `aria-sort`, filtr + licznik, motyw `--el-*`); logika `lib/dataTable.ts` (`sortRows`/`filterRows`, null na końcu, locale PL) + **6 testów**; pilotowa adopcja na liście kontrahentów. i18n `table.*`.
>
> **Od #208 (UI/UX faza 5):** **toasty w formularzach** zamiast inline „status" — migracja kontrahentów + pojazdów (`useToast` success/error, auto-znika 3.5 s, `aria-live`, slide-up). Wzorzec do reużycia na pozostałych formularzach.
>
> **Od #209:** toasty w kolejnych formularzach CRUD — **serwis** + **karty paliwowe** (spójność z #208). 4 formularze floty na toastach.
>
> **Od #210:** toasty w **zespole** + **dokumentach** (wgrywanie/otwieranie/usuwanie/walidacja). 6 formularzy na toastach.
>
> **Od #211:** **bugfix i18n** — 4 strony (pojazdy/karty/kierowcy/Trip) + `LiquidForm` ignorowały przełącznik języka (hardcoded `createTranslator("pl")`); zamiana na `useT()`. EN faktycznie działa.
>
> **Od #212:** **dopięcie toastów** — widoki-strony (zlecenia, moje zlecenia, faktury+pozycje, karta kierowcy, usterki, Trip, ustawienia/2FA) — 13 widoków na `useToast`.
>
> **Od #213:** domknięcie toastów — komponenty `DriverRoster`, `LiquidForm`, `PushToggle`. **Pełne 100%** (16 widoków/komponentów); inline tylko w publicznych login/reset.
>
> **Od #214 (naprawy z audytu — [AUDIT_REPORT.md](../AUDIT_REPORT.md)):** rate-limit na `/api/push/send` · CSP `Report-Only` (allowlista mapy/Supabase/routing) · wersja `apps/web`=root + bramka `docs:check` (web==root) · bramka unikalności numerów migracji.
>
> **Od #215 (audyt):** klient **service-role twardo `server-only`** — wydzielony do `@e-logistic/api/admin` (`import "server-only"`); 7 konsumentów + 2 testy przełączone. Build blokuje wciągnięcie do bundla klienta.
>
> **Od #216 (audyt):** **redukcja podatności 7→1** — overrides w `pnpm-workspace.yaml` (postcss ≥8.5.10, @xmldom/xmldom ^0.8.10). Pozostaje `uuid`<11 (transitive Expo, build-only — major bump zepsułby SDK).

## 🎨 UI/UX (z wizji — kolejne fazy)
- [x] **Tryb jasny** (light mode) + przełącznik — `cssPalette` + `Theme` dark/light, toggle w sidebarze, anty-FOUC (#205).
- [x] **Command palette 2.0** — Ctrl/⌘+K: akcje + nawigacja + encje, jeden filtr (#206).
- [x] **Data table** — `DataTable` generyczny (sort/filtr), pilot: kontrahenci (#207). 🔜 reużycie: zlecenia/faktury/pojazdy.
- [ ] **shadcn/ui** + migracja **inline-styles → klasy** (kolory już na tokenach `var(--el-*)` od #205; pozostają wymiary/layout inline).
- [x] **Toasty w formularzach** — `useToast` we **wszystkich** formularzach/komponentach CRUD/akcji (16 widoków, #208–#213; inline tylko w publicznych login/reset). Spójny feedback success/error/info.
- [ ] Mobile: animacje `react-native-reanimated` (jest dep, nieużywany), haptyka, gesty.

---

## 🔴 P1 — Testy (rozszerzanie pokrycia)
- [x] **Testy `packages/api`** — mock Supabase, **16 modułów** `data/*` = **50 testów** (#197/#199/#200/#202). Sensowna warstwa danych pokryta (drobne wrappery: companies/dev/invites/notifications — pominięte).
- [x] **Testy tras API** — push/send + notify-assignment (#198), route/traffic/fakturownia (#202). Passkey (WebAuthn) — świadomie pominięte (mock SimpleWebAuthn, niski zwrot).
- [x] **Testy mobile** — `lib/outbox.ts` (#200) + `lib/navigation.ts` (`guardRedirect`/`notificationTarget`, #202) = 13 testów. AuthProvider (wiring sesji) — bez testu (wymaga renderera RN, niski zwrot).

## 🟠 P2 — Wydajność (punktowo; DB ogólnie wzorowe)
- [ ] **`map/page.tsx` (~1700 l.)** — dekompozycja na 6–8 komponentów (wymaga QA wizualnego mapy).
- [ ] **POI O(n·m)** — filtr stacji wg marek + near‑route Haversine: cache marek / grid spatial index / próbka co ~2 km.

## 🟠 P2 — Mobile do publikacji
- [ ] **Mapa (faza M3)** — `@maplibre/maplibre-react-native` + reużycie `@e-logistic/maps`.
- [ ] **`eas.projectId`** (`eas init`) — wymagany do push.
- [ ] Finalna grafika (ikony/splash), **QA na urządzeniu**, `eas build`/`submit`.

## 🟡 P3 — Jakość / spójność
- [x] **Duplikacja:** `setupMessage` (#196) + `zodFieldErrors`/`firstZodError` (#201) wyekstrahowane do `core` — koniec kopiowanej walidacji/obsługi błędów web↔mobile.
- [ ] **`as unknown` ×8** (Supabase RPC) — komentarze lub dogenerowane typy RPC.
- [x] **Locale hardcoded** naprawione — `createTranslator("pl")` → `useT()` na 4 stronach + `LiquidForm` (#211). Publiczne (landing/reset) pozostają PL (poza `LocaleProvider`).

## 🟡 P3 — Bezpieczeństwo (hardening; brak P0/P1)
- [ ] **Mobile**: sesja w `AsyncStorage` → rozważyć `expo-secure-store` (szyfrowany keychain).
- [ ] Potwierdzić **rotację sekretów**, które trafiły kiedyś do historii czatu (Upstash, `sbp_` Supabase).

## 🟢 P4 — Infra / docelowy stack
- [ ] **`docs:check`** w CI (dodane w #195) — utrzymać zielone przy zmianach.
- [ ] **`supabase/config.toml`** — dla powtarzalnego dev/CI (wymaga Dockera; opcjonalne).
- [ ] Rozważyć **Sentry** (obserwowalność), **PowerSync** (jeśli outbox okaże się niewystarczający), **shadcn/ui**.

## 🔵 P5 — Produkt / rozwój (szerzej w raporcie audytu)
- [ ] **KSeF** (obowiązkowy w PL) — nadbudowa na silniku faktur + Fakturowni.
- [ ] **i18n ×14** — dziś PL/EN (infrastruktura parytetu gotowa); priorytet UA/DE.
- [ ] OCR paragonów · asystent AI spedytora · telematyka GPS live · portal klienta · link śledzenia ETA · tachograf `.ddd`.

## ⏸️ Wymaga Twoich zasobów
- **Integracje kart/płatności** — wstrzymane do dostarczenia danych/umów.
- **Publikacja mobile** — konta Apple Developer + Google Play.

---

*Rekomendowany następny krok: **testy `api` + API routes** (P1) — największy zwrot jakości przy zerowym ryzyku.*
