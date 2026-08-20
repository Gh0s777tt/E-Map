# 📱 Mobile (Expo) — stan i plan dojścia do pełnego parytetu z web

> Stan: **v1.95.0** · Expo SDK 56 · React Native 0.85 (New Architecture) · zsynchronizowane z v1.248.0 (#419) · 2026-08-19 · **iOS build 65 i Android versionCode 44 zbudowane na EAS** (profil `production` — bez lokalizacji w tle; ASC App ID 6789726653, Play track alpha). **Artefakty NIE zostały wysłane** ani na TestFlight, ani do sklepów — submit to osobna decyzja · **App Store**: review zawieszony (Guideline 5.6), kolejne zgłoszenia obarczone ryzykiem dla konta deweloperskiego — TestFlight blokadą nie jest objęty · **Android**: rollout nadal wymaga deklaracji „App content” w Play Console

> **Co niesie v1.95.0** (od v1.94.0 z 26 lipca): usuwanie konta w aplikacji (wymóg Apple), pełny interfejs czatu (reakcje, cytat, przekazanie, znikanie, lokalizacja), trzy formularze Fazy 6, ekran pauzy, **pole kwoty przy tankowaniu** — bez niego `price_total` był NULL w 100% wpisów i cała pieniężna część statystyk liczyła z pustego zbioru — kraj jako kod ISO 3166 oraz spalanie L/100 km, AdBlue i rozbicie na pojazdy w statystykach kierowcy.

> **Czeka na najbliższy build** (w kodzie, jeszcze nie w żadnym artefakcie EAS) — lista rośnie, bo od v1.95.0 nie powstał ani jeden nowy artefakt:
> - `[#388]` **waluta kosztu pojazdu jako wybór z listy zamiast wolnego tekstu** — wpisane `PL` zamiast `PLN` dawało koszt zapisany poprawnie, ale nie do przeliczenia na euro, więc kwota cicho wypadała z podsumowań; podpowiedź bierze się z kraju firmy i jest sprawdzana wobec listy walut notowanych przez EBC.
> - `[#389]`, `[#397-#399]` **„Moje rozliczenie" i „Czas pracy" liczyły ewidencję CAŁEJ firmy jako własną kierowcy** (`app/settlement.tsx`, `app/work-time.tsx`) — telefon znał tylko `auth.uid()`, a ewidencja wisi na `drivers.id`; brakujące powiązanie dokłada migracja 0104. Kierowca dostawał zawyżony szacunek wypłaty i czerwony alarm przekroczenia norm WTD, którego nie dało się wyjaśnić.
> - `[#401]` **czat urywał się po powrocie z tła** (`app/chat-thread.tsx`) — Realtime nie odtwarza zdarzeń po rejoinie, a tą drogą idą zmiany adresu załadunku i numeru rampy.
> - `[#390]` **token push zdejmowany przy wylogowaniu** (`components/AuthProvider.tsx`, `lib/push.ts`) —
>   część poprawki „klucz szyfrujący PII wywoływalny bez logowania". Bez tego telefon po wylogowaniu
>   dalej dostawał powiadomienia poprzedniego kierowcy; ścieżka wylogowania musi wejść do listy QA.
> - `[#391-#395]` **outbox i kontrola uprawnień** (`lib/outbox.ts`, `lib/usePermission.ts`) — pięć
>   odłożonych znalezisk audytu.
> - `[#404]` **ekran linków firmowych** (`app/links.tsx` + pozycja w menu) — myto, promy, awizacja.
> - `[#407-#413]` **przepisany outbox i strażnik PowerSync** (`lib/outbox.ts`, `lib/powersync.ts`) —
>   największa zmiana na tej liście; synchronizacja offline wymaga testu na urządzeniu, nie tylko w CI.
> - `[#416]` **przekompresowane grafiki** (`assets/icon.png`, `adaptive-icon.png`, `splash-icon.png`
>   i całe `store/`) — ImgBot, bezstratnie. Wchodzą do artefaktu i na kartę sklepu, więc build przyniesie
>   zmianę wizualną, której nikt nie zamawiał w kodzie.
>
> Wersja aplikacji **celowo zostaje na 1.95.0** — podbijamy ją bezpośrednio przed `eas build`, żeby nie powstał numer wersji, któremu nie odpowiada żaden artefakt.

Aplikacja **NIE jest już szkieletem ani wyłącznie narzędziem kierowcy** — to działające MVP na realnych
danych z Supabase (offline-first), a od fal parytetu zarządzania (fale 2–9, #346–#353) także panel właściciela:
ekrany `manage-*` dają z telefonu pełny CRUD floty, kartoteki, zleceń, faktur i zespołu.
Konsumuje `@e-logistic/core`, `@e-logistic/api`, `@e-logistic/i18n`, `@e-logistic/ui`.

## Stan funkcji (z kodu)

| Funkcja | Status | Dowód |
|:--|:--:|:--|
| Logowanie + sesja (szyfrowana: keychain + AES, #251) | ✅ | `app/login.tsx`, `lib/secureSession.ts` |
| Klient Supabase + warstwa `@e-logistic/api` | ✅ | `lib/supabase.ts` |
| Formularze Paliwo / AdBlue / Trip (realne dane) | ✅ | `components/LiquidForm.tsx`, `app/{fuel,adblue,trip}.tsx` |
| Outbox offline (`queued → synced → error`) | ✅ | `lib/outbox.ts` |
| Moje zlecenia + zmiana statusów | ✅ | `app/my-orders.tsx` |
| Zdjęcia ładunku (aparat/galeria) + podpis POD | ✅ | `components/CargoPhotosMobile.tsx`, `SignaturePadMobile.tsx` |
| Push (expo-notifications) | ✅ | `lib/push.ts` — `extra.eas.projectId` jest już w `app.config.js` |
| Mapa / POI / trasa | ⚠️ | `app/map.tsx` — fale 1 (#253) i 2 (#272), routing on-device (#356). **Profil zestawu niepełny**: trasa liczy się z wymiarów samego ciągnika, bez naczepy (#406 objął wyłącznie web) |
| Tacho PRO (licznik LIVE, planer odpoczynku) | ✅ | `app/tacho.tsx`, `lib/tacho{Live,Journal,Stop}.ts` |
| Zarządzanie z telefonu (właściciel/dyspozytor) | ✅ | `app/manage-*.tsx` — pojazdy, karty, kartoteka, zlecenia, faktury, serwis, zespół, kontrahenci, koszty |

> Odpowiada to ukończeniu faz **M1, M2 i M4**. **M3** (mapa) ma dostarczone trzy fale, ale profil
> zestawu w routingu mobile pomija naczepę (#406 objął tylko web), więc faza zostaje otwarta —
> szczegóły przy fazie M3 niżej. **M5** (PowerSync) ma za sobą falę 1 — sam odczyt; dopóki zapisy
> idą outboxem, faza jest otwarta.

## Audyt parytetu web↔mobile (#320 · odświeżony po falach zarządzania 2–9)

Spis WSZYSTKICH zakładek panelu web i ich odpowiedników w aplikacji.
Legenda: ✅ pełny odpowiednik · 👁 widok odczytu (edycja na webie) · 🖥 świadomie web-only (uzasadnienie) · ⏳ zaplanowane.

> Tabela w pierwotnym kształcie (#320) opisywała mobile jako aplikację **kierowcy**, więc kartoteka,
> zespół, kontrahenci i koszty stały w niej jako 🖥 „praca biurowa". Osiem fal parytetu
> zarządzania (fale 2–9, #346–#353) tę granicę skasowało — ekrany `manage-*` robią z telefonu pełny CRUD
> dla właściciela/dyspozytora. Rubryki 🖥 zostały tylko tam, gdzie web-only jest **decyzją**,
> a nie zaległością: wielkie tabele analityczne i narzędzia zarządcze.

| Zakładka web | Mobile | Uwagi |
|:--|:--:|:--|
| `dashboard` | ✅ | Start: karta kierowcy (wariant A) + pulpit właściciela (W1) |
| `orders` / `my-orders` | ✅ | `app/orders.tsx`, `app/my-orders.tsx` (statusy, POD, zdjęcia) + **#352** `manage-orders.tsx` (CRUD, przypisanie pojazd+kierowca) |
| `forms` (paliwo/AdBlue/trip) | ✅ | hub `(tabs)/forms` + `fuel/adblue/trip` (offline outbox, OCR) oraz `pause.tsx` (Faza 6) |
| `cards` | ✅ | `(tabs)/cards` — karty + PIN (30 s); `manage-cards.tsx` — CRUD + ustawienie PIN |
| `chat` | ✅ | `(tabs)/chat` + `chat-thread` (realtime, zdjęcia, push) |
| `checklists` | ✅ | `(tabs)/checklists` + **#346** `manage-checklists.tsx` (edytor szablonów i pozycji) |
| `expenses` | ✅ | `app/expenses.tsx` (offline + OCR paragonów) |
| `work-time` | ✅ | `app/work-time.tsx` |
| `documents` | ✅ | `app/documents.tsx` |
| `damages`/`reports` (usterki) | ✅ | `app/defects.tsx` |
| `map` | ⚠️ | `app/map.tsx` (POI, raporty, oceny parkingów, routing TIR on-device) — ale profil zestawu bez naczepy, patrz M3 |
| `stats` | ✅ | `app/stats.tsx` |
| `settlements` | ✅ | `app/settlement.tsx` (szacunek silnikiem core) |
| `per-diem` | 👁 | **#320** `app/per-diem.tsx` — kierowca widzi swoje diety; wpisy dodaje biuro |
| `payouts` | 👁 | **#320** `app/payouts.tsx` — saldo per waluta + historia; wpisy dodaje biuro |
| `fuel-prices` | ✅ | **#320** `app/fuel-prices.tsx` — ranking cen diesla EU (€/L) |
| `vehicles` | 👁 | `app/vehicle.tsx` — przypisany pojazd (widok kierowcy) + `manage-vehicles.tsx` — CRUD **ciągników** i ich terminów. **Naczep nie ma**: od #405 są osobną encją (`trailers`, migracja 0110) z własnym przeglądem, OC i leasingiem — web robi na nich pełny CRUD w tej samej zakładce, mobile nie ma nawet podglądu, więc z telefonu nie da się ani wpisać, ani zobaczyć terminu naczepy |
| `settings` | ✅ | `app/settings.tsx` + `app/profile.tsx` (język, avatar, e-mail/hasło) + **#404** `links.tsx` — linki firmowe |
| `schedule` / `service` | ✅ | **#321** `app/schedule.tsx` — terminy scalone per pojazd/kierowca (rozwijane) + **#350** `manage-service.tsx` (zadania serwisowe wg przebiegu) |
| `fleet-status` | ✅ | **#321** `app/fleet-status.tsx` — silnik `buildFleetStatus`: w trasie / zaplanowany / wolny + ostatni Trip |
| `invoices` | ✅ | **#321** `app/invoices.tsx` (suma miesiąca + lista) + **#353** `manage-invoices.tsx` — wystawianie, pozycje, opłacona/anulowana, duplikat |
| `tacho` | ✅ | **#327–#331** `app/tacho.tsx` — licznik LIVE 561/2006, kalkulator ręczny, OCR wyświetlacza, planer odpoczynku |
| `drivers` (kartoteka) | ✅ | **#349** `manage-drivers.tsx` — pełna kartoteka wraz z tożsamością (szyfrowaną przez RPC) i terminami badań |
| `team` | ✅ | **#351** `manage-team.tsx` — role, matryca uprawnień per moduł, link zaproszenia |
| `contractors` | ✅ | **#346** `manage-contractors.tsx` — CRUD nabywców/nadawców (import CSV zostaje na webie) |
| `koszty` | ✅ | **#347** `manage-vehicle-costs.tsx` — koszty inne niż paliwo (import CSV zostaje na webie) |
| `analytics` | 🖥 | **#335** insighty floty (`buildFleetInsights`) — wykresy i prognozy do czytania na dużym ekranie |
| `monthly` | 🖥 | zestawienie miesięczne (duże tabele) — analityka biurowa |
| `wyjazdy` | 🖥 | rozliczenie wyjazdów (buildJourneys) — analityka biurowa |
| `scoring` | 🖥 | ranking kierowców — narzędzie zarządcze (web) |
| `audit` | 🖥 | log audytowy compliance — web |
| `dev` | 🖥 | narzędzia deweloperskie — web |

## Faza M1 — Warstwa danych + sesja ✅ ZREALIZOWANE
- `@react-native-async-storage/async-storage` + `react-native-url-polyfill` + `@e-logistic/api`.
- `lib/supabase.ts`: `createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })`.
- Ekran logowania (email+hasło) + sesja persystentna; guard nawigacji (`AuthProvider` + `useProtectedRoute`).

## Faza M2 — Formularze offline-first na realnych danych ✅ ZREALIZOWANE
- Pojazdy/karty z bazy przez `lib/useFleet.ts` (RLS zawęża do firmy) — zamiast danych demo.
- Outbox na `AsyncStorage` (`lib/outbox.ts`: `enqueue`/`trySync`/`flushQueued`) + re-sync po połączeniu.
- Walidacja współdzielona (`fuelLogSchema`/`tripEventSchema` z `@e-logistic/core`).

## Faza M3 — Mapa i POI 🚧 FALE 1–3 DOSTARCZONE, FAZA OTWARTA
- [x] Fala 1 (#253): `@maplibre/maplibre-react-native` v11 (config plugin), ekran `app/map.tsx` —
  styl MapTiler dark / fallback OSM (`lib/mapStyle.ts`), „moja lokalizacja" (expo-location),
  POI TIR (parkingi hgv + stacje) z Overpass przez `@e-logistic/maps` (`fetchPois`), i18n `mobileMap.*`.
- [x] Fala 2 (#272): **warstwa trasy na mapie mobile** — web liczy trasę TIR i wysyła (`driver_routes`: przystanki+geometria+podsumowanie), mobile rysuje linię, przystanki i pasek dystans/czas/myto. Chips „🧭" z odebranymi trasami.
- [x] Fala 3 (#341, #356): wyszukiwanie adresu i **własne wyznaczanie trasy TIR na urządzeniu**
  (`TomTomRoutingProvider` z ruchem na żywo; `/api/route` webu jako fallback przy błędzie). Profil
  pojazdu bierze się z kartoteki (#383) — bez `heightCm` zapytanie leciało bez `vehicleHeight`,
  więc trasa omijała tylko to, co omija każdy TIR „bez wymiarów", a niższy wiadukt przechodził bez słowa.
- [x] Oceny parkingów (#323) — `components/ParkingReviewCard.tsx`, te same dane społecznościowe co web.
- [ ] **Profil ZESTAWU w routingu mobile** — otwarte i to jest powód, dla którego faza nie jest odhaczona.
  #406 (`combineRigProfile` w [`packages/core/src/rigProfile.ts`](../packages/core/src/rigProfile.ts))
  policzył wysokość zestawu jako MAKSIMUM z ciągnika i naczepy, a osie jako SUMĘ — ale objął wyłącznie
  web (`git show --stat 4eaadbc`: `apps/web/app/(app)/map/page.tsx` i `packages/core`, ani jednego pliku
  z `apps/mobile`). Mobile buduje `usedProfile` w [`app/map.tsx`](../apps/mobile/app/map.tsx) z
  [`lib/vehicleProfile.ts`](../apps/mobile/lib/vehicleProfile.ts), które o naczepie nie wie nic, i ten sam
  okrojony profil idzie ZARÓWNO do `TomTomRoutingProvider` on-device, JAK I do fallbacku `/api/route`.
  Skutek jest dokładnie ten, który fala 3 opisuje jako naprawiony: ciągnik 3,8 m z chłodnią 4,0 m dostaje
  z telefonu trasę pod wiadukt 3,9 m, a ta sama trasa policzona w panelu web wiadukt omija. Analogicznie
  liczba osi — myto szacowane z osi samego ciągnika jest zaniżone na całej trasie.
- ⚠️ **Natywny moduł** — działa w dev buildach / EAS, NIE w Expo Go. **Test:** mapa + POI na urządzeniu.

## Faza M4 — Powiadomienia push (natywne) ✅ ZREALIZOWANE
- `expo-notifications` + token urządzenia → tabela `expo_push_tokens` (`lib/push.ts`).
- Most do wysyłki serwerowej (`/api/orders/notify-assignment`, kanał Expo Push obok Web Push).
- `extra.eas.projectId` ustawiony w [`app.config.js`](../apps/mobile/app.config.js) — warunek spełniony,
  a `lib/push.ts` i tak schodzi na best-effort (brak zgody / brak `projectId` = push nieaktywny, nie wyjątek).

## Faza M5 — Offline-sync (PowerSync) 🚧 FALA 1 DOSTARCZONA (#311)
- [`lib/powersync.ts`](../apps/mobile/lib/powersync.ts) — lokalny SQLite ↔ Supabase, **tylko odczyt**.
  Bez `EXPO_PUBLIC_POWERSYNC_URL` całość jest no-opem, a natywny `@powersync/react-native` ładowany
  jest leniwie: statyczny import wywracał iOS przy niekompletnym setupie natywnym.
- Fala 2 (zapisy zamiast outboxu) — otwarta. Dopóki obie ścieżki zapisu istnieją równolegle,
  **źródłem prawdy zostaje outbox**; dwa niezależne kanały zapisu to gwarantowany rozjazd danych.

## Do publikacji w sklepach (pozostałe kroki)
1. ~~`eas init`~~ ✅ — `extra.eas.projectId` w `app.config.js` (projekt ma za sobą buildy EAS).
2. `npx expo install --fix` (dociągnięcie wersji natywnych do SDK — patrz „aktualizacje" niżej).
3. ~~Finalna grafika~~ ✅ (#255) — monogram „E" + droga (czerń/czerwień), generowane skryptem `scripts/gen-mobile-assets.mjs` (icon/adaptive/splash/favicon).
4. Dev build + **QA na urządzeniu**: login → zlecenia + status → zdjęcia z aparatu → formularze offline → push.
5. `eas build -p android/ios --profile production` → `eas submit`.
6. Konta deweloperskie: ~~Apple Developer~~ ✅ (opłacone 2026-07) — do buildu iOS jednorazowo `eas build -p ios` interaktywnie (login Apple + 2FA, credentials zapisują się na serwerze Expo). ~~Google Play Console~~ ✅ — konto założone, artefakt leży na tracku **alpha**; do rolloutu brakuje deklaracji „App content". Polityka prywatności ✅ (#256 — `/privacy` na web) + opisy uprawnień w [`app.config.js`](../apps/mobile/app.config.js) ✅ (`app.json` w tym repo nie istnieje — cała konfiguracja Expo jest dynamiczna). Karta sklepu: gotowe teksty/grafiki w `apps/mobile/store/` (`listing.md`).

## Aktualizacje zależności (Expo)
- **Nie** aktualizuj pakietów `expo-*`/`react-native*` ręcznie wg `pnpm outdated` (pokazuje mylące skoki przez
  unified-versioning Expo). Używaj `npx expo install --fix`, który dopasowuje wersje natywne do SDK.
- Bump dużych wersji = bump **SDK Expo** (np. 56 → następny) razem, nie pojedynczo.

## Wersjonowanie (decyzja — audyt #219)
- **`apps/mobile` wersjonowany niezależnie** ([`app.config.js`](../apps/mobile/app.config.js) i `package.json` = **1.95.0**, przy roocie na 1.248.0) — własny rytm wydań związany z buildami **EAS** i publikacją w sklepach; unified-versioning Expo czyni lockstep z numerem roota niepraktycznym. **Świadoma decyzja**, nie rozjazd — i dlatego `docs:check` traktuje ten numer jako dozwolony obok wersji projektu, zamiast żądać zgodności.
- `apps/web` = wersja roota (pilnowane bramką `docs:check` od #214). `packages/*` (0.x) — wewnętrzne, niepublikowane na npm; numer wersji bez znaczenia funkcjonalnego.

## Porządki przy okazji
- `apps/mobile/tsconfig.json` ma już zaostrzone reguły (strict + `noUncheckedIndexedAccess`) — utrzymać przy nowych ekranach.
