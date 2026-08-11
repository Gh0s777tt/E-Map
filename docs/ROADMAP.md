# 🗺️ Roadmapa — E‑Logistic

> Status: **w realizacji** · stan na v1.243.0 (#405) · 2026-08-11
> Zasada: każda faza = działający przyrost. Część zarobkowa (Faza 1) **nie wymaga drogich API map**.
>
> **Stan dostarczenia** (autorytatywnie: [CHANGELOG](../CHANGELOG.md)):
> - ✅ **Faza 0** (fundament) · ✅ **Faza 1** (rdzeń właściciela) · ✅ **Faza 2** (mapa podstawowa) — zrealizowane.
> - 🚧 **Faza 3** (społeczność/dane) — częściowo: zgłoszenia realtime na mapie + crowd‑ceny paliw + przypomnienia OC/przegląd/dokumenty działają; oceny/udogodnienia parkingów jeszcze nie.
> - ⏳ **Faza 4** (premium) — 3D/satelita ✅, reroute z ruchem ✅, OCR paragonów ✅; asystent pasa/HUD — planowany.
> - ➕ **Fazy 5–7 (poza pierwotnym planem, v1.20x–v1.23x):** moduł formularzy z importem/eksportem Excela i normalizacją krajów · statystyki pieniężne po kursach ECB (koniec z filtrowaniem do EUR) · **zwrot VAT za paliwo** per kraj · koszty operacyjne w rachunku wyjazdu · profil pojazdu z kartoteki w routingu (osie/ADR/klasa emisji) · adapter **TomTom** · mapa w aplikacji mobilnej.
> - ➕ **Ponad pierwotny plan (v1.0–1.50):** zlecenia + CMR/POD, faktury VAT (status/płatności/pozycje/duplikat/Fakturownia), rentowność klientów i pojazdów, diety, czas pracy, wypłaty, szkody/OC, serwis, sejf dokumentów, kontrahenci, alerty progowe, powiadomienia in‑app + push (web/Expo), **aplikacja mobilna kierowcy**, 2FA TOTP, passkeys, szyfrowanie PII, rate‑limiting, generowane typy DB, bramka RLS w CI.
> - ⚠️ Wyjątki vs pierwotny plan: offline‑first przez **outbox** (localStorage/AsyncStorage), nie PowerSync (planowane); zaproszenia **link/QR/e‑mail**, bez SMS/WhatsApp; i18n **web PL/EN, mobile PL/EN/DE/UK** (docelowo ×14).
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
- [x] CI: `ci.yml` (biome, tsc, build), `codeql.yml`, gitleaks.
- [x] README/CHANGELOG/CLAUDE + tagowanie `v0.x` + GitHub Releases.

**Done gdy:** `pnpm install && pnpm build` przechodzi; logowanie działa; CI zielone.

---

## Faza 1 — Rdzeń dla właściciela 💰 (najwyższy zwrot)

**Cel:** realny, sprzedawalny produkt bez kosztów API map. Web + mobile równolegle.

- [x] **Pojazdy**: CRUD z pełnymi danymi (wymiary, przeglądy, OC, leasing, VIN, spedycja).
- [x] **Kierowcy + zaproszenia**: link/QR + e‑mail, przypisanie do pojazdu (SMS/WhatsApp — świadomie pominięte).
- [x] **Karty paliwowe**: katalog dostawców, przypisanie osoba+pojazd, rabaty; **PIN szyfrowany** (Vault, odczyt audytowany).
- [x] **Formularze offline-first**: Paliwo, AdBlue, Trip (wszystkie akcje) — outbox (localStorage/AsyncStorage; PowerSync planowany).
- [x] **Historia + edycja** formularzy z rewizjami; podgląd własnych wysłanych (kierowca).
- [x] **Statystyki/rozliczenia**: spalanie, koszt po rabatach, AdBlue, uszkodzenia, stawka/km, **zysk z trasy**.
- [x] **Panele ról**: owner / spedytor / kierowca / developer.

**Done gdy:** kierowca offline wypełnia 3 formularze i synchronizuje; właściciel widzi
statystyki i zysk per pojazd; rozliczenia pokryte testami jednostkowymi.

---

## Faza 2 — Mapa podstawowa 🗺️

**Cel:** routing ciężarówkowy z mytem i POI (hybryda MapLibre + HERE/GraphHopper).

- [x] MapLibre render + styl red/black (dzień/noc), web + **mobile (M3 fala 1, #253** — render/lokalizacja/POI; routing na mapie mobile — fala 2**)**.
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
- [~] Oceny i udogodnienia parkingów — ✅ web (#308: gwiazdki 1-5 + 🚿🚻🍽🛡 w dymku POI); mobile — kolejna fala.
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
