<div align="center">

# 📜 CHANGELOG &nbsp;·&nbsp; E‑LOGISTIC

![Updaty](https://img.shields.io/badge/updaty-7-E50914?style=for-the-badge&labelColor=0a0a0a)
![Wersja](https://img.shields.io/badge/wersja-0.7.0-E50914?style=for-the-badge&labelColor=0a0a0a)

</div>

Format wg [Keep a Changelog](https://keepachangelog.com) + **numeracja updatów** `[#NNN]`.
Wersjonowanie: [SemVer](https://semver.org). Najnowsze na górze.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

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
