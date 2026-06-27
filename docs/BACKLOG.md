<!-- SYNC: po v1.51.0 · #195 · 2026-06-27 -->

# 📋 BACKLOG — E‑Logistic

Otwarte zadania, priorytetyzowane. Źródło: **audyt 360°** (2026‑06‑27, v1.51.0) + bieżący stan kodu.
Autorytatywny stan dostarczenia: [CHANGELOG.md](../CHANGELOG.md).

> **Świadomie pominięte (parking):** integracje **kart/płatności partnerskich** — DKV, Eurowag, SNAP, Travis.
> Czekają na dane/umowy/klucze (decyzja właściciela). Specyfikacja wpięcia w [INTEGRATIONS.md](INTEGRATIONS.md).

> **✅ Domknięte od poprzedniej listy (#080 → #195):** limit + zakres dat w zapytaniach · paginacja/limity w stats/history ·
> `useMemo` w stats · `ListStatus` na listach · settlements jako moduł · test push + `icon-192.png` · ceny diesla EU na mapie/`fuel-prices` ·
> ujednolicenie Node ≥26 · `apps/mobile/tsconfig` (strict) · **sync dokumentacji do v1.51 (#195)** · cała seria modułów v1.0–1.50
> (zlecenia, faktury, CMR/POD, rentowność, diety, czas pracy, wypłaty, szkody, serwis, dokumenty, kontrahenci, mapa 3D, aplikacja mobilna).

---

## 🔴 P1 — Testy (największa luka jakości)
- [ ] **Testy `packages/api`** (warstwa danych, 24 pliki `data/*`) — dziś **0 testów**. Mock klienta Supabase; kształt zapytań, filtry `company_id`, mapowanie.
- [ ] **Testy 13 tras API** (`apps/web/app/api`) — auth‑guard, walidacja Zod, rola owner/dispatcher, rate‑limit. Dziś 0.
- [ ] **Testy mobile** — `lib/outbox.ts` (enqueue/sync/error), guard sesji. Dziś 0.

## 🟠 P2 — Wydajność (punktowo; DB ogólnie wzorowe)
- [ ] **`invoice_items`**: brak indeksu `(invoice_id)` + brak `.limit()` w `listInvoiceItems`. → migracja 0052 + limit.
- [ ] **`map/page.tsx` (~1700 l.)** — dekompozycja na 6–8 komponentów; CSS MapLibre ładować dynamicznie (JS już lazy).
- [ ] **POI O(n·m)** — filtr stacji wg marek + near‑route Haversine: cache marek / grid spatial index / próbka co ~2 km.
- [ ] **`React.memo`** na wierszach długich list (np. `DriverRoster`).

## 🟠 P2 — Mobile do publikacji
- [ ] **Mapa (faza M3)** — `@maplibre/maplibre-react-native` + reużycie `@e-logistic/maps`.
- [ ] **`eas.projectId`** (`eas init`) — wymagany do push.
- [ ] Finalna grafika (ikony/splash), **QA na urządzeniu**, `eas build`/`submit`.

## 🟡 P3 — Jakość / spójność
- [ ] **Duplikacja:** `setupMsg` (~5 kopii) → wspólny hook; walidacja `LiquidForm` web/mobile → do `core`.
- [ ] **Trasy PL/EN** wymieszane (`/szkody /diety /wyplaty /czas-pracy` vs reszta EN) — ujednolicić.
- [ ] **`as unknown` ×8** (Supabase RPC) — komentarze lub dogenerowane typy RPC.
- [ ] **Locale hardcoded** `createTranslator("pl")` w kilku miejscach — czytać z kontekstu.

## 🟡 P3 — Bezpieczeństwo (hardening; brak P0/P1)
- [ ] **Mobile**: sesja w `AsyncStorage` → rozważyć `expo-secure-store` (szyfrowany keychain).
- [ ] **Push URL**: wzmocnić walidację do allowlisty ścieżek (defense‑in‑depth).
- [ ] **Rate‑limit**: opcjonalny in‑memory fallback / circuit breaker (dziś świadomy fail‑open).
- [ ] Potwierdzić **rotację sekretów**, które trafiły kiedyś do historii czatu (Upstash, `sbp_` Supabase).

## 🟢 P4 — Infra / docelowy stack
- [ ] **`docs:check`** w CI (dodane w #195) — utrzymać zielone przy zmianach.
- [ ] **`supabase/config.toml`** — dla powtarzalnego dev/CI (wymaga Dockera; opcjonalne).
- [ ] Rozważyć **Sentry** (obserwowalność), **PowerSync** (jeśli outbox okaże się niewystarczający), **shadcn/ui**.

## 🔵 P5 — Produkt / rozwój (szerzej w raporcie audytu)
- [ ] **KSeF** (obowiązkowy w PL) — nadbudowa na silniku faktur + Fakturowni.
- [ ] **i18n ×14** — dziś PL/EN (infrastruktura parytetu gotowa); priorytet UA/DE.
- [ ] OCR paragonów · asystent AI spedytora · telematyka GPS live · portal klienta · link śledzenia ETA · tachograf `.ddd`.

## ⏸️ Wymaga Twoich zasobów
- **Integracje kart/płatności** — wstrzymane do dostarczenia danych/umów.
- **Publikacja mobile** — konta Apple Developer + Google Play.

---

*Rekomendowany następny krok: **testy `api` + API routes** (P1) — największy zwrot jakości przy zerowym ryzyku.*
