# 🔎 DISCOVERY_REPORT — E‑Logistic

> Rola: product designer + product manager. Tryb: **analiza istniejącego produktu, bez zmian w kodzie**.
> Metoda: inwentaryzacja wszystkich funkcji (35 tras web, 6 ekranów mobile, ~34 komponenty, 11 tras API,
> silnik `packages/core`, model danych ~40 tabel) → analiza po osiach → problemy z dowodem → spriorytetyzowane propozycje.
> Data: 2026‑07‑03 · stan kodu: v1.87.0 (#231).
> Zasada raportu: **fakt** ma dowód `plik:linia`; **[ZAŁOŻENIE]** to hipoteza do weryfikacji, nie pewnik.

---

## 1. Podsumowanie

E‑Logistic to dojrzały, szeroki system operacyjny dla małych/średnich firm transportowych (TIR, rynek PL/EU). W kodzie jest **znacznie więcej niż typowe MVP**: flota z mini‑P&L per pojazd, kartoteki kierowców z szyfrowaną tożsamością, karty paliwowe z PIN‑em w Vault, formularze offline‑first (outbox), zlecenia→CMR/POD→faktury VAT→Fakturownia, diety/czas pracy/wypłaty/szkody, routing ciężarówkowy z mytem na odcinki i danymi społecznościowymi, aplikacja mobilna kierowcy. Warstwa liczb (`packages/core`) jest deterministyczna i pokryta testami — to mocny, „nośny" fundament pieniędzy.

Największa obserwacja: **problem tego produktu to nie brak funkcji, lecz brak połączeń.** Inteligencja już policzona (rentowność, anomalie, emisje, atrybucja kosztów do klienta, alerty progowe) leży rozproszona po ~30 ekranach, które prawie się nie linkują. Druga obserwacja: system **każe wpisywać ręcznie dane, które już zna** (stawka €/km w rozliczeniach — mimo istniejącej, ale nieużywanej tabeli `rates`). Trzecia: **warstwa offline jest solidna, ale ma lukę integralności** (brak blokady podwójnego zapisu na mobile).

**Trzy największe okazje (skrót):**
1. **Ożywić dane, które system już ma** — domyślne stawki per pojazd (tabela `rates` istnieje, ale jest martwa) + zapamiętane myto → auto‑fill rozliczeń. Tani, pewny, natychmiastowy zwrot.
2. **Połączyć wyspy** — kontekstowe linki między encjami (zlecenie↔faktura, statystyki→karta pojazdu, profil kierowcy→jego godziny/diety/wypłaty). Odblokowuje istniejącą inteligencję bez liczenia niczego nowego.
3. **Domknąć pętlę dyspozytor↔kierowca** — „wyślij trasę kierowcy": web już liczy trasę TIR z mytem i przystankami, mobile ma push — brakuje tylko mostu i widoku trasy w kabinie.

---

## 2. Założenia o użytkownikach

Oparte na kodzie, `docs/DATA-MODEL.md`, `docs/ROADMAP.md`, rolach RLS. Gdzie to hipoteza — oznaczam.

- **Właściciel (owner)** — mikro/mała firma transportowa (1–30 pojazdów). Cel: wiedzieć „czy zarabiam i na czym", trzymać terminy (OC/przegląd/leasing/dokumenty), rozliczyć kierowców i wystawić faktury. Pracuje głównie na web, często wieczorem/„po trasie". Prawdopodobnie sam jest też dyspozytorem. **[ZAŁOŻENIE]** niski próg tolerancji na „klikanie po pięciu ekranach, żeby zrozumieć jedną liczbę".
- **Spedytor/dyspozytor (dispatcher)** — planuje trasy, przypisuje kierowców, pilnuje statusów. Cel: szybko wytyczyć trasę TIR z mytem, przypisać i mieć pewność, że kierowca wie co robić. **Nie** widzi PIN‑ów kart (RLS).
- **Kierowca (driver)** — w kabinie, w ruchu, częściowo bez zasięgu, czasem w rękawicach. Cel: w 20 sekund zapisać tankowanie/zdarzenie trasy, zobaczyć swoje zlecenie, zrobić zdjęcia + podpis POD. Używa **mobile**; web tylko sporadycznie. Krytyczne: działanie offline i minimum pisania.
- **Developer** — rola diagnostyczna (zagregowane liczniki, bez dostępu do danych firm).
- **Księgowa/biuro rachunkowe** — **[ZAŁOŻENIE]** nie ma własnego logowania; konsumuje eksporty CSV/PDF i Fakturownię, które robi owner. Stąd waga eksportów i rejestru VAT.

Multi‑tenant: tenant = firma; kierowca widzi tylko swoje rekordy, owner/dispatcher — swoją firmę (RLS).

---

## 3. Analiza funkcji (kluczowe ustalenia po osiach)

Zwięźle, per klaster. Pełne osie (cel/funkcjonalność/przepływ/GUI/stany/dostępność/wydajność/kontekst/braki) zebrane z analizy kodu; poniżej sygnał, nie cały zapis. Dowody jako `plik:linia`.

### 3.1 Flota i zasoby (pojazdy, kierowcy, karty, zespół, kontrahenci)
- **Pojazdy** — CRUD z bogatym formularzem (20+ pól, pogrupowany), lazy‑load kart na rozwinięciu, mini‑P&L na karcie pojazdu (`vehicles/[id]/page.tsx:279‑297`), wykresy paliwa/kosztów 6 mies., CSV. Stany (pusty/ładowanie/błąd) obsłużone przez `ListStatus`. **Braki:** tylko twarde usunięcie (brak archiwizacji), karta pojazdu ładuje 7 zapytań `Promise.all` bez progresji (`vehicles/[id]/page.tsx:110‑118`).
- **Kierowcy** — zaproszenie link+QR (7 dni), kartoteka `DriverRoster` z **szyfrowanymi** numerami dokumentów (reveal audytowany), kategorie/uprawnienia jako chipy, historia zleceń po powiązaniu konta. **Braki:** brak listy/odwołania aktywnych zaproszeń; chipy bez `aria-pressed`.
- **Karty paliwowe** — CRUD, **PIN w Vault**, reveal audytowany (`cards/page.tsx:122‑129`), `CardArt` (16 marek, bez logotypów — bezpieczne prawnie), wygasanie karty jest w „Co wymaga uwagi". **Braki:** brak historii transakcji kartą; reveal PIN bez stanu ładowania.
- **Zespół** — role (dispatcher/driver) + **moduły** (widoczność paneli) jako chipy; owner‑only. **Brak:** nie da się usunąć/dezaktywować członka.
- **Kontrahenci** — rejestr nabywców/nadawców, `DataTable` (sort + filtr + ARIA `aria-sort`/`scope`), auto‑uzupełnianie na fakturach. Solidne.
- **Weryfikacja mitu:** „QR biały na białym" (zgłoszone jako błąd) — **fałszywy alarm**: `drivers/page.tsx:115` celowo ustawia białe tło pod QR (skanowalność). Odrzucone.

### 3.2 Formularze kierowcy i offline
- **Paliwo/AdBlue (`LiquidForm`)** — walidacja Zod współdzielona web↔mobile, warunkowe pole karty, **podpowiedź ceny z ostatniego tankowania** (`LiquidForm.tsx:373‑388`) — świetny wzorzec, `isFull` do liczenia spalania, edycja przez `?edit=`. Offline: `enqueue()` + toast statusu.
- **Trip** — discriminated‑union Zod (pola zależne od akcji), **kontrola przeładowania** (waga > `maxPayloadKg` → `notifyCompany` + ostrzeżenie) — realny feature bezpieczeństwa/compliance (`forms/trip/page.tsx:144‑167`).
- **Historia** — miks outbox (lokalne) + baza w jednej liście, statusy `queued/synced/error`, retry/delete, CSV.
- **Outbox** — `localStorage` (web) / `AsyncStorage` (mobile), best‑effort sync; mobile ma `flushQueued()` na mount, **web nie ma auto‑flush po powrocie sieci** (`apps/web/lib/outbox.ts`).
- **Braki po osiach:** `PlaceSearch` bez nawigacji klawiaturą i ARIA `listbox` (`components/PlaceSearch.tsx`); walidacja dopiero na submit; brak „powtórz ostatni wpis".

### 3.3 Zlecenia i dokumenty
- **Orders** — pełny CRUD, przypisanie kierowcy + **natychmiastowy push dual‑channel** (web+Expo, best‑effort), statusy, CMR/POD (druk), faktura z `delivered`, `CargoPhotos`, eksport CSV + „giełda". **Braki:** zmiana statusu = pełny `load()` (`orders/page.tsx:255`, brak optimistic UI); brak historii zmian statusu; relacja zlecenie↔faktura niepokazana w UI.
- **My‑orders (kierowca)** — skupiony widok, status context‑aware, CMR, mapa przez query. **Braki:** brak POD, filtrów, historii dostarczonych.
- **Faktury** — numeracja bez luk (advisory lock), pozycje z triggerami, rejestr VAT wg stawek, statusy płatności (unpaid/overdue/paid), duplikat, **eksport do Fakturowni z bezpiecznym tokenem** (`api/fakturownia/export`). **Braki:** brak noty korygującej/proformy; link do źródłowego zlecenia niepokazany.
- **Dokumenty** — sejf (prywatny bucket, signed URL), kategorie, terminy z kolorami. **Damages** — rejestr OC, statusy, koszt wielowalutowo; **brak zdjęć/dokumentów szkody**. **Service** — interwały km/mies., status z licznika; **brak kosztu i historii serwisu**.

### 3.4 Pieniądze, rozliczenia, raporty
- **Settlements** — rentowność trasy per pojazd/okres; matematyka `round2()` poprawna; CSV + druk. **Problem rdzenia:** stawka €/km i myto wpisywane **ręcznie za każdym razem** (`settlements/page.tsx:57,232`).
- **Monthly** — okno 6 mies., delta m/m (komponent `Delta` z `invert` dla kosztów), rejestr kosztów księgowy wg kategorii, diety osobno per waluta. **Uwaga:** przychód sumuje tylko EUR, inne waluty **cicho pomijane**.
- **Stats** — bogaty pulpit: flota KPI, P&L, ranking pojazdów, top klienci/trasy, **anomalie spalania**, **emisje CO₂ per pojazd i per klient**, alerty (`fleetAlerts`), **drill‑down** do pojazdu. To już jest zaawansowana analityka.
- **Per‑diem / Work‑time / Payouts** — kalkulatory diet, ewidencja czasu (alert >10h), salda kierowcy per waluta + `PayoutDoc`. **Problem wspólny:** kierowca to **wolny tekst** (`driver_name`), nie encja → duplikaty (Adam/adam), brak połączenia z profilem; wsady O(n) + pełny reload.
- **Fuel‑prices** — ceny diesla EU (OpenVan.camp), top 12; statyczne, bez powiązania z tankowaniami/trasą.

### 3.5 Mapa i routing
- **Mocny fundament:** abstrakcja `RoutingProvider` z adapterami **HERE → GraphHopper → mock** i graceful degradation (flagi `tollEstimated`/`durationEstimated`/`fallback`); **routing TIR** z wymiarami/masą/osiami; **myto per odcinek** (`multileg.ts`); POI (Overpass), ruch na żywo (HERE Traffic z jamFactor), utrudnienia społecznościowe w promieniu trasy; `shareRoute` (kopiuj link), prefill `?from=&to=`, integracja **fleet‑status → mapa** (`fleet-status:128‑133`). To jest realnie różnicujące.
- **Braki (kandydaci na feature):** brak **ETA per przystanek** (jest tylko suma czasu), brak **zapisu tras** (każdy plan ulotny — tylko URL), brak **wysłania trasy kierowcy**, brak reroute/turn‑by‑turn (te dwa są w Roadmap Faza 4 — znane).

### 3.6 Powłoka, auth, platforma
- **Auth** — 4 metody (hasło, magic link, passkey, OAuth) + wymuszane 2FA TOTP; solidne. **Reset** bez potwierdzenia hasła/wskaźnika siły.
- **Nawigacja** — **28–32 pozycje**, ale **świadome roli i modułów** (`AppLayout:62‑121`), pogrupowane (Zlecenia/Formularze/Flota/Finanse/Ustawienia). Gęste, bez ikon/hierarchii wizualnej; brak breadcrumbs.
- **GlobalSearch (Ctrl/⌘+K)** — pallet: encje (pojazdy/kierowcy/zlecenia/faktury) + nawigacja + akcje, lazy index, role‑aware. **Bardzo dobre — chronić.** Braki: brak `role="combobox"`/live‑region, brak debounce.
- **Dashboard** — role‑aware: `CompanyBanner`, `OnboardingChecklist` (4 kroki), `KpiStrip` (wynik miesiąca/diety/saldo/do zafakturowania), `RevenueTrend`, **`AttentionPanel`** (agreguje 7 źródeł terminów: pojazdy/karty/serwis/dokumenty/faktury/szkody/kierowcy, sort wg pilności). `NotificationBell` real‑time (Supabase). **Chronić — to jest proaktywna warstwa uwagi.** Braki: brak szkieletów/empty‑state (renderują `null`).
- **Audit** — owner‑only, akcje na czytelne etykiety; brak zakresu dat/eksportu/podglądu aktora (UUID).

### 3.7 Mobile kierowcy
- **6 ekranów:** login, pulpit, moje zlecenia (statusy + zdjęcia + podpis POD), paliwo, AdBlue, trip. Outbox **widoczny** dla kierowcy (⏳/✅/⚠️ + błąd) — `LiquidForm.tsx:122‑134`, `trip.tsx:157‑170`. Podpis jako wektor SVG, zdjęcia z aparatu (`capture`), push z deep‑linkiem.
- **Weryfikacja mitu:** **brak blokady in‑flight** na zapisie (`apps/mobile/components/LiquidForm.tsx:38,117` — brak `busy`/`disabled`) → podwójne dotknięcie = **dwa różne wpisy** (nowy UUIDv7 każdorazowo; idempotencja z #222 dotyczy retry tego samego id, nie dwóch tapnięć). **Realny błąd integralności.**
- **Parytet:** brak mapy (Faza M3), brak CMR PDF, **trip bez GPS/PlaceSearch** (web ma `fillGps`), brak „powtórz ostatni wpis".

---

## 4. Problemy i okazje (z dowodem)

Każdy: **co** (dowód) + **dlaczego** (cel użytkownika, który cierpi). To surowiec propozycji.

| # | Problem (co + dowód) | Dlaczego to problem (czyj cel cierpi) |
|:--|:--|:--|
| **P1** | **Inteligencja rozproszona, brak linków kontekstowych.** settlements/monthly/stats/per‑diem/payouts nie linkują się wzajemnie; zlecenie↔faktura niepokazane (`orders`); stats/reports nie prowadzą do karty pojazdu, choć ta istnieje (`vehicles/[id]`). Nawigacja 28–32 poz. | Owner/dispatcher, by odpowiedzieć „dlaczego pojazd X ma marżę 5%?" lub „która faktura dotyczy zlecenia Y?", ręcznie skacze po 4–5 ekranach. Częste, codzienne tarcie. |
| **P2** | **Ponowne wpisywanie znanych danych.** Stawka €/km i myto w rozliczeniach wpisywane co raz (`settlements/page.tsx:57,232`). Tabela **`rates` (rate_per_km per pojazd) istnieje w schemacie, ale jest MARTWA** — `rate_per_km` nie występuje w kodzie poza wygenerowanym `packages/api/src/database.types.ts` (grep). | Owner robiący rozliczenia miesięczne per pojazd — powtarzalny błąd i niespójność (brak nawet walidacji stawka<0). Dane już „są w firmie", a i tak trzeba je pamiętać. |
| **P3** | **Każda mutacja = pełny refetch; brak optimistic UI; wsady O(n).** Zmiana statusu zlecenia → `load()` (`orders/page.tsx:255`); payouts/per‑diem/work‑time wstawiają wiersze pętlą + reload; mobile status → reload. | Dyspozytor zmieniający wiele statusów / owner zapisujący pozycje wypłat odczuwa lag. Wpływ realny przy większym wolumenie (dziś umiarkowany). |
| **P4** | **Ryzyko duplikatów przy zapisie offline.** Mobile `LiquidForm.submit()` bez blokady (`apps/mobile/components/LiquidForm.tsx:38,117`); web outbox bez dedup; #222 dedupuje tylko retry tego samego id. **(zweryfikowane)** | Kierowca w słabym zasięgu dotyka „Zapisz" dwa razy → dwa tankowania → **zafałszowane spalanie** (nośna matematyka pieniędzy). Defekt integralności danych. |
| **P5** | **Kierowca w HR to wolny tekst, nie encja.** payouts/per‑diem/work‑time trzymają `driver_name` (string) (DATA‑MODEL 0047/0048/0050); `drivers.user_id` (0035) istnieje, ale te tabele go nie używają. | Duplikaty i rozjazd sald (Adam/adam); nie da się z profilu kierowcy zobaczyć jego godzin/diet/wypłat. Cel owner: jeden spójny obraz kierowcy. |
| **P6** | **Mobile: luki parytetu bolące w kabinie.** Trip bez GPS/PlaceSearch (mobile), brak „powtórz ostatni wpis" (web+mobile), brak mapy/trasy, brak CMR PDF. | Kierowca w ruchu wpisuje kraj/lokalizację ręcznie; powtarza całe formularze dla rutynowych tras; nie widzi zaplanowanej trasy. Cel: minimum pisania, maksimum offline. |
| **P7** | **Trasy ulotne; brak zapisu i przekazania.** Mapa ma tylko `shareRoute` (URL), brak tabeli tras, brak push‑do‑kierowcy, brak ETA per przystanek (mapa: luki). | Dyspozytor wielokrotnie planuje te same relacje; nie potrafi przekazać planu kierowcy ani obiecać okna dostawy klientowi. |
| **P8** | **Braki dostępności i stanów brzegowych.** `PlaceSearch`/`GlobalSearch` bez nawigacji klawiaturą i ról ARIA (combobox/listbox); modale bez focus‑trap; dashboard KPI/`AttentionPanel` renderują `null` zamiast szkieletu/empty‑state. | Użytkownik klawiatury/czytnika nie użyje wyszukiwarki; nowa firma widzi „pusty" pulpit bez sygnału „co dalej". |

**Okazje pozytywne (nie problemy):** dane cen diesla + tankowania (możliwa realna oszczędność paliwa), dane czasu pracy/zdarzeń trasy (możliwe auto‑podpowiedzi diet), policzona atrybucja kosztów do klienta (gotowa do lepszej ekspozycji).

---

## 5. Co działa — chronić (nie ruszać)

Analiza, która widzi tylko problemy, psuje to, co dobre. Te elementy są mocne i **nie powinny być przedmiotem redesignu**:

1. **Offline‑first outbox** z **widocznymi** stanami `queued/synced/error` (web+mobile) i przetestowaną deduplikacją retry (#222). Rdzeń wartości dla kierowcy.
2. **Silnik liczb `packages/core`** — `vehiclePnl`, `profitability` (atrybucja kosztu do klienta), `fleetAlerts`, `co2`, `fuelTrend`, `perDiem`, `payouts`, `expiry`/`cardExpiry` — deterministyczny, testowany. Nie przepisywać; **eksponować**.
3. **`AttentionPanel` + `NotificationBell`** — proaktywna warstwa uwagi (7 źródeł terminów, sort wg pilności, real‑time). To już rozwiązuje „przypomnienia" — **nie proponować generycznych powiadomień**.
4. **Abstrakcja routingu (HERE→GraphHopper→mock)** z graceful degradation i **mytem per odcinek** dla TIR. Realnie różnicujące, czyste architektonicznie.
5. **GlobalSearch (Ctrl/⌘+K)** — pallet encji + nawigacja + akcje. Właściwa odpowiedź na gęstą nawigację; rozwijać, nie zastępować.
6. **Bezpieczeństwo** — PIN‑y i PII kierowcy szyfrowane (Vault), reveal audytowany, `audit_log` + podgląd. Wzorcowe dla tej klasy produktu.
7. **Kontrola przeładowania** na formularzu trip (waga > ładowność → `notifyCompany`).
8. **Fakturowanie** — numeracja bez luk (advisory lock), rejestr VAT, eksport do Fakturowni z bezpiecznym tokenem.
9. **POD** — zdjęcia + podpis (wektor) web i mobile, signed URL, parsowalny caption.
10. **Współdzielone schematy Zod** web↔mobile i role‑aware nawigacja/dashboard.

---

## 6. Propozycje

Pola: **Problem** (z Fazy 2) · **Propozycja** · **Dla kogo/cel** · **Wpływ** · **Koszt (S/M/L)** · **Ryzyko/wykonalność** · **Pewność/założenie**.
Maks. ~6–8 na wiadro; słabe pomysły celowo odcięte (patrz §7).

### A. Usprawnienia istniejącego (tanie, duży zwrot)

| ID | Problem | Propozycja | Dla kogo / cel | Wpływ | Koszt | Ryzyko / wykonalność | Pewność |
|:--|:--|:--|:--|:--|:--:|:--|:--|
| **A1** | P2 | **Ożywić tabelę `rates`**: owner ustawia domyślną stawkę €/km per pojazd (i firmowy fallback); rozliczenia/monthly auto‑wypełniają ją + zapamiętują ostatnie myto per pojazd. Walidacja stawka/myto ≥ 0. | Owner/księgowość — szybkie, spójne rozliczenia | **Wysoki** | **S–M** | Niskie — tabela i typy już istnieją; brak tylko UI + odczytu | **Wysoka** (zweryfikowane: tabela martwa) |
| **A2** | P4 | **Blokada in‑flight** na zapisie formularzy (mobile: `busy`+`disabled` na Pressable; web: disabled + dedup po kliencie). | Kierowca — brak zdublowanych tankowań | **Wysoki** (integralność) | **S** | Niskie — lokalna zmiana | **Wysoka** (zweryfikowane) |
| **A3** | P3 | **Optymistyczna zmiana statusu zlecenia** (web owner, my‑orders, mobile) zamiast pełnego `load()`; rollback na błędzie. | Dyspozytor/kierowca — płynność | Średni | **S–M** | Niskie | Wysoka |
| **A4** | P1 | **Linki kontekstowe między encjami**: zlecenie→faktura (i wstecz), stats/monthly/settlements→karta pojazdu, profil kierowcy→jego godziny/diety/wypłaty, „pokaż na mapie" ze zlecenia. | Owner/dispatcher — mniej skakania | **Wysoki** | **M** (wiele miejsc, mechanicznie proste) | Niskie — reużywa istniejące trasy `?edit=`/`?from=` | Wysoka |
| **A5** | P6 | **„Powtórz ostatni wpis"** w paliwo/adblue/trip (web+mobile) — prefill z ostatniego wpisu pojazdu (poza licznikiem). | Kierowca — rutyna powtarzalnych tras | Średni–wysoki | **S** | Niskie | Średnia — [ZAŁOŻENIE] rutyna powtarzalna; łatwe do potwierdzenia |
| **A6** | P8 | **Klawiatura + ARIA**: `PlaceSearch`/`GlobalSearch` jako `combobox`+`listbox` (↑↓/Enter/Esc), focus‑trap w modalach; **empty/skeleton** na `KpiStrip`/`RevenueTrend`/`AttentionPanel`. | Użytkownicy klawiatury/czytnika + nowa firma | Średni | **M** | Niskie | Wysoka |
| **A7** | P6 | **GPS + PlaceSearch w mobilnym trip** (parytet z web `fillGps`). | Kierowca — mniej pisania w kabinie | Średni | **S–M** | Niskie, ale zależy od `expo-location` (do dodania) | Średnia (zależność) |

### B. Rozszerzenia funkcji (naturalny kolejny krok)

| ID | Problem | Propozycja | Dla kogo / cel | Wpływ | Koszt | Ryzyko / wykonalność | Pewność |
|:--|:--|:--|:--|:--|:--:|:--|:--|
| **B1** | P5 | **Kierowca jako encja w HR**: picker z kartoteki zamiast wolnego tekstu w payouts/per‑diem/work‑time; wiązanie `driver_id`. Odblokowuje agregaty i linki (A4). | Owner — jeden spójny obraz kierowcy | Średni–wysoki | **M** | Średnie — migracja historycznych `driver_name`→FK (mapowanie/duplikaty) | Wysoka |
| **B2** | P1/P7 | **Oś czasu statusu zlecenia** (`order_status_history`) + widoczny link do faktury na zleceniu. | Owner/dispatcher — audyt „kto/kiedy zmienił" | Średni | **M** | Niskie | Wysoka |
| **B3** | P7 | **Zapis tras w bazie** (`routes`) + „moje trasy" do reużycia; powiązanie z pojazdem/zleceniem. | Dyspozytor — powtarzalne relacje | Średni | **M** | Niskie | Średnia — [ZAŁOŻENIE] powtarzalność relacji |
| **B4** | P7 | **ETA per przystanek** na trasie (kumulacja czasów segmentów — dane już liczone w `multileg`). | Dyspozytor — okna dostaw dla klienta | Średni | **S–M** | Niskie — dane są, brak tylko ekspozycji | Wysoka |
| **B5** | P1 | **Auto‑podpowiedź diet** z zarejestrowanego czasu pracy / zdarzeń trasy (per‑diem ← work‑time/trip). | Owner/księgowość — mniej podwójnego wpisu | Średni | **M** | Średnie — reguły diet muszą być poprawne | Średnia |
| **B6** | (damages) | **Zdjęcia + dokumenty przy szkodzie** (`damage_claims`) — dowód do OC (reużyć wzorzec `CargoPhotos`/bucket). | Owner — likwidacja szkód | Średni | **S–M** | Niskie — wzorzec istnieje | Wysoka |

### C. Nowe funkcje (poparte celem/luką)

| ID | Problem | Propozycja | Dla kogo / cel | Wpływ | Koszt | Ryzyko / wykonalność | Pewność |
|:--|:--|:--|:--|:--|:--:|:--|:--|
| **C1** | P6/P7 | **„Wyślij trasę kierowcy"** — dyspozytor planuje na web (trasa+przystanki+myto już liczone), kierowca dostaje push + **widok trasy/stopów na mobile**. Domyka pętlę dyspozytor↔kierowca. | Dyspozytor + kierowca — rdzeń współpracy | **Wysoki** | **L** | Średnie — wymaga ekranu mapy na mobile (MapLibre RN, Faza M3) | Wysoka co do potrzeby; koszt duży |
| **C2** | (fuel‑prices) | **Tankowanie świadome ceny** — na trasie/rozliczeniu pokaż cenę diesla wg kraju (dane już są) i „taniej zatankować w DE za X km". | Kierowca/owner — realna oszczędność (paliwo = największy koszt) | Średni | **M–L** | Średnie — wymaga lokalizacji/tras; [ZAŁOŻENIE] wpływ na zachowanie | Średnia |
| **C3** | (invoices) | **Nota korygująca + proforma** — uzupełnienie cyklu faktur VAT (dziś brak). | Owner/księgowość — zgodność i praktyka PL | Średni | **M** | Średnie — poprawność VAT/prawo | Średnia |
| **C4** | (fleet‑status) | **Pozycja pojazdu na mapie floty na żywo** — mobile wysyła okresowo GPS; fleet‑status pokazuje realny punkt (dziś tylko „ostatnie zdarzenie"). | Dyspozytor — „gdzie jest ciężarówka" | Średni–wysoki | **L** | ⚠️ **WYSOKIE — prywatność/RODO**: śledzenie pracownika wymaga podstawy prawnej, zgody i przejrzystości; ryzyko regulacyjne | Średnia — **do rozstrzygnięcia prawnego przed budową** |

---

## 7. Priorytety

### Jeśli zrobić tylko 5 rzeczy (kolejność wg wpływ/koszt)

1. **A2 — blokada in‑flight (S).** Najtańsze i naprawia realny defekt integralności (zdublowane tankowania psują spalanie = rdzeń pieniędzy). Zaczynamy od „nie psuj danych".
2. **A1 — domyślne stawki (ożyw `rates`) (S–M).** Wysoki, pewny zwrot; tabela i typy już istnieją, brakuje tylko UI + odczytu. Usuwa codzienne tarcie i źródło błędów w rozliczeniach.
3. **A5 — „powtórz ostatni wpis" (S).** Tani, wysoka częstotliwość, dotyka najliczniejszej grupy (kierowcy) w ich głównej czynności.
4. **A4 — linki kontekstowe (M).** Największa dźwignia „odblokuj to, co już policzone" — spina wyspy bez liczenia niczego nowego. Reużywa istniejące trasy `?edit=`/`?from=`.
5. **A3 — optymistyczne statusy (S–M).** Płynność najczęstszej interakcji dyspozytora/kierowcy.

**Dlaczego te:** wszystkie mają wysoki stosunek wpływ/koszt, są nisko‑ryzykowne i opierają się na tym, co już istnieje (tabela `rates`, silnik core, trasy z parametrami). To „szybkie, pewne, nie‑psujące" wygrane, które od razu poprawiają codzienny przepływ obu głównych ról.

**Strategiczny zakład poza top‑5:** **C1 („wyślij trasę kierowcy")** — największy skok wartości produktu (domyka pętlę dyspozytor↔kierowca), ale koszt L i zależność od ekranu mapy na mobile (Faza M3). Rekomendacja: zaplanować jako kolejny większy kamień milowy po quick‑winach, razem z **B1** (kierowca jako encja) i **B4** (ETA per przystanek), które są jego naturalnym otoczeniem.

### Czego świadomie NIE proponuję (i dlaczego)

- **Generyczne „powiadomienia / dark mode / dodaj AI / gamifikacja"** — dark mode i przełącznik już są; proaktywne przypomnienia rozwiązuje `AttentionPanel`+`NotificationBell`; heurystyka `guessDefectPart` i silnik analityki już pełnią rolę „AI‑lite". Brak zaobserwowanej potrzeby → odcinam.
- **Budżety, prognozy, porównania rok/rok, benchmarking floty** (z listy życzeń analizy pieniędzy) — `stats` ma już delty m/m, 24‑mies. trend i alerty; prognozowanie to spekulacja o dużym koszcie i niskiej pewności wartości dla mikro/małej floty. Odcinam do czasu realnego sygnału popytu.
- **PowerSync, offline‑map cache, turn‑by‑turn, reroute, OCR paragonów** — to znane pozycje Roadmap (🔜/Faza 4). Nie udaję, że to nowe odkrycia; nie dubluję planu.
- **Paginacja/virtual scroll wszędzie** — realne dopiero przy dużych zbiorach; floty SMB to zwykle <100 rekordów per lista. Przedwczesne; **[ZAŁOŻENIE]** małe wolumeny — jeśli pojawią się firmy z 1000+ rekordów, wraca jako priorytet.
- **„Szyfruj AsyncStorage / NIP jako PII / RODO plaintext"** (zgłoszone przez analizę) — **fałszywe ramy**: NIP to dane firmowe, nie PII; PII kierowcy jest już szyfrowane (Vault); outbox to logi paliwa o niskiej wrażliwości. Nie‑problem → odcinam.
- **Bulk‑akcje na zleceniach, harmonogram zmian kierowców** — niska częstotliwość dla SMB; kuszące, ale słaby zwrot teraz. Odkładam.

---

## 8. Luki (czego nie dało się ocenić)

- **Brak realnych danych / konta testowego.** Strony z danymi nie renderują się offline (znane z tej sesji), więc **nie oceniano UX na realnych danych, odczuwalnej wydajności przy prawdziwym wolumenie, ani rzeczywistych czasów HERE/Supabase.** Priorytety oparte na strukturze kodu, nie na analityce użycia.
- **Brak danych o częstotliwości interakcji** (ile statusów/dzień, ile rozliczeń/mies., ilu kierowców na firmę). Kalibracja „Wpływ" to osąd, nie pomiar — stąd oznaczenia **[ZAŁOŻENIE]**.
- **Ścieżki wymagające kluczy API** (HERE routing/traffic, MapTiler, Fakturownia, Tankerkönig) oceniane **z kodu**, nie z żywego działania.
- **Dostępność** oceniana z kodu (obecność ról/atrybutów ARIA, obsługi klawiatury), **bez testów na czytniku ekranu / realnej nawigacji klawiaturą**.
- **Zgodność reguł diet i czasu pracy z aktualnymi przepisami** — kod sam zaznacza „to nie interpretacja prawna"; nie weryfikowano zgodności regulacyjnej.
- **Czy `orders` linkuje bezpośrednio do mapy** przez `?from=&to=` — sygnały sprzeczne między analizą zleceń a mapy; drobne, do potwierdzenia.
- **Realny wolumen list** (czy istnieją firmy z >1000 rekordów) — determinuje, czy paginacja jest przedwczesna czy pilna.

---

### Załącznik: szkice
Low‑fi szkice trzech najmocniejszych propozycji (A1, A4, C1) — w katalogu [`./sketches`](sketches/). Ilustrują pomysł na realnych etykietach; to nie redesign i nie wdrożenie.
