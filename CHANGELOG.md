<div align="center">

# 📜 CHANGELOG &nbsp;·&nbsp; E‑LOGISTIC

![Updaty](https://img.shields.io/badge/updaty-33-E50914?style=for-the-badge&labelColor=0a0a0a)
![Wersja](https://img.shields.io/badge/wersja-0.33.0-E50914?style=for-the-badge&labelColor=0a0a0a)

</div>

Format wg [Keep a Changelog](https://keepachangelog.com) + **numeracja updatów** `[#NNN]`.
Wersjonowanie: [SemVer](https://semver.org). Najnowsze na górze.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

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
