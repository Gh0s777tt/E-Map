# 🗺️ Roadmapa — E‑Logistic

> Status: **propozycja do akceptacji** · wersja 0.1.0 · 2026-06-20
> Zasada: każda faza = działający przyrost. Część zarobkowa (Faza 1) **nie wymaga drogich API map**.

---

## Faza 0 — Fundament 🧱

**Cel:** szkielet repo gotowy do pracy, spójny z ekosystemem GH0ST EMPIRE.

- [ ] Monorepo (Turborepo + pnpm), `apps/web`, `apps/mobile`, `packages/*`.
- [ ] Konfiguracja: TypeScript 6 strict, Biome, tsconfig bazowy, `.env.example`.
- [ ] Supabase: projekt, schema startowa + RLS (companies, users, memberships), PostGIS.
- [ ] Auth: e-mail/hasło + Google/Apple + magic link.
- [ ] Motyw red/black (`packages/ui` tokeny), i18n PL+EN (reszta dokładana).
- [ ] CI: `ci.yml` (biome, tsc, build), `codeql.yml`, Dependabot, gitleaks.
- [ ] README/CHANGELOG/CLAUDE + tagowanie `v0.x` + GitHub Releases.

**Done gdy:** `pnpm install && pnpm build` przechodzi; logowanie działa; CI zielone.

---

## Faza 1 — Rdzeń dla właściciela 💰 (najwyższy zwrot)

**Cel:** realny, sprzedawalny produkt bez kosztów API map. Web + mobile równolegle.

- [ ] **Pojazdy**: CRUD z pełnymi danymi (wymiary, przeglądy, OC, leasing, spedycja).
- [ ] **Kierowcy + zaproszenia**: link/QR, wysyłka e-mail/SMS/WhatsApp, przypisanie do pojazdu.
- [ ] **Karty paliwowe**: katalog dostawców, przypisanie osoba+pojazd, rabaty; **PIN szyfrowany** (owner-only).
- [ ] **Formularze offline-first**: Paliwo, AdBlue, Trip (wszystkie akcje) — PowerSync, kolejka sync.
- [ ] **Historia + edycja** formularzy z rewizjami; podgląd własnych wysłanych (kierowca).
- [ ] **Statystyki/rozliczenia**: spalanie, koszt po rabatach, AdBlue, uszkodzenia, stawka/km, **zysk z trasy**.
- [ ] **Panele ról**: owner / spedytor / kierowca / developer (podstawowy).

**Done gdy:** kierowca offline wypełnia 3 formularze i synchronizuje; właściciel widzi
statystyki i zysk per pojazd; rozliczenia pokryte testami jednostkowymi.

---

## Faza 2 — Mapa podstawowa 🗺️

**Cel:** routing ciężarówkowy z mytem i POI (hybryda MapLibre + HERE/GraphHopper).

- [ ] MapLibre render + styl red/black (dzień/noc), web i mobile.
- [ ] `RoutingProvider` + adapter HERE (start) / GraphHopper; profil pojazdu z `vehicles`.
- [ ] Trasa z przystankami (adres dostawy + stopy: parking/stacja).
- [ ] Omijanie: kraje (np. CH/NO), myto, promy, autokoszetki, drogi gruntowe.
- [ ] **Myto z podziałem na odcinki** + koszt trasy.
- [ ] POI z OSM + Truck Parking Europe → PostGIS; pełny adres + GPS.
- [ ] Geokodowanie GPS→kraj/miasto (autouzupełnianie lokalizacji w formularzach).

**Done gdy:** wytyczenie trasy TIR z omijaniem kraju i wyceną myta na odcinki działa na web+mobile.

---

## Faza 3 — Społeczność i dane 📡

**Cel:** dane, których nie kupujemy — przewaga produktu.

- [ ] Zgłoszenia realtime (wypadek/policja/waga/korek/zamknięcie) + wygasanie/głosy.
- [ ] **Crowd-ceny paliw** z `fuel_logs` → warstwa cen na mapie.
- [ ] Oceny i udogodnienia parkingów (miejsca TIR, prysznic, WC, woda, kompresor, restauracja).
- [ ] Akceptacja kart paliwowych na stacjach + warstwa SNAP/Travis.
- [ ] Przypomnienia: przegląd/OC/leasing pojazdu.

**Done gdy:** kierowcy widzą i dodają zgłoszenia na żywo; mapa pokazuje crowd-ceny i oceny.

---

## Faza 4 — Premium nawigacja 🛰️

**Cel:** funkcje „wow" i platformy dodatkowe.

- [ ] Widok satelitarny / 3D.
- [ ] Asystent pasa / widok skrzyżowań (Navigation SDK).
- [ ] Reroute z ruchem na żywo.
- [ ] **macOS** (PWA / Tauri 2) wg popytu.
- [ ] OCR paragonów (auto-uzupełnianie litrów/ceny), pełne i18n ×14.
- [ ] Rozszerzone logowanie: passkey wszędzie, 2FA wymuszane dla ról, Samsung (jeśli popyt).

**Done gdy:** nawigacja premium i macOS dostępne dla chętnych klientów.

---

## Kamienie milowe i wydania

- Każda zakończona część = wpis `[#NNN]` w CHANGELOG + ewentualny bump SemVer.
- Koniec fazy = tag `vX.Y.0` + GitHub Release z podsumowaniem.
- Numeracja ciągła, chronologiczna, bez luk (wymóg „na bieżąco").
