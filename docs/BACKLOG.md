<!-- SYNC: po v0.58.0 · #078 · 2026-06-21 -->

# 📋 BACKLOG — E‑Logistic

Otwarte zadania, priorytetyzowane. Źródło: audyt [`AUDIT-2026-06-21.md`](AUDIT-2026-06-21.md) + bieżący stan kodu.

> **Świadomie pominięte (parking):** integracje **kart/płatności partnerskich** — DKV, Eurowag, SNAP, Travis.
> Czekają na dane/umowy/klucze (decyzja właściciela). Specyfikacja wpięcia gotowa w
> [`INTEGRATIONS.md`](INTEGRATIONS.md) — podłączymy, gdy dostarczone będą dostępy.

---

## 🔴 P1 — Wydajność (największy zwrot)

- [ ] **Limit + zakres dat w zapytaniach** `listFuelLogs`/`listTripEvents` (dziś `select("*")` bez zakresu). Stats/Settlements/History ładują **pełne tabele** firmy i filtrują daty w JS. → dodać parametry `from/to` + `limit`, filtrować w DB. *(największy pojedynczy zysk)*
- [ ] **Paginacja „pokaż więcej"** na history / stats / settlements / reports.
- [ ] **`useMemo`** na obliczeniach w `stats` (`FuelBlock` liczy w renderze).
- [ ] **Mapa**: Overpass z limitem; filtr POI O(n·m) Haversine → optymalizacja; `cardOptions` w `useMemo`.
- [ ] `React.memo` na wierszach długich list.

## 🟠 P2 — UX / Spójność

- [ ] **Stany loading/error (`ListStatus`)** na pozostałych listach — `cards` / `team` / `settlements` (dziś `catch {}` = „brak danych" przy błędzie sieci). *(adopcja: 5 stron gotowych)*
- [ ] **`settlements` jako osobny moduł uprawnień** + strażnik strony (dziś gated modułem `stats`, bez własnego guardu). *(audyt #12)*
- [ ] **Wspólne prymitywy UI** — dokończyć ekstrakcję: `Card`, `Input`; użyć `Field` wszędzie (`LiquidForm` go redefiniuje); `setupMsg` (3× kopia) → 1 komponent.
- [ ] **Responsywność mobilna** — zweryfikować media queries; mobilny drawer sidebara (240 px zjada ekran telefonu).
- [ ] **Filtry na innych listach** (pojazd/data/status) — wzorzec z Historii (#076). **Eksport CSV/PDF** w stats/history.

## 🟡 P3 — Funkcje produktowe

- [ ] **„Wyślij testowy push"** w panelu właściciela (backend `/api/push/send` gotowy i zwalidowany) + **dodać `icon-192.png`** (brak — push używa domyślnej ikony). *(audyt #11)*
- [ ] **Ceny diesla (#078) na mapie/w formularzu** — opcjonalna warstwa lub wskaźnik „cena vs średnia krajowa" przy wpisie tankowania.

## 🟢 P4 — Infra / Jakość

- [ ] **Ujednolicić wersję Node** — `engines.node ">=22"` vs `.nvmrc 26` vs cel „Node 26". Zdecydować: `>=26` czy zostać przy `>=22` (Vercel‑safe) i udokumentować.
- [ ] **`apps/mobile/tsconfig.json`** nie dziedziczy `tsconfig.base.json` → traci `noUncheckedIndexedAccess`; wyrównać do web.
- [ ] **`turbo.json`** — `typecheck`/`test` z `dependsOn:["^build"]` (no‑op); dodać `inputs/outputs` → cache (szybsze CI).
- [ ] **Testy** — pokrycie web/api cienkie (71 testów ~ core/maps). Dodać: silnik settlements (edge cases), przeliczenie `/api/fuel-eu`, `ratelimit`, cache membership.
- [ ] **`supabase/config.toml`** — brak (powtarzalne env DB w dev/CI). Wymaga Dockera; opcjonalne.

## 🔵 P5 — Dokumentacja (sync z kodem)

- [ ] **`DATA-MODEL.md`** (nagłówek 0.51.0) — zweryfikować kompletność vs migracje 0001–0025 (notifications, push_subscriptions, vehicle_defects, pola zbiorników, `memberships.modules`, passkeys, drivers roster, `*_enc`).
- [ ] **README** — tabela modułów: dodać Rozliczenia / Usterki / Push; ceny paliwa już nie „planowane".
- [ ] **DEPLOY.md** — env: dodać `HERE_API_KEY` / `NEXT_PUBLIC_MAPTILER_KEY`; spójność nazwy repo `E-Map` ↔ produkt E‑Logistic.
- [ ] **CLAUDE.md / ARCHITECTURE.md** — oznaczyć jako *plan* (niezaimplementowane): PowerSync, shadcn/ui, TanStack Query, Zustand, Sentry.
- [ ] **ROADMAP.md** — zaznaczyć zrealizowane fazy.
- [x] ~~`.env.example` drift~~ — naprawione (martwe klucze usunięte, realne obecne).

## 🔒 Bezpieczeństwo (resztka)

- [ ] **P1 #5 — pełna rotacja kluczy + klucze per‑tenant** (dziś: segmentacja `pii_key` ≠ `card_key`). Większy projekt; wg audytu nadmiarowy dla obecnej skali.

> Pozostałe pozycje bezpieczeństwa z audytu (P0–P3, P1 #4/#6) — ✅ **domknięte** (#072–#077).

## ⏸️ Wymaga Twoich zasobów

- **Mobile parity** (M1–M5, [`MOBILE-PLAN.md`](MOBILE-PLAN.md)) — wymaga emulatora / Expo Go.
- **Rotacja sekretów wklejonych w czacie** — token Upstash oraz token `sbp_` Supabase.
- **Integracje kart/płatności** — ⏸️ wstrzymane do dostarczenia danych.

---

*Rekomendowany następny krok: **P1 — wydajność** (limit + zakres dat), największy zwrot przy umiarkowanym koszcie.*
