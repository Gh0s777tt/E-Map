# 🗺️ Roadmapa — E‑Logistic

> Status: **w realizacji** · stan na v1.248.0 (#419) · 2026-08-19
> Zasada: każda faza = działający przyrost. Część zarobkowa (Faza 1) **nie wymaga drogich API map**.
>
> **Stan dostarczenia** (autorytatywnie: [CHANGELOG](../CHANGELOG.md)):
> - ✅ **Faza 1** (rdzeń właściciela) · ✅ **Faza 2** (mapa podstawowa) — zrealizowane. **Faza 0** (fundament) — kod i bramki gotowe, ale warunek „CI zielone" pozostaje niespełniony z powodów **spoza repo** (bloker #414, patrz niżej), więc faza nie jest odhaczona na ✅.
> - 🚧 **Faza 3** (społeczność/dane) — częściowo: zgłoszenia realtime na mapie + crowd‑ceny paliw + przypomnienia OC/przegląd/dokumenty + **oceny/udogodnienia parkingów (web #308, mobile #323)** działają; otwarta zostaje wyłącznie warstwa akceptacji kart paliwowych na stacjach (SNAP/Travis).
> - ⏳ **Faza 4** (premium) — 3D/satelita ✅, reroute z ruchem ✅, OCR paragonów ✅; asystent pasa/HUD — planowany.
> - ➕ **Fazy 5–7 (poza pierwotnym planem, v1.20x–v1.24x):** moduł formularzy z importem/eksportem Excela i normalizacją krajów · statystyki pieniężne po kursach ECB (koniec z filtrowaniem do EUR) · **zwrot VAT za paliwo** per kraj · koszty operacyjne w rachunku wyjazdu · profil pojazdu z kartoteki w routingu (osie/ADR/klasa emisji) · adapter **TomTom** · mapa w aplikacji mobilnej · statystyki awaryjności floty (#403) · linki firmowe dla kierowcy (#404) · **naczepa jako osobna encja** z własnymi terminami (#405) · trasa liczona dla ZESTAWU, nie dla samego ciągnika (#406).
> - ➕ **Ponad pierwotny plan (v1.0–1.50):** zlecenia + CMR/POD, faktury VAT (status/płatności/pozycje/duplikat/Fakturownia), rentowność klientów i pojazdów, diety, czas pracy, wypłaty, szkody/OC, serwis, sejf dokumentów, kontrahenci, alerty progowe, powiadomienia in‑app + push (web/Expo), **aplikacja mobilna kierowcy**, 2FA TOTP, passkeys, szyfrowanie PII, rate‑limiting, generowane typy DB, bramka RLS w CI.
> - ⚠️ Wyjątki vs pierwotny plan: offline‑first przez **outbox** (localStorage/AsyncStorage) — PowerSync jest w mobile od #311, ale **tylko do odczytu**, więc źródłem prawdy dla zapisów pozostaje outbox (fala 2 = przepięcie zapisów); zaproszenia **link/QR/e‑mail**, bez SMS/WhatsApp; i18n **web PL/EN, mobile PL/EN/DE/UK** (docelowo ×14).
> - 🛑 **Wstrzymane nie przez kod, tylko przez decyzję poza repo:** strefy niskiej emisji (LEZ) i weekendowe zakazy ruchu — **żaden zintegrowany dostawca tych danych nie oddaje**, więc potrzebne jest źródło (zakup albo własny zbiór); język etykiet na mapie — domyślny podkład jest rastrowy, nazwy są wypalone w kafelkach, więc zmiana wymaga podkładu wektorowego. Trzymanie tego na liście jako zwykłego zadania sugerowałoby, że wystarczy usiąść i napisać kod — nie wystarczy.
>
> *Checkboxy poniżej zaktualizowane do stanu faktycznego: `[x]` = dostarczone, `[~]` = częściowo, `[ ]` = pozostaje.*

---

## Faza 0 — Fundament 🧱

**Cel:** szkielet repo gotowy do pracy, spójny z resztą repo.

- [x] Monorepo (Turborepo + pnpm), `apps/web`, `apps/mobile`, `packages/*`.
- [x] Konfiguracja: TypeScript 6 strict, Biome, tsconfig bazowy, `.env.example`.
- [x] Supabase: projekt, schema startowa + RLS (companies, users, memberships), PostGIS.
- [x] Auth: e-mail/hasło + magic link (passkeys + 2FA ponad plan; Google/Apple — opcjonalnie).
- [x] Motyw red/black (`packages/ui` tokeny), i18n PL+EN (reszta dokładana).
- [~] CI: bramka jakości (biome, tsc ×7, testy, build, `docs:check`) biegnie **w obu miejscach** —
      w [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) od #414 i nadal w jobie `quality`
      w [`.gitlab-ci.yml`](../.gitlab-ci.yml). To duplikat świadomy, nie przeoczenie: dopóki żadna
      z platform nie daje pewności wykonania (patrz ostrzeżenie niżej), skasowanie jednej strony
      groziłoby brakiem bramki w ogóle. Joby wymagające sekretów albo pełnej historii — `gitleaks`,
      SAST, `db-types`, `rls` — są wyłącznie po stronie GitLaba. `codeql.yml` **istniał**: dodany
      razem z `ci.yml` w 2ceae97 (Faza 0, #002), rozszerzony o `workflow_dispatch` w 30a214d,
      usunięty przy przenosinach na szablony GitLab w 48062f8 (2026-07-17). Przez ten miesiąc kod
      Faz 0–1 był realnie skanowany CodeQL-em, a `ci.yml` rozwijany (#125 audyt RLS, #195
      `docs:check`, #254/#262 Playwright) — przywrócenie SAST na GitHubie zaczyna się więc od
      `git show 30a214d:.github/workflows/codeql.yml`, nie od pustego pliku.
- [x] README/CHANGELOG/CLAUDE + tagowanie `v0.x` + GitHub Releases.

**Done gdy:** `pnpm install && pnpm build` przechodzi; logowanie działa; CI zielone.

> ⚠️ **Ostatni warunek nie jest spełniony i nie da się go spełnić z repo** (bloker #414, szerzej
> w [BACKLOG](BACKLOG.md)): pliki CI są po obu stronach poprawne, ale **nie ma gdzie ich wykonać** —
> GitLab odbija joby na `ci_quota_exceeded`, a GitHub trzyma przebiegi w `queued` i nie przydziela
> runnerów temu kontu. Blokada jest rozliczeniowa, nie techniczna. Do czasu odblokowania realną
> bramką jest lokalne `pnpm check` + `next build`.

---

## Faza 1 — Rdzeń dla właściciela 💰 (najwyższy zwrot)

**Cel:** realny, sprzedawalny produkt bez kosztów API map. Web + mobile równolegle.

- [x] **Pojazdy**: CRUD z pełnymi danymi (wymiary, przeglądy, OC, leasing, VIN, spedycja).
- [x] **Kierowcy + zaproszenia**: link/QR + e‑mail, przypisanie do pojazdu (SMS/WhatsApp — świadomie pominięte).
- [x] **Karty paliwowe**: katalog dostawców, przypisanie osoba+pojazd, rabaty; **PIN szyfrowany** (Vault, odczyt audytowany).
- [x] **Formularze offline-first**: Paliwo, AdBlue, Trip (wszystkie akcje) — outbox (localStorage/AsyncStorage; PowerSync w mobile od #311, ale na razie tylko odczyt — zapisy dalej outboxem).
- [x] **Historia + edycja** formularzy z rewizjami; podgląd własnych wysłanych (kierowca).
- [x] **Statystyki/rozliczenia**: spalanie, koszt po rabatach, AdBlue, uszkodzenia, stawka/km, **zysk z trasy**.
- [x] **Panele ról**: owner / spedytor / kierowca / developer.

**Done gdy:** kierowca offline wypełnia 3 formularze i synchronizuje; właściciel widzi
statystyki i zysk per pojazd; rozliczenia pokryte testami jednostkowymi.

---

## Faza 2 — Mapa podstawowa 🗺️

**Cel:** routing ciężarówkowy z mytem i POI (hybryda MapLibre + HERE/GraphHopper).

- [x] MapLibre render + styl red/black (dzień/noc), web + **mobile**: fala 1 (#253) render/lokalizacja/POI,
      fala 2 (#272) warstwa trasy odebranej z panelu, wyszukiwanie adresu i trasa TIR z `/api/route` (#341),
      a od #356 telefon **liczy trasę sam** (TomTom on-device z ruchem, web jako fallback) — mapa
      mobile nie jest już tylko podglądem tego, co policzył panel.
- [x] `RoutingProvider` + adaptery **HERE → TomTom → GraphHopper → mock**; profil pojazdu
      **czytany z `vehicles`** (gabaryty, masa, osie, ADR, klasa emisji), a nie ze stałych w ekranie.
- [x] Trasa z przystankami (adres dostawy + stopy: parking/stacja).
- [x] Omijanie: kraje (np. CH/NO), myto, promy, drogi gruntowe.
- [x] **Myto z podziałem na odcinki** + koszt trasy.
- [x] POI z OSM → PostGIS; pełny adres + GPS (Truck Parking Europe — opcjonalnie później).
- [x] Geokodowanie GPS→kraj/miasto (autouzupełnianie lokalizacji w formularzach).

**Done gdy:** wytyczenie trasy TIR z omijaniem kraju i wyceną myta na odcinki działa na web+mobile.

---

## Faza 3 — Społeczność i dane 📡

**Cel:** dane, których nie kupujemy — przewaga produktu.

- [x] Zgłoszenia realtime (wypadek/policja/waga/korek/zamknięcie) + wygasanie/głosy.
- [x] **Crowd-ceny paliw** z `fuel_logs` + ceny diesla EU → warstwa cen na mapie.
- [x] Oceny i udogodnienia parkingów — web (#308: gwiazdki 1-5 + 🚿🚻🍽🛡 w dymku POI) **oraz mobile (#323**, `components/ParkingReviewCard.tsx` — te same dane, jedna ocena na użytkownika i parking**)**.
- [~] Akceptacja kart paliwowych na stacjach (filtr stacji wg kart ✅; warstwa SNAP/Travis — nie).
- [x] Przypomnienia: przegląd/OC/leasing pojazdu + dokumenty + badania kierowców.

**Done gdy:** kierowcy widzą i dodają zgłoszenia na żywo; mapa pokazuje crowd-ceny i oceny.

---

## Faza 4 — Premium nawigacja 🛰️

**Cel:** funkcje „wow" i platformy dodatkowe.

- [x] Widok satelitarny / 3D (web).
- [ ] Asystent pasa / widok skrzyżowań (Navigation SDK) — wymaga manewrów w kontrakcie routingu,
      których dziś `RouteResult` nie niesie; to pierwszy krok, nie sam widok.
- [x] Reroute z ruchem na żywo — warstwa ruchu HERE ✅ + automatyczny objazd przy nowych utrudnieniach (#309).
- [~] **macOS**: panel jako **PWA** dostarczony (#279 — manifest+ikony, instalacja z Chrome/Safari); apka kierowcy trafi na Mac App Store razem z iOS (Apple Silicon). Tauri — tylko gdy PWA nie wystarczy.
- [~] OCR paragonów — ✅ wydatki (#298) + litry paliwa (#299, ML Kit on-device) + **kwota i waluta
      przenoszone do formularza** (wcześniej parser je zwracał, a formularz wyrzucał);
      pełne i18n ×14 — pozostaje.
- [x] Rozszerzone logowanie: passkey + **2FA wymuszane** (Samsung — świadomie pominięty).

**Done gdy:** nawigacja premium i macOS dostępne dla chętnych klientów.

---

## Kamienie milowe i wydania

- Każda zakończona część = wpis `[#NNN]` w CHANGELOG + ewentualny bump SemVer.
- Koniec fazy = tag `vX.Y.0` + GitHub Release z podsumowaniem.
- Numeracja ciągła, chronologiczna, bez luk (wymóg „na bieżąco").
