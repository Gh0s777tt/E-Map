<!-- SYNC: po v1.89.0 · #233 · 2026-07-03 -->

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
>
> **Od #217 (audyt):** **pierwsze testy komponentów UI** (RTL + jsdom + `@vitejs/plugin-react`) — `DataTable` (5) + `Toast` (3) = **343 testy**. Zamyka lukę „zero testów React".
>
> **Od #218 (audyt):** **panele mapy reagują na tryb jasny** — `mapUi.tsx` + panele DOM `page.tsx` (23 użycia) `palette`→`cssPalette`. Render mapy świadomie ciemny (WebGL/markery/POI na hex).
>
> **Od #219 (audyt — domknięcie):** link `/dev` w nav (rola `developer`, i18n `nav.dev`) · `.claude/`→`.gitignore` + odśledzenie `launch.json` · udokumentowane: niezależne wersjonowanie `apps/mobile` (EAS/sklepy) i wzorzec `DataTable` vs karty. **Wszystkie ustalenia audytu zaadresowane** (poza `uuid`<11 — świadomie, #216).
>
> **Od #220 (audyt — Top usprawnień #9):** **rate-limit na pozostałych mutacjach** — `notify-assignment` + `fakturownia/export` (`rateLimit` po auth, 429, 30/60 s/IP). Z „Top usprawnień" pozostaje już tylko **dekompozycja `map/page.tsx`** (P2 niżej — refaktor maintainability, wymaga QA wizualnego mapy).
>
> **Od #221 (sesja QA — [TEST_REPORT.md](../TEST_REPORT.md)):** **+55 testów (343 → 398)** bez zmian w kodzie: granice diet/wygasania/czasu pracy (core), scoping multi-tenant `listPushSubscriptionsForDelivery` (api), geokoder + `route()` HERE/GraphHopper z mockiem `fetch` (maps), open-redirect/CRLF (web), **integralność outboxu — brak duplikatów** (mobile). 1 ustalenie Niskie/latentne: brak guardu scopingu w `listPushSubscriptionsForDelivery` (pominięty `it.skip` jako regresja hardening). Białe plamy wymagające zasobów: RPC/RLS (Postgres), e2e `(app)` (sesja).
>
> **Od #222 (po QA):** **idempotentny zapis offline** — `insertFuelLog`/`insertTripEvent` `insert`→`upsert(onConflict:"id", ignoreDuplicates:true)`. Ponowny sync = `ON CONFLICT DO NOTHING` → brak duplikatu/błędu PK; chroni przed wyścigiem read-modify-write w outboxie. Bez migracji.
>
> **Od #223 (domknięcie QA):** **guard anty-wyciek** w `listPushSubscriptionsForDelivery` (wymóg ≥1 filtra — `it.skip`→aktywny test) · **odporność adapterów** (`graphhopper.ts` brak `points`→pusta geometria; `geocode.ts` odsiew NaN). **408 testów**.
>
> **Od #224:** **dekompozycja `map/page.tsx` — etap 1** (QA wizualne w trybie offline preview): 4 prezentacyjne komponenty → `mapPanels.tsx` (`RouteSummary`/`StopsEditor`/`SavedPlacesChips`/`FuelPricesPanel`), page.tsx 1452→1343 l. (−109), zachowanie bez zmian. **Wszystkie ustalenia audytu/QA domknięte** (dekompozycja rozpoczęta, dalsze etapy opcjonalne).

## 🎨 UI/UX (z wizji — kolejne fazy)
- [x] **Tryb jasny** (light mode) + przełącznik — `cssPalette` + `Theme` dark/light, toggle w sidebarze, anty-FOUC (#205).
- [x] **Command palette 2.0** — Ctrl/⌘+K: akcje + nawigacja + encje, jeden filtr (#206).
- [x] **Data table** — `DataTable` generyczny (sort/filtr), adopcja: kontrahenci (#207). **Decyzja (audyt #219):** `DataTable` dla list **płaskich/tabelarycznych** (kontrahenci); **karty** świadomie dla list z **rozwijaniem/bogatą treścią** (pojazdy, zlecenia, faktury) — dwa celowe wzorce, nie niespójność. Migracja kolejnych list tylko gdy realnie płaskie.
- [~] **Modernizacja frontu — Tier 3 (inline-styles → klasy + CSP enforce).** Część inline→CSS **domknięta świadomie** na powierzchniach o dużym `styles` (#227–#230); reszta = niska wartość / osobny projekt CSP.
  - **Zrobione #225–#230:** ✅ React Compiler, ✅ tree-shaking (`optimizePackageImports`), ✅ streaming `loading.tsx`; ✅ **inline→CSS Module** dla: mapy (#227), `LiquidForm` paliwo/AdBlue (#228), logowania (#229), `HelpCenter` (#230) — **każdy QA 1:1** (computed styles offline). Fonty = systemowe (zero payloadu), kolory = tokeny `var(--el-*)`.
  - **Świadomie NIE robione (dowód: malejąca wartość):** strony list/detali mają MAŁE obiekty `styles` (payouts=2 klucze, vehicles=4) + rozproszone one-offy → mały zysk/plik; pełną wierność na danych potwierdzi tylko **authed e2e QA**.
  - **CSP-enforce = osobny, większy projekt** (nie „kolejny etap"): wymaga usunięcia `'unsafe-inline'` ze `style-src` (→ usunąć WSZYSTKIE one-off inline, dziesiątki plików) ORAZ `script-src` (→ **nonce** dla skryptu anty-FOUC w `layout.tsx`). Do zrobienia z authed QA, gdy priorytet. Dziś CSP `Report-Only` (od #214) obserwuje bez blokowania.
  - Rekomendacja: dalsze migracje tylko z podglądem authed; one-off inline styli w React jest idiomatyczny i nie wymaga masowej migracji poza celem CSP.
- [x] **Toasty w formularzach** — `useToast` we **wszystkich** formularzach/komponentach CRUD/akcji (16 widoków, #208–#213; inline tylko w publicznych login/reset). Spójny feedback success/error/info.
- [ ] Mobile: animacje `react-native-reanimated` (jest dep, nieużywany), haptyka, gesty.

---

## 🔴 P1 — Testy (rozszerzanie pokrycia)
- [x] **Testy `packages/api`** — mock Supabase, **16 modułów** `data/*` = **50 testów** (#197/#199/#200/#202). Sensowna warstwa danych pokryta (drobne wrappery: companies/dev/invites/notifications — pominięte).
- [x] **Testy tras API** — push/send + notify-assignment (#198), route/traffic/fakturownia (#202). Passkey (WebAuthn) — świadomie pominięte (mock SimpleWebAuthn, niski zwrot).
- [x] **Testy mobile** — `lib/outbox.ts` (#200) + `lib/navigation.ts` (`guardRedirect`/`notificationTarget`, #202) = 13 testów. AuthProvider (wiring sesji) — bez testu (wymaga renderera RN, niski zwrot).

## 🟠 P2 — Wydajność (punktowo; DB ogólnie wzorowe)
- [~] **`map/page.tsx`** — dekompozycja: **etap 1 zrobiony (#224)** — 4 prezentacyjne komponenty do `mapPanels.tsx` (1452→1343 l.). Pozostają sekcje sprzężone ze stanem (TIR/wymiary, POI, filtr kart, ruch) — dalsze etapy wg potrzeby.
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
