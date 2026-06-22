<div align="center">

# 📜 CHANGELOG &nbsp;·&nbsp; E‑LOGISTIC

![Updaty](https://img.shields.io/badge/updaty-113-E50914?style=for-the-badge&labelColor=0a0a0a)
![Wersja](https://img.shields.io/badge/wersja-0.88.0-E50914?style=for-the-badge&labelColor=0a0a0a)

</div>

Format wg [Keep a Changelog](https://keepachangelog.com) + **numeracja updatów** `[#NNN]`.
Wersjonowanie: [SemVer](https://semver.org). Najnowsze na górze.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

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
