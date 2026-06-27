# 🗺️ Roadmapa — E‑Logistic

> Status: **w realizacji** · stan na v1.64.0 (#208) · 2026-06-27
> Zasada: każda faza = działający przyrost. Część zarobkowa (Faza 1) **nie wymaga drogich API map**.
>
> **Stan dostarczenia** (autorytatywnie: [CHANGELOG](../CHANGELOG.md)):
> - ✅ **Faza 0** (fundament) · ✅ **Faza 1** (rdzeń właściciela) · ✅ **Faza 2** (mapa podstawowa) — zrealizowane.
> - 🚧 **Faza 3** (społeczność/dane) — częściowo: zgłoszenia realtime na mapie + crowd‑ceny paliw + przypomnienia OC/przegląd/dokumenty działają; oceny/udogodnienia parkingów jeszcze nie.
> - ⏳ **Faza 4** (premium) — 3D/satelita na web ✅; asystent pasa, reroute auto, macOS, OCR — planowane.
> - ➕ **Ponad pierwotny plan (v1.0–1.50):** zlecenia + CMR/POD, faktury VAT (status/płatności/pozycje/duplikat/Fakturownia), rentowność klientów i pojazdów, diety, czas pracy, wypłaty, szkody/OC, serwis, sejf dokumentów, kontrahenci, alerty progowe, powiadomienia in‑app + push (web/Expo), **aplikacja mobilna kierowcy**, 2FA TOTP, passkeys, szyfrowanie PII, rate‑limiting, generowane typy DB, bramka RLS w CI.
> - ⚠️ Wyjątki vs pierwotny plan: offline‑first przez **outbox** (localStorage/AsyncStorage), nie PowerSync (planowane); zaproszenia **link/QR/e‑mail**, bez SMS/WhatsApp; i18n **PL/EN** (docelowo ×14).
>
> *Checkboxy poniżej zaktualizowane do stanu faktycznego: `[x]` = dostarczone, `[~]` = częściowo, `[ ]` = pozostaje.*

---

## Faza 0 — Fundament 🧱

**Cel:** szkielet repo gotowy do pracy, spójny z ekosystemem GH0ST EMPIRE.

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

- [x] MapLibre render + styl red/black (dzień/noc), web (**mobile — planowane, faza M3**).
- [x] `RoutingProvider` + adapter HERE (start) / GraphHopper; profil pojazdu z `vehicles`.
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
- [ ] Oceny i udogodnienia parkingów (miejsca TIR, prysznic, WC, woda, kompresor, restauracja).
- [~] Akceptacja kart paliwowych na stacjach (filtr stacji wg kart ✅; warstwa SNAP/Travis — nie).
- [x] Przypomnienia: przegląd/OC/leasing pojazdu + dokumenty + badania kierowców.

**Done gdy:** kierowcy widzą i dodają zgłoszenia na żywo; mapa pokazuje crowd-ceny i oceny.

---

## Faza 4 — Premium nawigacja 🛰️

**Cel:** funkcje „wow" i platformy dodatkowe.

- [x] Widok satelitarny / 3D (web).
- [ ] Asystent pasa / widok skrzyżowań (Navigation SDK).
- [~] Reroute z ruchem na żywo (warstwa ruchu HERE ✅; automatyczny reroute — nie).
- [ ] **macOS** (PWA / Tauri 2) wg popytu.
- [ ] OCR paragonów (auto-uzupełnianie litrów/ceny), pełne i18n ×14.
- [x] Rozszerzone logowanie: passkey + **2FA wymuszane** (Samsung — świadomie pominięty).

**Done gdy:** nawigacja premium i macOS dostępne dla chętnych klientów.

---

## Kamienie milowe i wydania

- Każda zakończona część = wpis `[#NNN]` w CHANGELOG + ewentualny bump SemVer.
- Koniec fazy = tag `vX.Y.0` + GitHub Release z podsumowaniem.
- Numeracja ciągła, chronologiczna, bez luk (wymóg „na bieżąco").
