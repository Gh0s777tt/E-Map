<div align="center">

# 📜 CHANGELOG &nbsp;·&nbsp; E‑LOGISTIC

![Updaty](https://img.shields.io/badge/updaty-427-E50914?style=for-the-badge&labelColor=0a0a0a)
![Wersja](https://img.shields.io/badge/wersja-1.252.0-E50914?style=for-the-badge&labelColor=0a0a0a)

</div>

Format wg [Keep a Changelog](https://keepachangelog.com) + **numeracja updatów** `[#NNN]`.
Wersjonowanie: [SemVer](https://semver.org). Najnowsze na górze.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```


## [1.252.0] — 📏 Reguła bez bramki gnije

Rozbudowa [`CLAUDE.md`](CLAUDE.md) i [`SECURITY.md`](SECURITY.md) o rytm pracy „na bieżąco".
Przy pisaniu wyszło, że problemem nie jest brak reguł — tylko to, że **istniejące reguły
nikogo nie obowiązywały**, bo nic ich nie sprawdzało.

- `[#427]` 📏 **Każda reguła dostaje wskazaną bramkę — albo etykietę `[dyscyplina]`**
  ([CLAUDE.md](CLAUDE.md))

  Dokument mówił „bramki muszą być zielone przed PR", a job `quality` miał w historii
  projektu **12 uruchomień i 12 porażek, ani jednego sukcesu**. Mówił „dokumenty zawsze
  zgodne z kodem", a `ARCHITECTURE.md` odsyłał do plików, których w repo nie ma. Reguły były
  prawdziwe jako intencja i fałszywe jako opis rzeczywistości — więc ich czytanie
  **wprowadzało w błąd**.

  Nowa zasada nadrzędna: reguła bez egzekucji jest jawnie oznaczona jako `[dyscyplina]`.
  Tabela „Rytm pracy" wymienia przy każdej pozycji konkretną bramkę: dokumentacja, README,
  changelog, roadmapa, commity, push, release, gałąź, audyty, numeracja, podpisy, sekrety.
  Doszła też sekcja **„Reguły wykute na błędach"** — dziewięć zasad, z których każda
  kosztowała osobne śledztwo w tej serii audytów.

- `[#427]` 🔢 **Bramka ciągłości numeracji `[#NNN]` — i zgubiony wpis, który znalazła**
  ([docs-check.mjs](scripts/docs-check.mjs))

  CLAUDE.md od pierwszego dnia wymagał numerów „kolejnych, bez luk". **Pierwsze uruchomienie
  kontroli znalazło dwie luki.**

  `#376` okazał się **zgubionym wpisem**: trzy commity z 2026‑08‑09 (`aff3cb7`, `9ad6a7d`,
  `d0dbf1a`) opisujące realną pracę — fałszywy sukces przy znikaniu wiadomości na kanale
  ogólnym, zdjęcie przekazane z kanału firmowego do rozmowy prywatnej pozostające czytelne
  dla całej firmy, całkowicie niesprawny cron czatu (414 na 195‑kilobajtowym URL-u) oraz
  waluta zapisywana, ale nigdzie nieprzeliczana (1200 PLN liczone jako 1200 EUR). Wpis
  odtworzony z treści commitów i dopisany do wydania `1.217.0`.

  `#336` to numer faktycznie przeskoczony — bez commita, bez zmiany. Trafił na listę
  wyjątków, która **sama się dezaktualizuje**: gdy numer się kiedyś pojawi, bramka zażąda
  usunięcia zbędnego zwolnienia.

  Luka w numeracji jest tanim wskaźnikiem zgubionego wpisu — dlatego jest błędem,
  nie ostrzeżeniem.

- `[#427]` ✋ **Strażnik gałęzi w `pre-commit`** ([lefthook.yml](lefthook.yml))

  Zakaz commitowania wprost na `main` istniał w regułach i nikt go nie pilnował — a commit
  na gałęzi domyślnej omija MR, czyli **jedyne miejsce, w którym w tym repo uruchamiają się
  bramki i przegląd**. Świadome obejście zostaje (`--no-verify`), bo commit ratunkowy przy
  zepsutym CI musi być możliwy.

- `[#427]` 🔐 **SECURITY.md z inwariantami zamiast samej polityki zgłoszeń**
  ([SECURITY.md](SECURITY.md))

  Doszły: **inwarianty** (RLS 62/62 · `search_path` na 91/91 funkcjach `SECURITY DEFINER` ·
  rate-limit 16/16 tras · `service_role` za `server-only`) z podanym sposobem weryfikacji
  przy każdym; **klasyfikacja sekretów** — bo klucz `anon` nie jest sekretem i mylenie go
  z `service_role` generuje najwięcej fałszywych alarmów; **bramki bezpieczeństwa** wraz
  z pułapką płytkiego klonu (bez `GIT_DEPTH: 0` skan sekretów widzi ~20 commitów);
  oraz **kolejność postępowania przy wycieku** — najpierw rotacja, dopiero potem historia,
  bo usunięcie sekretu z gita go **nie unieważnia**.

**Bramki:** `biome` ✓ · `tsc` 7/7 ✓ · testy **1283** ✓ · `next build` ✓ · `docs:check` ✓
(9 kontroli) · nowa kontrola przetestowana negatywnie — sztuczna luka wywala bramkę z kodem 1


## [1.251.0] — 📳 „Nic się nie dzieje" przestaje być możliwym stanem przycisku

Zgłoszenie od kierowcy: *nie da się zapisać trasy po wybraniu rozładunku, przycisk nie
reaguje*. Śledztwo dało wynik, którego się nie spodziewałem.

- `[#426]` 📳 **Ekran Trasa dostaje sygnały zwrotne, które formularz Paliwo ma od `[#294]`**
  ([trip.tsx](apps/mobile/app/trip.tsx))

  **W kodzie nie ma ŻADNEJ różnicy między załadunkiem a rozładunkiem.** Sprawdzone kolejno:
  `tripEventSchema` to `discriminatedUnion`, w którym obie gałęzie mają identyczny zestaw
  pól; `needsWeight` obejmuje obie akcje tak samo; `tripEventToRow` nie ma gałęzi zależnej
  od akcji; wszystkie 7 akcji × 4 języki są w katalogu; `firstZodError` ma fallback, więc
  walidacja nie może odrzucić po cichu; `apps/mobile/app/trip.tsx` nie zmienił się od
  wersji 1.95.0, więc to nie kwestia starego artefaktu.

  Różnica jest gdzie indziej — **między ekranem Trasa a formularzem Paliwo/AdBlue**.
  `LiquidForm` daje trzy sygnały: wibrację (`success()`/`warn()`), komunikat i osobny baner
  błędu synchronizacji. Trasa nie miała **żadnego z nich** poza tekstem w wyblakłym kolorze
  `smoke`, renderowanym **pod przyciskiem**. Przy dłuższym formularzu — a rozładunek
  z wybranym zleceniem dokłada sekcję zdjęć ładunku — ten tekst ląduje poniżej krawędzi
  ekranu. Kierowca tapie „Zapisz", telefon nie drga, nic widocznego się nie zmienia.
  **To nie jest przycisk, który nie działa. To przycisk, który nie odpowiada.**

  Naprawione: haptyka na każdej ścieżce (`warn()` przy odrzuceniu, `success()` przy zapisie),
  odrzucenie w kolorze ostrzeżenia zamiast wyblakłego, `accessibilityLiveRegion` +
  `accessibilityRole="alert"`, oraz zbiorczy baner błędu synchronizacji.

  Baner skanuje **całą kolejkę**, nie widoczną dziesiątkę: lista pokazuje `slice(0, 10)`,
  więc przy dłużej niedostępnym backendzie błędny wpis wypadał poza nią i znikał z oczu —
  a to jedyne miejsce, w którym kierowca widzi powód odrzucenia przez serwer.

  **Czego to NIE naprawia:** jeśli rozładunek jest odrzucany przez bazę, ta zmiana sprawia,
  że kierowca zobaczy powód — nie usuwa powodu. Jedyna asymetria load/unload w całym
  systemie siedzi w wyzwalaczu `auto_close_order_on_delivery` ([0052](supabase/migrations/0052_trip_order_link.sql)),
  który robi `update orders` dopiero gdy istnieją OBA zdarzenia, czyli w praktyce przy
  rozładunku. Weryfikacja wymaga żywej bazy — dziś wstrzymanej (patrz [BACKLOG](docs/BACKLOG.md)).

**Bramki:** `biome` ✓ · `tsc` 7/7 ✓ · testy **1283** ✓ · `next build` ✓ · `docs:check` ✓ ·
parytet i18n PL/EN/DE/UK ✓


## [1.250.0] — 🔧 Plan serwisowy przestaje gubić auta po terminie

- `[#424]` 🔧 **Przebieg liczony w bazie, plan sortowany wg pilności**
  ([0111_vehicle_odometers.sql](supabase/migrations/0111_vehicle_odometers.sql) · [service.ts](packages/api/src/data/service.ts))

  `latestOdometers` ściągało całą historię tankowań i liczyło maksimum w przeglądarce.
  Stronicowanie tego **nie naprawiło**, bo strony schodzą po `id`, czyli po
  `gen_random_uuid()` — porządek pobierania nie ma nic wspólnego z czasem. Powyżej sufitu
  wynikiem był `max` z próbki **jednolicie losowej**, razem z najświeższymi tankowaniami.
  Przy tankowaniu co ~900 km auto realnie 500 km po terminie wymiany oleju raportowało
  zapas +2000 km i **wypadało z panelu „Wymaga uwagi"**.

  Agregat należy do bazy: `vehicle_odometers(p_company)` robi `max(odometer_km) group by
  vehicle_id` — jeden wiersz na pojazd, odpowiedź o trzy rzędy wielkości mniejsza od zbioru,
  z którego powstaje. `security invoker`, więc RLS zawęża tak samo jak przy odczycie tankowań.

  **Okno renderowania obcinało listę od niewłaściwego końca.** Plan sortuje się po dacie
  dopisania rosnąco, a okno montuje pierwsze 200 wierszy — użytkownik widział 200
  **najstarszych** zadań zamiast najpilniejszych. Sortowanie wg pilności (gorszy z dwóch
  wymiarów: przebieg i kalendarz) idzie teraz **przed** oknem, a `LEVEL_RANK` i liczenie
  terminu, żyjące dotąd wyłącznie w ekranie mobilnym, wylądowały w `packages/core`.

  `listServiceTasksAll` (keyset) plus przepięcie **wszystkich sześciu** konsumentów —
  cztery web i dwa mobile. Karta pojazdu ściągała dotąd plan całej firmy i filtrowała
  w przeglądarce; przy ponad ~66 autach potrafiła pokazać pustą sekcję serwisu mimo
  istniejącego planu.

  **Ścieżka awaryjna zamiast wymuszonej kolejności wdrożenia.** Migracja i kod klienta jadą
  osobno — kod z deployem panelu, migracja ręcznie. Bez tego kolejność „panel przed bazą"
  wywracała cztery ekrany naraz u **każdej** firmy. Brak RPC (`PGRST202`, rozpoznawany
  wąsko po kodzie) cofa odczyt na starą ścieżkę i zwraca `complete`, więc niepewność jest
  widoczna, a nie ukryta. Każdy inny błąd nadal leci wyjątkiem — awaria sieci ma zostać
  awarią, nie cichym zejściem na wolniejszy tor. Obie własności pilnują testy.

- `[#423]` 📅 **Okno czasowe na `/orders` — i data, która naprawdę opisuje zlecenie**
  ([orders/page.tsx](apps/web/app/(app)/orders/page.tsx))

  Ekran pobierał całą historię, żeby suma zgadzała się z eksportem; przy 50 tys. zleceń
  to kilkadziesiąt zapytań przy wejściu. Selektor okresu (3/12/24 mies./cała historia,
  domyślnie 12) schodzi do bazy, wzorem `/forms/history`.

  Przy okazji wyszło coś poważniejszego: **okno filtrowało po `created_at`, a cały ekran
  datuje zlecenie po `load_date`**. Zlecenie wpisane w styczniu z załadunkiem w marcu
  trafiało do złego kubełka. Naprawa siedzi w jednym miejscu — `coalesce(load_date,
  created_at)` w filtrze — więc obejmuje też `/monthly`, `/stats`, `/scoring`, `KpiStrip`
  i `RevenueTrend`, które wszystkie kubełkują po dacie frachtu, a filtrowały po dacie wpisu.

  Podpis przy sumie mówi wprost, jakiego okresu dotyczą liczby i eksporty — bez tego
  właściciel odczytałby kwotę z dwunastu miesięcy jako obrót całej firmy. Okno kursów FX
  przestało być sztywnymi 24 miesiącami i wynika **z danych**: najstarsza data, o którą
  realnie zapyta przelicznik, minus zapas na weekendy EBC.

- `[#425]` 🌍 **Długi mobile i katalog** — lista dokumentów kierowcy sygnalizuje ucięcie
  (kierowca szukający dokumentu musi wiedzieć, że lista jest niepełna, a nie że dokumentu
  nie ma), a `fleet-status` przestaje mieć polskie napisy wpisane na sztywno w JSX.

**Bramki:** `biome` ✓ · `tsc` 7/7 ✓ · testy **1283** ✓ (+15) · `next build` ✓ ·
`docs:check` ✓ (113 migracji) · `pnpm check` 7/7 ✓
**Weryfikacja:** 3 agentów implementujących, 3 adwersaryjnych recenzentów — **7 znalezisk,
wszystkie potwierdzone, 5 wysokich.**

> ⚠️ **Wdrożenie:** migracja `0111` nie jest jeszcze zastosowana na bazie. Kod działa bez
> niej (ścieżka awaryjna), ale do czasu jej wgrania przebiegi liczą się starym, gorszym
> sposobem. Patrz [BACKLOG](docs/BACKLOG.md).


## [1.249.0] — 📐 Komplet danych, a nie zawieszona przeglądarka

Domknięcie tego, co `[#417]` zaczął na eksporcie księgowym. Przy okazji wyszło, że sama
naprawa kompletności — zrobiona bez drugiej połowy — zamieniłaby cichą utratę danych
na zawieszony ekran.

- `[#422]` 🔴 **`latestOdometers` — komentarz obiecywał komplet, zapytanie go nie miało**
  ([service.ts](packages/api/src/data/service.ts))

  Zapytanie nie miało **ani `limit`, ani `order`**, a komentarz nad nim twierdził
  „domyślnie skanujemy komplet". To nie był komplet, tylko sufit `api.max_rows`
  w **kolejności nieokreślonej**. Skutek jest gorszy niż brak danych: `latestOdometers`
  liczy najwyższy przebieg per pojazd, więc obcięcie **zaniża maksimum** — a od niego
  zależy, czy zadanie serwisowe w ogóle się odpali. Auto z przekroczonym interwałem
  po prostu nie pojawiało się na liście.

  Karmiło to panel „Wymaga uwagi", `/service`, `/schedule`, `/vehicles/[id]` oraz dwa
  ekrany mobilne. Przepięte na keyset po `id` z trzema wąskimi kolumnami; wariant
  próbkujący **usunięty**, żeby nie został jako furtka.

- `[#420]` 🧾 **Reszta cichych sufitów — siedem nowych wariantów stronicowanych**

  `listPerDiemTripsAll`, `listDriverPayoutsAll`, `listInvoicesAll`, `listDriverExpensesAll`,
  `listChecklistSubmissionsAll`, `listDocumentsAll`, `listDefectsAll` — wszystkie keysetem
  po kluczu głównym, z filtrami **schodzącymi do bazy**. Przepięte ekrany: analytics,
  koszty, stats, wyjazdy, settlements, monthly, scoring, orders, documents, expenses,
  forms/history, forms/import, fleet-status (web i mobile), `KpiStrip`, `RevenueTrend`,
  `AttentionPanel`.

  **Detektor, który nie mógł zadziałać.** `/stats` i `/wyjazdy` miały ostrzeżenie
  wyzwalane warunkiem `rows.length >= 5000`. Serwer tnie na 1000, więc warunek nie mógł
  być prawdziwy **nigdy** — ekran miał wbudowaną kontrolę obcięcia, która wyłącznie
  udawała, że chroni.

  **Keyset zmienia znaczenie obcięcia — i to trzeba było powiedzieć inaczej.** Przy
  `limit` i sortowaniu malejącym brakuje zawsze najstarszego ogona, więc dało się podać
  datę graniczną: „komplet mają wyjazdy po tej dacie". Keyset schodzi po kluczu, nie po
  dacie, więc braki są **rozsiane losowo** względem czasu. Stara treść komunikatu
  po przepięciu stałaby się fałszywa — dlatego `/wyjazdy` nie podaje już daty, dopóki
  **każdy** niepełny zbiór jej nie ma, a `/stats` mówi wprost, że zawężenie okresu
  **chowa ostrzeżenie zamiast naprawiać liczby**.

  W panelu „Wymaga uwagi" przepięcie objęło początkowo jeden zbiór z siedmiu. Baner
  mówiący wyłącznie o fakturach **uwiarygadniał ciszę** o dokumentach i usterkach —
  teraz wymienia zbiory z nazwy, a każde zapytanie ma własne `catch`, bo „nie wiemy"
  musi wyglądać tak samo jak „niekompletne".

- `[#421]` 🪟 **Rozdział pobrania od renderowania**
  ([useRenderWindow.ts](apps/web/lib/useRenderWindow.ts) · [ShowMore.tsx](apps/web/components/ShowMore.tsx))

  Sama kompletność to za mało: `/forms/history` po przepięciu pobierał trzy zbiory
  **całej historii** i renderował je w całości, bez okna i bez wirtualizacji. Cicha
  utrata danych zamieniłaby się w zawieszoną kartę przeglądarki — czyli w błąd, który
  użytkownik odczuje mocniej niż ten naprawiany.

  Sumy, filtry i eksport liczą się z **kompletu**; w DOM idzie porcja 200 z przyciskiem
  „pokaż więcej". Okno zwija się **w trakcie renderu**, nie w efekcie — efekt zwinąłby
  je dopiero po kosztownym montażu. Odciskiem zbioru jest długość plus tożsamość
  pierwszego i ostatniego wiersza, **nie** tożsamość tablicy: porównywanie tablicy
  zamieniało brak memoizacji u wywołującego w „Too many re-renders". Obie własności
  pilnuje test.

**Bramki:** `biome` ✓ · `tsc` 7/7 ✓ · testy **1268** ✓ (+40) · `next build` ✓ ·
`docs:check` ✓ · `pnpm check` 7/7 ✓
**Weryfikacja:** 3 agentów implementujących, 3 adwersaryjnych recenzentów —
**21 znalezisk, wszystkie 21 potwierdzone; 2 krytyczne, 8 wysokich.** Rekord sesji,
i słusznie: połowa dotyczyła nie starego długu, tylko **problemów wprowadzonych przez
samą naprawę**.


## [1.248.0] — 🧾 Eksport księgowy przestaje po cichu gubić wiersze

Audyt `[#413]` zostawił `listOrders` bez sufitu, świadomie: obcięta lista w dokumencie
finansowym to zła liczba bez sygnału. Przy sprawdzaniu tego wyszło, że **problem nie był
przyszły — był już aktywny**.

- `[#417]` 🧾 **Pobieranie stronami zamiast cichego sufitu**
  ([pagination.ts](packages/api/src/data/pagination.ts) · [exportAll.ts](apps/web/lib/exportAll.ts))

  PostgREST ma `api.max_rows`, u Supabase ustawione na **1000**. Przekroczenie **nie jest
  błędem**: wraca `200` z krótszą tablicą, a `supabase-js` nie konfrontuje jej z `Content-Range`.
  Firma z ponad tysiącem zleceń dostawała więc niepełny eksport księgowy — bez żadnego znaku.

  **Keyset, nie offset — i to jest sedno.** Pierwsze podejście stronicowało przez `range()`.
  Zbiór zleceń jest sortowany **malejąco** po `created_at`, więc nowy wiersz wchodzi na
  początek i przesuwa wszystkie offsety w dół. Wiersz z końca strony 1 wracał na początku
  strony 2 — i jego kwota była liczona **dwa razy**, przy `complete: true`. Stronicowanie
  po kluczu głównym (`gt("id", kursor)`) nie ma jak zdublować ani zgubić wiersza istniejącego
  w chwili startu. Porządek prezentacyjny odtwarzają wywołujący po złożeniu stron.

  **Sygnał zamiast milczenia.** Typ `PagedRows` niesie `complete`, którego nie da się ominąć,
  żeby dostać wiersze. Decyzję o reakcji podejmuje wywołujący, bo medium jest różne:
  **skoroszyt → wyjątek, pliku nie ma** (zapisany na dysku jest nieodróżnialny od pełnego);
  **ekran → baner i zablokowany eksport**. Baner nie ma `no-print`, więc jedzie też na PDF.

  **Stronicowanie objęło wszystkie pięć zbiorów skoroszytu**, nie tylko zlecenia. Pierwsza
  wersja pilnowała samych zleceń — a to było **gorsze niż brak bramki**: milczenie przy
  pozostałych czterech arkuszach czytało się jak potwierdzenie ich kompletności.

  Przy okazji, z tej samej przyczyny: `KpiStrip` (kafelki przychodu na pulpicie), P&L na
  karcie pojazdu, rejestr kosztów w `/monthly` i wykrywanie duplikatów przy imporcie zleceń.
  Filtry `vehicleId`/`assignedTo`/`statuses` zeszły **do bazy** — koniec wzorca „ściągnij całą
  firmę, odsiej w przeglądarce". Karta kierowcy zamiast kilkudziesięciu obiegów po całej
  firmie robi jedną–dwie strony jednego kierowcy.

- `[#418]` 🗺️ **Dekompozycja ekranu mapy — i pierwsze testy tego ekranu**
  ([map/](apps/web/app/(app)/map))

  `page.tsx`: **2803 → 1871 linii** (−33 %). Struktura była gotowa od `[#224]`, tylko plik
  urósł dwukrotnie obok niej. Logika bez React → `mapFeatures.ts`, specyfikacje warstw
  MapLibre → nowy `mapLayers.ts`, 11 komponentów prezentacyjnych → `mapPanels.tsx`.

  Bramki „mapa jest / styl wczytany" **zostały w `page.tsx`** razem z komentarzami — wynikają
  z cyklu życia Reacta, nie z rysowania, a kolejność efektów inicjalizujących MapLibre jest
  krucha i nie było powodu jej dotykać.

  Realny zysk nie jest w liczbie linii: **44 nowe testy** ([mapFeatures.test.ts](apps/web/app/(app)/map/mapFeatures.test.ts)).
  Ekran, który liczy gabaryty zestawu, myto i koszty trasy, nie miał dotąd **ani jednego**.

- `[#419]` 📚 **Trzy dokumenty przestają zmyślać**
  ([ROADMAP.md](docs/ROADMAP.md) · [MOBILE-PLAN.md](docs/MOBILE-PLAN.md) · [DATA-MODEL.md](docs/DATA-MODEL.md))

  ROADMAP twierdził, że `codeql.yml` **nigdy nie powstał** i że „w repo nie było ani jednego
  workflow". Oba człony fałszywe i obalane jednym `git log`: pliki istniały od `[#002]`
  i zostały usunięte dopiero 17.07. MOBILE-PLAN stemplował fazę M3 na „✅ zrealizowane",
  choć `[#406]` — profil **zestawu** w routingu — nie ruszył ani jednego pliku w `apps/mobile`;
  wiersz `vehicles` deklarował parytet, a naczep (encja `trailers`, migracja 0110) aplikacja
  mobilna nie ma wcale.

- `[#416]` 🖼️ **ImgBot — bezstratna optymalizacja grafik**

  Zaległy PR z 4 lipca. 19 plików, **−30 %** (2713 → 1896 kB), ikona aplikacji −86 %.
  Zweryfikowane przed scaleniem: poprawne PNG, **wymiary co do piksela identyczne**.

**Bramki:** `biome` ✓ (592 pliki) · `tsc` 7/7 ✓ · testy **1228** ✓ (+64) · `next build` ✓ ·
`docs:check` ✓ · `pnpm check` 7/7 ✓
**Weryfikacja:** 3 agentów implementujących, 3 adwersaryjnych recenzentów — **15 znalezisk,
1 krytyczne, 6 wysokich; 14 potwierdzonych i naprawionych.** Krytyczne trafiło w to, co ta
sama sesja właśnie „naprawiała": stronicowanie objęło jeden arkusz z pięciu.


## [1.247.0] — 🩹 Bramka, która blokowała własny push

- `[#415]` 🩹 **`docs:check` liczył sidecary AppleDouble jako migracje**
  ([scripts/docs-check.mjs](scripts/docs-check.mjs))

  `[#414]` uodpornił na sidecary vitest, ale ta sama pułapka siedziała w bramce dokumentacji
  i wyszła dopiero przy `git push` — hook `pre-push` odrzucił wypchnięcie `main` komunikatem
  o **zdublowanych numerach migracji: `._00`, `._01`**.

  Mechanizm jest podstępny, bo sidecar **kończy się tym samym rozszerzeniem co plik źródłowy**:
  `._0109_company_links.sql` przechodzi filtr `.endsWith(".sql")` i wchodzi do kontroli
  unikalności numerów jako migracja o numerze `._01`. Kontrola z audytu `#214` — sensowna,
  bo duplikat numeru znaczy niejednoznaczną kolejność stosowania — zaczęła więc zgłaszać
  duplikaty, których nie ma, i **blokować push**.

  Filtr `bezSidecarow` w trzech miejscach czytających katalogi: migracje, skan `docs/*.md`
  (inaczej `._ARCHITECTURE.md` trafiłby do kontroli martwych linków) oraz skan
  `apps/*`/`packages/*`. Pliki są ignorowane przez gita, więc na runnerach CI nie istnieją —
  poprawka jest bez skutku ubocznego, a lokalnie przywraca uruchamialność bramki.

  Wzorzec z `[#414]` powtórzył się co do joty: **narzędzie, które globuje po rozszerzeniu,
  musi jawnie odsiać sidecary.** Trzeci raz w tej sesji — najpierw Biome, potem vitest, teraz
  `docs:check`.

**Bramki:** `biome` ✓ · `tsc` 7/7 ✓ · testy **1164** ✓ · `next build` ✓ · `docs:check` ✓ (112 migracji)


## [1.246.0] — 🟢 Bramka, która ma gdzie się wykonać

`[#408]` naprawił reguły CI i dowiódł, że działają: w pipelinie gałęziowym pojawiły się
`quality` i `gitleaks`, których wcześniej tam nie było. Po czym **wszystkie joby padły na
`ci_quota_exceeded`** — poprawna konfiguracja spotkała się z pustym budżetem.

- `[#414]` 🟢 **Bramka jakości przeniesiona na GitHub Actions**
  ([.github/workflows/ci.yml](.github/workflows/ci.yml))

  Namespace GitLaba jest na planie **free**, a minuty współdzielonych runnerów kończą się
  w połowie miesiąca. Job nie pada wtedy na błędzie — pada, **zanim runner cokolwiek pobierze**.
  Żadna poprawka w `.gitlab-ci.yml` tego nie odblokuje, bo to limit rozliczeniowy, nie usterka.

  Rozstrzyga obserwacja, którą wystarczyło zauważyć: **repo lustrzane na GitHubie jest publiczne,
  a dla publicznych repo Actions nie zużywają płatnych minut.** Bramka `pnpm check` nie
  potrzebuje ani jednego sekretu — Biome, `tsc`, testy i `docs:check` są czysto lokalne — więc
  przeniesienie jej tam nic nie ujawnia i nic nie kosztuje.

  **Granica przebiega dokładnie po sekretach:**
  GitHub Actions dostaje bramkę jakości (Biome · `tsc` ×7 · testy · `next build` · `docs:check`);
  GitLab zatrzymuje wszystko, co wymaga sekretów albo pełnej historii — `gitleaks`, SAST,
  `db-types`/`rls` (`SUPABASE_DB_URL`), `release`, `pages`. Bramka bez sekretów nie może stać
  na budżecie; bramka z sekretami nie może stać na publicznym repo. `quality` zostaje
  w GitLabie jako bramka zapasowa i rusza sama, gdy minuty są dostępne.

  Workflow uruchamia **tę samą komendę co GitLab** (`pnpm check`) — celowo, żeby dwie bramki
  o tej samej nazwie nie zaczęły z czasem sprawdzać dwóch różnych rzeczy. Node bierze z
  [`.nvmrc`](.nvmrc), a `corepack` doinstalowuje jawnie: to ta sama pułapka, która wysypywała
  każdy job Node'owy na GitLabie.

- `[#414]` 🧪 **`pnpm check` znów da się uruchomić lokalnie** (7 × `vitest.config.ts`)

  Przy pierwszej próbie uruchomienia bramki wyszło, że komenda, którą wykonuje CI, **nie
  przechodzi na maszynie autora** — i nie z powodu kodu. macOS na woluminach bez natywnych
  xattr zapisuje metadane w sidecarach `._nazwa.ts`. Taki plik pasuje do wzorca `*.test.ts`,
  więc vitest brał go za test i wywracał się na „Transform failed".

  Najgorsza cecha tego błędu: dotyczył **wyłącznie plików niedawno edytowanych**, więc
  `pnpm check` potrafił paść u jednej osoby i przejść u drugiej na tym samym commicie.
  `exclude: [...defaultExclude, "**/._*"]` we wszystkich siedmiu konfiguracjach (dwie
  utworzone — `i18n` i `ui` szły dotąd na domyślnych). Na runnerach Linuksa sidecarów nie ma,
  więc zmiana jest bez skutku ubocznego, a lokalnie przywraca uruchamialność bramki.

- `[#414]` 📚 **Osiem miejsc twierdziło, że Actions są wyłączone**
  ([README.md](README.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ·
  [docs/SECURITY-RLS.md](docs/SECURITY-RLS.md) · [docs/index.md](docs/index.md) ·
  [.gitlab-ci.yml](.gitlab-ci.yml) · [.github/dependabot.yml](.github/dependabot.yml))

  Dokładnie ta klasa nieprawdy, którą `[#409]` przed chwilą usuwał — więc poprawione od razu,
  a nie „przy okazji". Wraca też ekosystem `github-actions` w Dependabocie, usunięty w `[#408]`
  jako martwy: skoro workflow istnieje, nieaktualizowana akcja jest tym samym długiem
  co nieaktualizowana zależność.

**Bramki:** `biome` ✓ (593 pliki) · `tsc` 7/7 ✓ · testy **1164** ✓ · `next build` ✓ ·
`docs:check` ✓ · **`pnpm check` ✓ (7/7 zadań)** — pierwszy raz uruchomiona jako całość,
dokładnie ta komenda, którą wykonuje CI.


## [1.245.0] — 🔒 Bramki, które naprawdę chodzą

Audyt 360° repo. Najważniejsze ustalenie nie dotyczy kodu: **bramki jakości nigdy nie działały
w CI**. Kod był dobry — gwarancja była pusta.

- `[#408]` 🔒 **CI: koniec fałszywej zieleni** ([.gitlab-ci.yml](.gitlab-ci.yml))

  Trzy niezależne usterki składały się na jeden obraz: pipeline świecił na zielono, nie
  sprawdzając niczego.

  **Reguły.** `quality`, `gitleaks` i `db-types` odpalały się wyłącznie przy
  `merge_request_event` albo na gałęzi domyślnej. Na gałęzi feature startował tylko
  `semgrep-sast` z szablonu. 84 pipeline'y na tej gałęzi, każdy „success", każdy uruchamiający
  jeden job z sześciu. Zielony znaczek mówił „SAST przeszedł", a czytany był jako „bramki
  przeszły". Teraz decyduje `workflow:` na poziomie pipeline'u: push na dowolną gałąź uruchamia
  komplet, a push do gałęzi z otwartym MR-em jest pomijany, żeby nie liczyć wszystkiego dwa razy.
  Reguła zawężona do `$CI_PIPELINE_SOURCE == "push"` (inaczej „Run pipeline" z UI nie tworzyło
  nic) i do gałęzi innej niż domyślna (inaczej MR o źródle `main` zabiłby jedyną gałąź, na której
  żyją `release` i `pages`).

  **`corepack enable` nie istnieje na Node 26.** Obraz `node:26-bookworm-slim` nie zawiera
  corepacka — Node przestał go dostarczać. `before_script` kończył się kodem 127, więc **każdy**
  job Node'owy padał przed pierwszą linią `script`. Statystyka z API GitLaba jest jednoznaczna:
  **`quality` — 12 uruchomień, 12 porażek, ani jednego sukcesu w historii projektu.** Dochodzi
  do tego wyczerpany limit minut w lipcu (`ci_quota_exceeded` na 13 jobach), który przykrył
  przyczynę. Naprawa: `npm install --global corepack` przed `corepack enable` — pin wersji pnpm
  zostaje tam, gdzie jego miejsce, w polu `packageManager`.

  **`release` był martwy od pierwszego dnia.** `semantic-release` stoi w całości na gicie —
  czyta historię, tworzy tag, pushuje go — a `node:26-bookworm-slim` gita nie ma. Mówił o tym
  komentarz przy `db-types` w tym samym pliku, tylko nikt nie połączył faktów. Przy
  `when: manual` + `allow_failure: true` porażka nigdy nikogo nie obudziła; stąd 753 commity
  bez ani jednego wydania z CI. Obraz zmieniony na pełny `node:26-bookworm` (git 2.39.5),
  `GIT_DEPTH: 0` dołożone także do `gitleaks` — skan sekretów na płytkim klonie widział
  ~20 commitów z 46 i przepuściłby sekret sprzed 30.

  `allow_failure: true` na `release` **zostaje świadomie**: manualny job bez tej flagi jest
  w GitLabie blokujący, więc `main` stałby w stanie „blocked" do kliknięcia wydania i nigdy
  nie byłby zielony. To ta sama choroba, tylko odwrócona.

- `[#409]` 📚 **Dokumentacja przestaje kłamać — i bramka tego pilnuje**
  ([CLAUDE.md](CLAUDE.md) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [scripts/docs-check.mjs](scripts/docs-check.mjs))

  CLAUDE.md trzymał w kolumnie 🔜 trzy rzeczy leżące od dawna w `package.json`: TanStack Query,
  PowerSync i Sentry. `ARCHITECTURE.md` reklamował `.github/workflows/ci.yml` i `codeql.yml`
  — plików, których w repo nie ma — oraz „bramkę RLS w CI", która jest wyłącznie skryptem npm.
  Deklarował 51 migracji przy 112 istniejących i „PL/EN" przy czterech katalogach w aplikacji
  kierowcy (`MOBILE_LOCALES` = pl/en/de/uk).

  Poprawienie zdań to połowa roboty; druga to sprawić, żeby zgniły z powrotem trudniej.
  Dwie nowe kontrole w bramce `docs:check`:
  **(7)** technologia oznaczona 🔜 w CLAUDE.md nie może występować w zależnościach — jawna
  tablica `STACK_PACKAGES` mapuje nazwę z dokumentu na pakiet npm;
  **(8)** linki markdown wskazujące ścieżki w repo muszą wskazywać istniejące pliki. Trzy
  z czterech rozjazdów w `ARCHITECTURE.md` były właśnie martwym odwołaniem — to jest
  mechanicznie sprawdzalne, więc od teraz sprawdza to maszyna. Poza zakresem świadomie:
  CHANGELOG, raporty `AUDIT-*` i archiwum — dziennik zmian ma być prawdą o **przeszłości**,
  a nie o dzisiejszym drzewie plików.

- `[#410]` 🔑 **Runbook rotacji sekretów** ([docs/SECRET-ROTATION.md](docs/SECRET-ROTATION.md))

  Backlog nosił od dawna pozycję „potwierdzić rotację sekretów, które trafiły do historii czatu
  (Upstash, `sbp_`)". `sbp_` to token zarządczy Supabase — pełna kontrola nad projektem.
  Rotacji nie da się wykonać z repo, więc powstała instrukcja: gdzie każdy sekret siedzi
  (Vercel, zmienne CI, `turbo.json`), w jakiej kolejności go wymieniać, żeby produkcja nie
  miała przerwy, i **jak sprawdzić, że nowy działa**. Pozycja w backlogu zostaje otwarta —
  runbook jest narzędziem, nie wykonaniem.

- `[#411]` ⚡ **TanStack Query — fala 2** ([queryKeys.ts](apps/web/lib/queryKeys.ts) ·
  [queryError.ts](apps/web/lib/queryError.ts) · [queryClient.ts](apps/web/lib/queryClient.ts))

  `[#310]` wpiął `QueryProvider` w layout **wszystkich** tras panelu, a korzystała z niego
  jedna strona. Prowizorka nie polegała na tym, że migracja stanęła — tylko że wszyscy płacili
  bundlem za cache jednego ekranu. Dziesięć kolejnych stron listowych przeszło na `useQuery`:
  pojazdy, kontrahenci, dokumenty, serwis, karty, zlecenia, faktury, ceny paliw, scoring, audyt.

  **Klucz zapytania niesie `companyId` i to jest wymóg bezpieczeństwa, nie porządku.** Część
  funkcji warstwy danych nie przyjmuje firmy, bo zasięg wierszy daje RLS — pod gołym kluczem
  wpis cache przeżyłby zmianę członkostwa i przez `staleTime` pokazywał dane poprzedniej firmy.
  Recenzja adwersaryjna złapała tu poważniejszy przypadek: sam klucz członkostwa był
  nieunieważniany, więc cała izolacja stała na zapytaniu, którego nic nie odświeżało.

- `[#412]` 📦 **Outbox wspólny dla web i mobile** ([packages/core/src/outbox.ts](packages/core/src/outbox.ts))

  Dwie niezależne implementacje kolejki offline — 171 linii na webie, 347 w mobile — rozjechane
  w ~370 liniach. Outbox to jedyne miejsce, gdzie mieszkają dane zebrane bez zasięgu; rozjazd
  znaczy, że kierowca w terenie i spedytor w panelu dostają inne zachowanie przy tej samej
  awarii sieci. Logika niezależna od platformy (kolejność, deduplikacja, idempotencja,
  przycinanie, uszkodzony JSON) poszła do rdzenia, storage jest wstrzykiwany — `localStorage`
  synchronicznie, `AsyncStorage` asynchronicznie. **69 nowych testów**, w tym regresje
  z `[#221]` (integralność) i `[#222]` (idempotentny ponowny sync).

- `[#413]` 🚧 **Limity w warstwie danych** (20 plików w [packages/api/src/data](packages/api/src/data))

  Kilkanaście funkcji listujących nie miało żadnego pułapu. Nie dawało to błędu — Supabase
  i tak tnie odpowiedź na twardym limicie — dawało **ciche obcięcie**, czyli gorzej niż błąd.
  Domyślne limity dobrane do realnej wielkości zbioru, sygnatury wstecznie zgodne.

  Najgroźniejsze znalezisko wyszło dopiero z adwersaryjnego przeglądu: `latestOdometers`
  sortowane malejąco po przebiegu, więc obcięcie mogło wypchnąć **cały pojazd** poza wynik,
  a nie tylko jego starsze odczyty. Ten sam przegląd pokazał, dlaczego `listOrders` sufitu
  dostać nie może — zasila eksport księgowy, a obcięta lista w dokumencie finansowym to zła
  liczba bez żadnego sygnału. Decyzja została udokumentowana zamiast zamieciona.

- `[#407]` 🧹 **Repo i archiwum changelogu** ([CHANGELOG.md](CHANGELOG.md) · [.gitignore](.gitignore))

  `core.filemode` na wolumenie bez uprawnień POSIX pokazywał **786 plików jako zmienione**,
  choć żaden nie zmienił treści; 6313 sidecarów `._*` (86 w `.git/objects/pack`) sypało błędami
  „non-monotonic index" i **uniemożliwiało lokalne uruchomienie Biome**. Wzorzec `._*` trafił
  do `.gitignore` — naprawa przyczyny, bo pliki i tak odrastają przy każdej edycji.

  CHANGELOG urósł do 4661 linii i 399 rewizji — **83 MB blobów w historii przy 87 MB całego
  packa**. 346 starszych wydań przeniesionych do [docs/changelog/](docs/changelog/); główny plik
  4661 → **1814 linii**, komplet 393 wydań zachowany.

**Bramki:** `biome` ✓ (586 plików) · `tsc` 7/7 ✓ · testy **1164** ✓ (+115: outbox 69, limity 42,
reszta 4) · `next build` ✓ 8,7 s bez ostrzeżeń · `docs:check` ✓
**Weryfikacja:** 5 agentów implementujących, 5 adwersaryjnych recenzentów (soczewki: regresja
outboxu, przeciek cache między firmami, ciche obcięcie w obliczeniach finansowych, fałszywa
zieleń CI, nieprawda w dokumentacji) — **26 znalezisk, 1 krytyczne, 6 wysokich; 25 naprawionych,
1 odrzucone jako fałszywy alarm** (strażnik odczytu web był już poprawny o poziom wyżej).

## [1.244.0] — 📐 Trasa liczona dla ZESTAWU, nie dla samego ciągnika

Domknięcie tego, co `[#405]` dopiero umożliwił. Naczepa ma już wymiary — więc profil
wysyłany do routingu przestaje opisywać połowę pojazdu.

- `[#406]` **`combineRigProfile`** ([rigProfile.ts](packages/core/src/rigProfile.ts))
  — 13 testów. Mapa wysyłała dotąd gabaryty samego ciągnika. Skutek był tym groźniejszy,
  że niewidoczny: parametry wyglądały na kompletne.

  **Każdy wymiar łączy się inaczej i każdy z tych sposobów jest decyzją:**

  **Wysokość — MAKSIMUM, nie ciągnik.** Niski ciągnik z czterometrową chłodnią to zestaw
  czterometrowy. Najgroźniejszy parametr w całym profilu, bo błąd kończy się na wiadukcie,
  a nie na mandacie.

  **Osie — SUMA.** Systemy poboru myta liczą osie całego zestawu; trzyosiowy ciągnik
  z trzyosiową naczepą to sześć osi, a nie trzy.

  **Masa — DMC zestawu**, liczone tylko gdy znane są obie składowe obu pojazdów. Masa
  samego ciągnika podana jako masa zestawu to zaniżenie o kilkanaście ton, czyli przejazd
  przez most z ograniczeniem tonażu.

  **Długość — świadomie NIE liczymy jej wcale.** To wymaga wyjaśnienia, bo wygląda na
  uchylanie się od roboty. Suma zawyża: naczepa zachodzi na ciągnik przez siodło, więc
  6 m + 13,6 m to nie 19,6 m, tylko około 16,5 m. Maksimum zaniża: 13,6 m to sama naczepa,
  bez wystającego przodu. Dokładnie policzyć da się tylko znając położenie sworznia,
  a tej danej nie mamy i nie zamierzam jej zgadywać.

  Rozstrzyga co innego: **stan dotychczasowy był GORSZY niż brak danych.** Szła długość
  samego ciągnika — jakieś 6 m dla zestawu o 16,5 m. Dziesięć metrów zaniżenia to trasa
  poprowadzona przez łuk, w który zestaw nie wejdzie. Router, który długości nie dostanie,
  użyje własnej wartości domyślnej dla profilu ciężarowego — a ta będzie bliższa prawdzie
  niż nasze 6 m. Przy podpiętej naczepie długość idzie więc jako brak, a spedytor może
  podać długość zestawu ręcznie w polu nadpisania.

  **Brak liczby, o którym wiadomo, jest uczciwszy niż liczba kłamiąca o dziesięć metrów.**

- `[#406]` **Mapa pobiera naczepy razem z pojazdami** ([map/page.tsx](apps/web/app/(app)/map/page.tsx)).
  Osobne zapytanie po wyborze auta oznaczałoby, że pierwsza policzona trasa idzie bez naczepy
  — czyli dokładnie ten błąd, który tu naprawiamy, tylko rzadziej.

**Bramki:** `biome` ✓ · `tsc` 7/7 ✓ · testy **1049** ✓ (13 nowych) · `next build` ✓ ·
`docs:check` ✓

> Nie oglądałem tego na ekranie — mapa wymaga zalogowania. Zweryfikowane: reguły łączenia
> testami (w tym ten pilnujący, że długość ciągnika NIE trafia do zestawu), reszta kompilacją.
> Pozostaje: ten sam profil w aplikacji kierowcy (`apps/mobile/lib/vehicleProfile.ts` nadal
> liczy z samego pojazdu) oraz podpinanie naczepy z formularza pojazdu.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## [1.243.0] — 🛻 Naczepa przestaje być polem tekstowym w kartotece ciągnika

Największy z nietkniętych punktów backlogu. Do tej pory naczepa to były dwa pola
tekstowe przy ciągniku (`[#250]`), co zakładało coś, co w transporcie nie jest prawdą:
że naczepa należy do ciągnika na stałe.

- `[#405]` **Osobna encja `trailers`** (migracja
  [0110](supabase/migrations/0110_trailers_entity.sql),
  [trailers.ts](packages/api/src/data/trailers.ts),
  sekcja w [kartotece floty](apps/web/app/(app)/vehicles/page.tsx)).

  Co przez stary model nie działało:

  • **Naczepa ma własny przegląd i własne OC.** Jako pole tekstowe nie miała gdzie
    trzymać dat, więc nie wchodziły do przypomnień — a naczepa po terminie zatrzymuje
    zestaw równie skutecznie jak ciągnik, bo kontrola patrzy na oba dowody.
    **To jest powód, dla którego ta tabela w ogóle powstała.**
  • **Ciągnik wymienia naczepy.** Przepięcie oznaczało nadpisanie tekstu i utratę
    informacji, że poprzednia w ogóle istniała.
  • **Naczepa ma własne gabaryty i osie** — i to ona, nie ciągnik, wyznacza wysokość
    oraz długość zestawu, czyli wartości, które idą do routingu.
  • **Naczepa odstawiona nie istniała** — bez ciągnika nie było jej w systemie.

  Teraz naczepa należy do FIRMY, a `vehicles.trailer_id` mówi, która jest aktualnie
  podpięta. Zestaw powstaje z pary, nie z jednego wiersza.

- `[#405]` **Terminy naczep w codziennych przypomnieniach** ([alerts.ts](apps/web/lib/alerts.ts)).
  Prefiks `trl:` zamiast `veh:` — inaczej przypomnienie o naczepie wykluczałoby przez
  `dedup_key` przypomnienie o ciągniku, a to dwa różne pojazdy, nawet gdy jadą razem.

**Dane przeniesione automatycznie.** Każda wpisana wcześniej `trailer_registration`
staje się wierszem w `trailers`, a ciągnik dostaje do niej wskazanie. Bez tego kroku
właściciel musiałby przepisać ręcznie to, co już raz wpisał — najpewniejszy sposób,
żeby nowa funkcja została pusta.

Migrację **sprawdziłem doświadczalnie**, bo na produkcji nie było czego przenieść
(0 pojazdów z wpisaną naczepą): w transakcji zakończonej ROLLBACK, na danych
syntetycznych. Dwa ciągniki wskazujące tę samą naczepę zapisaną raz ze spacjami dają
**jeden** wiersz naczepy i dwa wskazania — dokładnie jak zamierzono.

> Przy pierwszym podejściu test wyszedł na „BŁĄD MIGRACJI" i to była **moja pomyłka
> w teście, nie w migracji**: oba pojazdy w tej bazie należą do RÓŻNYCH firm, a
> rejestracja jest unikalna per firma, więc dwie naczepy były wynikiem poprawnym.
> Sprawdziłem to, zanim zacząłem „naprawiać" działający kod.

**Zgodność wsteczna:** kolumny `trailer_registration`/`trailer_type` **zostają** i nadal
są zapisywane. Powód jest konkretny, nie ostrożnościowy — w sklepach są buildy aplikacji
mobilnej, które o tabeli `trailers` nie wiedzą i czytają te pola. Usunięcie ich teraz
zepsułoby kartotekę każdemu, kto nie zaktualizował aplikacji.

**Bramki:** `biome` ✓ · `tsc` 7/7 ✓ · testy **1036** ✓ · `next build` ✓ · `docs:check` ✓ ·
migracja 0110 zastosowana, ścieżka przeniesienia danych zweryfikowana

> Ekranu nie oglądałem — wymaga zalogowania. Pozostaje do zrobienia: podpinanie naczepy
> do ciągnika z poziomu formularza pojazdu, widok w aplikacji kierowcy i gabaryty
> naczepy w profilu routingu.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## [1.242.0] — 🔗 Linki firmowe: koniec dyktowania adresu przez telefon

Drugi z nietkniętych punktów backlogu. Funkcja mała, ale zdejmuje z kierowcy czynność,
którą i tak wykonuje — tylko gorzej.

- `[#404]` **Właściciel definiuje skróty, kierowca ma je w aplikacji**
  (migracja [0109](supabase/migrations/0109_company_links.sql),
  [companyLinks.ts](packages/api/src/data/companyLinks.ts),
  sekcja w [ustawieniach](apps/web/app/(app)/settings/page.tsx),
  ekran [links.tsx](apps/mobile/app/links.tsx)).

  Kierowca w trasie potrzebuje kilku adresów, które nie należą do tej aplikacji i nigdy
  nie będą: portal myta (ASFINAG, Toll Collect, viaTOLL), rezerwacja promu, zgłoszenie
  szkody u ubezpieczyciela, awizacja u konkretnego klienta. Dotąd każdy przewoźnik
  rozwiązywał to identycznie — wysyłał link na czacie albo dyktował przez telefon,
  a kierowca przepisywał go z pamięci na parkingu, w rękawicach, przy złym zasięgu.

  Nazwa, adres, emoji i krótkie wyjaśnienie „do czego to jest" — bo link do portalu myta
  bez podpisu „opłata przed wjazdem do Austrii" niczego nie tłumaczy komuś, kto jedzie
  tam pierwszy raz. Kolejność ustawia właściciel strzałkami: `ASFINAG` przed `viaTOLL`
  ma wynikać z tego, gdzie flota jeździ, a nie z alfabetu.

  **Dwa stopnie widoczności**, nie trzy: wszyscy albo tylko zarząd. Trzeci stopień
  oznaczałby wejście w matrycę uprawnień, a ta czeka na Twoją decyzję (`#393`) —
  wolę zostawić tu dwa działające niż trzy, z których jeden byłby pozorny.
  **Sprawdzone doświadczalnie** na produkcji (transakcja zakończona ROLLBACK, rola
  zmieniona na czas testu): kierowca widzi link ogólny, a zarządowego nie widzi.

  **`url` sprawdzany regexem na `http(s)` w OBU warstwach** — schemat Zod i CHECK
  w bazie. To nie estetyka: `z.url()` przyjmuje także `javascript:alert(1)`
  i `data:text/html,…`, a ten adres aplikacja kierowcy otwiera jednym dotknięciem.

  Świadomie **wąski zakres**, żeby nie zrobić z tego drugiego CMS-a: bez folderów
  (lista wystarcza przy kilkunastu pozycjach, a kilkuset nikt tu nie doda), bez
  uprawnień per link, bez śledzenia kliknięć — to skrót do cudzej strony, nie kampania.

**Bramki:** `biome` ✓ · `tsc` 7/7 ✓ · testy **1036** ✓ · `next build` ✓ · `docs:check` ✓ ·
migracja 0109 zastosowana, RLS zweryfikowany na obu rolach

> Ekranów nie oglądałem w przeglądarce ani na telefonie — wymagają zalogowania.
> Zweryfikowane: RLS zapytaniem na żywej bazie, reszta kompilacją i testami.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## [1.241.0] — 📉 Statystyki usterek — z danych, które leżały nieczytane

Wszystkie znane usterki są naprawione, a otwarte pozycje czekają na Twoje decyzje —
więc wracam do rozwoju. Pierwszy z nietkniętych punktów backlogu, wybrany dlatego,
że **dane już są**: zgłoszenia usterek zbierają się od czasu wprowadzenia kontroli
pojazdu i nikt ich dotąd nie podsumował.

- `[#403]` **`summarizeDefects`** ([defectStats.ts](packages/core/src/defectStats.ts)) —
  silnik z 13 testami. Ekran zgłoszeń odpowiadał na pytanie „co jest zepsute". Nie
  odpowiadał na te, które przewoźnik zadaje przy planowaniu wymian i zakupie części:
  **który ciągnik psuje się częściej od reszty floty**, **co psuje się najczęściej**
  (czyli co warto trzymać w magazynie), **ile auto realnie czeka na naprawę** i **czy
  najstarsze otwarte zgłoszenie nie leży od pół roku**.

- `[#403]` **Pasek statystyk nad listą zgłoszeń**
  ([reports/page.tsx](apps/web/app/(app)/reports/page.tsx)) — pięć liczb, ranking części
  i ranking pojazdów. Znika przy pustym zbiorze zamiast pokazywać rząd zer: zero usterek
  i brak danych wyglądają identycznie, a znaczą co innego.

**Trzy decyzje, które są w tym module decyzjami, a nie oczywistościami** — spisane
w kodzie, bo każda daje inny wynik:

1. **Nie liczymy awaryjności „na 100 tys. km"**, choć to najbardziej naturalna miara.
   Przebieg pochodzi z tankowań, a wielu wpisów brakuje — wskaźnik z niepełnego
   mianownika wygląda dokładnie tak samo jak z pełnego. Liczby surowe są porównywalne
   między autami tej samej floty, bo dotyczą tego samego okresu.

2. **Czas naprawy tylko z zamkniętych zgłoszeń.** Zgłoszenie otwarte nie ma czasu
   naprawy — ma wiek, a to inna wielkość. Wliczenie otwartych jako „0 dni" zaniżałoby
   średnią dokładnie tam, gdzie problem jest największy: flota z połową zgłoszeń
   leżących bez ruchu wyglądałaby na szybciej serwisowaną niż ta, która wszystko domyka.

3. **Wiek najstarszego otwartego, nie średnia wieku.** Średnia ukryłaby jedno zgłoszenie
   leżące pół roku wśród dziesięciu świeżych — a to właśnie ono jest informacją.
   Powyżej 30 dni liczba zapala się na czerwono.

Drobiazgi, które też są decyzjami: nazwa części jest normalizowana przy grupowaniu
(kierowca wpisuje ręcznie, więc „Hamulce", „hamulce " i „HAMULCE" to jedna pozycja,
ale na ekranie pokazujemy zapis człowieka, nie klucz techniczny) · zgłoszenie zamknięte
**przed** datą zgłoszenia odpada ze średniej zamiast ją zaniżać liczbą ujemną ·
zgłoszenia bez pojazdu są liczone osobno, żeby suma po autach zgadzała się z sumą
całkowitą · „w trakcie naprawy" liczy się jako otwarte, bo auto dalej stoi.

**Bramki:** `biome` ✓ · `tsc` 7/7 ✓ · testy **1036** ✓ (13 nowych) · `next build` ✓ ·
`docs:check` ✓

> Sekcja nie została obejrzana w przeglądarce — ekran wymaga zalogowania, a ja nie loguję
> się na Twoje konto. Zweryfikowane jest to, co dało się zweryfikować bez sesji: silnik
> testami, a ekran kompilacją produkcyjną.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## [1.240.0] — 🧹 Domknięcie tego, co sam zostawiłem opisane

Zamiast czwartej rundy audytu — trzecia dała już 3 słabe znaleziska na 12, więc sygnał
się wyczerpuje — trzy rzeczy, które w poprzednim wydaniu opisałem jako otwarte.

- `[#400]` **Pliki firmy nie znikały przy usuwaniu danych ani konta**
  ([purge-storage/route.ts](apps/web/app/api/company/purge-storage/route.ts)).
  `_company_purge` kasował wiersze, ale **ani jednego obiektu w Storage** — skany
  dokumentów kierowców, zdjęcia ładunku, zdjęcia z czatu i paragony zostawały na dysku
  po „wyczyść dane firmy" i po usunięciu konta właściciela. Czyli dokładnie te dane
  osobowe, których usunięcia zażądano.

  **Dlaczego to nie mogło być poprawką w SQL-u:** `delete from storage.objects` kasuje
  wyłącznie wiersz metadanych; plik zostaje w backendzie obiektowym jako blob bez
  żadnego wpisu — stan gorszy niż wyjściowy, bo znika nawet ewidencja tego, co należałoby
  posprzątać. Skasować plik można tylko przez API Storage, czyli po stronie serwera.

  **Kolejność jest wymuszona przez uprawnienia:** trasa idzie PRZED czyszczeniem bazy.
  Po usunięciu `memberships` nie da się już potwierdzić, że proszący jest właścicielem
  tej firmy — a wtedy pliki zostają nieusuwalne dla kogokolwiek poza kluczem serwisowym.
  Błąd sprzątania **przerywa całą operację**: przejście dalej oznaczałoby potwierdzenie
  usunięcia danych, które nadal leżą na dysku.

  Przy usuwaniu konta bez kasowania firmy plików nie ruszamy — należą do firmy, nie do
  odchodzącego pracownika.

- `[#401]` **Rozmowa nie dociągała wiadomości po powrocie telefonu z tła**
  ([chat-thread.tsx](apps/mobile/app/chat-thread.tsx)). Realtime dostarcza wyłącznie
  zdarzenia bieżące: gdy system uśpi telefon, WebSocket się zamyka, a po ponownym
  połączeniu Postgres Changes **nie odtwarza tego, co przyszło w międzyczasie**.
  Kierowca z otwartą rozmową w uchwycie widział wątek urwany na ostatniej wiadomości
  sprzed uśpienia — i nic mu tego nie sygnalizowało. Tą drogą idą zmiany adresu załadunku
  i numeru rampy, więc brakująca wiadomość nie jest kosmetyką.

- `[#402]` **Okno zgody na usunięcie konta przeczyło samo sobie.** Jedna linijka mówiła,
  że wpisy operacyjne ZOSTAJĄ w firmie bez powiązania, a następna — „Do skasowania:
  240 tankowań, 512 zdarzeń trasy". Kod odpina (`driver_id = null`) i kasuje wyłącznie
  wiadomości. Dla właściciela kasującego firmę tekst był prawdziwy, dla zwykłego kierowcy
  — czyli dominującego użytkownika aplikacji — nie.

  To ekran wymagany przez App Store i realizujący żądanie z RODO, więc rzetelność
  komunikatu jest tu funkcją, nie stylistyką. Przeredagowane w sześciu miejscach
  (mobile ×4 języki, web ×2): co zostanie **odłączone**, a co **trwale usunięte**.

**Bramki:** `biome` ✓ · `tsc` 7/7 ✓ · testy **1023** ✓ · `next build` ✓ · `docs:check` ✓

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## [1.239.0] — 🔍 Trzecia runda audytu — i dwa trafienia w moją własną robotę

Pierwsza runda, w której weryfikatorzy **coś obalili** (2 z 12). Obiektyw wycelowany
w zmiany z tej sesji znalazł dwie rzeczy, które sam popsułem — i o to w nim chodziło.

### Moje własne błędy

- `[#397]` **Regresja, którą wprowadziła poprawka `[#389]`** ([workTimeEntries.ts](packages/api/src/data/workTimeEntries.ts)).
  Zawężenie ewidencji czasu pracy do `driver_id` wyglądało na oczywiste — ale wpisy
  powstają dwiema drogami. Ręczny wpis z panelu ustawia kartotekę; **import pliku `.ddd`
  z karty kierowcy ustawia tylko `driver_name`**, bo plik zna kierowcę po nazwisku
  z karty, nie po naszym UUID.

  Dane z tachografu stały się więc dla kierowcy niewidoczne: ekran „Czas pracy" pokazywał
  0 h, a status WTD 2002/15/WE liczył się z pustego zbioru — **alarm przekroczenia nie
  zapaliłby się nigdy**. To gorsze niż stan sprzed `[#389]`, gdzie alarm zapalał się
  fałszywie: ostrzeżenie nadmiarowe da się zauważyć, brakującego nie.

  Wiersz jest mój, jeśli wskazuje na moją kartotekę **albo** nie ma kartoteki w ogóle
  i zgadza się nazwisko. Warunek „bez kartoteki" jest istotny — bez niego dopasowanie po
  nazwisku przyciągałoby wpisy przypisane wprost do kogoś innego, a imiennicy w firmie
  transportowej nie są rzadkością.

- `[#397]` **Test, który niczego nie pilnował** ([outbox.test.ts](apps/web/lib/outbox.test.ts)).
  Test „usunięcie wpisu w trakcie synchronizacji nie wskrzesza go" zaciskał bramkę
  dopiero PO zakolejkowaniu, więc wpis miał już status `synced`, a `trySync` wychodził
  od razu na strażniku — nigdy nie docierał do miejsca, które test miał sprawdzać.
  Końcową asercję spełniało samo `removeOutbox`.

  Sprawdziłem to mutacją: po przywróceniu starego `write(items)` **test przechodził**.
  Po poprawce oba testy padają na mutancie i przechodzą na kodzie naprawionym — teraz
  faktycznie coś pilnują.

  Przy okazji wyszła rzecz o mnie: skrypt nakładający poprawki **przerwał się w połowie**
  na nietrafionej asercji, a ja uznałem, że wszystkie edycje weszły. Stąd pierwszy wynik
  mutacji, który mi się nie zgadzał. Nie zgadywałem, tylko dołożyłem sondę — i to ona
  pokazała, że plik testu jest niezmieniony.

### Księgowość

- `[#398]` **Rejestr VAT brał stawkę z nagłówka faktury, ignorując stawki pozycji**
  ([invoices/page.tsx](apps/web/app/(app)/invoices/page.tsx)). Faktura mieszana — fracht
  23% plus refaktura opłaty drogowej 0%, w tej branży rzecz zwykła — ma pozycje o różnych
  stawkach, a w nagłówku zostaje jedna z nich. Cała kwota szła więc do rejestru pod tę
  jedną stawkę: podatek naliczony od kwoty, która mu nie podlega, albo odwrotnie.
  To trafia wprost do deklaracji.

  Teraz jeden wiersz na parę (faktura, stawka), a faktury bez pozycji zachowują się jak
  dotąd — dla nich nagłówek JEST pełną informacją o stawce, więc to nie przybliżenie.

- `[#398]` **Eksport listy faktur pomijał filtr z ekranu.** Użytkownik zawężał listę do
  nieopłaconych, klikał „eksportuj" i dostawał plik ze wszystkimi fakturami, łącznie
  z anulowanymi — bez kolumny statusu, więc bez szansy je odsiać w arkuszu. Eksport ma
  potwierdzać to, co użytkownik przed chwilą wybrał.

- `[#399]` **Kanał powiadomień zakładany po odmontowaniu komponentu**
  ([NotificationBell.tsx](apps/web/components/NotificationBell.tsx)). Subskrypcja powstaje
  po kilku `await`; jeśli komponent zniknie w tym czasie — a znika przy każdym odczytaniu
  powiadomienia — sprzątanie wykonuje się, gdy kanału jeszcze nie ma, a chwilę później
  kanał powstaje i nikt go już nie zamyka. Przy panelu otwartym cały dzień zbiera się
  kilkadziesiąt osieroconych subskrypcji.

### Znalezisko, które odrzuciłem mimo „potwierdzenia"

`damage_claims` rzekomo zostawiało dowody szkody w buckecie po usunięciu wpisu.
Sprawdziłem schemat na żywej bazie: tabela **nie ma żadnej kolumny na plik**, a ekran
szkód niczego nie wgrywa. Usunięcie szkody nie może osierocić plików, bo szkoda ich nie
posiada. Agent i weryfikator pomylili się oba — weryfikator „potwierdził" prawdziwe, ale
puste spostrzeżenie, że `deleteDamageClaim` nie dotyka Storage.

### Co ZOSTAJE (opisane, nie ukryte)

`[#400]` **Pliki w Storage nie są kasowane przy usuwaniu firmy ani konta** — `_company_purge`
kasuje wiersze, ale ani jednego obiektu z bucketów `documents` i `cargo-photos`. Naprawa
NIE jest jednym `delete from storage.objects`: to kasuje tylko metadane, a plik zostaje
w S3 jako niepodpięty blob — gorzej niż dziś, bo znika nawet ewidencja. Potrzebna jest
trasa serwerowa kasująca przez API Storage kluczem `service_role`. Dziś w buckecie jest
**0 obiektów**, więc to luka do zamknięcia przed pozyskaniem ruchu, nie trwający incydent.

`[#401]` Rozmowa nie dociąga wiadomości po powrocie telefonu z tła (Postgres Changes nie
odtwarza zdarzeń po rejoinie) · `[#402]` okno zgody na usunięcie konta mówi „do skasowania
N tankowań", a kod je odpina, nie kasuje — dla kierowcy nieprawda, dla właściciela prawda;
6 ciągów do przeredagowania.

**Audyt, runda 3:** 6 obiektywów · 18 agentów · 12 znalezisk · **2 obalone przez
weryfikatorów** · 1 odrzucone przeze mnie po sprawdzeniu schematu.

**Bramki:** `biome` ✓ · `tsc` 7/7 ✓ · testy **1023** ✓ · `next build` ✓ · `docs:check` ✓

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## [1.238.0] — 🪤 Ta sama pułapka, druga warstwa — tym razem trafiła w moją własną poprawkę

Ponowne zapytanie o ostrzeżenia dostawcy po wydaniu 1.236.0: **96 → 72**, ostrzeżenia
o `search_path` zniknęły, lista funkcji wywoływalnych przez `anon` spadła z 39 do 19.
W tej dziewiętnastce siedziały jednak dwie funkcje, **które sam dodałem w migracji 0107
właśnie po to, żeby poprawić bezpieczeństwo** — i jedna przeoczona.

- `[#396]` **`revoke ... from public` NIE wystarcza** (migracja
  [0108](supabase/migrations/0108_revoke_anon_explicit_grants.sql)). Pułapka ma dwie warstwy,
  a `[#390]` widziało tylko pierwszą:

  1. `anon` dziedziczy `EXECUTE` po `PUBLIC` → samo `revoke … from anon` nie daje nic.
  2. Supabase ma `alter default privileges` nadające `EXECUTE` roli `anon` **jawnie**
     przy tworzeniu funkcji → `revoke … from public` **też** nie wystarcza, bo wpis
     `anon=X/postgres` zostaje w `proacl`.

  Skutek: `save_expo_push_token` i `delete_expo_push_token` — dodane w 0107 z myślą
  o zamknięciu dziury z tokenem push — same pozostały wywoływalne **bez logowania**.
  Razem z nimi wyszło **`driver_save`**, którego przeoczyłem przy układaniu listy w 0105,
  a które zapisuje dane osobowe kierowcy: imię, nazwisko, datę urodzenia, numery uprawnień,
  paszport i dowód.

  Reguła, tym razem bez wyjątków: **`revoke execute … from public, anon`**, a skutek
  sprawdzać przez `has_function_privilege('anon', …)` — nigdy przez samą obecność
  instrukcji `revoke` w migracji. Po zmianie funkcji `SECURITY DEFINER` dostępnych dla
  `anon` zostało **dokładnie tyle, ile jest na jawnej liście wyjątków**: predykaty RLS
  (muszą, bo polityki wykonują się z uprawnieniami pytającego), publiczny link śledzenia
  przesyłki i funkcja PostGIS.

- `[#396]` **Sprostowanie własnego komentarza.** Migracja 0105 tłumaczyła pułapkę
  wyłącznie pierwszą warstwą — czyli mówiła półprawdę, na której sam się przejechałem
  dwa wydania później. Opis uzupełniony w migracji, w [SECURITY-RLS.md](docs/SECURITY-RLS.md)
  i w komunikacie bramki [audit-rls.mjs](scripts/audit-rls.mjs), żeby podpowiadała pełną
  postać polecenia zamiast połowicznej.

**Weryfikacja:** `_card_key`/`_pii_key` — niedostępne dla `anon` i `authenticated`,
dostępne dla ścieżki serwerowej. `driver_save`, `save_expo_push_token`,
`delete_expo_push_token` — `anon` ✗, zalogowany ✓. Sprawdzone zapytaniem o uprawnienie
skuteczne, nie o treść migracji.

**Bramki:** `biome` ✓ · `tsc` 7/7 ✓ · testy **1023** ✓ · `docs:check` ✓ · migracja 0108
zastosowana i zweryfikowana na produkcji

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## [1.237.0] — 🧹 Pięć znalezisk, które odłożyłem — domknięte

Poprzednie wydanie zostawiło pięć potwierdzonych rzeczy z opisem i ścieżką naprawy,
zamiast robić je w pośpiechu na końcu długiej sesji. Tu są zrobione.

- `[#391]` **Ponowna wysyłka z kolejki tworzyła DRUGI wydatek**
  ([driverExpenses.ts](packages/api/src/data/driverExpenses.ts),
  [checklists.ts](packages/api/src/data/checklists.ts), [outbox.ts](apps/mobile/lib/outbox.ts)).
  Ścieżka jest w tej branży zwyczajna: kierowca dodaje wydatek na słabym zasięgu,
  żądanie **dochodzi** do bazy i wiersz powstaje, ale odpowiedź ginie. Klient widzi błąd,
  wpis zostaje w kolejce, a przy następnym połączeniu leci drugi zwykły `INSERT` —
  i w rozliczeniu są dwie myjnie po 180 zł zamiast jednej.

  Paliwo, AdBlue, Trip i czat miały to rozwiązane od dawna (`id` z kolejki +
  `upsert(onConflict:"id", ignoreDuplicates)`). Wydatki i checklisty zostały przy czystym
  `insert` z kluczem z bazy — czyli każda próba tworzyła nowy wiersz.

  Przy okazji rzecz, która sama byłaby błędem: `ignoreDuplicates` sprawia, że przy
  powtórce baza **nie zwraca wiersza**. `single()` uznałby to za błąd i wpis wróciłby do
  kolejki ze statusem `error` — poprawka przed duplikatem stworzyłaby pętlę nieudanych
  wysyłek. Stąd `maybeSingle()` i `id` z kolejki jako wynik.

- `[#392]` **`/stats` z limitem 5000 wierszy, który działał po cichu**
  ([stats/page.tsx](apps/web/app/(app)/stats/page.tsx)). Przewoźnik z 45 ciągnikami
  generuje w dwa lata więcej niż 5000 zdarzeń trasy; nadwyżka nie dojeżdżała, a ekran
  pokazywał zaniżone spalanie, koszty i przychód **jako liczby pewne**.

  Najgorsze, że wygląda to jak spadek: właściciel widzi „mniej tankowań niż rok temu"
  i szuka przyczyny w firmie, a nie w limicie zapytania. Limit zostaje (po jego
  przekroczeniu i tak trzeba liczyć po stronie bazy), ale obcięcie jest teraz wykrywane
  i nazwane wprost. Świadomie zgłaszamy też przypadek graniczny „dokładnie 5000":
  fałszywe ostrzeżenie raz na jakiś czas jest tanie, cicha strata danych — nie.

- `[#394]` **Cron nie przypominał o licencji transportowej, paszporcie, dowodzie
  i uprawnieniach kierowcy** ([alerts.ts](apps/web/lib/alerts.ts)). Ta funkcja i SQL-owa
  `generate_expiry_notifications` miały być bliźniacze — wspólny `dedup_key` jest po to,
  żeby oba źródła były dla siebie idempotentne — ale rozjechały się zakresem.

  To ma znaczenie, bo **tylko cron wypycha powiadomienie**: chodzi codziennie o 7:00
  z harmonogramu, podczas gdy funkcja SQL odpala się z dzwonka w panelu web, czyli
  wyłącznie gdy właściciel sam tam wejdzie. O kończącej się licencji dowiadywał się więc
  ten, kto i tak zaglądał do panelu — a nie ten, komu wygasa.

  Najgłębsza była luka przy uprawnieniach dodatkowych (UDT, HDS): nie mają ŻADNEJ
  powierzchni alertowej po stronie klienta — ani w panelu uwag na webie, ani w mobilnym
  terminarzu. Dla właściciela pracującego z telefonu wygasały bez jednego sygnału.

- `[#395]` **Data UTC sklejona z lokalną godziną w imporcie tachografu**
  ([TachoAutoSection.tsx](apps/web/app/(app)/work-time/TachoAutoSection.tsx)).
  `created_at.slice(0, 10)` bierze dzień w UTC, a godzina pochodzi z checklisty wypełnionej
  w strefie kierowcy. Checklista o 00:30 czasu polskiego ma `created_at` 22:30 UTC **dnia
  poprzedniego** — nocna zmiana lądowała w złej dobie, a z tych godzin liczony jest
  odpoczynek dobowy i tygodniowy.

- `[#393]` **Sprostowanie w komentarzu — i to jest tu najważniejsze**
  ([usePermission.ts](apps/mobile/lib/usePermission.ts)). Komentarz twierdził, że przy
  poziomie uprawnień „view" „serwerowe RLS i tak pilnuje zapisu". **To nieprawda.** Żadna
  polityka nie czyta `memberships.permissions`: kolumna istnieje i jest używana przez
  `company_members()` oraz `create_invite`, ale ani jedna reguła INSERT/UPDATE się do niej
  nie odwołuje.

  Fałszywa deklaracja zabezpieczenia jest groźniejsza niż jego brak — następna osoba czyta
  ją, uznaje ścieżkę za osłoniętą i nie dokłada kontroli tam, gdzie jej naprawdę nie ma.

  **To znalezisko NIE jest domknięte i tak jest opisane.** Poprawiony został fałszywy opis,
  nie sam brak. Ekrany mobilne respektują „view", web nie, baza nie zna go w ogóle —
  granicą pozostaje RLS (własne wiersze, własna firma) i ta granica działa. Egzekwowanie
  poziomu w bazie wymaga **decyzji produktowej**: czy rozstrzyga o INSERT, o UPDATE cudzych
  wierszy, czy o obu, i co zrobić z wpisami zakolejkowanymi offline, zanim uprawnienie
  odebrano. Stan i pytanie zapisane w [SECURITY-RLS.md](docs/SECURITY-RLS.md).

**Bramki:** `biome` ✓ · `tsc` 7/7 ✓ · testy **1023** ✓ · `next build` ✓ · `docs:check` ✓

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## [1.236.0] — 🔑 Klucz szyfrujący dane osobowe był do pobrania bez logowania. Plus druga runda audytu.

Ostrzeżenia dostawcy bazy okazały się cenniejsze niż cały audyt agentowy — a audyt
i tak znalazł dwanaście rzeczy, w tym utratę tankowania odtworzoną testem.

### Rzecz najpoważniejsza w całej tej serii

- `[#390]` **`_card_key()` i `_pii_key()` — funkcje zwracające klucz pgcrypto, którym
  szyfrowane są PIN-y kart paliwowych i dane osobowe kierowców — miały `EXECUTE` dla
  roli `PUBLIC`**, a więc i dla `anon` (migracja
  [0105](supabase/migrations/0105_revoke_key_accessors_from_clients.sql)).

  PostgREST wystawia funkcje ze schematu `public` jako `/rest/v1/rpc/<nazwa>`, a `anon`
  to klucz publiczny, który **z definicji leży w paczce aplikacji webowej**. Klucz
  szyfrujący dało się więc pobrać jednym żądaniem HTTP, bez logowania, danymi które
  i tak są jawne.

  **Potwierdzone doświadczalnie** (transakcja zakończona ROLLBACK, `set local role anon`):
  wywołanie przechodziło. Wartość klucza nie została nigdzie wypisana ani zapisana.

  Dlaczego to boli bardziej niż zwykły błąd uprawnień: szyfrowanie jest tu **drugą
  warstwą** — RLS chroni dostęp do wierszy, szyfrowanie chroni ich treść na wypadek,
  gdyby RLS zawiodło. Klucz dostępny publicznie sprowadzał tę drugą warstwę do zera,
  zostawiając dane osobowe całej floty na jednej warstwie zamiast dwóch.

  Odebrane `PUBLIC`/`anon`/`authenticated`. Wołają je wyłącznie funkcje `SECURITY DEFINER`
  należące do `postgres`, więc aplikacja działa bez zmian — **sprawdzone**: odszyfrowanie
  przez `my_driver_identity` działa dalej dla zalogowanego.

  Przy okazji **19 uprzywilejowanych RPC** (PIN karty, kartoteka kierowców, faktury,
  zaproszenia) odebrane `PUBLIC` przy zachowaniu `authenticated`. Publiczny link
  śledzenia przesyłki i predykaty RLS zostają dostępne — jawnie i z uzasadnieniem.

  **Pułapka, na którą sam wpadłem:** Postgres domyślnie nadaje `EXECUTE` roli `PUBLIC`,
  a `anon` po niej dziedziczy. Pierwsze `revoke … from anon` nie zmieniło **nic** —
  `has_function_privilege('anon', …)` nadal zwracało `true`. Odbierać trzeba `PUBLIC`.
  Opisane w migracji, żeby następny nie stracił na to godziny.

- `[#390]` **Reguła 8 w bramce** ([audit-rls.mjs](scripts/audit-rls.mjs),
  [SECURITY-RLS.md](docs/SECURITY-RLS.md)) — żadna funkcja `SECURITY DEFINER` nie może być
  wywoływalna przez `anon` poza jawną, krótką listą wyjątków. Reguła sprawdza uprawnienie
  **skuteczne**, nie treść `proacl`, właśnie z powodu dziedziczenia po `PUBLIC`.

### Sejf dokumentów i telefon zmieniający właściciela

- `[#390]` **Widoczność dokumentu nie obowiązywała na PLIKU**
  (migracja [0107](supabase/migrations/0107_storage_visibility_and_push_takeover.sql)).
  Migracja 0061 wprowadziła poziomy `management`/`company`/`selected` i poprawnie założyła
  je na tabelę metadanych — ale polityka na `storage.objects` została z 0031 i sprawdzała
  wyłącznie przynależność do firmy. Kierowca **nie widział** dokumentu na liście, ale
  **mógł pobrać plik**; ścieżek nie trzeba było zgadywać, bo bucket dawał się wylistować.

  Wzorzec do zapamiętania: **przy plikach reguła musi stać w dwóch miejscach** — na
  wierszu metadanych i na obiekcie w buckecie. Zabezpieczenie jednego wygląda na
  kompletne, bo lista rzeczywiście się filtruje.

- `[#390]` **Firmowy telefon oddany innemu kierowcy odbierał cudze powiadomienia.**
  `expo_push_tokens.token` jest UNIQUE, a tabela nie ma polityki UPDATE — więc
  `upsert(onConflict:"token")` po prostu się nie udawał i wiersz zostawał przy poprzednim
  właścicielu. Przydziały zleceń i treści z czatu adresowane do kierowcy A trafiały na
  ekran telefonu, którego używał już B — i nie mijało to samo, bo A mógł nigdy więcej się
  nie zalogować.

  Token należy do **urządzenia**, więc przejmuje go ten, kto urządzenie trzyma
  (`save_expo_push_token`), a wylogowanie token zdejmuje (`delete_expo_push_token`,
  wołane przed zamknięciem sesji — potem nie ma już czym się uwierzytelnić).

### Trasa, myto i kolejka offline

- `[#390]` **Klucz cache tras pomijał kategorię tunelową ADR**
  ([cache.ts](packages/maps/src/cache.ts)). Kierowca bez ADR liczył trasę, wpis lądował
  w cache — i chwilę później zestaw z cysterną kategorii C dostawał **dokładnie tę samą
  trasę, policzoną bez ograniczeń tunelowych**, bo klucz obu zapytań był identyczny.
  To nie jest preferencja, tylko warunek legalności przejazdu. Cztery testy, w tym ten,
  że identyczny profil nadal trafia w cache — poprawka nie może kosztować trafień.

- `[#390]` **Myto w nieznanej walucie wchodziło do kosztu razy jeden**
  ([here.ts](packages/maps/src/here.ts)), czyli jako euro. Teraz pozycja jest pomijana
  i zgłaszana uwagą `toll.currencyUnknown`: **myto niepełne, o którym wiadomo, jest
  uczciwsze niż zawyżone, o którym nie wiadomo.** Poprzedni test przybijał stare
  zachowanie bez słowa uzasadnienia — czyli utrwalał przypadek, nie decyzję; przepisany.

- `[#390]` **Kolejka offline na webie kasowała zapisane tankowanie**
  ([outbox.ts](apps/web/lib/outbox.ts)). `trySync` czytał całą tablicę, czekał na kilka
  żądań sieciowych i zapisywał ten sam, już nieaktualny snapshot — wszystko, co w tym
  czasie doszło do kolejki, znikało. Razem z komunikatem „Zapisano lokalnie (w kolejce)",
  który użytkownik właśnie zobaczył.

  Nie trzeba do tego zerwanego łącza: zwykły round-trip to setki milisekund, a
  `localStorage` jest wspólny dla **wszystkich kart** tej samej domeny. Wersja mobilna
  miała ten błąd opisany i naprawiony dawno temu — poprawka nigdy nie została przeniesiona
  na web, bo web nie miał **ani jednego** testu kolejki.

  Teraz ma cztery. Sprawdziłem, że wyłapują błąd: po chwilowym przywróceniu starego kodu
  test pada z `expected [ 500 ] to deeply equal [ 300, 500 ]` — czyli dokładnie na
  zniknięciu drugiego tankowania.

### Skala i strefy czasowe

- `[#390]` **52 klucze obce bez indeksu** (migracja
  [0106](supabase/migrations/0106_missing_fk_indexes.sql)) — w tym `fuel_logs.vehicle_id`
  i `trip_events.vehicle_id`, najgorętsze kolumny w produkcie. Produkcyjna baza jest dziś
  prawie pusta, więc żaden z tych braków nie ujawni się przy klikaniu; przy 30–50 autach
  jest już za późno, bo `create index` na milionie wierszy blokuje zapisy, a na pustej
  tabeli trwa milisekundy. Drugi powód jest mniej oczywisty: **usuwanie konta jest tu
  funkcją produktu** (wymóg Apple), a bez indeksów na `created_by`/`uploaded_by`/… każde
  usunięcie skanuje kilkanaście tabel naraz.

- `[#390]` **Domyślne „od" w rozliczeniu wskazywało ostatni dzień POPRZEDNIEGO miesiąca.**
  `new Date(rok, miesiac, 1)` buduje lokalną północ, a `toISOString()` przelicza ją na
  UTC — dla całej Polski to 22:00 dnia poprzedniego. Rachunek domyślnie zaczynał się dzień
  za wcześnie i wciągał tankowania z rozliczonego już okresu.

- `[#390]` **Diety w raporcie miesięcznym pobierane bez zakresu dat** — cała historia firmy
  szła do przeglądarki, filtr działał dopiero tam, a limit 5000 ucinał najstarsze miesiące.
  Sekcja pokazywała kwotę zaniżoną albo znikała, wyglądając jak miesiąc bez podróży.
  Filtr po `trip_date`, a wiersze bez daty przepuszczane — zawężenie zakresu nie może
  ukryć danych, których nie umiemy umiejscowić w czasie.

### Co ZOSTAJE z tej rundy (świadomie, nie po cichu)

Pięć potwierdzonych znalezisk czeka — każde ma opis i ścieżkę naprawy:
`[#391]` duplikat wydatku i checklisty przy ponownej wysyłce z kolejki mobilnej (brak
idempotencji — paliwo i Trip ją mają) · `[#392]` `/stats` z twardym limitem 5000 wierszy
bez wykrycia obcięcia · `[#393]` poziom uprawnień „view" nieegzekwowany przy zapisie ·
`[#394]` cron nie przypomina o licencji transportowej, paszporcie, dowodzie i uprawnieniach
kierowcy (te terminy zna tylko funkcja SQL odpalana z panelu web) · `[#395]` data UTC
sklejona z lokalną godziną w imporcie tachografu.

**Audyt, runda 2:** 6 obiektywów · 18 agentów · 12 znalezisk · 0 obalonych — ale tym razem
weryfikatorzy **reprodukowali** błędy tymczasowymi testami zamiast czytać kod, i dwa razy
skorygowali zawyżony opis skutku, zamiast go przyklepać.

**Bramki:** `biome` ✓ · `tsc` 7/7 ✓ · testy **1023** ✓ · `next build` ✓ · `docs:check` ✓ ·
migracje 0105/0106/0107 zastosowane i zweryfikowane na produkcji

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## [1.235.0] — 🛡️ Kierowca mógł przepiąć swoje tankowanie do obcej firmy. Sprawdzone na produkcji, zamknięte.

Adwersaryjny audyt pięcioma niezależnymi obiektywami: 10 znalezisk, każde weryfikowane
przez agenta, którego zadaniem było je **obalić**. Dwa z nich znalazłem równolegle sam,
patrząc wprost w żywą bazę — i to one okazały się najpoważniejsze.

### Izolacja firm — ta sama reguła, trzeci raz

- `[#389]` **Osiem polityk UPDATE bez `WITH CHECK`** (migracja
  [0103](supabase/migrations/0103_update_policies_with_check.sql)). Migracje 0094
  (`chat_threads`) i 0101 (`driver_positions`) naprawiły po jednym wystąpieniu i obie
  kończyły się tym samym wnioskiem. Zapytanie do `pg_policies` na żywej bazie pokazało,
  że wniosku nigdzie nie zastosowano szerzej.

  **Dziura potwierdzona doświadczalnie, nie wywnioskowana:** w transakcji zakończonej
  ROLLBACK, z rolą `authenticated` i JWT prawdziwego kierowcy,
  `update fuel_logs set company_id = <obca firma>` **przeszło**. Wpis tankowania zmienił firmę.

  Działało to tak: `USING ((driver_id = auth.uid()) OR has_role(company_id, …))` Postgres
  stosuje także do wiersza PO zmianie. Pierwszy człon pozostaje prawdziwy, bo kierowca nie
  rusza `driver_id` — a `company_id` nie występuje w warunku w żaden sposób, który by go
  bronił. W praktyce: kierowca firmy A wstrzykuje własne tankowania, wyjazdy, przerwy
  i AdBlue do ksiąg firmy B, jednocześnie usuwając je z własnych. Nie trzeba do tego luki
  w aplikacji ani wykradzionego tokenu — wystarczy klucz publiczny i jedno zapytanie.

  Po migracji: atak kończy się błędem RLS, **legalna edycja własnego wpisu nadal działa**
  (sprawdzone osobno — poprawka bezpieczeństwa blokująca kierowcy własne dane byłaby
  gorsza od dziury). Polityk UPDATE bez `WITH CHECK`: **0 z 16**.

- `[#389]` **Reguła w bramce CI** ([audit-rls.mjs](scripts/audit-rls.mjs)) — żeby dziewiąta
  nie powstała po cichu. Naprawianie po jednym działa dopóki ktoś pamięta; reguła działa dalej.

- `[#389]` **Ocena POI przestaje być przenośna** — `poi_id` niezmienny przez wyzwalacz.
  Autor mógł PRZESUNĄĆ własną jedynkę na sąsiedni parking, bez śladu i bez pisania nowej
  opinii. Wyzwalacz, nie `WITH CHECK`: odczyt tej samej tabeli w jej własnej polityce
  wchodzi ponownie w polityki SELECT, a to prosta droga do rekursji.

### Liczby, które nie miały prawa być prawdziwe

- `[#389]` **Rozliczenie kierowcy pobierało kilometry filtrem, który nie mógł trafić**
  ([settlements/driver](apps/web/app/(app)/settlements/driver/page.tsx)). Zapytanie szło po
  `drivers.id` (klucz KARTOTEKI), a `trip_events.driver_id` ma więz obcy do `auth.users(id)`
  — **potwierdzone w żywej bazie**, `trip_events_driver_id_fkey → auth.users(id)`. To dwie
  różne wartości, więc wynik był pusty ZAWSZE, dla każdego kierowcy i każdego okresu.

  Nie było tego widać: dni pracy przychodzą osobno z ewidencji, więc arkusz wypełniał się
  normalnie — tylko premia za nadwyżkę kilometrów wychodziła zerowa. Komunikat „brak danych"
  też nie padał, bo jego warunek wymaga JEDNOCZEŚNIE braku dni i braku przejazdów.
  Właściciel zapisywał kierowcy zaniżoną należność, nie mając jak zauważyć czego brakuje.

  Przy okazji: okno liczone po `created_at` (moment synchronizacji) zamiast `occurred_at`
  (dzień zdarzenia) wrzucało kilometry do złego tygodnia ISO, a na przełomie miesiąca poza
  okres rozliczenia. Kierowca bez powiązanego konta dostaje teraz komunikat, a nie zero.

- `[#389]` **Rachunek wyjazdu sumował waluty jak liczby**
  ([settlements](apps/web/app/(app)/settlements/page.tsx)). Kolumna `currency` przychodziła
  z bazy i **ani razu nie była odczytana**, a wynik podpisywano znakiem €. Tankowanie za
  430 PLN dokładało „430 €". Teraz kurs EBC z dnia zdarzenia, licznik pozycji bez notowania
  na ekranie, a w CSV rozdzielone „Kwota"/„Waluta"/„Kwota (€)" — bo arkusz z jedną kolumną
  „Kwota" dawał się zsumować `=SUMA()` i dawał liczbę bez znaczenia.

### Aplikacja kierowcy liczyła cudze dane jako własne

- `[#389]` **„Moje rozliczenie" brało ewidencję CAŁEJ firmy**
  ([settlement.tsx](apps/mobile/app/settlement.tsx)) — polityka SELECT to
  `is_member_of(company_id)`, więc kierowca realnie widzi dni kolegów i wszystkie szły do
  jego szacunku. W firmie z pięcioma kierowcami kwota była około pięciokrotnie za wysoka.
  Do tego liczone były WPISY, nie unikalne dni: korekta godzin dopisana osobno robiła
  z jednego dnia dwa.

- `[#389]` **Czas pracy liczył WTD z godzin całej firmy**
  ([work-time.tsx](apps/mobile/app/work-time.tsx)). Kierowca dostawał czerwony alarm
  przekroczenia 48 h/60 h praktycznie zawsze i nie miał jak go wyjaśnić, bo w jego własnych
  dniach przekroczenia nie było. **Alarm zapalający się bez powodu uczy tego, żeby go
  ignorować — i wtedy nie zadziała, gdy przekroczenie będzie prawdziwe.**

  Oba ekrany filtrują teraz po kartotece. Telefon nie miał czym: zna `auth.uid()`, a wpisy
  są zaadresowane `drivers.id`. Migracja [0104](supabase/migrations/0104_my_driver_identity_id.sql)
  dokłada `id` do `my_driver_identity()` — wstecznie zgodnie, więc buildy w sklepach działają dalej.

### Mechanizm zamiast łatki

- `[#389]` **Edycja pojazdu z telefonu kasowała 17 kolumn**
  ([vehicles.ts](packages/api/src/data/vehicles.ts)) — dokładnie błąd naprawiony w `[#386]`,
  ale tam naprawiono JEDNEGO WYWOŁUJĄCEGO: dołożono pola do formularza web. Aplikacja
  mobilna ma 9 pól z 26 i kasowała dalej — w tym gabaryty, liczbę osi i kod tunelowy ADR,
  czyli dane, z których mapa liczy trasę ciężarówki.

  Naprawione u źródła: `updateVehicle` wysyła teraz **patch**, nie cały wiersz. Rozróżnienie
  opiera się na OBECNOŚCI KLUCZA, bo `undefined` znaczy tu dwie różne rzeczy —
  `{ insurer: undefined }` to „wyczyściłem pole" (zapisz `null`), a klucz nieobecny to
  „mój formularz tego pola nie ma" (nie ruszaj kolumny). Zod tę różnicę zachowuje;
  sprawdziłem to sondą, zanim na tym oparłem naprawę. Web wysyła `pole.trim() || undefined`,
  czyli klucz OBECNY — czyszczenie działa jak dotąd.

  Osiem testów, w tym jeden pilnujący WARUNKU POPRAWNOŚCI: `vehicleSchema` nie może dostać
  `.default()`, bo `.default()` wstawia klucz również wtedy, gdy wywołujący go nie podał —
  i „nie ruszaj" zamieniłoby się w „nadpisz domyślną".

- `[#389]` **Waluta zlecenia jako kod ISO** ([schemas.ts](packages/core/src/schemas.ts)) —
  `z.string().max(8)` przepuszczało `zł`, `euro`, `EU`, podczas gdy migracja 0100 nałożyła
  na `orders.currency` CHECK `^[A-Z]{3}$`. Walidator `currencyCode` istniał w tym samym
  pliku od `[#373]`. `pln` z telefonu przechodzi jako `PLN`; zlecenia mobilne dostały
  chipy walut zamiast pola tekstowego — jak koszty pojazdu w `[#388]`.

**Audyt:** 5 obiektywów · 15 agentów · 10 znalezisk · 0 obalonych przez weryfikatorów ·
2 znalezione niezależnie przeze mnie w żywej bazie (i to one były najgroźniejsze) ·
0 zgłoszeń dotyczących czegoś, co było świadomą decyzją.

**Bramki:** `biome` ✓ · `tsc` 7/7 ✓ · testy **1015** ✓ · `next build` ✓ · `docs:check` ✓ ·
migracje 0103/0104 zastosowane i zweryfikowane na produkcji (atak zablokowany, praca normalna działa)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## [1.234.0] — 💱 Waluta przestaje być polem tekstowym: koniec z kosztem, którego nikt nie policzy

Przegląd zamknął dziesięć usterek walutowych na webie. Ta sama klasa błędu została
w telefonie, w ekranie, którego tamten przegląd nie obejmował.

- `[#388]` **Formularz kosztu pojazdu w aplikacji brał walutę WOLNYM TEKSTEM**
  ([manage-vehicle-costs.tsx](apps/mobile/app/manage-vehicle-costs.tsx)) — `TextInput`
  z `maxLength={3}` i podpowiedzią „EUR". Kto wpisał `PL` zamiast `PLN`, zapisywał wiersz
  **poprawny dla bazy i dla `vehicleCostSchema`** (`z.string().min(1)`), ale nie do
  przeliczenia: `pickFxRate` nie zna kodu `PL`, więc koszt cicho wypadał z każdej sumy
  w euro. Formularz mówił „zapisano", kwota po prostu nie dochodziła — i nic tego nie
  zgłaszało, bo z punktu widzenia bazy wszystko było w porządku.

  Teraz wybór z listy (te same chipy, co przy kategoriach), z walutą podpowiedzianą
  **z kraju firmy** — jak na webie od `[#378]`.

- `[#388]` **Podpowiedź z kraju przepuszczona przez bramkę** — i to nie jest ostrożność
  na wyrost. `currencyForCountry` zwraca `UAH` dla Ukrainy, `MDL`, `RSD`, `BGN` dla
  sąsiadów, a **sprawdzenie w produkcyjnej tabeli `fx_rates` pokazuje, że żadna z tych
  czterech nie ma ani jednego notowania** (EBC ich nie publikuje). Bez `isSupportedCurrency`
  firma zarejestrowana na Ukrainie dostałaby domyślnie walutę, w której każdy zapisany
  koszt byłby martwy. Dziesięć walut z listy ma komplet 153 notowań od stycznia.

- `[#388]` **Jedna lista walut dla całego produktu** ([fx.ts](packages/core/src/fx.ts)).
  Żyła w czterech kopiach — [formShared.ts](apps/web/app/(app)/forms/formShared.ts) (10 walut),
  [pause.tsx](apps/mobile/app/pause.tsx) i [expenses.tsx](apps/mobile/app/expenses.tsx)
  (4, kolejność „PLN, EUR…"), [LiquidForm.tsx](apps/mobile/components/LiquidForm.tsx)
  (4, kolejność „EUR, PLN…") — z **różną walutą domyślną w różnych ekranach tej samej
  aplikacji**. Do rdzenia trafia `CURRENCIES`, typ `Currency` i `isSupportedCurrency`.

  Krótkie listy w ekranach wpisywanych jedną ręką w kabinie **zostają** — cztery chipy
  zamiast dziesięciu to świadomy wybór, nie niedopatrzenie. Zmienia się to, że są teraz
  typowane `Currency`, więc literówka albo kod bez notowania w EBC **nie kompiluje się**,
  zamiast tworzyć wpis nie do przeliczenia.

- `[#388]` **Sześć testów** ([fx.test.ts](packages/core/src/fx.test.ts)) — w tym ten, który
  pilnuje sedna: `PL` i `PLNN` odrzucone, ` pln ` i `Eur` przyjęte (bo tyle wpisuje
  człowiek), a waluta istniejąca naprawdę, lecz bez notowań, **odrzucona mimo to**.

**Weryfikacja dziesięciu usterek z przeglądu:** sprawdzone w kodzie po kolei, nie z raportu —
wszystkie dziesięć jest naprawionych (faktury: `paidGross`/`unpaidGross`; mobile /stats:
data z `occurred_at`; zlecenia: filtr `priced` zdejmujący wiersz z obu stron ułamka;
koszty pojazdu: selekt waluty; pulpit: `KpiStrip` i `RevenueTrend` przeliczają;
/monthly: licznik braków na całym oknie trendu; /wyjazdy: zapas `LEAD_MONTHS`, kurs
z dnia wyjazdu, `costKnown` blokujący zawyżoną marżę).

**Bramki:** `biome` ✓ · `tsc` 7/7 ✓ · testy **1007** ✓ · `next build` ✓ · `docs:check` ✓

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## [1.233.0] — 🧰 Hook floty przestaje gubić gabaryty, a paleta marki dostaje test

Sprzątanie po Fali 1 mapy: dwie rzeczy, które sam wskazałem jako dług, zanim urosną.

- `[#387]` **`useFleet` na webie oddaje pełny wiersz pojazdu**
  ([useFleet.ts](apps/web/lib/useFleet.ts)). Hook mapował pojazd do
  `{id, registration, maxPayloadKg}`, a `listVehicles` robi `select("*")` — czyli
  wysokość, szerokość, długość, masę własną, liczbę osi, ADR i klasę emisji **baza
  już przysyłała**, tylko hook wyrzucał je jedną linijką przed użyciem. Ekran mapy
  musiał z tego powodu ominąć hook własnym zapytaniem; każdy następny ekran
  potrzebujący gabarytów powtórzyłby to obejście. Kształt celowo zrównany z
  `apps/mobile/lib/useFleet.ts`, żeby profil pojazdu czytało się tak samo na obu
  platformach.

  `null` zostaje `null-em`: brak w kartotece **nie** jest podmieniany na „typową"
  wartość. Podstawienie 4 m wysokości wygląda na ekranie identycznie jak wysokość
  prawdziwa, a kończy się zestawem pod za niskim wiaduktem.

- `[#387]` **Pojazdy trybu demo mają ten sam kształt** ([demo.ts](apps/web/lib/demo.ts))
  — z gabarytami `null`. Tryb demo ma pokazywać zachowanie aplikacji przy pustej
  kartotece, a nie wymyślone wymiary udające dane.

- `[#387]` **Komentarz na mapie doprowadzony do prawdy**
  ([map/page.tsx](apps/web/app/(app)/map/page.tsx)). Tłumaczył własne zapytanie tym,
  że „hook wystawia tylko rejestrację" — po tej zmianie to już nieprawda. Osobne
  pobranie zostaje, ale z prawdziwego powodu: ma własny `catch`, więc brak uprawnień
  do `vehicles` zabiera wyłącznie listę wyboru pojazdu, a mapa i zapisane miejsca
  działają dalej. Nieaktualne uzasadnienie w kodzie jest gorsze niż jego brak —
  następna osoba „posprząta" według niego i zabierze odporność ekranu.

- `[#387]` **`packages/ui` dostaje pierwsze testy** ([theme.test.ts](packages/ui/src/theme.test.ts)).
  Był jedynym pakietem bez ani jednego. Test przybija kanon z CLAUDE.md — czerwień
  `#E50914` na czerni `#0a0a0a` — bo to reguła, którą łamie się jedną literą w jednym
  pliku i nie zauważa tego ani kompilator, ani przeglądarka. Sprawdzany jest też
  wariant CSS (zmienna musi mieć kanon jako wartość zapasową) i parytet kluczy obu
  palet, żeby kolor nie istniał w jednej wersji, a w drugiej nie.

- `[#387]` **Dokumentacja dogoniła kod — `docs:check` bez ani jednego ostrzeżenia.**
  [ARCHITECTURE.md](docs/ARCHITECTURE.md) i [ROADMAP.md](docs/ROADMAP.md) stały na v1.202.0,
  czyli 31 wersji wstecz: nadal zapowiadały jako „planowane" profil truck, mapę mobilną
  i adapter, który od dawna działa. [DATA-MODEL.md](docs/DATA-MODEL.md) nie miał ani migracji
  0101 (dziura RLS w `driver_positions`), ani 0102 (osie/ADR/klasa emisji), a to jedyne
  miejsce, gdzie ktoś szuka semantyki NULL-a w `adr_tunnel_code`.

  Nagłówki podbite razem z **treścią**, nie zamiast niej — sam numer wersji nad nieaktualnym
  tekstem robi z dokumentu coś gorszego niż dokument przestarzały: wygląda na sprawdzony.

  Do „decyzji otwartych" wpisane **LEZ, weekendowe zakazy ruchu i język etykiet na mapie** —
  z powodem. Żaden zintegrowany dostawca nie oddaje tych danych, a domyślny podkład jest
  rastrowy (nazwy wypalone w kafelkach). To decyzje zakupowe, nie zadania programistyczne,
  i trzymanie ich na liście „do zrobienia" sugerowałoby, że wystarczy usiąść i napisać kod.

- `[#387]` **Wersja aplikacji mobilnej zsynchronizowana** — `apps/mobile/package.json` stał na
  1.89.0, a EAS buduje z `app.config.js`, gdzie jest 1.95.0. Rozjazd nic nie psuł dopóki nikt
  nie sięgnął po tę pierwszą liczbę; teraz obie mówią to samo.

**Bramki:** `biome` ✓ · `tsc` 7/7 ✓ · testy **1001** ✓ (`packages/ui` 4 nowe) · `next build` ✓ · `docs:check` ✓ (0 ostrzeżeń)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## [1.232.0] — 🧾 Gabaryty z kartoteki, a nie ze stałych w kodzie — i koniec kasowania danych przy edycji pojazdu

Domknięcie Fali 1 mapy plus błąd, który wyszedł przy okazji i był groźniejszy niż zadanie.

- `[#385]` **Trzy pola routingu w kartotece** (migracja [0102](supabase/migrations/0102_vehicles_routing_fields.sql)):
  liczba osi, kategoria tunelowa ADR i klasa emisji. Wszystkie NULLABLE świadomie —
  istniejące pojazdy tych danych nie mają i **nie wolno ich zgadywać**. Puste ADR znaczy
  „ładunek zwykły", a nie „nie wiemy", więc nie wywołuje ostrzeżenia; puste osie i klasa
  emisji pokazują „—", bo tam danych faktycznie brakuje.

- `[#385]` **Mapa czyta profil z wybranego pojazdu.** Ekran trzymał własne wartości w stanie
  komponentu (24 t / 400 / 255 / 1650 cm / 5 osi) i wysyłał je do routingu **niezależnie
  od kartoteki**, przy panelu domyślnie zwiniętym — więc solówka i pięcioosiowy zestaw
  dostawały tę samą trasę i to samo myto. Ręczne pola zostają jako nadpisanie (spedytor
  bywa proszony o trasę dla zestawu spoza kartoteki), ale gdy pojazd jest wybrany, punktem
  wyjścia jest jego kartoteka.

- `[#385]` **Ciche podstawianie usunięte.** `Number(weightT) || 24` zamieniało wyczyszczone
  pole w 24 tony. Teraz brak parametru jest brakiem: klucz nie wchodzi do profilu,
  a **braki są widoczne w trzech miejscach naraz** — w etykiecie zwiniętego panelu („?"
  zamiast wartości), w ramce „Trasa liczona BEZ: …" renderowanej **poza** zwijanym panelem,
  i w pasku pod wynikiem opisującym profil, którym trasa faktycznie poszła do dostawcy.
  Panel rozwija się sam, gdy wybranemu pojazdowi czegoś brakuje.

- `[#385]` **Uwagi dostawcy widoczne.** `RouteResult.notices` renderowane nad liczbami,
  `severity: "critical"` w czerwieni ze znakiem ⛔ i dodatkowym powiadomieniem — bo panel
  wyniku bywa przewinięty poza ekran, a to jedyny kanał, którym dostawca mówi
  „zignorowałem twój parametr" albo „policzyłem trasę profilem osobowym".

- `[#386]` **Edycja pojazdu kasowała sześć kolumn.** `updateVehicle` nadpisuje CAŁY wiersz
  (`update(vehicleToRow(input))`), a formularz nie miał pól: **szerokość, długość**,
  pierwsza rejestracja, koniec leasingu, spedytor i uwagi. Każda edycja ustawiała je
  na `null` — po cichu, bo lista ich nie pokazuje.
  Najboleśniej przy szerokości i długości: **import CSV/XLSX je wczytuje**, a pierwsza
  ręczna poprawka literówki w rejestracji je czyściła. Od tego wydania mapa czyta te
  kolumny do profilu routingu, więc ich zniknięcie oznaczałoby trasę liczoną bez gabarytów —
  czyli powrót dokładnie tego problemu, który przed chwilą naprawiliśmy.
  Sprawdzone na produkcji: **nikt jeszcze danych nie stracił** (2 pojazdy, żaden nie miał
  tych pól wypełnionych) — ale błąd był żywy i czekał na pierwszy import.

**Bramki:** biome ✓ · `tsc` 7/7 ✓ · testy core 611 · maps 133 · api 81 · web 131 · mobile 36 · i18n 5 (razem **997**) ✓ · `next build` ✓.

**Do rozważenia osobno:** `apps/web/lib/useFleet.ts` mapuje pojazd do `{id, registration,
maxPayloadKg}` i gubi gabaryty — mapa omija ten hook własnym `listVehicles`, ale każdy
kolejny ekran potrzebujący wymiarów powtórzy to obejście. Wersja mobilna ma już właściwy kształt.

## [1.231.0] — 🚚 Kontrakt pojazdu: ADR, twarda walidacja i kanał, którym dostawca przyznaje się do pominięcia

Fala 1 mapy. Routing wyglądał na ciężarówkowy, ale trzy rzeczy pozwalały mu po cichu
przestać nim być.

- `[#384]` **`kind` był `z.string()`.** „TRUCK" wielkimi literami przechodziło walidację,
  a `isTruck()` zwracało `false` — trasa **po cichu stawała się osobowa**, komplet gabarytów
  szedł do kosza, a odpowiedź API nie zawierała niczego, co by o tym mówiło. Teraz to enum:
  literówka jest błędem 400, a nie podmianą trasy.

- `[#384]` **Liczby nie miały zakresów.** `heightCm: -5` albo `weightKg: 1e9` szły prosto
  do płatnego API dostawcy. Granice są hojne (60 t, 6 m wysokości, 30 m długości, 12 osi) —
  mają odsiewać bzdury i nadużycia, nie realne zestawy.

- `[#384]` **ADR — kategoria tunelowa.** Do tej pory nie istniała nigdzie: ani w profilu
  pojazdu, ani w schemacie, ani w adapterach. Routing prowadził zestaw z materiałem
  niebezpiecznym przez tunele, do których nie ma wstępu. To nie jest optymalizacja trasy,
  tylko warunek legalności przejazdu — kontrola przy wjeździe kończy się zawróceniem
  i mandatem. Wysyłane do HERE (`truck[tunnelCategory]`) i TomTom
  (`vehicleAdrTunnelRestrictionCode`), a **kategoria leci tylko wtedy, gdy ładunek
  faktycznie jest niebezpieczny** — test pilnuje obu stron tego warunku.
  Uwaga na fałszywy trop: ciągi „ADR" w repo (`catalog.ts`, kartoteka kierowcy, migracja 0074)
  to **terminy ważności uprawnień kierowcy**, bez związku z routingiem.

- `[#384]` **Klasa emisji** dodana do kontraktu, choć routing jej dziś nie używa. Bez niej
  nie ruszy omijanie stref niskiej emisji, a dodanie pola później oznaczałoby drugą migrację
  kartoteki i drugą zmianę wszystkich wywołujących.

- `[#384]` **`notices` — kanał, którym HERE przyznaje się do pominięcia parametru.**
  Pole było zadeklarowane w typie odpowiedzi i **nigdy nieczytane**. To jedyne miejsce,
  w którym dostawca mówi „nie dało się uwzględnić wysokości i policzyłem trasę bez niej".
  Bez tego trasa bez gabarytów wygląda identycznie jak trasa z gabarytami — a różnica jest
  taka, że jedna z nich prowadzi pod wiadukt. Uwagi są czytane z trzech poziomów odpowiedzi
  (trasa, sekcje), odsiewane z duplikatów i **wymagane w `RouteResult`**: każdy adapter musi
  się zadeklarować, zamiast po cichu pominąć temat. Pusta lista znaczy „dostawca nic nie
  zgłosił", a nie „nie sprawdziliśmy". Przy trasie wieloodcinkowej uwagi z każdego odcinka
  trafiają do wyniku całości.

**Bramki:** biome ✓ · `tsc` 7/7 ✓ · testy core 611 · **maps 129** · api 81 · web 131 · mobile 36 · i18n 5 (razem **993**) ✓ · `next build` ✓.

**Zostaje z Fali 1:** gabaryty z kartoteki pojazdu po stronie **web** (dziś ręczne wartości
domyślne w zwiniętym panelu — typowy użytkownik wysyła zestaw domyślny, nie swój; mobile
zostało naprawione w [1.230.0]), kolumna `axle_count` w kartotece oraz rozstrzygnięcie
GraphHoppera, który liczy profilem osobowym i udaje TIR-a.

## [1.230.0] — 🗺️ Mapa: dziura w izolacji firm, gabaryty w telefonie, dane odzyskane z tego, co już płacimy

Mapowanie podsystemu map wykazało wzorzec gorszy niż martwy kod: **dane są pobierane —
czasem opłacone — i wyrzucane na ostatnim metrze, tuż przed renderem.**

- `[#383]` **Dziura w izolacji firm** (migracja [0101](supabase/migrations/0101_driver_positions_update_check.sql)).
  Polityka UPDATE na `driver_positions` miała `USING (user_id = auth.uid())` i **żadnego
  `WITH CHECK`**. `user_id` był chroniony, ale `company_id` nie występował w warunku w ogóle —
  kierowca firmy A mógł podmienić go we własnym wierszu i **wstrzyknąć swoją pozycję na mapę
  floty firmy B**, bo SELECT przepuszcza po przynależności. INSERT był zabezpieczony, UPDATE
  go omijał. Zweryfikowane na żywej bazie przed i po. To ta sama klasa błędu co w wątkach
  czatu (0094): warunek na tym, co wolno wziąć, bez warunku na tym, czym wolno to zastąpić.

- `[#383]` **Telefon liczył trasy bez wymiarów pojazdu — i to nie był brak funkcji, tylko
  ryzyko fizyczne.** `apps/mobile/app/map.tsx` wysyłał twardo `{ kind: "truck", weightKg: 24000 }`.
  Bez `heightCm` warunek budujący URL nie wchodził, więc **wysokość nigdy nie trafiała
  do zapytania**: trasa wyglądała jak trasa TIR, a była trasą pojazdu bez wymiarów — żaden
  wiadukt, tunel ani ograniczenie szerokości nie były brane pod uwagę. Web ma formularz
  gabarytów od dawna; telefon, czyli to, co jedzie w kabinie, nie miał nic.
  Teraz gabaryty idą z kartoteki pojazdu, a **brakująca kolumna jest widoczna na ekranie** —
  parametr wysłany „na oko" jest gorszy niż jego brak, bo wygląda tak samo jak prawdziwy.
  Pojazd typu „inne" jest routowany jako ciężarówka: pomyłka w tę stronę co najwyżej wydłuża
  trasę, w drugą — wysyła zestaw pod niski wiadukt.

- `[#383]` **Godziny otwarcia POI** ([openingHours.ts](packages/core/src/openingHours.ts), 62 testy).
  Tagi OSM (`opening_hours`, `addr:*`, `brand`, `phone`, `website`) przychodziły w `Poi.tags`
  i były odcinane do `{id, name, type}` tuż przed renderem. Parser obsługuje realistyczny
  podzbiór formatu OSM, a **wszystko, czego nie rozumie, zwraca jako „nie wiemy" — nigdy jako
  „zamknięte"**. Zamknięte to twierdzenie, a błędne twierdzenie wysyła kierowcę 40 km
  na zamkniętą stację. Święta (`PH`) wracają osobną flagą, bo kalendarza świąt nie mamy.
  Sprawdzone niezależnie: `24/7` i zwykły zakres → otwarte, zakres przez północ o 2:00 →
  otwarte, przerwa obiadowa → zamknięte, `sunrise-sunset` i reguły sezonowe → „nie wiemy".

- `[#383]` **Odcinki płatne odzyskane.** `sectionType=tollRoad` leciał do TomTom w **każdym**
  zapytaniu o trasę — czyli już za to płaciliśmy — a typ odpowiedzi nie deklarował `sections`,
  więc dane były kasowane i `tollCost` wychodził zerem. Teraz są warstwą na trasie.
  Dostawcy, którzy takich danych nie oddają, zwracają pustą listę **odróżnialną** od
  „nie ma dróg płatnych".

- `[#383]` **`heading` pojazdu** siedział w bazie i w zapytaniu, a mapa nie czytała go ani razu —
  flota była rysowana bezkierunkowymi kołami. Teraz ikona jest obrócona, z niuansem, który
  łatwo przeoczyć: filtr `["has","heading"]` łapie także `null`, więc sprawdzenie jest jawne.

**Bramki:** biome ✓ · `tsc` 7/7 ✓ · testy core **611** · maps **126** · api 81 · web 131 · mobile 36 · i18n 5 (razem **990**) ✓ · `next build` ✓.

**Dwa zarzuty z mapowania, które sprawdziłem i ODRZUCIŁEM** — warto to zapisać, żeby nikt
ich nie „naprawiał" drugi raz: (1) obietnica „premium nawigacja… już działają" na stronie
głównej stoi w sekcji **roadmapy**, a to, co opisuje jako działające (auto-objazd przy
utrudnieniu, widok 3D), w kodzie jest; (2) warstwa incydentów **nie** woła TomTom prosto
z przeglądarki — idzie przez `/api/traffic`, czyli przez serwer z limitem i cache.

**Niewykonalne bez decyzji, nie bez pracy:** warstwy LEZ i sieci dróg płatnych. Ani TomTom,
ani HERE nie oddają takiej geometrii przez zwykły klucz API. Zostaje OSM z wyrywkowym
pokryciem — mapa pokaże „brak strefy" tam, gdzie strefa jest, co jest **gorsze niż brak
warstwy** — albo dane licencjonowane. Zakazów weekendowych żaden dostawca nie oddaje jako
danych; własna tabela kalendarza dałaby większość wartości, przy koszcie ukrytym: ktoś musi
ją co roku aktualizować i odpowiadać za poprawność.

## [1.229.0] — 🧭 Koszty operacyjne w rachunku wyjazdu + skrót tras na statystykach

Domknięcie listy Fazy 7. Rachunek pojedynczej trasy był zaniżony dokładnie o to,
co kierowca płaci po drodze: `buildJourneys` liczy paliwo, AdBlue i kwoty przy
zdarzeniach trasy, bo tylko te dane zna — parkingi, myto, promy i mandaty siedzą
w tabelach Fazy 6 i do żadnego wyjazdu nie trafiały.

- `[#382]` **Silnik przypisania** ([journeyCosts.ts](packages/core/src/journeyCosts.ts), 13 testów).
  Wiąże po pojeździe i po **oknie czasowym** wyjazdu, bo to jedyne wiązanie, jakie
  w danych istnieje — postój ani bramka nie niosą numeru wyjazdu. Wyjazd otwarty
  łapie wszystko od swojego startu, bo trwa. **Pozycja spoza okna NIE jest doklejana
  do najbliższej trasy**: wyglądałoby to na precyzję, a byłoby zgadywaniem — trafia
  do „poza wyjazdami" i jest pokazana osobno.

- `[#382]` **Karta wyjazdu** ([/wyjazdy](apps/web/app/(app)/wyjazdy/page.tsx)) pokazuje
  rozbicie „w tym koszty operacyjne: parkingi · opłaty drogowe · kary", a zysk i marża
  liczą się od pełnej sumy. Kary anulowane i kwestionowane są poza kosztem i wymienione
  w osobnym banerze — wydatku nie było albo sprawa nie jest rozstrzygnięta.
  Zdarzenia trasy świadomie **nie są doliczane drugi raz**: ma je już `buildJourneys`.

- `[#382]` **Skrót tras na `/stats`** — zwijana sekcja z liczbą wyjazdów, otwartymi,
  dystansem, spalaniem ważonym dystansem i kosztem, plus link do pełnego rachunku.
  Zamiast budować trzeci mechanizm liczący to samo, ekran korzysta z danych, które
  już ma w stanie.

- `[#382]` **Czego ten skrót NIE liczy i mówi o tym wprost:** przychodu, zysku ani marży.
  Wymagają stawki za kilometr przeliczonej po kursie z **dnia wyjazdu**, a to prowadzi
  ekran `/wyjazdy`. Kafelki są napisane i zadziałają, gdy dane się pojawią — dziś się
  nie renderują, bo kafelek z wiecznym „—" pod etykietą „Przychód" sugerowałby brak
  danych, podczas gdy chodzi o inny rachunek.

- `[#382]` **Pusty ekran zwrotu VAT kłamał.** „Brak tankowań z kwotą" pojawiało się także
  wtedy, gdy tankowania z kwotą **były**, ale żadnej nie dało się przeliczyć na euro.
  Silnik liczył takie pozycje w `missingRate`, widok gubił ten licznik w gałęzi pustego
  stanu — przewoźnik czytał komunikat wprost nieprawdziwy i nie miał jak dojść,
  że wystarczy uzupełnić kursy. Znalezione przez nowy test, naprawione w kodzie,
  nie w asercji.

- `[#382]` **Trzy martwe klucze i18n** (`stats.tile.refuels`, `stats.tile.tripEvents`,
  `stats.tile.anomalies`) istniały w obu językach, ale nikt ich nie wołał — kafelki
  pojazdów, czyli pierwsza rzecz widoczna po wejściu w statystyki, zostawały po polsku.

- `[#382]` **`TripRaw` nie deklarował `odometer_km`** (kolumna `not null` od migracji 0001,
  `select("*")` i tak ją pobierał). Bez niej żaden wyjazd nie miałby licznika startu
  i końca, więc dystans i spalanie byłyby puste mimo kompletu danych w pamięci.

**Bramki:** biome ✓ · `tsc` 7/7 ✓ · testy core **549** · api 81 · maps 116 · **web 131** · mobile 36 · i18n 5 (razem **918**) ✓ · `next build` ✓.

**Znane ograniczenie do decyzji:** `route_extra_costs` ma węższe RLS niż reszta (migracja 0095 —
kierowca ich nie widzi). Kierowca z modułem statystyk dostanie z tej tabeli pusty zbiór
bez błędu, więc zobaczy koszt wyjazdu zaniżony o opłaty drogowe i nie będzie o tym wiedział.
To sprawa polityki RLS albo świadomego komunikatu per rola — celowo nie zostało zatuszowane.

## [1.228.0] — 🔒 Waluta wymuszona typem — filtry `currency === "EUR"` usunięte z rdzenia

Ostatni dług po serii walutowej. Po [1.222.0] i [1.223.0] wszyscy wywołujący podawali
już kwoty przeliczone, więc **sześć filtrów `currency === "EUR"` w `packages/core`
przestało cokolwiek robić** — ale zostawały pułapką: następna osoba dodająca wywołanie
znów po cichu zgubiłaby waluty, a nic by o tym nie powiedziało.

- `[#381]` **Pole `currency` usunięte z pięciu typów wejściowych** (`FleetPnlOrder`,
  `ProfitOrderEntry`, `Co2OrderEntry`, `OrderAnalyticsEntry`, `MonthlyOrderEntry`),
  a `price` przemianowane na **`priceEur`**. Zmiana jest z pozoru kosmetyczna, a robi
  rzecz zasadniczą: przeliczanie należy do warstwy, która zna kursy i datę zdarzenia,
  a silnik liczący ma dostać liczby porównywalne i tyle. **Nazwa niesie jednostkę**,
  więc pomyłka jest widoczna przy czytaniu, a nie dopiero w wyniku.

- `[#381]` **Kompilator znalazł dwa realne przeoczenia**, których nie wyłapał wcześniejszy
  przegląd: `orderAnalytics` i `co2ByClient` na `/stats` nadal dostawały **surowe** kwoty
  z walutą. Skutek: do „średniej stawki", „top nadawców" i udziału klienta w emisjach
  wchodziły wyłącznie zlecenia wystawione w euro. To jest dokładnie ten rodzaj błędu,
  przed którym miał chronić typ — i pierwszy, który złapał.

- `[#381]` **Sześć testów utrwalało usunięte zachowanie** i zostało przepisanych
  z wyjaśnieniem, dlaczego stare oczekiwanie było złe — żeby nikt nie cofnął tego
  jako „regresji". Najciekawszy z nich: w `monthlyFleetSummary` pojazd `v2` miał
  wcześniej wynik **−250**, bo jego przychód znikał przez filtr, a koszt paliwa
  zostawał. Po poprawce ma **+2750** i **wyskakuje na pierwsze miejsce rankingu** —
  wcześniej filtr spychał go na dół jako rzekomo stratny. Sama podmiana liczb
  by tego nie wychwyciła; trzeba było poprawić też asercję kolejności.

**Bramki:** biome ✓ · `tsc` 7/7 ✓ · testy core 536 · api 81 · maps 116 · web 101 · mobile 36 · i18n 5 ✓ · `next build` ✓.
**Kontrola:** `grep` na `currency === "EUR"` w `packages/core` i `apps` — zero trafień poza ekranem cen paliw, gdzie waluta jest **wyświetlana**, a nie używana do filtrowania.

## [1.227.0] — ⛽ Spalanie na telefonie kierowcy

Statystyki mobilne pokazywały kierowcy litry, koszt i wykres — ale **nie spalanie**,
czyli jedyną liczbę, którą realnie kontroluje w trasie. Musiał ją liczyć w głowie.
Kolumny `odometer_km` i `is_full` istniały w bazie od dawna; typ `FuelRow` ich nie
deklarował, więc dane leżały nieodczytane.

- `[#380]` **L/100 km, liczone od pełna do pełna** — tankowanie częściowe nie zamyka
  odcinka, więc wchodzi do litrów i kosztu, ale nie do spalania. Ekran mówi o tym wprost.

- `[#380]` **Średnia floty ważona kilometrami**, nie średnia ze średnich. Przy jednym aucie
  z 2 000 km i drugim z 20 000 km średnia arytmetyczna po autach dałaby liczbę, której nie
  przejechał żaden z nich. **Ten sam błąd poprawiony po stronie webowej** (`/stats`) —
  nie zostawiam go w kodzie tylko dlatego, że mieścił się w innym pliku.

- `[#380]` **AdBlue i rozbicie na pojazdy** — kierowca jeżdżący dwoma autami nie miał jak
  zobaczyć, które pali więcej.

- `[#380]` **Limit podniesiony ze 100 do 2000 wpisów** i **komunikat o obcięciu**. Przy dwóch
  tankowaniach dziennie trzydziestodniowe okno mieściło się w starym limicie ledwo,
  a obcięcie było ciche — kierowca dostawałby zaniżone litry bez żadnego sygnału.

**Weryfikacja na produkcji:** dane pozwalają policzyć tę liczbę — 20 tankowań, 13 do pełna,
21 718 km, 2 603 L, czyli około **12 L/100 km**. To **pierwsza funkcja Fazy 7, która pokaże
realne dane** — zwrot VAT i koszty operacyjne czekają na wpisy, których jeszcze nie ma.
Rozbicie na pojazdy się nie pojawi: flota ma dziś jedno auto z tankowaniami, a sekcja
renderuje się od dwóch.

**Bramki:** biome ✓ · `tsc` 7/7 ✓ · testy core 536 · api 81 · maps 116 · web 101 · mobile 36 · i18n 5 (parytet 4 języków) ✓. **Wymaga nowego builda EAS**, żeby trafiło do kierowców.

## [1.226.0] — 🅿️ Koszty operacyjne trasy w rachunku + sekcje zwijane

Domknięcie pętli, którą Faza 6 zostawiła otwartą: formularze pauzy, kosztów trasy
i kar zbierają dane od [#375], a **żaden ekran statystyk ich nie czytał**. To samo
dotyczyło kwot przy zdarzeniach Trip. Błąd był jednostronny i zawsze w tę samą stronę —
koszt floty pokazywany bez parkingów, myta, promów i mandatów, więc **zysk wychodził
systematycznie zawyżony**, a im więcej firma jeździła po płatnych drogach, tym bardziej.

- `[#380]` **Silnik kosztów operacyjnych** ([operatingCosts.ts](packages/core/src/operatingCosts.ts), 10 testów) —
  cztery źródła (pauzy, koszty trasy, kary, zdarzenia Trip) sprowadzone do jednego kształtu,
  przeliczone po kursie z dnia zdarzenia, pogrupowane po rodzaju i podrodzaju.
  Wchodzą do pozycji „Pozostałe koszty" w P&L.

- `[#380]` **Kara anulowana nadal ma kwotę w bazie.** Wliczenie jej to wydatek, którego
  nie było — więc wypada z kosztu, a licznik pokazuje, ile ich pominięto. **Kara
  kwestionowana to inna sprawa:** pieniądze mogą jeszcze wypłynąć, więc liczona jest
  osobno i poza sumą, zamiast rozstrzygać za użytkownika, czy ją zapłaci.

- `[#380]` **Sekcje zwijane** ([Collapsible](apps/web/components/Collapsible.tsx)) — punkt z listy.
  Świadomie na natywnym `<details>`, a nie na własnym stanie React: działa przed hydratacją,
  daje obsługę klawiatury i rolę dla czytników ekranu za darmo, a **wyszukiwanie w stronie
  (Ctrl+F) znajduje tekst w zwiniętej sekcji i sam ją rozwija**. Przy `display: none`
  użytkownik szukający numeru rejestracyjnego dostałby „brak wyników", mimo że dane
  są na ekranie. Podsumowanie zostaje w nagłówku, żeby zwinięcie nie kosztowało informacji.

**Stan danych — ważne zastrzeżenie.** Sekcja pokaże się dopiero, gdy pojawią się wpisy:
`pause_events`, `route_extra_costs`, `penalties` i `trip_events` mają dziś na produkcji
**po zero wierszy**. Formularze są świeże (Faza 6) i nikt ich jeszcze nie użył. Kod jest
gotowy i otestowany, ale na ekranie nie będzie nic widać do pierwszego zgłoszenia —
piszę to wprost, żeby brak sekcji nie został wzięty za usterkę.

**Bramki:** biome ✓ · `tsc` 7/7 ✓ · testy core **536** · api 81 · maps 116 · web 101 · mobile 36 · i18n 5 ✓ · `next build` ✓.

## [1.225.0] — 💧 AdBlue w statystykach + przełącznik waluty

Dwa kolejne punkty z listy Fazy 7. Pierwszy z nich zamyka najstarszą lukę tego ekranu:
`/stats` **pobierał AdBlue z bazy od dawna** i przekazywał go wyłącznie do karty pojazdu.
Kafelki, P&L i ranking rentowności udawały, że flota jeździ na samym oleju napędowym.

- `[#379]` **AdBlue wchodzi do rachunku.** Osobne kafelki (litry i wydatek), osobna pozycja
  w P&L i doliczenie do kosztu przy rentowności klientów oraz w rankingu pojazdów.
  Trzymany osobno do **pokazania**, ale wliczony do sumy: ukrycie go zawyżało zysk floty
  o pozycję, którą flota realnie płaci co miesiąc, a ranking faworyzował auta zużywające
  go najwięcej.

- `[#379]` **Jeden świadomy wyjątek: CO₂.** AdBlue to reagent do redukcji tlenków azotu,
  nie paliwo — doliczenie go do emisji ze spalania byłoby po prostu błędem. Kafelek nazywa
  się teraz „Ślad węglowy (CO₂, paliwo)", żeby wykluczenie było widoczne, a nie domyślne.

- `[#379]` **Noty, które kłamały po zmianie.** Klucze `profit.note` i `profit.approx` wprost
  obiecywały, że AdBlue **nie** jest liczony („koszt = paliwo", „pomija … AdBlue"). Po tej
  zmianie byłyby nieprawdą, więc zostały przepisane w obu językach. Nota mówi też teraz,
  że kwoty w innych walutach są przeliczane — dotąd twierdziła „tylko zlecenia w EUR",
  co przestało być prawdą w [1.222.0].

- `[#379]` **Przełącznik waluty prezentacji.** Ostatni nietknięty punkt walutowy z listy.
  Rachunek jest i zostaje w euro, po kursie z **dnia zdarzenia** — to wymóg księgowy.
  Przełącznik zmienia wyłącznie to, w czym pokazujemy gotowy wynik, po **najświeższym
  znanym kursie**, i **podaje jego datę wprost**: bez tego liczba wyglądałaby jak kwota
  historyczna, a jest odpowiedzią na pytanie „ile to jest dzisiaj".
  Szesnaście miejsc z zaszytym `€` zastąpionych jednym formaterem.

- `[#379]` **Gdy waluty nie da się przeliczyć, ekran zostaje przy euro** zamiast pokazać
  liczbę z symbolem waluty, w której jej nie przeliczono — i mówi o tym w pasku.
  Nieprzełączony widok jest lepszy niż wiarygodnie wyglądająca nieprawda.

**Bramki:** biome ✓ · `tsc` 7/7 ✓ · testy core 526 · api 81 · maps 116 · **web 101** · mobile 36 · i18n 5 ✓ · `next build` ✓. Ekran niezweryfikowany wizualnie — jest za logowaniem.

## [1.224.0] — 🧾 Zwrot VAT za paliwo — pierwszy raz widoczny

Trzy punkty z listy Fazy 7 (netto/VAT, stawki per kraj, wyliczenie zwrotu) stały na zerze,
mimo że **cały kod istniał od [#373] i miał testy** — tabela `vat_rates` z 28 krajami,
`pickVatRate`, `splitFromGross`, `refundableFuelVat`. Brakowało agregacji i ekranu,
więc przewoźnik nie miał gdzie zobaczyć kwoty, o którą może wystąpić. Przy kilkuset
tysiącach litrów rocznie idzie to w dziesiątki tysięcy euro.

- `[#379]` **Silnik zestawienia** ([vatRefund.ts](packages/core/src/vatRefund.ts), 10 testów) —
  grupuje tankowania per kraj i liczy VAT możliwy do odzyskania. **Kolejność działań jest
  księgowa, nie wygodna:** VAT liczony od kwoty w **walucie zapłaty** (bo taka widnieje
  na paragonie i taką stawką jest obciążona), a dopiero wynik przeliczany na euro.
  Odwrotna kolejność daje niemal to samo — ale „niemal" w dokumencie dla urzędu skarbowego
  jest złym słowem.

- `[#379]` **Trzy stany, których nie wolno zlewać w jeden.** To najgroźniejszy błąd w tym
  module i dlatego widać go na ekranie:
  - **kwota** — znamy stawkę i kraj zwraca;
  - **zero** — kraj jawnie nie zwraca VAT od paliwa (UK, Szwajcaria, Norwegia); to twierdzenie prawdziwe;
  - **„nie znamy stawki"** — brak danych. Pokazane jako zero **zaniżyłoby wniosek i nikt by się o tym nie dowiedział**, dlatego takie kraje są poza sumą i wymienione z nazwy.

- `[#379]` **Stawka z dnia tankowania, nie z dzisiaj.** Wniosek o zwrot dotyczy okresu
  historycznego i musi użyć stawki obowiązującej wtedy. Test pilnuje dokładnie tego przypadku.

- `[#379]` **Sekcja na `/stats`** ([VatRefundSection](apps/web/app/(app)/stats/VatRefundSection.tsx))
  — per kraj: liczba tankowań, litry, brutto, stawka, kwota do odzyskania, plus suma.
  Tylko dla zarządu: to podstawa wniosku do urzędu, a nie liczba, z którą kierowca ma co zrobić.
  Zestawienie obejmuje **wyłącznie olej napędowy** — flaga zwrotu w tabeli stawek dotyczy paliwa,
  więc AdBlue nie jest doliczany i jest to napisane wprost, zamiast cicho założone.

**Weryfikacja na produkcji:** wszystkie 9 krajów, w których ta flota tankuje
(BE, CZ, DE, ES, FR, GB, LU, PL, SE), ma stawki w tabeli, a **GB poprawnie oznaczone jako
niezwracające**. Sekcja pokaże jednak pustą listę, dopóki kierowcy nie zaczną wpisywać kwot —
`price_total` jest dziś NULL w 100% wpisów, bo pole kwoty dodano dopiero w [1.220.0] i wymaga
nowego builda EAS.

**Bramki:** biome ✓ · `tsc` 7/7 ✓ · testy core **526** · api 81 · maps 116 · web 97 · mobile 36 · i18n 5 ✓ · `next build` ✓. Ekran niezweryfikowany wizualnie — jest za logowaniem.

## [1.223.0] — 💱 Koniec z gubieniem walut na pozostałych ekranach + dokumentacja modelu danych

Dokończenie tego, co [1.222.0] zaczęło na `/stats`. Jedenaście filtrów `currency === "EUR"`
i kilka surowych sum na sześciu ekranach pokazywało liczby błędne w obie strony naraz:
złotówki doliczane jak euro (zawyżenie ~4,3×) i jednocześnie pozycje w obcej walucie
wyrzucane z sum bez śladu.

**Naprawione ekrany** — wszystkie przeliczają teraz przez `rowAmountEur` po kursie
z **dnia zdarzenia**:

- `[#378]` **Karta pojazdu** ([vehicles/[id]](apps/web/app/(app)/vehicles/[id]/page.tsx)) — trzy filtry i surowa suma paliwa w jednym widoku: przychód zaniżony, koszt zawyżony, więc auto wyglądało na niedochodowe, choć zarabiało. **Dodatkowo formularz w tym samym pliku zapisywał każdy koszt jako `currency: "EUR"` na sztywno** — koszt wpisany w złotówkach szedł do bazy jako euro. To było gorsze niż stan przed poprawką, bo taki wiersz jest formalnie poprawnym EUR i żaden licznik go nie łapał. Doszedł wybór waluty z podpowiedzią z kraju firmy.
- `[#378]` **Analityka** — sumowała surowe kwoty i formatowała je jako **złotówki** (`zl()`), gdy reszta aplikacji liczy w euro. Etykieta waluty kłamała niezależnie od liczby.
- `[#378]` **Zlecenia** — suma nad tabelą nie zawierała zleceń w innych walutach, choć tabela je pokazywała; wyglądało to na błąd arytmetyczny. Osobno: tankowanie bez kursu wchodziło do `orderCost` jako zero, **ale jego licznik nadal rozciągał dystans** — koszt/km wychodził kilkukrotnie za niski. Teraz taki wpis wypada z obu stron ułamka naraz, a karta zlecenia oznacza wynik jako szacunek (`≈`).
- `[#378]` **Karta kierowcy** — zaniżony przychód z tras rozliczanych w innej walucie, a to bywa podstawą rozmowy o premii.
- `[#378]` **Zestawienie miesięczne** — koszty pojazdu w obcych walutach wypadały; eksport CSV wpisywał do rejestru dla księgowości **0** zamiast oznaczenia „brak kursu". Ostrzeżenie o niepełnej sumie obejmuje teraz całe okno trendu, nie tylko wybrany miesiąc — inaczej Δ m/m pokazywała wzrost, którego nie było.
- `[#378]` **Pulpit** ([KpiStrip](apps/web/components/KpiStrip.tsx), [RevenueTrend](apps/web/components/RevenueTrend.tsx)) — po naprawie `/monthly` pulpit i zestawienie pokazywały dla tego samego miesiąca **dwie różne kwoty przychodu**. Dwie różne liczby na dwóch ekranach tej samej aplikacji są gorsze niż jedna zła.
- `[#378]` **Wyjazdy** — stawka €/km przeliczana kursem z dnia **wpisania stawki** zamiast z dnia wyjazdu; przy starszych stawkach kurs nie znajdował się w ogóle i przychód schodził do „—", a baner obiecywał nieistniejący fallback. Teraz kurs z daty wyjazdu, a fallback (starsza stawka → domyślna firmowa) jest zaimplementowany, nie obiecany.
- `[#378]` **Statystyki kierowcy (mobile)** — pokazywały datę synchronizacji przy kwocie przeliczonej po kursie z dnia tankowania, obok notki obiecującej „kurs z dnia tankowania". Kierowca sprawdzający liczbę w tabeli EBC nie miał jak trafić. To samo dotyczyło grupowania słupków wykresu.
- `[#378]` **Ranking kart i stacji** — pole `totalEur` sumowało mieszane waluty, a render wypisywał liczbę **bez symbolu waluty**. To podstawa decyzji „gdzie tankujemy taniej".

**Faktury — świadomie BEZ przeliczania.** Rejestr faktur prowadzi się w walucie wystawienia
i przeliczanie go na euro byłoby księgowo niepoprawne. Zamiast tego faktury w innych walutach
przestały być **po cichu** pomijane: mają teraz własny blok z rozbiciem
zafakturowane / opłacone / pozostaje, każda waluta w niej samej.

**Uczciwość komunikatów.** Kilka poprawek dotyczyło nie liczb, tylko tekstu, który obiecywał
coś, czego kod nie robił — a to gorsze niż brak komunikatu, bo buduje fałszywą pewność.
Na `/wyjazdy` baner twierdził, że pozycji bez kursu nie wliczamy jako zero, podczas gdy
`journeys.ts` robi dokładnie `?? 0`. Wyjazdy o zaniżonym koszcie są teraz **wykrywane**
(sentinel `NaN` przechodzi przez `??` i zaraża sumę tego jednego wyjazdu) i oznaczane
na karcie, zamiast pokazywać zawyżony zysk jako liczbę pewną.

- `[#378]` **Model danych opisany na nowo** ([DATA-MODEL.md](docs/DATA-MODEL.md)). Dokument deklarował „82 migracje, ostatnia 0080" przy 102 faktycznych — rozjazd o dwadzieścia migracji, w tym **wszystkie tabele Fazy 6 i 7**. Nowa sekcja 0.4 opisuje 21 nieudokumentowanych tabel (czat, formularze Fazy 6, dane referencyjne, kierowca w terenie, usunięcie konta), z kolumnami **odczytanymi z żywego schematu**, nie z plików migracji. Wyjaśnia też, dlaczego `account_deletions` **nie ma polityk RLS** — to zamierzone, nie przeoczenie.

**Bramki:** biome ✓ · `tsc` 7/7 ✓ · testy core 516 · api 81 · maps 116 · web 97 · mobile 36 · i18n 5 (parytet pl/en oraz pl/en/de/uk) ✓.

**Proces:** 19 agentów naprawiło ekrany i sprawdziło je nawzajem, 10 usterek wysokiej wagi
z weryfikacji zostało naprawionych w drugim przebiegu — **wszystkie potwierdzone jako realne**,
w tym trzy regresje wprowadzone przez same poprawki. Ekrany nadal **niezweryfikowane wizualnie** —
są za logowaniem.

**Zostaje:** filtry `currency !== "EUR"` w `packages/core` (`billing.ts:342`, `vehiclePnl.ts:75`,
`profitability.ts:64`, `co2.ts:88`, `orders.ts:48,57`) są po tej zmianie martwe — wszyscy
wywołujący podają już kwoty przeliczone. Usunięcie ich (i wymuszenie typem, że wejście jest
znormalizowane) to osobny krok, żeby nie mieszać go z naprawą liczb.

## [1.222.0] — 💱 Statystyki floty przestały sumować złotówki jak euro

Faza 7, etap 1–2 dla ekranu `/stats`. To nie jest nowa funkcja — to naprawa liczb,
które ten ekran pokazywał zarządowi jako prawdziwe.

- `[#378]` **Sedno błędu.** `stats/page.tsx` sumował koszt paliwa przez
  `a + Number(r.price_total ?? 0)` — **bez jednego sprawdzenia waluty**, mimo że
  zmienna nazywała się `fuelEur`. Tankowanie za 1200 PLN wchodziło do sumy jako
  1200 €, czyli **ponad czterokrotne zawyżenie**. Ta liczba szła prosto do kafelków
  „Wydatek", „Koszty razem", „Zysk netto" i „Marża". Równolegle **pięć filtrów
  `currency === "EUR"`** po cichu **wyrzucało** z sum zlecenia i koszty pojazdu
  w innych walutach. W jednej mapie `byVeh` obie pomyłki działały naraz: paliwo
  w złotówkach zawyżone, koszt pojazdu w złotówkach usunięty — a wynik trafiał
  do rentowności klientów.

- `[#378]` **Przeliczanie na granicy odczytu**, a nie w każdym miejscu sumowania
  ([shared.tsx](apps/web/app/(app)/stats/shared.tsx)). `entry()` oddaje kwotę już
  w euro, po kursie z **dnia zdarzenia** — dzięki temu `summarizeFuel`, kafelki,
  P&L, ranking pojazdów, wykres miesięczny i alerty prostują się jedną zmianą.
  `FuelRaw` dostał wreszcie `currency`, `price_net`, `vat_rate` i `fuel_card_id`:
  `select("*")` i tak je pobierał, więc **dane leżały w pamięci przeglądarki nieodczytane**.

- `[#378]` **Kursy jako parametr WYMAGANY.** Wersja z wartością domyślną `= []`
  kompilowała `.map(entry)` — i cicho przekazywała **indeks tablicy** jako kursy,
  wracając do sumowania bez przeliczeń. Tak było napisane w trzech miejscach;
  TypeScript zgłasza to dopiero, gdy parametru nie da się pominąć.

- `[#378]` **„Brak kwoty" ≠ „brak kursu".** Dotąd oba przypadki dawały to samo `null`
  i ten sam komunikat „uzupełnij kwotę" — instrukcja niewykonalna dla kogoś, kto
  kwotę wpisał, tylko w złotówkach. Nowy licznik `countMissingRate` i pasek nad
  kafelkami mówią wprost: suma jest niepełna, bo brakuje **notowania**, nie kwoty.

- `[#378]` **Fałszywe alerty.** Miesięczny koszt paliwa w alertach też sumował
  mieszane waluty, więc **jedno tankowanie w złotówkach samo z siebie** przekraczało
  próg 30% i generowało alert „skok kosztu paliwa m/m", którego nie dało się
  potwierdzić na wykresie obok.

- `[#378]` Etykieta „Przychód (zlecenia EUR)" → „Przychód (zlecenia)". Stara nazwa
  nie opisywała waluty wyniku, tylko fakt, że reszta wypadała.

- `[#378]` **9 testów** ([shared.test.ts](apps/web/app/(app)/stats/shared.test.ts)):
  430 PLN @ 4,30 = 100 €, kurs z dnia zdarzenia a nie synchronizacji, brak kursu →
  `undefined` zamiast zera lub kursu 1:1. Konfiguracja vitest obejmuje teraz `app/**/*.test.ts`
  — helpery mieszkające obok ekranu były wcześniej nietestowalne.

**Bramki:** biome ✓ · `tsc` 7/7 ✓ · testy core 516 · api 81 · maps 116 · **web 97** · mobile 36 · i18n 5 ✓ · `next build` ✓.
**Zakres:** ten wpis naprawia `/stats`. Te same błędy siedzą jeszcze w `/wyjazdy`, `/analytics`,
`/settlements`, `vehicles/[id]` i w mobile — razem **11 filtrów `currency === "EUR"`** i kilka
surowych sum. Nie zostały tknięte i nadal pokazują liczby sprzed tej poprawki.

## [1.221.0] — 🧱 Fundament pod statystyki: kursy wstecz, waluta w Trip, odblokowane kolumny

Faza 7, etap 0. Przed dokładaniem nowych liczb — naprawa tego, na czym mają stanąć.
Mapowanie podsystemu statystyk (sześć ekranów, **cztery niezależne silniki liczące**)
pokazało, że większość Fazy 7 jest już napisana i otestowana, tylko nikt jej nie woła,
a fundament pod nią ma dziury, przez które nowe liczby byłyby gorsze od dzisiejszych.

- `[#378]` **Historia kursów EBC — kluczowy brak.** Cron pobierał wyłącznie kurs z bieżącego
  dnia, więc w bazie były notowania z **jednego dnia**. Przeliczenia liczą po kursie z DNIA
  ZDARZENIA (wymóg księgowy), a to znaczy, że każde tankowanie sprzed tego dnia w walucie
  innej niż euro po prostu **wypadało z sumy**. Wgrane notowania od stycznia 2026 (1 672 kursy,
  11 walut) — sprawdzone: tankowanie z 15 lipca dostaje kurs z 15 lipca, a niedzielne cofa się
  do piątku, dokładnie jak wymaga tego rozliczenie.

- `[#378]` **Powtarzalny import historii** ([scripts/fx-backfill.mjs](scripts/fx-backfill.mjs), `pnpm fx:backfill`).
  Skrypt operatora, nie trasa serverless: plik historyczny EBC ma ~8 MB i nie przejdzie
  w limicie czasu funkcji. Idempotentny, nie nadpisuje notowań crona. Świeże wdrożenie
  nie startuje już z pustą historią. **EBC nie publikuje RSD, UAH, BAM ani MKD** — tankowania
  w Serbii i na Ukrainie nie przeliczą się z żadnego źródła i trzeba to mówić wprost.

- `[#378]` **`listFxRates` ucinało najstarsze kursy** ([referenceRates.ts](packages/api/src/data/referenceRates.ts)).
  Zapytanie sortuje malejąco po dacie i **nie miało limitu**, więc domyślny pułap PostgREST
  obcinał notowania od najstarszej strony — czyli dokładnie te, których potrzebuje starszy
  koniec okna. Objaw podstępny: nowsze miesiące liczą się normalnie, starsze cicho tracą kwoty.

- `[#378]` **`trip_events` nie miało waluty** (migracja [0100](supabase/migrations/0100_stats_currency_foundations.sql)).
  Kolumna `amount` istnieje od dawna i trzyma koszt serwisu czy myta, ale migracja 0093 dodała
  `currency` tylko do paliwa i AdBlue. Wymaganie „zdarzenia Trip w statystykach" oznaczałoby
  więc powtórzenie tego samego błędu: **1200 PLN policzone jako 1200 €**.

- `[#378]` **`fuel_card_id` był zapisywany, ale nieodczytywalny.** Pauzy i koszty trasy zapisują,
  którą kartą zapłacono — a kolumny nie było w SELECT-ach ([formsPhase6.ts](packages/api/src/data/formsPhase6.ts)).
  Informacja fizycznie nie dawała się pobrać.

- `[#378]` **Waluty bez walidacji formatu.** `vehicle_costs.currency` i `orders.currency` nie miały
  CHECK-a na ISO 4217 — „zł" albo „PLN " ze spacją przechodziło, a potem nie dopasowało się
  do żadnego kursu. Wartości uporządkowane, bramka założona. Doszły indeksy `(company_id,
  station_country, occurred_at)` pod zwrot VAT, który liczy się per kraj tankowania.

- `[#378]` **Typy bazy kłamały o kierowcy.** `driver_id` jest nullable od migracji 0090 (usunięcie
  konta anonimizuje wpisy zamiast je kasować), a [database.types.ts](packages/api/src/database.types.ts)
  deklarował `string`. Statystyki per kierowca dostawały `null`, którego typ nie przewidywał —
  TypeScript milczał. Pełna regeneracja (`pnpm gen:types`) wymaga dostępu do bazy; ta łatka jej nie zastępuje.

- `[#378]` **Naprawa własnego niedopatrzenia:** test parzystości map krajów TS↔SQL czytał plik
  migracji z `packages/core`, który **świadomie nie ma typów Node** (dzieli go z Hermesem, gdzie
  `node:fs` nie istnieje). `tsc` rdzenia był czerwony od poprzedniego wydania, bo mój przebieg
  bramek objął wtedy web i mobile, ale nie core. Test przeniesiony do `packages/api`.

**Bramki:** biome ✓ (0 ostrzeżeń) · `tsc` **7/7 pakietów** ✓ · testy core 516 · api 81 · maps 116 · web 88 · mobile 36 · i18n 5 ✓ · migracja 0100 zastosowana i zweryfikowana na produkcji (3 CHECK-i + 2 indeksy) ✓.

## [1.220.0] — 💸 Kierowca może wreszcie wpisać kwotę tankowania

Przygotowanie do Fazy 7, znalezione przy sprawdzaniu, na czym właściwie mają
stanąć statystyki pieniężne. Odpowiedź brzmiała: na niczym.

- `[#377]` **Formularz kierowcy nie miał pola kwoty.** Nie „miał zepsute" — nie miał
  go wcale ([mobile/components/LiquidForm.tsx](apps/mobile/components/LiquidForm.tsx)).
  Kierowca podawał litry, licznik, kraj i metodę płatności, ale nigdzie sumy z paragonu.
  Skutek widać w bazie: `price_total` jest **NULL w 100% wpisów** (0 z 20 tankowań
  i 0 z 19 wpisów AdBlue). Kwotę ma tylko formularz webowy, czyli ten, którego nie
  otwiera osoba stojąca przy dystrybutorze. Cała pieniężna połowa Fazy 7 —
  netto/brutto/VAT, zwrot podatku, koszt na kilometr — liczyłaby z pustego zbioru.

- `[#377]` **Skan paragonu wyrzucał to, co sam odczytał.** [`parseReceiptText`](packages/core/src/receipt.ts)
  zwraca `{ amount, currency, liters }` od czasu #298, a formularz brał z tego
  **wyłącznie litry**. Dokładnie te dwie wartości, których brakowało, leżały już
  odczytane i były kasowane. Teraz uzupełniają puste pola — skan ma pomagać,
  a nie nadpisywać to, co kierowca zdążył wpisać z ręki.

- `[#377]` **Waluta podpowiadana z kraju** (`currencyForCountry`, pierwsze produkcyjne
  użycie [`fx.ts`](packages/core/src/fx.ts)) — ale **nigdy nie nadpisuje ręcznego wyboru**:
  tankowanie w Czechach bywa rozliczane kartą w euro i kierowca musi móc to powiedzieć.

- `[#377]` Kwota pozostaje **opcjonalna** — brak paragonu to nie powód, żeby zablokować
  zapis tankowania. Ale gdy jest, leci razem z walutą: liczba bez waluty jest
  nieporównywalna z czymkolwiek innym w zestawieniu.

**Bramki:** biome ✓ · `tsc` mobile 0 ✓ · testy core 520 · api 77 · maps 116 · web 88 · mobile 36 · i18n 5 (parytet 4 języków: pl/en/de/uk) ✓. **Wymaga nowego builda EAS**, żeby trafiło do kierowców.

## [1.219.0] — 📊 Arkusze: eksport z prawdziwymi liczbami i import tankowań z pliku

Domknięcie Fazy 6. Eksport historii formularzy przestał być zrzutem tekstu,
a zestawienia z kart paliwowych da się wgrać zamiast przepisywać.

- `[#375]` **Eksport z kolumnami liczbowymi** ([historia](apps/web/app/(app)/forms/history/page.tsx)). Dotąd arkusz dostawał sklejoną komórkę „WX1234 · 620 L · 812345 km" — do oglądania, nie do liczenia. Teraz przebieg, litry, brutto, waluta, netto i stawka VAT idą **osobnymi kolumnami i jako liczby**, bo tekst „620" w Excelu się nie sumuje, a sumowanie jest jedynym powodem, dla którego ktoś ten arkusz pobiera. Doszedł przycisk **⬇️ Excel** obok CSV (`exceljs` doładowywany dynamicznie, poza bundlem); oba formaty biorą dane z jednego źródła, żeby nie rozjechały się przy pierwszej dołożonej kolumnie.

- `[#375]` **Import tankowań i AdBlue z CSV/Excel** (nowa strona [`/forms/import`](apps/web/app/(app)/forms/import/page.tsx)). Miesięczne zestawienie od operatora karty to dwieście pozycji — kilka godzin przepisywania i tyle samo okazji do pomyłki, a bez tych wpisów nie ma ani zwrotu VAT, ani spalania. Nagłówki dopasowujemy po nazwach (polskich, angielskich i niemieckich), rejestrację po zapisie bez spacji i myślników („WX 1234" = „wx-1234").

- `[#375]` **Czego import świadomie NIE robi:**
  - **Nie zgaduje stanu licznika.** Wiersz bez przebiegu jest odrzucany, a nie zapisywany z zerem — zero zafałszowałoby spalanie każdego kolejnego tankowania tego auta, bo silnik liczy różnice przebiegów.
  - **Nie podstawia dzisiejszej daty**, gdy data w pliku jest nieczytelna, i odrzuca daty, które nie istnieją w kalendarzu (`31.02` pasuje do wzorca, a `new Date` przesunęłoby to na marzec i wpis wpadłby do złego miesiąca).
  - **Nie dubluje.** Duplikaty rozpoznajemy **przed** zapisem po trójce pojazd + moment + litry i pokazujemy w podglądzie — wgranie tego samego zestawienia dwa razy to najbardziej prawdopodobny błąd, a każdy import generuje nowe UUID-y, więc idempotencja po kluczu tu nie działa. Kwota celowo nie wchodzi do klucza: ta sama transakcja bywa na zestawieniu raz w walucie stacji, a raz przeliczona.

- `[#375]` **Odczyt komórek** ([`sheetImport.ts`](packages/core/src/sheetImport.ts), 14 testów) — data w czterech formatach, liczba z polskiego (`1 234,56`) i angielskiego Excela (`1,234.56`) oraz z doklejoną jednostką (`48,30 L`). Cicha pomyłka w odczycie liczby to nie literówka, tylko zła kwota w rozliczeniu, więc ta logika ma testy, a nie tylko komentarz.

- `[#375]` **Logika wiersza wyjęta ze strony** ([`fuelImport.ts`](apps/web/lib/fuelImport.ts), 10 testów). Nie kosmetyka: pierwsza wersja odrzucała **każdy** wiersz, bo schemat wymaga wskazania karty przy płatności kartą, a import ustawiał kartę jako metodę i żadnej nie podawał. Test złapał to od razu; w przeglądarce wyszłoby dopiero po wgraniu pliku. Kartę wybiera się teraz raz dla całego pliku.

**Bramki:** biome ✓ · `tsc` core/maps/api/web/mobile 0 ✓ · testy core 520 · api 77 · maps 116 · web 88 · mobile 36 · i18n 5 ✓ · `next build` ✓ (trasa `/forms/import` w wykazie). **Niezweryfikowane wizualnie** — nowe ekrany są za logowaniem, a kont testowych nie zakładam.

## [1.218.0] — 🌍 Kraj jako kod ISO — koniec z „10115 Berlin" w polu kraju

Ostatni z błędów zgłoszonych do formularzy. Pole „Kraj" przyjmowało dowolny
tekst, więc zepsuty geokoder ([#372]) wstawiał tam kod pocztowy z miejscowością.
Brzydki wpis to była najmniejsza szkoda: **stawka VAT i zwrot podatku są
kluczowane po kraju tankowania**, a „10115 Berlin" nie pasuje do żadnej stawki —
kwota wypadała z rozliczenia bez jednego komunikatu.

- `[#375]` **Walidacja i normalizacja** ([`countries.ts`](packages/core/src/countries.ts)): 43 kody ISO 3166-1 alpha-2 plus 99 aliasów, które ludzie realnie wpisują — „Niemcy", „Germany", „Deutschland", „DEU", a także nieoficjalne „UK" mapowane na `GB`. [`geoLocationSchema`](packages/core/src/schemas.ts) sprowadza wpis do kodu przy zapisie i **odrzuca to, czego nie da się rozpoznać**.

- `[#375]` **Bramka w bazie** (migracja [0099](supabase/migrations/0099_country_normalization.sql)). Sama walidacja Zod nie wystarcza: buildy mobile leżące w sklepach nie mają nowego schematu i nadal wysyłają wolny tekst. Trigger `normalize_country` stoi na sześciu tabelach z formularzami i **normalizuje, a nie odrzuca** — kierowca przy dystrybutorze nie może stracić dokumentacji tankowania przez literówkę w nazwie kraju.

- `[#375]` **Dane historyczne posprzątane.** W bazie były cztery takie wiersze: `LUX` → `LU`, dwa razy `69-100 Słubice` → `PL`, `8630 Veurne` → `BE`. Po migracji **każda wartość w kolumnie kraju to poprawny kod ISO**.

- `[#375]` **Interfejs.** Web dostał [`CountryInput`](apps/web/components/CountryInput.tsx) — `input` z `datalist`, bo kierowca znający kod wpisze „DE" szybciej, niż znajdzie Niemcy na liście czterdziestu pozycji, a nieznający dostaje nazwy. Mobile dostał [`CountryField`](apps/mobile/components/CountryField.tsx): skróty do jedenastu najczęstszych kierunków i **natychmiastowe potwierdzenie rozpoznania** (`✓ DE`) albo ostrzeżenie. Do tej pory kierowca nie miał żadnego sygnału, że w polu „Kraj" wylądowało coś, czego rozliczenie nie zrozumie.

- `[#375]` **Test parzystości TS ↔ SQL** ([`countries.sql.test.ts`](packages/core/src/countries.sql.test.ts)). Ta sama mapa żyje w dwóch miejscach i musi tak zostać — dopisanie aliasu tylko po jednej stronie zapala się w testach, a nie po miesiącu w rozliczeniu VAT.

**Bramki:** biome ✓ · `tsc` core/maps/api/web/mobile 0 ✓ · testy core 506 · api 77 · maps 116 · web 78 · mobile 36 · i18n 5 ✓ · trigger zweryfikowany na żywej bazie z roli `authenticated` (`Niemcy` → `DE`, `united kingdom` → `GB`, `10115 Berlin` → zapis przechodzi bez zmiany, `NULL` → bez błędu) ✓.

## [1.217.0] — 📋 Formularze: trzy nowe zgłoszenia, usuwanie w historii, naprawa przeładunku

Faza 6. Zmiany oparte wprost na Twojej liście: pauza, dodatkowe koszty trasy,
kary, usuwanie wpisów, ekspres i parking strzeżony.

- `[#375]` **Trzy nowe formularze** (migracja [0095](supabase/migrations/0095_forms_phase6.sql) + [warstwa danych](packages/api/src/data/formsPhase6.ts)):
  - **Pauza / postój** — wypełnia kierowca: gdzie stoi, przy jakim przebiegu, czy parking był płatny i strzeżony, jaką metodą zapłacono. Kwota jest **opcjonalna, nie zerowa** — zero znaczyłoby „parking za darmo", a brak wpisu znaczy „nie podano".
  - **Dodatkowe koszty trasy** — hotele, bramki, autostrady, promy, tunele, pociągi, winiety. Wypełnia zarząd po zakończeniu trasy, z opcjonalnym powiązaniem ze zleceniem, co pozwoli policzyć pełny koszt trasy w Fazie 7.
  - **Kary i mandaty** — osobna tabela mimo bardzo podobnej struktury: kara ma inny obieg (kwestionowanie, termin płatności, przypisanie winy) i w jednym worku z opłatami drogowymi zaśmiecałaby raporty. **Kierowca widzi karę, która jego dotyczy**, ale nie może jej dodać ani zmienić — inaczej dowiadywałby się o mandacie dopiero z potrącenia w wypłacie.
  - Metody płatności to `text` + `CHECK`, nie rozszerzenie wspólnego enuma `payment_method`: ten enum używają tankowania i buildy obecne w sklepach, więc dodanie do niego `snap` czy `travis` zmusiłoby je do obsługi wartości, o których nie wiedzą.

- `[#375]` **Usuwanie wpisów z historii.** Dotąd kasować dało się wyłącznie pozycje czekające w kolejce offline — zsynchronizowany wpis zostawał na zawsze, a kierowca mógł go tylko edytować, zostawiając w bazie zdarzenie, które nigdy nie miało miejsca. Funkcje sprawdzają `count`, nie tylko `error`: przy braku uprawnień RLS nie zwraca błędu, więc interfejs pokazałby „usunięto", a wpis by został.

- `[#375]` **Przeładunek dał się wreszcie zapisać z panelu.** Formularz Trip **oferował** tę akcję w liście, ale nie miał pól `fromVehicleReg`/`toVehicleReg`, których schemat wymaga jako obowiązkowych — wybór kończył się błędem walidacji pól, których w interfejsie nie ma. Ślepa uliczka od momentu dodania akcji.

- `[#375]` **Ekspres i parking strzeżony** przy załadunku/rozładunku — schemat, maper, kolumny i checkboxy.

**Bramki:** biome ✓ · `tsc` core/maps/api/web/mobile 0 ✓ · testy core 489 · api 77 · web 78 · i18n 5 ✓ · `next build` ✓.

- `[#376]` 🧾 **Wpis odtworzony w `[#427]` z treści commitów** — oryginał nigdy nie powstał,
  a lukę wykryła dopiero nowa bramka ciągłości numeracji. Trzy commity z 2026‑08‑09
  (`aff3cb7`, `9ad6a7d`, `d0dbf1a`), wszystkie z rundy przeglądowej:

  **Znikanie wiadomości na kanale ogólnym — fałszywy sukces.** Panel czytał ustawienie
  z aktywnego WĄTKU, a kanał ogólny wątku nie ma, więc zawsze pokazywał „wyłączone".
  Gorzej: ustawienie kanału ogólnego zapisuje się w `companies`, gdzie polityka dopuszcza
  wyłącznie właściciela — RLS nie zwraca błędu, żaden wiersz nie pasuje, PostgREST
  odpowiada 204 i `error` jest `null`. Dyspozytor wychodził przekonany, że włączył
  znikanie wiadomości całej firmy. Teraz rozstrzyga `count`.

  **Reakcje na żywo.** `message_reactions` trafiła do publikacji realtime w migracji 0094,
  ale żaden klient jej nie subskrybował — publikacja bez subskrypcji nie robi nic.

  **Przekazywanie zdjęć — dwa złe skutki naraz.** Polityka Storage bramkuje dostęp po wątku
  zapisanym w nazwie pliku, a przekazanie zachowywało ścieżkę źródłową: odbiorca widział
  wieczne „ładowanie" (błąd połykany pustym `catch`), a zdjęcie przekazane z kanału ogólnego
  do rozmowy prywatnej **zostawało czytelne dla całej firmy**. Załącznik jest teraz kopiowany
  tokenem użytkownika, więc skopiować da się tylko to, co wywołujący i tak może odczytać.

  **Cron czatu był całkowicie niesprawny.** `in()` buduje się jako parametr URL — 5000 UUID
  dawało adres ~195 KB i bramę odpowiadającą 414. Cron wywracał się przy każdym przebiegu
  i nic nigdy nie zostało usunięte, odwrotnie niż obiecywał nagłówek pliku. Do tego
  `storage.remove` wykonywało się PRZED `delete`, więc zdjęcia znikały, a wiersze zostawały.

  **Waluta była zapisywana, ale nigdzie nie przeliczana.** Żaden odczyt nie patrzył na
  kolumnę `currency` — 1200 PLN wchodziło do sumy jako 1200 EUR zamiast ~279 EUR, a moduł
  `fx.ts` nie miał ani jednego wywołania produkcyjnego. Sprawdzone przed naprawą: w bazie
  było 0 wierszy nie-EUR, więc żadne dane nie zostały zepsute.

## [1.216.0] — 💬 Czat: model wiadomości + załatana dziura cross-tenant

Faza 2, etap 1. Dziewięć funkcji czatu z backlogu (usuń, edytuj, cytuj, przekaż,
reakcje, znikanie per wiadomość i per kanał, lokalizacja) opiera się na tym samym:
tabela `messages` miała **wyłącznie** polityki SELECT i INSERT, żadnych kolumn stanu,
a realtime obsługiwał tylko INSERT. Stąd jedna migracja fundamentowa zamiast siedmiu.

- `[#374]` 🔒 **Wątek dawało się przenieść do innej firmy.** `chat_threads_update` miało `USING` **bez `WITH CHECK`** — Postgres stosuje wtedy wyrażenie `USING` także do NOWEGO wiersza, a warunek `created_by = auth.uid()` jest spełniony niezależnie od tego, co stanie się z `company_id`.
  - Skutek nie był teoretyczny: polityka Storage z migracji [0088](supabase/migrations/0088_chat_photos_acl.sql) kluczuje dostęp do zdjęć czatu po `thread_company(thread_id)`. Przepisanie wątku do firmy X dawało właścicielowi X **wgląd w zdjęcia z cudzych rozmów**. Pozwalało też wstrzyknąć obcy wątek na listę kanałów innej firmy — wektor podszycia.
  - Naprawione dwutorowo: `WITH CHECK` na polityce **oraz** wyzwalacz blokujący zmianę `company_id`/`created_by`. Wyzwalacz działa też tam, gdzie RLS jest omijane (`service_role`, migracje) — zweryfikowane na produkcji: próba przeniesienia zostaje odrzucona.
  - Dziś twórcą wątku jest zawsze zarząd, więc skutek był ograniczony. Po dopuszczeniu kierowców do zakładania wątków (Faza 3) stałby się realny — dlatego łatamy **zanim**, a nie potem.

- `[#374]` **Model wiadomości** (migracja [0094](supabase/migrations/0094_chat_message_model.sql)): `deleted_at`, `edited_at`, `expires_at`, `reply_to_id`, `kind`, `meta` + tabela `message_reactions`.
  - **Usuwanie jest miękkie.** Twarde `DELETE` byłoby gorsze dla użytkownika: klient, który był offline, nigdy nie zobaczy zdarzenia DELETE i zostanie z wiadomością na ekranie. Przy `deleted_at` dostaje zwykły UPDATE i usuwa ją u siebie.
  - Tożsamość wiadomości (`company_id`, `thread_id`, `sender_id`, `created_at`) jest niezmienna — wyzwalacz blokuje przepisanie własnej wiadomości do cudzego wątku przez UPDATE. `edited_at` ustawia **baza**, więc klient nie może udawać, że treści nie zmieniano.
  - Realtime objął UPDATE (`replica identity full`), a `message_reactions` doszło do publikacji. Bez tego edycja, usunięcie i reakcja byłyby widoczne dopiero po odświeżeniu.

- `[#374]` **Znikanie wiadomości — i uczciwość co do tego, czym ono jest.** TTL ustawiany per kanał (zarząd) albo per wiadomość (nadawca); termin wylicza **baza**, bo zegar urządzenia bywa przestawiony.
  - RLS potrafi wiadomość **ukryć, ale nigdy jej nie usuwa**. Sam filtr zostawiałby treść w tabeli, w kopiach zapasowych i w replikacji. Dlatego doszedł [cron czyszczący](apps/web/app/api/cron/chat-purge/route.ts), który kasuje wiersze i pliki ze Storage — ukrycie zamienia się w faktyczne usunięcie.
  - Czego cron **nie** naprawia i o czym trzeba mówić wprost: treść wysłana pushem dotarła już na ekran blokady telefonu, klienci online mają ją w pamięci do odświeżenia, a podpisany URL zdjęcia wystawiony wcześniej działa jeszcze przez godzinę. Znikanie jest domyślnie **wyłączone**.

**Bramki:** biome ✓ · `tsc` core/maps/api/web/mobile 0 ✓ · testy core 452 · maps 116 · api 77 · web 78 · mobile 36 · i18n 5 ✓ · `next build` ✓ · migracja 0094 na produkcji, blokada przeniesienia wątku zweryfikowana na żywym wierszu ✓.

### Etap 2 — interfejs (web)

- `[#374]` **Menu kontekstowe dymka** — nowy [MessageBubble](apps/web/app/(app)/chat/MessageBubble.tsx) z edycją, usuwaniem, kopiowaniem, cytowaniem, przekazywaniem i reakcjami. Wydzielony z `chat/page.tsx`, który miał już 594 linie.
- `[#374]` **Reguły uprawnień w `core`** ([chatMessage.ts](packages/core/src/chatMessage.ts), 20 testów) — web i mobile renderują dymek osobno, a bez wspólnego źródła prawdy rozjechałyby się w tym, kto co może. Rozjazd byłby cichy: interfejs pokazałby akcję, a baza odrzuciłaby ją dopiero po kliknięciu.
  - **Edycja tylko dla autora i tylko przez 15 minut.** Czat w firmie transportowej bywa dowodem, kto wydał polecenie kierowcy — możliwość poprawienia treści sprzed tygodnia, już po zdarzeniu drogowym, podważałaby wartość całej historii.
  - **Właściciel może usunąć cudzą wiadomość, ale nie może jej zmienić.** Moderacja to co innego niż prawo do przepisywania cudzych słów.
  - Usuwanie bez limitu czasu dla autora — pomyłkowo wysłanego zdjęcia musi dać się cofnąć także po kwadransie.
- `[#374]` **Usunięta wiadomość zostaje jako ślad** („Wiadomość usunięta") zamiast znikać bez śladu — inaczej rozmowa traci sens, bo odpowiedzi wiszą w próżni.
- `[#374]` **Usuwanie kanału — odkopany martwy kod.** Funkcja `deleteThread` i polityka RLS istniały od migracji 0067, ale **żaden interfejs ich nie wywoływał** przez trzy wydania.
- `[#374]` Ustawienia znikania dla kanału w panelu zarządu, z ostrzeżeniem wprost w interfejsie, że treść wysłana pushem została już dostarczona na telefon i tam zostaje.

### Etap 3 — interfejs mobilny

- `[#374]` **Kierowca dostał te same akcje co panel** ([chat-thread.tsx](apps/mobile/app/chat-thread.tsx)): długie przytrzymanie dymka otwiera arkusz z odpowiedzią, kopiowaniem, edycją, usunięciem i sześcioma szybkimi reakcjami. Modal zamiast menu przy dymku — na telefonie palec zasłaniałby własne menu.
- `[#374]` Cytowanie działa **przez kolejkę offline**: `ChatOutboxInput` niesie `replyToId` jako pole opcjonalne, więc wpisy zakolejkowane starym buildem przechodzą bez zmian.
- `[#374]` Reakcje i realtime `UPDATE` tak samo jak na webie — reakcje jednym zapytaniem na widok, nie per dymek (przy dłuższej rozmowie i słabym zasięgu to różnica między jednym a setkami żądań).
- `[#374]` Tryb edycji korzysta ze **zwykłego pola wpisywania** zamiast osobnego okna — kierowca poprawia treść tam, gdzie zawsze pisze; pasek nad polem mówi, w którym trybie jest.
- 17 kluczy i18n × 4 języki. Przy okazji `tsc` wyłapał zduplikowane klucze (`m.chat.cancel`, `m.chat.save`), których test parytetu nie widzi — sprawdza zgodność **między** językami, nie unikalność w obrębie jednego.

> ⚠️ **Wymaga nowego buildu EAS.** Kopiowanie do schowka używa `expo-clipboard` — to moduł natywny, więc buildy już obecne w TestFlight i Google Play go nie mają. Sama aktualizacja JS nie wystarczy.

### Etap 4 — lokalizacja i emoji (domknięcie Fazy 2)

- `[#374]` **Wysłanie lokalizacji jako wiadomości** — przycisk 📍 w obu aplikacjach, pinezka w dymku, dotknięcie otwiera natywną mapę (`geo:` na telefonie, OpenStreetMap w przeglądarce). Świadomie **jednorazowy zrzut pozycji**, nie śledzenie na żywo: udostępnianie ciągłe to inna kategoria danych i zgód, i mieszka w osobnym przełączniku w Ustawieniach.
  - `readChatLocation` czyta `meta` (kolumna `jsonb`) obronnie i sprawdza zakres współrzędnych — pojedynczy uszkodzony wpis nie może wywalić całej listy rozmowy ani narysować pinezki w miejscu, którego nie ma na Ziemi.
  - Na mobile **celowo poza kolejką offline**: pozycja sprzed godzin jest bezwartościowa albo myląca („jestem tutaj" o miejscu, w którym kierowcy dawno nie ma).
- `[#374]` **Picker emoji** — ~140 znaków w sześciu kategoriach dobranych pod rozmowę w transporcie (miny, gesty, transport, ładunek, pogoda, czas). Rozwijany na żądanie z paska sześciu szybkich reakcji; siatka ma własne przewijanie, żeby nie przykryć rozmowy.
  - **Nie jest to pełna tablica Unicode** i to świadoma decyzja: pełny picker wymagałby pakietu danych z nazwami w czterech językach — kilkaset kilobajtów w buildzie mobilnym po to, żeby dało się wysłać flagę Wysp Owczych.
  - Test pilnuje, że każdy znak mieści się w limicie `CHECK` z bazy (16 znaków — emoji złożone bywają dłuższe) i że szybkie reakcje są podzbiorem pełnego zestawu.

## [1.215.0] — 💶 Fundament finansowy: data zdarzenia, waluty, kursy EBC, VAT per kraj

Faza 1 z przeglądu backlogu. Osiem pozycji ze statystyk było **niewykonalnych**,
dopóki tankowania nie miały waluty ani rozbicia kwoty, a jedenaście miejsc w kodzie
cicho odrzucało wszystko, co nie jest EUR — koszt w PLN po prostu znikał z sumy.

- `[#373]` **Data zdarzenia ≠ data zapisu** (migracja [0093](supabase/migrations/0093_occurred_at_and_amounts.sql)). Datą tankowania było `created_at` z `default now()`, a kolejka offline trzymała `createdAt` lokalnie i **nigdy go nie wysyłała**. Wpis zrobiony w terenie bez zasięgu i zsynchronizowany trzy dni później dostawał datę synchronizacji, wpadał do złego miesiąca i cicho psuł zestawienie.
  - Nowe `occurred_at` na `fuel_logs`/`adblue_logs`/`trip_events`, z backfillem z `created_at` — po migracji żadna liczba się nie zmieniła, i o to chodziło.
  - Oba outboxy (web i mobile) dopinają teraz datę **zakolejkowania**; jawna data z formularza ma pierwszeństwo.
  - Zakres i sortowanie w `listFuelLogs`/`listTripEvents` idą po `occurred_at`; raporty (zestawienie, analityka, statystyki, rozliczenia, wyjazdy, karta pojazdu) grupują po dacie zdarzenia.
  - Formularz webowy dostał pole daty i godziny. Stare buildy mobile nie znają tego pola — kolumna ma `default now()`, a maper **nie wysyła klucza**, gdy data nie została podana, żeby nie nadpisać wartości domyślnej.

- `[#373]` **Waluta i rozbicie kwoty** (tamże). `price_total` był jedyną kwotą w systemie — bez waluty, bez netto, bez VAT. Doszły `currency`, `price_net`, `vat_rate`, `vat_amount`; `price_total` **zostaje** jako brutto, bo zmiana nazwy dotknęłaby ponad trzydziestu miejsc w kodzie i wszystkich buildów w sklepach.
  - `resolveAmounts` w [vatRates.ts](packages/core/src/vatRates.ts) realizuje zasadę „podaj dwa, policz resztę". Samo brutto **nie dorabia** stawki — domyślne 23% dałoby liczbę wyglądającą jak wpisana przez człowieka, która weszłaby do rozliczeń i wniosku o zwrot VAT.
  - Formularz podpowiada walutę kraju stacji (kierowca w Polsce płaci złotówkami), ale nie nadpisuje ręcznego wyboru.

- `[#373]` **Kursy walut z EBC** (migracja [0092](supabase/migrations/0092_fx_and_vat_rates.sql) + [fx.ts](packages/core/src/fx.ts) + [cron](apps/web/app/api/cron/fx/route.ts)). Jedyne kursy w repo to dotąd hardcode dla myta i kursy pobierane w `/api/fuel-eu`, nigdzie niezapisywane.
  - **Kierunek kursu jest jawny i testowany wprost**: `units_per_eur` = ile jednostek waluty za 1 EUR, dokładnie jak publikuje EBC. Brak inwersji przy imporcie jest celowy — odwrócony kurs to błąd, którego nikt nie zauważy, dopóki nie policzy zwrotu VAT. Sprawdzone na realnej liczbie: 1000 PLN = 232,65 EUR.
  - Przeliczanie po kursie z **dnia zdarzenia**, nie dzisiejszym. Kurs z przyszłości odrzucany; w weekend (EBC nie publikuje) sięgamy po ostatni znany.
  - **Brak kursu to `null`, nigdy zero.** `sumInCurrency` zwraca listę pominiętych pozycji, żeby ekran mógł powiedzieć „suma niepełna" zamiast pokazać zaniżoną liczbę wyglądającą na kompletną.
  - Publiczny kanał XML EBC — bez klucza, bez limitu. Parser zweryfikowany na żywym kanale (29 walut), cron o 06:00 UTC.

- `[#373]` **Stawki VAT per kraj** (tamże + [vatRates.ts](packages/core/src/vatRates.ts)). Istniała wyłącznie `companies.default_vat_rate` — jedna stawka firmowa do faktur sprzedaży. Do zwrotu VAT potrzebna jest stawka **kraju tankowania**.
  - Seed 28 krajów, wersjonowany od `valid_from` — test używa niemieckiej obniżki covidowej (16% w 2020) i sprawdza, że wniosek za tamten okres dostaje stawkę z tamtego czasu.
  - `fuel_refundable` odróżnia kraje, które VAT-u od paliwa nie oddają (GB, CH, NO) — bez tego zwrot wychodziłby zawyżony. Nieznany kraj daje `null`, nie domyślne 23%.

- `[#373]` **Dwa ekrany liczyły spalanie inaczej.** `/analytics` miał własny wzór inline (wszystkie litry / rozpiętość licznika), który **zawyża** — wliczał pierwsze tankowanie, choć napędziło ono drogę sprzed pierwszego odczytu. Oba ekrany używają teraz `consumptionFullToFull`.

**Bramki:** biome ✓ · `tsc` core/maps/api/web/mobile 0 ✓ · testy core 452 · maps 116 · api 77 · web 78 · mobile 36 · i18n 5 ✓ · `next build` ✓ · migracje 0092 i 0093 na produkcji, backfill zweryfikowany (39/39 wierszy) ✓.

## [1.214.0] — 🔐 Usuwanie konta (wymóg App Store) + cztery błędy pokazujące nieprawdę

Faza 0 z przeglądu backlogu (82 pozycje, 10 faz). Kolejność nie jest przypadkowa:
najpierw to, co blokuje wydanie i co **kłamie użytkownikowi w interfejsie**.

- `[#372]` **Usuwanie konta i danych — pełna ścieżka w aplikacji.** App Store Guideline 5.1.1(v) wymaga, by aplikacja pozwalająca założyć konto pozwalała je usunąć **wewnątrz aplikacji**. Dotąd istniała wyłącznie strona [/account-deletion](apps/web/app/account-deletion/page.tsx) z instrukcją wysłania e-maila — to wymogu nie spełnia. Migracja [0090](supabase/migrations/0090_account_deletion.sql) wnosi `delete_my_account`, `account_deletion_preview` (podgląd skutków dla ekranu potwierdzenia) i kompletne `_company_purge`.
  - **Mobile** ([settings.tsx](apps/mobile/app/settings.tsx)): sekcja „Strefa niebezpieczna" z podglądem skutków pobranym z bazy i czyszczeniem ośmiu kluczy lokalnych, które przeżyłyby wylogowanie — w tym kolejki offline i zgody na udostępnianie pozycji.
  - **Web** ([settings/page.tsx](apps/web/app/(app)/settings/page.tsx)): karta z potwierdzeniem przez przepisanie frazy, świadomie **poza** warunkiem `isOwner` — wymóg dotyczy każdego użytkownika, nie tylko właściciela.
  - Właściciel firmy z aktywnymi pracownikami dostaje **drugie, osobne potwierdzenie**: jego usunięcie kasuje też cudze dane. Baza broni się niezależnie od interfejsu (błąd `23503`), nawet gdyby podgląd zdezaktualizował się między oknami.
  - Strona publiczna przestała być samą instrukcją mailową — samoobsługa jest pierwsza, e-mail zszedł do przypadku „nie mogę się już zalogować". Google Play nadal wymaga tego URL, więc strona zostaje.
  - Nowy moduł danych [account.ts](packages/api/src/data/account.ts) + 13 kluczy i18n × 4 języki mobilne i 10 × 2 języki web.
  - Kontrola bazy wykazała, że **nie ma ani jednego klucza obcego do `auth.users`** — nic nie kaskaduje, więc funkcja obsługuje każdą kolumnę użytkownika jawnie (~35 tabel). Dane osobowe są usuwane, zapisy operacyjne firmy — odpinane od osoby, zgodnie z treścią strony prywatności.
  - `driver_id` w `fuel_logs`/`adblue_logs`/`trip_events` przestaje być `NOT NULL`. Polityki RLS tych tabel mają postać `driver_id = auth.uid() or has_role(...)`, więc dla `NULL` wpis znika kierowcom, a zostaje właścicielowi i dyspozytorowi; `WITH CHECK` nadal nie dopuszcza wpisu bez kierowcy.
  - Przy okazji: **`company_wipe_data` pomijała 11 tabel** (cały czat, checklisty, wydatki kierowcy, pozycje GPS, trasy, zdarzenia tacho, tokeny push, ustawienia rozliczeń) — „wyczyszczona" firma zostawiała wiadomości w bazie. Naprawione, bez zmiany sygnatury.

- `[#372]` **Numer karty paliwowej był jawny — także w powiadomieniach.** Kolumna nazywa się `card_number_masked`, ale przechowywała **pełne numery** (15–17 cyfr, zero znaków maskujących), a UI pokazywał je w 13 miejscach. Najgorszy przypadek: [alerts.ts](apps/web/lib/alerts.ts) wklejał numer do **tytułu powiadomienia**, które jest zapisywane w bazie i wysyłane pushem na ekran blokady. Kontrast był wymowny — PIN ma szyfrowanie, audytowane RPC i re-maskowanie po 30 s, a numer karty nie miał nic.
  - Nowy [cardMask.ts](packages/core/src/cardMask.ts) (13 testów) + normalizacja w `fuelCardSchema`: pełny numer jest przycinany **przed** wysłaniem do bazy, więc nigdy więcej tam nie trafi.
  - Migracja [0091](supabase/migrations/0091_card_number_trim.sql) przycina dane historyczne i dokłada `CHECK`, który odrzuci pełny numer nawet przy bezpośrednim `INSERT`.
  - Etykieta pola zmieniona na „Ostatnie 4 cyfry" w 6 lokalizacjach (web pl/en, mobile pl/en/de/uk) — pole ma mówić prawdę o tym, co się wpisuje.

- `[#372]` **Zestawienie miesięczne pokazywało 0 € mimo wpisów.** Diagnoza na produkcji: 20 tankowań i 19 wpisów AdBlue, `price_total` **NULL w 100%** — kwota jest w formularzu opcjonalna i nigdy nie została wypełniona, a `?? 0` cicho zamieniało brak na zero. `monthlyFleetSummary` zwraca teraz `missingPrice`, a [zestawienie](apps/web/app/(app)/monthly/page.tsx) mówi wprost „koszt jest niepełny, N pozycji bez kwoty" zamiast pokazywać zero jako fakt. Zasada obowiązująca dalej w całym backlogu: **brak danych ma być widoczny jako brak, nigdy jako zero**.

- `[#372]` **Dymek na mapie był biały i nieczytelny** ([globals.css](apps/web/app/globals.css)). Ciemny motyw dymka istniał od #148, ale przegrywał kaskadę: `maplibre-gl.css` jest importowany na poziomie strony, nasz arkusz w layoucie, a Next emituje CSS w kolejności layout → page, więc biblioteka ładowała się ostatnia. Przy równej specyficzności (0,1,0) wygrywał vendor. Selektory są teraz kwalifikowane prefiksem `.maplibregl-popup` (0,2,0; strzałka 0,3,0), co rozstrzyga niezależnie od kolejności. Domknięta też druga kolizja — reguła przycisku malowała krzyżyk zamykania na czerwono.

- `[#372]` **Historia formularzy sortowała alfabetycznie po kraju**, nie chronologicznie ([history/page.tsx](apps/web/app/(app)/forms/history/page.tsx)) — porównywany był tekst `„KRAJ · data"`, więc data liczyła się dopiero po nazwie kraju. `Row` niesie teraz `at` (ISO) i sortowanie idzie po czasie.

- `[#372]` **W polu „Kraj" lądował kod pocztowy z miastem.** `GeoHit` był płaski (`label`/`lat`/`lng`), więc formularze odtwarzały kraj heurystyką „ostatni człon etykiety po przecinku" — a TomTom kraju we `freeformAddress` nie umieszcza („Rynek Główny 1, 31-042 Kraków"). Dane były przy tym **pobierane od dostawcy i wyrzucane**: [tomtomSearch.ts](packages/maps/src/tomtomSearch.ts) parsował `countryCode`, `country`, `municipality` i `postalCode`, po czym budował z tego sam `label`.
  - [GeoHit](packages/maps/src/geocode.ts) niesie teraz pola strukturalne, uzupełniane przez wszystkich trzech dostawców: TomTom (przestaje je gubić), Nominatim (doszedł `addressdetails=1` — bez niego OSM w ogóle nie zwraca adresu, a kod kraju normalizujemy do wielkich liter) i MapTiler (`context[].short_code`).
  - Zduplikowany `splitPlace` zniknął z obu formularzy webowych. Kraj **nie jest już zgadywany z tekstu**; z etykiety bierzemy co najwyżej awaryjną nazwę miejsca.
  - Przy okazji domknięty parytet z mobile: web dostał brakujące pole **kod pocztowy** w formularzach paliwa/AdBlue i Trip. Schemat i tabele miały je od dawna — wpisy z panelu traciły je po cichu, a edycja wpisu z telefonu **kasowała** wartość, bo pole startowało puste.
  - 4 nowe testy w [geocode.test.ts](packages/maps/src/geocode.test.ts) pilnują, żeby kraj znów nie zaczął pochodzić z etykiety.

**Bramki:** biome ✓ · `tsc` core/maps/api/web/mobile 0 ✓ · testy core 413/413 ✓ · maps 116/116 ✓ · web 78/78 ✓ · parytet i18n 5/5 ✓ · `next build` ✓ · `docs:check` ✓ · migracje 0090+0091 na produkcji, uprawnienia zweryfikowane (`anon` bez dostępu) ✓.

> **Pozostaje po stronie danych:** 39 istniejących wpisów paliwa/AdBlue nie ma kwoty. Świadomie ich nie doszacowujemy — wyliczone liczby wyglądałyby jak wprowadzone przez kierowcę i weszłyby do rozliczeń oraz zwrotu VAT. Do uzupełnienia ręcznie w historii formularzy.

## [1.213.2] — 📱 Mobile 1.94.0 do sklepów (aktualny kod czatu)

- `[#371]` **Nowy build mobile z poprawkami #369.** Build 63 (v1.93.0) powstał PRZED paczką #369, więc zapisywał załączniki czatu pod starą ścieżką — a migracja [0088](supabase/migrations/0088_chat_photos_acl.sql) jest już na produkcji i tę ścieżkę BLOKUJE (fail-closed). Wysłanie build 63 do sklepów oznaczałoby zdjęcia w czacie nie do odczytania. Wersja 1.94.0 niesie nową ścieżkę `{firma}/chat/{wątek|general}/…`, naprawiony magazyn liczników nieprzeczytanych i zdławiony znacznik przeczytania.
- `[#371]` **Android wraca do obiegu** — ostatni build sklepowy to była wersja 1.90.2 (versionCode 42) z 19 lipca, czyli bez trzech wydań. Nowy build wyrównuje obie platformy.

**Bramki:** bez zmian w kodzie względem #370 — to wydanie pakietowe (bump + build).

## [1.213.1] — 🗺️ Mapa nigdy nie jest czarna + porządek w kreatorze startu

Naprawa **regresji z #365** wykrytej na żywej produkcji podczas przeglądu ekranów.

- `[#370]` **Mapa na produkcji była całkowicie czarna.** Od #365 podkład domyślny wybieramy po tym, czy klucz TomTom jest USTAWIONY — nie czy jest PRAWIDŁOWY. W Vercel siedział 4-znakowy placeholder, więc kafelki wracały z **401**, a `NEXT_PUBLIC_MAPTILER_KEY` nie był skonfigurowany, czyli nie było na co spaść. Przed #365 domyślny był OSM i mapa działała. Teraz [map/page.tsx](apps/web/app/(app)/map/page.tsx) nasłuchuje błędów źródła i przy odmowie autoryzacji (401/403/404) przełącza podkład na OpenStreetMap, który nie wymaga klucza, oraz mówi o tym użytkownikowi (`mapPage.basemapKeyInvalid`, pl/en). Pojedynczy nieudany kafelek nie przełącza niczego — sieć bywa kapryśna.

> **Do zrobienia po stronie konfiguracji:** wpisać prawdziwy klucz w `NEXT_PUBLIC_TOMTOM_KEY` (Vercel → Production) albo usunąć tę zmienną. Poprawka sprawia, że mapa działa w obu przypadkach, ale pełny podkład TomTom wymaga ważnego klucza.

- `[#370]` **Kreator startu twierdził, że skończył, i nie znikał** ([CompanyBanner](apps/web/components/CompanyBanner.tsx)) — licznik pokazywał numer BIEŻĄCEGO kroku (`stepIndex + 1`), więc na etapie „Zaproś kierowcę" widniało **3/3** obok kroku oznaczonego jako niewykonany. Teraz liczy kroki ukończone (0/3 … 2/3), a 3/3 nie wystąpi, bo przy komplecie kreator się chowa.
- `[#370]` **Kreatora dało się wreszcie zamknąć** (tamże) — ostatni krok domyka się dopiero, gdy zaproszony kierowca FAKTYCZNIE dołączy, więc firma jednoosobowa miała go na pulpicie na zawsze. Dodane „Pomiń ✕" (jak w checkliście od #317).
- `[#370]` **Koniec dwóch onboardingów obok siebie** ([OnboardingChecklist](apps/web/components/OnboardingChecklist.tsx)) — lista powtarzała kroki „pojazd" i „kierowca", którymi już prowadzi kreator. Pokazuje się dopiero, gdy kreator zniknie, i wnosi wtedy realnie nową treść: karta paliwowa i pierwsze zlecenie.

**Bramki:** biome ✓ · parytet i18n 5/5 ✓ · `tsc` web 0 ✓ · testy web 78/78 ✓ · docs:check ✓.

## [1.213.0] — 🔐 Domknięcie długu z #368: bramka wątku dla załączników czatu

Naprawa trzech rzeczy, które sam wpisałem w #368 jako „znane ograniczenia", plus regresje
wychwycone przy adwersaryjnej weryfikacji tej paczki (w tym **blocker w pierwszej wersji 0088**).

- `[#369]` 🔒 **Załączniki czatu za bramką wątku** — migracja [0088](supabase/migrations/0088_chat_photos_acl.sql) + nowa ścieżka `{firma}/chat/{wątek|general}/…` ([messages.ts](packages/api/src/data/messages.ts)). Dotąd zdjęcie z **prywatnego** wątku (skan dokumentu, paragon) leżało w `cargo-photos`, którego polityka daje SELECT każdemu członkowi firmy — chroniła je wyłącznie nieodgadywalność UUID-a, mimo że sam wiersz wiadomości jest poprawnie zawężony przez `messages_select`. Polityka odtwarza teraz regułę z 0067: kanał ogólny → firma, wątek → `is_thread_member` albo zarząd, z dodatkowym warunkiem, że wątek należy do firmy z pierwszego folderu.
  > Pierwsza wersja migracji dziedziczyła ACL starych plików z widoczności wiersza wiadomości — **odrzucone**: `messages_insert` pozwala każdemu członkowi firmy wstawić wiersz do kanału ogólnego z dowolnym `photo_path`, więc dało się podrobić wiersz i odzyskać dostęp do cudzego zdjęcia. Sprawdzenie produkcji rozstrzygnęło sprawę: bucket był **pusty** (0 obiektów, 0 wiadomości z załącznikiem), więc stary prefiks jest po prostu zamknięty (fail-closed), bez podzapytania do `messages` przy każdym podpisaniu URL-a. Klasyfikacja ścieżek zweryfikowana na prod — ładunek, szkody, checklisty i paragony bez zmian, `..` odbite.
- `[#369]` 🕵️ **Audyt odczytu PII pokazuje skalę** — migracja [0089](supabase/migrations/0089_list_drivers_audit_v2.sql): zamiast pomijać wpis w oknie godziny, podbijamy licznik `hits` i znacznik czasu, więc masowe zassanie kartoteki (pętla skryptu) nie wygląda już identycznie jak jedno wejście na listę. Przy okazji naprawiony błąd z 0087: `actor_id = auth.uid()` nigdy nie trafiało w istniejący wiersz dla `auth.uid() = NULL`. Ślad odmowy to świadomie **tylko** `raise log` — zapis do tabeli byłby martwy, bo `raise exception` wycofuje transakcję, a kosztowałby zużycie identyfikatorów transakcji przy zapętlonych próbach.
- `[#369]` 🌐 **Panel „Co wymaga uwagi" mówi po angielsku** ([AttentionPanel](apps/web/components/AttentionPanel.tsx)) — etykiety kategorii i statusów przez `t()`, w tym rodzaje i statusy szkód (stałe w `packages/core` są wyłącznie polskie, więc wersja EN pokazywała „Kolizja / wypadek" obok przetłumaczonej kategorii).
- `[#369]` ⚡ **Cache geokodera znów działa** ([geocode.ts](packages/maps/src/geocode.ts)) — predykat odróżnia **awarię** dostawcy (nie cache'ujemy) od **pustej, poprawnej odpowiedzi** (cache'ujemy). Poprzedni warunek porównywał źródło z preferowanym, a produkcja przekazuje oba klucze — więc dla każdej frazy nieznanej TomTomowi cache był martwy i każde naciśnięcie klawisza kosztowało dwa zapytania.
- `[#369]` 🔄 **Liczniki czatu odcinane przy wylogowaniu** ([chatUnread](apps/web/lib/chatUnread.ts), [SignOutButton](apps/web/components/SignOutButton.tsx)) — `router.push("/login")` to miękka nawigacja SPA, więc stan modułowy przeżywał wylogowanie: po zalogowaniu na inne konto w tej samej karcie badge pokazywał liczniki **poprzedniej** firmy i trzymał jej subskrypcję realtime. Dodany `resetChatUnread()` (lustrzany do mobilnego) zeruje też okno dławienia.
- `[#369]` ⏱️ **Znacznik przeczytania zdławiony** ([chatUnread](apps/web/lib/chatUnread.ts)) — zapis do bazy przy **każdej** przychodzącej wiadomości u każdego patrzącego zastąpiony jednym zapisem „na koniec" (RLS i tak liczy `created_at > last_read_at`); badge otwartego kanału nadal się nie zapala. Naprawiony też martwy magazyn po nieudanym starcie (badge pokazywał 0 mimo nieprzeczytanych).
- `[#369]` 🗺️ **Limit obszaru ruchu** ([/api/traffic](apps/web/app/api/traffic/route.ts)) — `tooLarge` liczone przed przyciągnięciem bboxa, więc widok mieszczący się w limicie dostawcy nie traci warstwy ruchu po rozszerzeniu ramki.

> **Nadal otwarte:** polityki INSERT/DELETE bucketu nie mają symetrycznej bramki wątku — członek firmy może *wgrać* plik pod cudzy prefiks (odczytu nie dostanie, to zaśmiecanie, nie wyciek). `deferredRead` jest jednoelementowy — dziś bezpieczny, bo przełączenie kanału zawsze go domyka.

**Bramki:** biome ✓ · parytet i18n 5/5 ✓ · `tsc` core+maps+api+web+mobile 0 ✓ · testy **701** (core 398, maps 112, api 72, web 78, mobile 36, i18n 5) ✓ · migracje 0088–0089 na prod i zweryfikowane.

## [1.212.0] — 🚀 Reszta top7 z audytu + paczka bezpieczeństwa (alerty, tacho, cache, czat)

Domknięcie mapy drogowej z audytu wieloagentowego: pozycje **#2, #3, #5, #6, #7** oraz cztery
punkty bezpieczeństwa. Adwersaryjna weryfikacja tej paczki wykryła przy okazji **dwa zastane
błędy krytyczne** (silnik alertów i wyciek między firmami) — opisane niżej.

### 🔴 Naprawy krytyczne wykryte przy weryfikacji

- `[#368]` **Silnik alertów NIGDY nic nie wstawiał** ([alerts.ts](apps/web/lib/alerts.ts)) — `upsert` wskazywał `onConflict: "user_id,dedup_key"`, a indeks `notifications_dedup` (0017) jest **częściowy** (`where dedup_key is not null`); Postgres rzucał `42P10`, co cron połykał (`.catch(() => -1)`) i zwracał 200. Dotyczyło **wszystkich** reguł — opóźnień, AETR i terminów pojazdów, nie tylko nowych. Potwierdzone empirycznie na produkcji (wariant z celem → 42P10, nietargetowany → OK; w bazie **0** powiadomień z crona). Naprawa: `ON CONFLICT DO NOTHING` bez celu + [cron](apps/web/app/api/cron/notify/route.ts) raportuje błędy do Sentry zamiast je połykać.
- `[#368]` 🔒 **Wyciek treści między firmami** ([chat/notify](apps/web/app/api/chat/notify/route.ts)) — firmę nadawcy wybierało `limit(1)` z jego członkostw, więc konto należące do dwóch firm rozsyłało podgląd wiadomości członkom **niewłaściwej**; od tej paczki treść jest dodatkowo trwale zapisywana w `notifications` i wysyłana Web Pushem. Teraz `companyId` jest jawny i weryfikowany (bez niego dopuszczamy tylko konto z jedną firmą).
- `[#368]` 🔒 **Brak autoryzacji do wątku** (tamże) — sprawdzano wyłącznie, czy wątek należy do firmy; dowolny jej członek mógł wstrzyknąć treść do powiadomień **prywatnego** kanału i poznać liczbę jego członków. Bramka odzwierciedla teraz RLS z 0067 (zarząd / twórca / członek). Dołożone testy regresyjne.
- `[#368]` **Tacho datowało przerwę wstecz** ([tachoStop.ts](apps/mobile/lib/tachoStop.ts)) — po powrocie z tła detektor zaliczał jako postój cały czas, gdy ekran był zablokowany (GPS nie chodzi w tle), więc jedno tapnięcie kasowało z zapisu np. 40 min faktycznej jazdy. Punkt odniesienia jest teraz zerowany przy wznowieniu. Dodatkowo próg dystansu 50 m > `distanceInterval` watchera (30 m) czynił dystansowy dowód ruchu **martwym** (pełzanie w korku = „postój") — obniżony do 20 m.

### ✨ Pozycje z mapy drogowej

- `[#368]` 🔔 **#2 Cron-alerty o terminach** ([alerts.ts](apps/web/lib/alerts.ts)) — dokumenty kierowców (prawo jazdy, kod 95, badania, psychotechnika, ADR) i ważność kart paliwowych trafiają wreszcie do push/e-mail, nie tylko do żywego panelu. Horyzont per firma z `companies.notify_days_ahead` (cron miał 30 dni na sztywno i nadpisywał ustawienie właściciela).
- `[#368]` 🛠️ **#3 Krytyczne usterki do właściciela** ([alerts.ts](apps/web/lib/alerts.ts), [AttentionPanel](apps/web/components/AttentionPanel.tsx)) — otwarte zgłoszenie o wadze „high" lub z kontrolką alarmuje zarząd (okno 30 dni, by pierwszy cykl nie wysłał lawiny zaległości).
- `[#368]` 💬 **#5 Czat gotowy do pracy** — migracja [0085](supabase/migrations/0085_chat_reads.sql) (`chat_reads` + RPC `chat_mark_read`/`chat_unread_counts`, SECURITY INVOKER pod RLS), liczniki nieprzeczytanych (badge mobile + web), powiadomienia na web (Web Push + centrum) i wysyłka przez outbox z idempotencją.
- `[#368]` ⏸️ **#6 Auto-pauza jazdy z GPS** ([tacho](apps/mobile/app/tacho.tsx)) — wykryty postój pyta kierowcę, nigdy nie przełącza sam (fałszywy zapis compliance byłby gorszy niż brak). Logika w czystym, przetestowanym module.
- `[#368]` ⚡ **#7 Cache płatnych API map** ([cache.ts](packages/maps/src/cache.ts), [geocode](packages/maps/src/geocode.ts), [/api/route](apps/web/app/api/route/route.ts), [/api/traffic](apps/web/app/api/traffic/route.ts)) — geokoder, trasa i ruch nie płacą dwa razy za to samo. Trafienie w cache raportuje nagłówek poza produkcją, a nie treść odpowiedzi (inaczej zdradzałaby aktywność innych najemców).

### 🔒 Paczka bezpieczeństwa

- `[#368]` **Limity bucketów Storage** — migracja [0086](supabase/migrations/0086_storage_hardening.sql): rozmiar + whitelista MIME. Publiczny `avatars` (3 MB) bez SVG/HTML — tam leży ryzyko XSS. `cargo-photos` zachowuje `image/svg+xml` (podpis POD generowany przez apkę), a `documents` przyjmuje pakiet biurowy i `octet-stream`, bo sejf ma `<input type="file">` bez `accept` — wąska lista zablokowałaby codzienne użycie.
- `[#368]` **Koniec fail-open w rate-limicie** ([ratelimit.ts](apps/web/lib/ratelimit.ts)) — brak zmiennych Upstash na produkcji nie wyłącza już po cichu ochrony (fallback in-memory + sygnał do Sentry). Strażnik pamięci eksmituje najstarsze wpisy zamiast `clear()`, który kasował liczniki wszystkich klientów.
- `[#368]` **Audyt masowego odczytu PII** — migracja [0087](supabase/migrations/0087_list_drivers_audit.sql): `list_drivers` zapisuje `driver.list_pii` (dławione 1/h). PIN i zaproszenia były audytowane, kartoteka RODO nie.
- `[#368]` **Potwierdzenie przy PIN karty na webie** ([cards](apps/web/app/(app)/cards/page.tsx)) — mobile wymaga Face ID, web odsłaniał jednym kliknięciem. Świadomie bez hasła/passkey: część kont loguje się przez OAuth/magic link i nie ma żadnego z nich, więc twardy step-up odciąłby PIN potrzebny przy automacie.
- `[#368]` **Wiadomość offline nie wyjdzie z cudzego konta** ([outbox](apps/mobile/lib/outbox.ts)) — wpisy czatu bez właściciela nie są „claimowane" przez pierwszego zalogowanego (dla paliwa/Tripa to świadomy backfill, dla wypowiedzi w czacie — niedopuszczalne).

> **Znane ograniczenia (kandydaci na kolejny update):** załączniki czatu leżą w `cargo-photos` widocznym dla całej firmy, więc zdjęcie z prywatnego wątku chroni nieodgadywalność ścieżki, nie autoryzacja; dławienie audytu 1/h nie odróżnia jednego wejścia od masowego zaciągnięcia kartoteki; `AttentionPanel` nadal ma teksty zaszyte po polsku (cały plik, stan sprzed tej paczki).

**Bramki:** biome ✓ (bez ostrzeżeń) · parytet i18n 5/5 ✓ · `tsc` core+maps+api+web+mobile 0 ✓ · testy **689** (core 398, maps 109, api 68, web 73, mobile 36, i18n 5) ✓ · migracje 0085–0087 na prod.

## [1.211.0] — ⚡ Paczka tanich zwycięstw z audytu (mapa, obserwowalność, CI, XSS)

Sześć pozycji „duża wartość / mały koszt" z audytu wieloagentowego, plus poprawki znalezione
przy adwersaryjnej weryfikacji tej paczki (w tym **realna luka XSS**, której audyt nie miał w zakresie).

- `[#367]` 🛡️ **XSS w popupach mapy** ([map/page.tsx](apps/web/app/(app)/map/page.tsx)) — komentarze zgłoszeń, nazwy POI z OSM, opisy incydentów i etykiety przystanków szły surowe do `Popup.setHTML`. `map_reports.comment` to wolny tekst dowolnego zalogowanego, a warstwa jest **wspólna dla wszystkich firm** — jeden wpis `<img src=x onerror=…>` wykonywał się u każdego, kto kliknął pinezkę. Wszystkie wstawki przez `escapeHtml` (z apostrofem).
- `[#367]` 🛡️ **Fałszywe zgłoszenia z kliknięcia w pinezkę** ([map/page.tsx](apps/web/app/(app)/map/page.tsx)) — w trybie zgłoszeń klik w POI/incydent/zapisane miejsce otwierał popup **i** zakładał zgłoszenie (wypadek/policja/waga) we wspólnej tabeli. Guard `queryRenderedFeatures` przed `insertMapReport`.
- `[#367]` 🔭 **Sentry w granicach błędów web** ([(app)/error.tsx](apps/web/app/(app)/error.tsx), [global-error.tsx](apps/web/app/global-error.tsx)) — granice błędów Reacta zatrzymują propagację do `window.onerror`, więc crashe renderu (te, które ubijają stronę) **nie trafiały do Sentry wcale** mimo wdrożenia #306.
- `[#367]` 🗺️ **Zapisane miejsca firmy na mapie** ([map/page.tsx](apps/web/app/(app)/map/page.tsx), [mapFeatures](apps/web/app/(app)/map/mapFeatures.ts)) — warstwa z ikoną kategorii, popup „dodaj jako przystanek", przełącznik i odtwarzanie po zmianie podkładu (`applyOverlays` + guard `isStyleLoaded`).
- `[#367]` 🖱️ **Prawy klik = przystanek** ([map/page.tsx](apps/web/app/(app)/map/page.tsx)) — reverse-geocode TomTom (dotąd nieużywany) w języku UI, z fallbackiem na współrzędne; nie koliduje z trybem zgłoszeń ani z pinezkami.
- `[#367]` 🚧 **Omijanie krajów bez cichego ignorowania** ([tomtom](packages/maps/src/tomtom.ts), [/api/route](apps/web/app/api/route/route.ts), [mapPanels](apps/web/app/(app)/map/mapPanels.tsx)) — TomTom dostał `avoidVignette` (CH/AT/CZ/SK/HU/SI/BG/RO/MD), a odpowiedź API niesie **trzy uczciwe stany** `avoidCountriesMode: full | partial | none`. Jeden bit kłamałby o TomTomie (dziś domyślnym), który realnie omija winiety, choć kraju nie wyklucza.
- `[#367]` 🌐 **`<html lang>` zgodny z językiem** ([(app)/layout](apps/web/app/(app)/layout.tsx)) — ustawiany w **panelu**, jedynym tłumaczonym obszarze. Strony publiczne (landing/prywatność/wsparcie/logowanie) są PL-only i zostają statyczne z `lang="pl"` — nadpisywanie ich na „en" byłoby fałszywą deklaracją języka (i wymuszało render dynamiczny całej apki).
- `[#367]` 🧪 **Bramka CI: typy bazy vs schemat** ([.gitlab-ci.yml](.gitlab-ci.yml)) — job `db-types` (`pnpm gen:types` + `diff`) pilnuje, by po migracji zregenerowano `database.types.ts`. Porównanie przez `cp`+`diff`, bo `node:*-slim` nie ma gita. **Włącza się sam** po dodaniu zmiennej CI `SUPABASE_DB_URL`.

> Konfiguracja po stronie właściciela: `NEXT_PUBLIC_SENTRY_DSN` w Vercel (bez DSN Sentry jest no-opem) oraz `SUPABASE_DB_URL` w GitLab → Settings → CI/CD → Variables (masked + protected), by aktywować bramkę typów.

**Bramki:** biome ✓ · parytet i18n 5/5 ✓ · `tsc` maps+api+web+mobile 0 ✓ · testy maps 80/80, web 61/61 ✓.

## [1.210.0] — 🔒 Odcięcie dostępu byłemu członkowi firmy (priorytet #1 z audytu)

Domknięcie **najpoważniejszej potwierdzonej luki multi-tenant** z audytu wieloagentowego: enum `membership_status` miał `disabled`, ale nic go nie ustawiało → odchodzący kierowca zachowywał dostęp do danych firmy i **PIN-ów kart**. Helpery RLS ([0002](supabase/migrations/0002_rls.sql:8): `is_member_of`/`has_role`/`is_developer`) wymagają `status='active'`, więc `disabled` realnie odcina cały dostęp.

- `[#366]` 🔒 **Migracja [0084](supabase/migrations/0084_member_access_control.sql)** (na prod): `set_member_status(p_user,p_status)` — owner zawiesza/przywraca dostęp członka, SECURITY DEFINER z guardami (tylko owner, nie własne konto, nie właściciela, tylko `active⇄disabled`) i audytem (`member.suspend`/`member.reactivate`); `revoke_invite(p_invite)` — owner/spedytor cofa oczekujące zaproszenie (wygasza, audyt `invite.revoke`). Oba `revoke ... from public` + `grant ... to authenticated`.
- `[#366]` 👔 **Web** ([team](apps/web/app/(app)/team/page.tsx)) — przy każdym członku „⛔ Zawieś dostęp" / „↩ Przywróć dostęp" (z potwierdzeniem), znacznik „Zawieszony", oraz sekcja **oczekujących zaproszeń** z „Cofnij".
- `[#366]` 📱 **Mobile** ([manage-team](apps/mobile/app/manage-team.tsx)) — parytet: zawieś/przywróć (Alert), status zawieszenia, lista i cofanie zaproszeń.
- `[#366]` 🧩 **Warstwa danych** ([memberships](packages/api/src/data/memberships.ts) `setMemberStatus`, [invites](packages/api/src/data/invites.ts) `listInvites`/`revokeInvite`/`isInvitePending`) + typy RPC ([database.types](packages/api/src/database.types.ts)); i18n web (pl/en) + mobile (pl/en/de/uk).

> Weryfikacja na prod: funkcje `SECURITY DEFINER`, `anon` bez EXECUTE, guardy (enum + owner) potwierdzone smoke-testem. Część mobilna wejdzie w kolejnym buildzie EAS (po buildzie 61).

**Bramki:** biome ✓ · parytet i18n 5/5 ✓ · api+web+mobile `tsc` 0 ✓ · migracja 0084 na prod.

## [1.209.0] — 🗺️ Podkład mapy TomTom (web + mobile) — „widać TomTom"

Domknięcie #4 od strony kodu. Do tej pory podkład mapy to **MapTiler/OSM**, a TomTom był tylko opcjonalną nakładką incydentów → użytkownik słusznie „nigdzie nie widział TomTom". Teraz TomTom jest **pełnoprawnym podkładem** (raster, styl „night" pod motyw red/black) i **domyślnym**, gdy jest jego klucz.

- `[#365]` 🗺️ **Web** ([mapTheme](apps/web/app/(app)/map/mapTheme.ts), [mapTypes](apps/web/app/(app)/map/mapTypes.ts), [page](apps/web/app/(app)/map/page.tsx)) — nowy podkład `tomtom` w przełączniku „Podkład" (pojawia się, gdy jest `NEXT_PUBLIC_TOMTOM_KEY`), `DEFAULT_BASEMAP` = TomTom → MapTiler(dark) → OSM. Nakładki ruchu/incydentów odtwarzane po zmianie podkładu (bez zmian).
- `[#365]` 📱 **Mobile** ([mapStyle](apps/mobile/lib/mapStyle.ts)) — `mapStyle()` priorytetuje TomTom (`EXPO_PUBLIC_TOMTOM_KEY`) → MapTiler → OSM; ten sam styl „night".
- `[#365]` 🌐 **i18n** — nowy klucz `mapPage.basemapTomtom` (pl/en, parytet 5/5).

> **Uwaga (config, nie kod):** żeby TomTom był widoczny, ustaw klucze env — web `NEXT_PUBLIC_TOMTOM_KEY` (podkład+incydenty) i serwerowy `TOMTOM_KEY`/`HERE_API_KEY` (routing „wyznacz trasę"); mobile `EXPO_PUBLIC_TOMTOM_KEY`. Podkład wektorowy MapTiler nadal pod `*_MAPTILER_KEY`.

**Bramki:** biome ✓ · parytet i18n 5/5 ✓ · web+mobile `tsc` 0 ✓.

## [1.208.0] — 🧰 Batch funkcji: firma kierowcy, tryby lokalizacji, reset Tacho, PIN za biometrią, hardening DB

Pakiet zgłoszony przez właściciela. Mobile **1.91.0** (wymaga rebuildu EAS). Migracja **0083** nałożona na prod.

- `[#364]` 👤 **Firma własna kierowcy (B2B/kontrakt)** — kierowca na kontrakt może mieć własną firmę: nazwa/NIP/REGON/adres/profil działalności (opcjonalne). Migracja [0083](supabase/migrations/0083_driver_company.sql) (+5 kolumn `drivers`, `driver_save`/`list_drivers` rozszerzone; PII i auth bez zmian), formularze [web](apps/web/components/DriverRoster.tsx) + [mobile](apps/mobile/app/manage-drivers.tsx), i18n web+mobile.
- `[#364]` 📍 **Tryby udostępniania lokalizacji** ([settings](apps/mobile/app/settings.tsx)) — chooser off / „tylko gdy używam" / „cały czas (w tle)". **Apple‑safe:** `app.json → app.config.js`; domyślny build (v1, do review) ma **ZERO** tła (chroni przed 2.5.4); „always" + task tła ([backgroundLocation](apps/mobile/lib/backgroundLocation.ts)) dochodzą TYLKO w buildzie z flagą `EAS_BG_LOCATION=1` (profil `production-bg` = v2 na TestFlight po akceptacji).
- `[#364]` ♻️ **Reset Tacho** ([tacho](apps/mobile/app/tacho.tsx)) — przycisk „Reset licznika" (z potwierdzeniem) czyści LIVE + km dnia + kalkulator → wszystko od 0.
- `[#364]` 🔒 **PIN karty za biometrią** ([cards](apps/mobile/app/(tabs)/cards.tsx)) — odczyt PIN karty paliwowej bramkowany Face ID / kodem urządzenia (`authenticate()`); RPC + audyt bez zmian.
- `[#364]` 🛡️ **Hardening DB** ([0082](supabase/migrations/0082_advisor_hardening.sql)) wg Supabase Advisors — `set_updated_at` search_path, odcięte helpery `_card_key`/`_pii_key`/`dev_stats`. Reszta warnów celowa (RPC z wewn. auth, helpery RLS, token-gated `order_tracking`); ERROR `spatial_ref_sys` nieusuwalny (tabela PostGIS).

**Bramki:** biome ✓ · parytet i18n 5/5 (web + 4 języki mobile) ✓ · api+web+mobile `tsc` 0 ✓ · migracje 0082/0083 na prod. **Otwarte (sekrety usera):** klucz TomTom→Vercel (mapy), Apple Key+Supabase (logowanie Apple).

## [1.207.0] — 🍏 Mobile: przegląd jakości pod Apple 5.6 (crash + stabilność + polish)

Aplikacja iOS dostała od Apple odmowę **Guideline 5.6** (jakość/stabilność). Dwuetapowy **audyt** (2 subagentów: crashe + placeholdery) → naprawa realnych blokerów. Mobile **1.90.1**. Audyt potwierdził też, że apka jest treściowo zdrowa: **bez stubów, placeholderów, martwych przycisków**, wszystkie `Info.plist` obecne.

- `[#363]` 💥 **Crash ekranu Ustawień (iOS)** — PowerSync (natywny SQLite, faza M5) inicjował się na mount, a `EXPO_PUBLIC_POWERSYNC_URL` był włączony we wszystkich buildach → **hard crash**. Wyłączony w buildach + [leniwy import](apps/mobile/lib/powersync.ts) + try/catch. To był objaw zgłoszony przez właściciela („Ustawienia wyłączają apkę").
- `[#363]` 📍 **Lokalizacja w tle bez implementacji → auto-reject 2.5.4** — [app.json](apps/mobile/app.json) deklarował `UIBackgroundModes:location` + „Always" + Android background/foreground-service, ale żaden kod tego nie używał. Usunięte (zostaje „when in use"). + zbędny `RECORD_AUDIO`.
- `[#363]` 🛡 **Error Boundary** ([ErrorBoundary.tsx](apps/mobile/components/ErrorBoundary.tsx)) — nieuchwycony błąd renderu pokazuje markowy ekran „spróbuj ponownie" (+Sentry.captureException) zamiast ubijać apkę. +klucze `m.error.*` (4 języki).
- `[#363]` 🧹 **Wyciek env + polish** — hardcoded „Ustaw EXPO_PUBLIC_…" w login/orders → generyczny `m.error.serviceUnavailable`; GPS-watcher tacho w try/catch; **10 fixów UX**: klikalny link wsparcia, stany loading/empty (fuel-prices, schedule), i18n czatu (w tym „📷 Zdjęcie" zapisywane do bazy), fallbacki obrazków/PDF poradnika, guard pustego formularza kosztów, wyciszony błąd usterek → komunikat, empty-state w manage-cards/vehicles, disabled przycisku oceny, etykiety a11y. +8 kluczy (4 języki).

**Bramki:** biome ✓ (1 warning prexistujący) · parytet i18n **5/5** (4 języki) · mobile `tsc` 0 (×3 batche) · bez migracji. **Wymaga rebuildu EAS** + (osobno) **odwołania do App Review** — 5.6 „Review Suspended" nie da się odblokować samym resubmitem.

## [1.206.0] — 📱 Tacho na mobile: 4 panele zgodności na ekranie aplikacji (+ fix jednostki)

Silniki tacho (Faza 1/2 — dotąd tylko web) trafiły na ekran aplikacji — **mobile 1.90.0**. Trzy panele dla kierowcy (widzi **swoje** dane) + jeden glance dla właściciela; wszystkie i18n w **4 językach** (pl/en/de/uk, parytet).

- `[#362]` 🚔 **Wirtualna kontrola 561** ([tacho](apps/mobile/app/tacho.tsx)) — z licznika `inspectAetr` wykrywa naruszenia jazdy z **wagą** (2006/22/WE): badge + o ile przekroczono + limit.
- `[#362]` 🛏 **Saldo kompensacji** ([TachoJournal](apps/mobile/components/TachoJournal.tsx)) — z **własnych** odpoczynków kierowcy `restCompensationLedger`: długi (561/2006 art. 8.6) + terminy + oznaczenie po terminie (live).
- `[#362]` ⏱ **WTD 48 h** ([work-time](apps/mobile/app/work-time.tsx)) — `wtdStatus` z ewidencji: średnia tygodniowa vs 48 h, budżet, najwyższy tydzień, tygodnie > 60 h.
- `[#362]` 🗓 **Terminy sczytań** (Tacho, **owner/dyspozytor, read-only**) — `checkDownload` glance „co wymaga sczytania" (karta 28 dni / tacho 90 dni, 581/2010); ustawianie dat zostaje na webie.
- `[#362]` 🐛 **Fix jednostki** — mobile `h()` traktował godziny jak minuty (dzielił `/60` → licznik ~0 h). Ewidencja trzyma **godziny** (potwierdzone: web form step 0.5, `.ddd`/checklist zapisują `/60`). Bug utajony (tabela pusta), ale realny.

**Bramki:** `biome` ✓ (1 warning prexistujący, nie z tych zmian) · parytet i18n **5/5** (4 języki) ✓ · mobile `tsc` exit 0 (weryfikowany po każdym z 4 paneli) ✓ · bez migracji. **Widoczne po rebuildzie EAS.**

## [1.205.0] — 🌍 Web i18n: WSZYSTKIE strony panelu przez `t()` (PL/EN, parytet)

Domknięcie internacjonalizacji panelu web — **każda strona `(app)` renderuje teksty przez `t()`** z pełnym parytetem PL/EN (bramka testowa). W tej rundzie zlokalizowano **15 stron** i dodano **~590 kluczy** do [pl.ts](packages/i18n/src/locales/pl.ts) / [en.ts](packages/i18n/src/locales/en.ts).

- `[#361]` 🌍 **15 stron przez `t()`** — Ceny diesla, Audyt, Harmonogram, Scoring, Analityka, Rozliczenia (+kierowcy), Diety, Wyjazdy, Dokumenty, Usterki, Czat, Mapa (plik strony), Tacho, Czas pracy. Wzorzec: `useT` (klient) / `createTranslator` (serwer — dashboard), klucze płaskie `namespace.key`, **bez interpolacji** (dynamika w JSX, splity prefix/suffix), mapy etykiet `kod→MessageKey` w komponencie (jak `SEV_LABEL`/`RANK_LABEL`).
- `[#361]` ✅ **Parytet pl/en wymuszony compile-time** — `en: Record<MessageKey, string>` + test parytetu (5/5); brak/nadmiar klucza = błąd `tsc`.
- `[#361]` 🧩 **Panele Fazy 2 tacho** (inspektor, WTD, kompensacja, sczytania) też przez `t()` — spójne z resztą.
- `[#361]` ✅ **Współdzielone komponenty — DOMKNIĘTE** (już nie tylko strony): `DEFECT_PARTS/SIDES` (Usterki + [diagram pojazdu](apps/web/components/VehicleDiagram.tsx)), panel Mapy ([mapPanels](apps/web/app/(app)/map/mapPanels.tsx)/[mapTheme](apps/web/app/(app)/map/mapTheme.ts)/mapFeatures), [TachoAutoSection](apps/web/app/(app)/work-time/TachoAutoSection.tsx) — mapy etykiet `wartość→MessageKey` tłumaczone u konsumentów, wartości kanoniczne (DB/`core`) nietknięte. Eksporty **CSV zostają PL** (konwencja: nazwy plików/nagłówki).

**Bramki:** `biome` ✓ · parytet i18n **5/5** ✓ · web `tsc` exit 0 (weryfikowany po każdym z 8 batchy) ✓ · bez migracji. Deploy przez Vercel.

## [1.204.0] — 🕹️ Tacho Faza 2: cztery silniki wpięte w panel (widoczne dla użytkownika)

Silniki z Fazy 1 stały się **realnymi ekranami** owner panelu — bez rebuildu (deploy Vercel). 3 z 4 **bez migracji** (dane już były); #3 dokłada osobną tabelę. Każdy panel z bramką web `tsc` 0.

- `[#360]` 🚔 **Wirtualna kontrola 561** na [`/tacho`](apps/web/app/(app)/tacho/page.tsx) — panel z `inspectAetr`: naruszenia jazdy z **wagą** (drobne/poważne/bardzo poważne, 2006/22/WE zał. III) + o ile przekroczono; zastępuje ogólny alert konkretną listą.
- `[#360]` ⏱ **WTD 48 h** na [`/work-time`](apps/web/app/(app)/work-time/page.tsx) — panel z `wtdStatus`: średnia tygodniowa vs 48 h, budżet do średniej, najwyższy tydzień, liczba tygodni > 60 h; respektuje filtr kierowcy.
- `[#360]` 🛏 **Saldo kompensacji** na `/work-time` — dla wybranego kierowcy z jego dziennika tacho (`driver_tacho_events` via RLS): długi za skrócone odpoczynki + terminy oddania + oznaczenie po terminie. Nowy helper core [`weeklyRestsFromBoundaries`](packages/core/src/weeklyRest.ts) (**+7 testów** → 398).
- `[#360]` 🗓 **Terminy sczytań** na `/tacho` (owner) — dashboard z `checkDownloads`: karta 28 dni / tachograf 90 dni, status **ok/wkrótce/po terminie**, formularz dat, usuwanie. Migracja [0081](supabase/migrations/0081_tacho_downloads.sql) `tacho_downloads` (osobna tabela — `drivers`/`vehicles` nietknięte; RLS owner/dyspozytor zarządza, członek czyta). Sekcja **ukryta dopóki migracja nie nałożona** (flaga `available` — zero błędu przed).

**Bramki:** vitest core **398/398** · api `tsc` 0 · web `tsc` 0 · biome czysto. **Wymaga:** nałożenie migracji **0081** na prod (dla #3; pozostałe działają od razu po deployu).

## [1.203.0] — 🕹️ Tacho Faza 1: cztery silniki zgodności kierowcy (A–D)

Cztery **czyste, przetestowane silniki** w `@e-logistic/core` domykające compliance kierowcy — orientacyjne (każdy z dopiskiem „pomoc orientacyjna, nie interpretacja prawna"), gotowe pod wpięcie w UI (Faza 2). Rozwijają istniejący licznik 561/AETR o brakujące reżimy prawne.

- `[#359]` 🛏 **A — Kompensacja skróconych odpoczynków** ([weeklyRest.ts](packages/core/src/weeklyRest.ts)) — rejestr długów wg 561/2006 art. 8.6: każdy odpoczynek tygodniowy < 45 h generuje dług `(45 − długość)h` do oddania **en bloc** przed końcem 3. tygodnia; spłatę modelujemy **zachowawczo** (nadwyżka > 45 h spłaca najstarszy zaległy dług, błąd zaokrągla w stronę ostrzeżenia). Nowe: `WeeklyRestEvent`, `RestCompensationLedger`, `restCompensationLedger()`.
- `[#359]` 🚔 **B — Wirtualny inspektor 561** ([inspector.ts](packages/core/src/inspector.ts), **+13 testów**) — pre-kontrola PRZED drogówką: z bieżących wartości licznika wykrywa naruszenia czasu jazdy (ciągła 4 h 30, dobowa 9/10 h, tygodniowa 56 h, dwutygodniowa 90 h) i klasyfikuje wagę wg dyr. **2006/22/WE zał. III** (drobne / poważne / bardzo poważne) + `worst`/`clean`. Nowe: `inspectAetr()`, `Infringement`, `InspectionResult`.
- `[#359]` ⏱ **C — WTD 2002/15/WE** ([workTime.ts](packages/core/src/workTime.ts)) — reżim **ODRĘBNY** od 561: średnia tygodniowa ≤ 48 h w okresie rozliczeniowym (dom. 17 tyg.), maksimum 60 h w tygodniu, praca nocna ≤ 10 h/dobę; budżet „ile godzin do utrzymania średniej 48". Nowe: `WTD_LIMITS`, `wtdStatus()`, `weeklyWorkingFromEntries()`, `isoWeekKey()`.
- `[#359]` 🗓 **D — Terminy sczytań tachografu** ([tachoDownload.ts](packages/core/src/tachoDownload.ts), **+10 testów**) — rozp. (UE) **581/2010**: karta kierowcy co ≤ 28 dni, jednostka pojazdowa (tachograf) co ≤ 90 dni; z daty ostatniego sczytania liczy termin następnego + status **ok / wkrótce (≤7 dni) / po terminie**; zbiorczy przegląd floty z sortem po pilności. Nowe: `DOWNLOAD_LIMITS`, `checkDownload()`, `checkDownloads()`.

**Bramki:** vitest core **391/391** ✓ · biome czysto ✓ · bez migracji. **Faza 2 (następna):** wpięcie silników w ekran **Tacho** (mobile) i **/tacho** (web) + persistencja dat sczytań i zdarzeń odpoczynku.

## [1.202.0] — 🗺️ TomTom parytet web↔mobile: routing/geokoder/ruch na stronie + „po drodze" i „z GPS"

Domknięcie parytetu z #356: funkcje TomTom trafiły na **web** (dotąd tylko mobile) i doszły nowe UI/UX po obu stronach. Wszystko **klucz-gated** (web: `NEXT_PUBLIC_TOMTOM_KEY` klient + `TOMTOM_API_KEY` serwer; mobile: `EXPO_PUBLIC_TOMTOM_KEY`) — bez klucza mapa działa jak dotąd.

**Web — nowy parytet:**
- `[#358]` 🧭 **Routing TomTom** w [route.ts](apps/web/app/api/route/route.ts) — łańcuch HERE→TomTom→GraphHopper→mock; TomTom liczy ETA TIR z ruchem (myto doszacowane, bo TomTom zwraca 0).
- `[#358]` 🚧 **Warstwa incydentów TomTom** (korki/zamknięcia) jako overlay obok ruchu HERE — [/api/traffic](apps/web/app/api/traffic/route.ts) wariant TomTom + render w `map/page.tsx`.
- `[#358]` 🔎 **Geokoder TomTom** w wyszukiwarce mapy (`map/page.tsx`) i w formularzach ([PlaceSearch.tsx](apps/web/components/PlaceSearch.tsx)).
- `[#358]` ⛽🅿️ **„Paliwo/parking po drodze"** na mapie web — POI wzdłuż wytyczonej trasy (próbkowanie ≤100 pkt).

**Mobile — domknięcie funkcji:**
- `[#358]` 🚦 **Warstwa ruchu** (incydenty TomTom) na mapie + 🅿️ **„parking po drodze"** obok paliwa ([map.tsx](apps/mobile/app/map.tsx)).
- `[#358]` 📍 **„Z GPS" (reverse-geocode)** w formularzach — nowy [GeoFillButton](apps/mobile/components/GeoFillButton.tsx) wpięty w [kontrahentów](apps/mobile/app/manage-contractors.tsx) i [zlecenia](apps/mobile/app/manage-orders.tsx); [geoFill](apps/mobile/lib/geoFill.ts) używa TomTom z fallbackiem expo.

**Wspólne:**
- `[#358]` 🌍 **i18n:** +12 kluczy web ([pl](packages/i18n/src/locales/pl.ts)/[en](packages/i18n/src/locales/en.ts)) + 5 mobile ([mobile.ts](packages/i18n/src/mobile.ts) pl/en/de/uk) — parytet zielony.
- `[#358]` ⚙️ **Config:** `TOMTOM_API_KEY` + `NEXT_PUBLIC_TOMTOM_KEY` w [.env.example](.env.example) i [turbo.json](turbo.json).
- `[#357]` 🔧 **Play:** tor Android `internal → alpha` (zamknięty — liczy się do dostępu produkcyjnego dla konta prywatnego) + materiały strony sklepu i testu zamkniętego ([docs](docs/PLAY-CLOSED-TEST.md)).
- **Bramki:** `biome` ✓ · `tsc` web+mobile exit 0 ✓ · testy i18n **5/5** ✓ · **przegląd adwersarialny** (5 agentów) → 3 defekty naprawione: próbkowanie ≤100 (było 101 → 400 z TomTom), odtwarzanie warstw po zmianie podkładu, bbox trasy dla ruchu. Bez migracji.

## [1.201.0] — 🗺️ TomTom w aplikacji: geokoder, routing TIR z ruchem na żywo i „paliwo po drodze"

Użytkownik podłączył TomTom w konektorach i poprosił o połączenie aplikacji z funkcjami TomTom oraz rozwinięcie jej o te możliwości. Dodano pełny adapter TomTom w `@e-logistic/maps` i wpięto go w mapę mobilną — **addytywnie**: bez klucza mapa działa jak dotąd (MapTiler/OSM + web `/api/route`), z kluczem `EXPO_PUBLIC_TOMTOM_KEY` włączają się lepsze funkcje.

- `[#356]` 🧭 **Adapter routingu TomTom** ([tomtom.ts](packages/maps/src/tomtom.ts)) — `TomTomRoutingProvider` liczy trasę **TIR** (tryb `truck`, wymiary/tonaż/osie, `vehicleCommercial`) z **ruchem na żywo** (`traffic=true`), zwraca geometrię i odcinki płatne. Dopięte do fabryki ([factory.ts](packages/maps/src/factory.ts)) jako provider `"tomtom"` — web może go wybrać przez env.
- `[#356]` 🔎 **Search TomTom** ([tomtomSearch.ts](packages/maps/src/tomtomSearch.ts)) — geokoder fuzzy (adres/miasto/POI/marka), reverse-geocode (GPS → kraj/miasto/kod), POI w pobliżu oraz **wyszukiwanie WZDŁUŻ TRASY** (paliwo/parking po drodze, do 10 min objazdu). Geokoder wpięty w [geocode.ts](packages/maps/src/geocode.ts): priorytet TomTom → MapTiler → Nominatim.
- `[#356]` 🚦 **Incydenty ruchu TomTom** ([tomtomTraffic.ts](packages/maps/src/tomtomTraffic.ts)) — `tomtomTrafficIncidents(bbox)` z mapowaniem powagi (w tym zamknięcia dróg); gotowe pod warstwę ruchu.
- `[#356]` 📱 **Mapa mobilna wpięta w TomTom** ([map.tsx](apps/mobile/app/map.tsx)) — wyszukiwarka używa geokodera TomTom; „🧭 Wyznacz trasę" liczy trasę TIR **na urządzeniu** z ruchem na żywo (fallback do web `/api/route`); nowy przycisk **⛽ paliwo po drodze** pokazuje stacje wzdłuż wytyczonej trasy (zielone piny + karta POI).
- `[#356]` ⚙️ **Konfiguracja** — `EXPO_PUBLIC_TOMTOM_KEY` w [eas.json](apps/mobile/eas.json) (3 profile) i `.env.example` ([root](.env.example) + [mobile](apps/mobile/.env.example)); klucz klient-side (jak MapTiler), domenowo restrykcjonowany. Pusty klucz = zachowanie bez zmian.
- `[#356]` ✅ **Testy** — 12 nowych testów adaptera ([tomtom.test.ts](packages/maps/src/tomtom.test.ts)): budowa URL truck, parsowanie trasy, provider, geokoder, reverse, incydenty, geokoder z kluczem TomTom.
- **Bramki:** `biome` czysto ✓ · `tsc` (maps + mobile) exit 0 ✓ · testy maps **72** (+12 TomTom) ✓ · docs:check ✓ · bez migracji. **Aktywacja:** wklej klucz TomTom do `EXPO_PUBLIC_TOMTOM_KEY`.

## [1.200.0] — 🐛 KRYTYCZNE: znaleziona PRAWDZIWA przyczyna „nie da się zapisać" — `newId()` rzucał na telefonie

Użytkownik potwierdził na 1.86.0: „zupełnie nic się nie dzieje", wszystkie formularze. To wykluczyło sieć i klawiaturę — objaw był deterministyczny. Znaleziono twardą przyczynę:

- `[#355]` 💥 **`newId()` rzucał wyjątek na Hermes/React Native** ([ids.ts](packages/core/src/ids.ts)) — generator ID (od #003!) wymagał `crypto.randomUUID`, którego **silnik Hermes nie ma**. Jedyny wołający to outbox `enqueue` = **każdy zapis formularza** (tankowanie, AdBlue, trasa, checklisty, wydatki): klik → `newId()` rzuca natychmiast → zapis pada. Testy przechodziły, bo Node 26 ma `randomUUID` — telefon nie. **Fix:** fallback `getRandomValues` → `Math.random`, zawsze poprawny UUIDv4 (RFC 4122) + **4 testy regresji** symulujące środowisko Hermes.
- `[#355]` 🔇 **Dlaczego było „zupełnie nic":** submit w 4 formularzach miał `try/finally` **bez `catch`** — wyjątek ginął bez komunikatu, `busy` wracał na false. Dodano `catch` z widocznym błędem w [LiquidForm](apps/mobile/components/LiquidForm.tsx), [trip](apps/mobile/app/trip.tsx), [checklists](apps/mobile/app/(tabs)/checklists.tsx), [expenses](apps/mobile/app/expenses.tsx) — **żaden błąd zapisu nie może już być niewidzialny**.
- `[#355]` 📷 **Ta sama bomba w 8 miejscach packages/api** (upload zdjęć zleceń/szkód/checklist/wydatków, avatar, czat, dokumenty) — `crypto.randomUUID()` → `newId()` z fallbackiem; na telefonie te akcje też by rzucały.
- Poprzednie poprawki (#344 klawiatura, #354 timeouty) były realnymi błędami, ale **nie tą** przyczyną — usterka zapisu siedziała w generatorze ID od pierwszej wersji formularzy i ujawniała się wyłącznie na fizycznym urządzeniu.
- **Bramki:** `biome` czysto ✓ · `tsc` (mobile) exit 0 ✓ · testy core **352** (+4 regresji ids) + api 68 ✓ · docs:check ✓ · bez migracji.

---

## 📚 Archiwum

Starsze wydania (nie mieszczą się już w jednym pliku — `[#407]`):

- [**v1.100 – v1.199**](docs/changelog/v1.100-v1.199.md) — 103 wydania
- [**v1.0 – v1.99**](docs/changelog/v1.0-v1.99.md) — 112 wydań
- [**v0.1 – v0.99**](docs/changelog/v0.x.md) — 131 wydań
