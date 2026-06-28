<!-- Raport QA — testy + polowanie na defekty. Stan: 2026-06-28, main @ v1.76.0. -->

# 🧪 TEST_REPORT — E‑Logistic

> QA / test engineering. Cel: aktywnie wywoływać błędy i dopisać testy na krytycznej logice.
> Zasada: **nie zmieniam kodu aplikacji pod test** — czerwony test = znalezisko.
> Zakres: Faza 0 (baseline) → 1 (logika domenowa) → 2 (integracja/scoping) → 4 (autoryzacja/nadużycia).

---

## 1. Podsumowanie

Przejrzałem krytyczną logikę domenową (`packages/core`), warstwę danych (`packages/api`), autoryzację tras API (`apps/web/app/api/*`) i kontrole bezpieczeństwa (open‑redirect). Punktem wyjścia był zwiad 3 agentów (≈30 podejrzeń) — **każde zweryfikowałem ręcznie na kodzie**.

**Ocena:** kod jest **dojrzały, dobrze przetestowany i bezpieczny**. Logika finansowa zaokrągla raz na końcu przez `round2` z `Number.EPSILON`, walidacja Zod ma sensowne granice, trasy z klientem service‑role poprawnie zawężają zapytania do firmy/użytkownika, RLS zweryfikowane wcześniejszym audytem. **Zdecydowana większość podejrzeń agentów to fałszywe alarmy** (szczegóły w §6) — co potwierdza, że „zielony bez sprawdzenia" jest bezwartościowy w obie strony.

- **Defekty Krytyczne/Wysokie/Średnie:** 0.
- **Defekty Niskie:** 1 (latentne ryzyko scoping — `listPushSubscriptionsForDelivery`, obecnie nieeksploatowalne).
- **Testy dodane:** **+55** (343 → **398**) + **1 pominięty** (regresja na hardening). Każdy uruchomiony; kluczowe granice/parsery/inwarianty zweryfikowane **mutacją** (psucie kodu → czerwony → przywrócenie).
- **Gotowość:** część webowa produkcyjnie gotowa (zgodnie z wcześniejszym audytem). Brak blokerów wydania.

---

## 2. Defekty

| Severity | Obszar | Opis | Kroki odtworzenia | Oczekiwane vs faktyczne | Test odsłaniający |
|---|---|---|---|---|---|
| **Niski** (latentny) | `packages/api/src/data/push.ts:46‑56` `listPushSubscriptionsForDelivery` | Brak guardu: wywołane **bez** `companyId`/`userIds` nie zakłada żadnego filtra → zapytanie service‑role (omija RLS) zwraca subskrypcje **wszystkich firm**. Obecnie wszyscy 3 wołający przekazują filtr, więc **nie jest aktywnie eksploatowalne**; doc mówi „filtruje *jeśli podano*" (świadome). Ryzyko: przyszły wołający zapomni filtra → cross‑tenant. | `listPushSubscriptionsForDelivery(admin)` (bez opts) → brak `.eq`/`.in` w zapytaniu → zwraca cały zbiór. | Oczekiwane (hardening): odmowa / wymóg ≥1 filtra. Faktyczne: zwraca wszystko. | TAK — `push.test.ts` (pominięty `it.skip` „bez filtra POWINNO odmówić — TEST_REPORT #1") + testy pozytywne potwierdzające scoping firmy/użytkownika |

> Klasyfikacja: na granicy „działa‑jak‑zaprojektowano". Zgłaszam jako **Niski/latentny**, bo to klasyczny wektor wycieku multi‑tenant, gdyby ktoś dodał wołającego bez filtra. Naprawa (poza moim zakresem — nie ruszam kodu aplikacji): wymusić w sygnaturze ≥1 filtr lub rzucać, gdy brak obu.

---

## 3. Triage

- **Blokuje wydanie:** nic.
- **Może poczekać (hardening):** defekt #1 — dodać guard wymagający scope w `listPushSubscriptionsForDelivery`; po naprawie odznaczyć `it.skip` w `push.test.ts`. Niski priorytet (nieosiągalne obecną ścieżką).
- **Uwagi z §6** — kosmetyka/decyzje projektowe, nie wymagają działania.

---

## 4. Dodane testy

Uruchomienie całości: **`CI=true pnpm test`** (Turbo, 6 pakietów). Ostatni przebieg: **398 passed, 1 skipped, 0 failed** (`@core 222 · @api 58+1skip · @maps 54 · @web 43 · @mobile 19 · @i18n 2`). Biome czysto.

| Plik | Co pokryto | + testów |
|---|---|---|
| [perDiem.test.ts](packages/core/src/perDiem.test.ts) | **Granice dób** krajowa/zagraniczna: dokładnie 8h i 12h, tuż‑poniżej/tuż‑powyżej, reszta wielodobowa dokładnie 8h. Chroni wypłaty przed flipem `<`/`<=`. | +12 |
| [expiry.test.ts](packages/core/src/expiry.test.ts) | **Granice ważności:** dzień wygaśnięcia (0 dni = soon, nie expired), −1 = expired, dokładnie `warnDays`, `warnDays+1`, własny próg; `serviceStatus` dokładnie na `warnKm` i na celu. | +8 |
| [workTime.test.ts](packages/core/src/workTime.test.ts) | **Limit jazdy:** dokładnie na limicie → brak przekroczenia (`>` strict), tuż powyżej → przekroczenie, własny limit na granicy. | +3 |
| [push.test.ts](packages/api/src/data/push.test.ts) *(nowy)* | **Scoping multi‑tenant** `listPushSubscriptionsForDelivery`: filtr `company_id`, filtr `user_id IN`, oba łącznie, pusta tablica userIds, passthrough danych, rzut przy błędzie + regresja hardening (skip). | +6 (+1 skip) |
| [pushUrl.test.ts](apps/web/lib/pushUrl.test.ts) | **Open‑redirect / CRLF‑injection:** TAB/CR/NUL (przez `String.fromCharCode`), backslash tuż po „/". | +2 |
| [geocode.test.ts](packages/maps/src/geocode.test.ts) *(nowy)* | **Parsowanie geokodera** (mock `fetch`): Nominatim/MapTiler, pominięcie pozycji bez współrzędnych, łańcuch etykiet, **fallback MapTiler→Nominatim** przy błędzie HTTP, guard `<2` znaki, zachowanie równika (`lat="0"`). | +9 |
| [maps.test.ts](packages/maps/src/maps.test.ts) | **Haversine na granicy:** antymerydian (179.9°E↔179.9°W ≈ 22 km, nie 40000) i 1° przy biegunie ≈ 111 km. | +2 |
| [routeProviders.test.ts](packages/maps/src/routeProviders.test.ts) *(nowy)* | **Ścieżka sieciowa `route()`** (mock `fetch`): HERE — sumowanie sekcji, **konwersja myta lokalnego (PLN)→EUR**, pominięcie myta bez wartości, nieznana waluta 1:1, błąd HTTP, brak trasy, <2 pkt; GraphHopper — m→km/ms→min/geometria, myto 0, błędy, waluta z żądania. | +10 |
| [outbox.test.ts](apps/mobile/lib/outbox.test.ts) | **Integralność offline-first:** ⚠️ zsynchronizowany wpis **nie jest wstawiany ponownie** przy `flushQueued` (brak duplikatów — integralność danych); brak firmy → error; błąd insertu → error; ekstrakcja `errorMessage` (details/code); uszkodzony storage → `[]`; kolejność `unshift`. | +6 |

**Dowód wartości (mutation testing):** tymczasowo psułem kod i potwierdzałem czerwień, po czym przywracałem (`git checkout`): `perDiem.ts` (`< 8`→`<= 8`), `workTime.ts` (`> limit`→`>= limit`), `geocode.ts` (usunięcie pominięcia bez‑współrzędnych), `here.ts` (usunięcie konwersji FX myta), `outbox.ts` (usunięcie **obu** guardów anty‑duplikat → podwójny zapis). Za każdym razem odpowiedni test wpadał na czerwono → testy realnie łapią regresję, nie są tautologiczne.

---

## 5. Pokrycie

**Dobrze przetestowane (po tej sesji):**
- Logika rozliczeń/spalania (`billing.ts`) — throw‑guardy, `monthsEndingAt` z przeniesieniem roku, anomalie, full‑to‑full. Solidne już przed sesją.
- **Diety/czas pracy/wygasanie — teraz z granicami progów** (płace, compliance).
- **Scoping push** (`company_id`/`user_id`) + kontrola open‑redirect powiadomień.
- Walidacja Zod (`schemas.ts`), warstwa danych `api` (16 modułów `data/*`, kształt zapytań), handlery tras (push/send, notify‑assignment, fakturownia, route, traffic) — auth‑guard + izolacja firm.

- **`maps` — domknięte:** geokoder (`geocode.ts`, fallback), haversine antymerydian/biegun, **ścieżka sieciowa `route()` HERE i GraphHopper** (mock `fetch`: parsowanie, FX myta, błędy HTTP). `multileg`/`poi`/`toll`/`parseHereTraffic`/buildery — pokryte wcześniej. Adaptery map są teraz solidnie pokryte logiką+siecią.
- **Mobile `outbox` — integralność offline-first:** ochrona przed podwójnym zapisem przy ponownej synchronizacji (defense‑in‑depth, dwa guardy), ścieżki błędów (brak firmy/sesji, błąd insertu) i odporność na uszkodzony storage.

**Białe plamy (konkretnie):**
- RPC `order_set_status` — autoryzacja przejść statusów żyje **w bazie** (SECURITY DEFINER), nietestowalna jednostkowo bez instancji Postgres.
- Komponenty React (poza `DataTable`/`Toast`) i pełne przepływy UI — patrz §7 Luki.

---

## 6. Uwagi (nie‑defekty: zweryfikowane i odrzucone)

Transparentnie — podejrzenia, które **sprawdziłem i odrzuciłem** (żeby nie mylić ich z realnymi bugami):

- **perDiem „granica 8h zagraniczna źle"** → FAŁSZ. Kod `remainder <= 8 → 1/3` jest zgodny z komentarzem i z rozporządzeniem MPiPS („do 8 h – 1/3"). Dodałem za to testy brzegowe.
- **expiry „bug strefy czasowej (Date.parse)"** → FAŁSZ. Oba argumenty to `YYYY‑MM‑DD` parsowane jednakowo jako UTC → różnica jest dokładną wielokrotnością doby; strefa się znosi.
- **search „puste tokeny z wielospacji"** → FAŁSZ. `query.trim()` przed `split(/\s+/)` eliminuje puste tokeny.
- **disruptions „Infinity na pustej trasie"** → FAŁSZ (nieosiągalne). Jedyny wołający `itemsNearRoute` ma guard `route.length===0`; Infinity i tak odpada w filtrze `<= maxKm`.
- **orders „brak maszyny stanów, dowolne przejścia"** → FAŁSZ. `setOrderStatus` woła RPC `order_set_status` z kontrolą uprawnień w bazie; wolne przejścia dla owner/dyspozytora są **zamierzone** (korekta pomyłek).
- **billing/profitability/co2 „brak pośredniego zaokrąglania"** → NIE‑BUG. Zaokrąglanie raz na końcu (`round2` z `Number.EPSILON`) jest *poprawniejsze* niż pośrednie; sumy nie kumulują błędu istotnie.
- **Kosmetyka (decyzja, nie defekt):** opcjonalne pola tekstowe w `orderSchema` (`shipper`/`origin`…) bez `.min(1)` przepuszczają `""` (jakość danych, nie błąd); `orderSchema.currency` bez `.min(1)` w odróżnieniu od `vehicleCostSchema` (drobna niespójność).
- **Odporność (drobna nierówność):** [graphhopper.ts:71](packages/maps/src/graphhopper.ts) zakłada `path.points.coordinates` — odpowiedź bez `points` rzuci nieczytelny `TypeError` zamiast „brak trasy"; HERE analogicznie łagodnie pomija brak polilinii (`if (s.polyline)`). Nieosiągalne przy `points_encoded:false` + poprawnej odpowiedzi; rekomendacja: guard na brak `points`. [geocode.ts:49](packages/maps/src/geocode.ts) — `Number("abc")→NaN` nie jest odsiewane (Nominatim nie zwraca takich danych; defensywnie warto).

---

## 7. Luki w testach (czego nie dało się przetestować i dlaczego)

- **E2E przepływów `(app)`** — wymaga zalogowanej sesji Supabase. Nie loguję się (wpisywanie poświadczeń poza moim zakresem), a tryb offline‑bez‑auth obchodziłby właśnie testowaną autoryzację. Potwierdziłem jedynie: dev server wstaje, `/map`→`/login` (auth‑guard działa, `opaqueredirect`), strony publiczne renderują. **Pełne ścieżki (logowanie → akcja → zapis → wynik) niepokryte.**
- **Logika DB‑side** — RPC `order_set_status`, polityki RLS, funkcje SECURITY DEFINER: testowalne tylko na instancji Postgres (zakaz pracy na produkcji; brak lokalnego `supabase/config.toml`/Dockera). Pokryte pośrednio audytem RLS (`scripts/audit-rls.mjs`).
- **Adaptery HTTP map** — **domknięte** mockiem `fetch`: geokoder (MapTiler/Nominatim) oraz `route()` HERE/GraphHopper (parsowanie, FX, błędy). Nie testowano wobec żywego API (determinizm) — kontrakt parsowania odpowiedzi pokryty mockami.
- **Mobile (Expo)** — brak urządzenia/emulatora; pokryta tylko logika (`outbox`, `navigation`).

---

*Koniec raportu. Nie zmieniłem żadnego kodu aplikacji — dodano wyłącznie testy. Mutacje weryfikacyjne przywrócono (`git diff` źródeł czysty).*
