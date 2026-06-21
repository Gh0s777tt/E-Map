# 🔌 Integracje partnerów — E‑Logistic

Stan i plan podłączenia integracji zależnych od API/umów partnerów. Wzorzec wdrażania:
**kod za flagą env** (jak push/rate‑limiting) — bez klucza funkcja jest ukryta/no‑op, z kluczem działa.
Nie tworzymy martwych atrap bez specyfikacji — poniżej dokładnie, co jest potrzebne do każdej.

> Status v0.54.0: **Tankerkönig (ceny paliwa, DE) — wdrożone** (`FUEL_PRICE_API_KEY`). Reszta poniżej.

---

## 1. Ceny paliwa — Tankerkönig (DE) ✅ wdrożone

- **Kod:** [`packages/maps/src/fuelprice.ts`](../packages/maps/src/fuelprice.ts) + [`/api/fuel-prices`](../apps/web/app/api/fuel-prices/route.ts) + przycisk na `/map`.
- **Env:** `FUEL_PRICE_API_KEY`. Bez klucza UI pokazuje podpowiedź konfiguracji.
- **Rozszerzenie (inne kraje):** brak jednego darmowego źródła EU — wymagałoby osobnych adapterów
  (np. komercyjne API cen PL). Punkt wpięcia: kolejny adapter w `fuelprice.ts` + wybór wg kraju.

## 2. Akceptacja kart na stacjach — DKV / Eurowag

- **Dziś:** filtr **orientacyjny** po marce (OSM `brand/operator`) — [`stationMatchesProviders`](../packages/core/src/catalog.ts). Bez gwarancji akceptacji.
- **Czego potrzeba do wersji wiążącej:**
  - **DKV** — DKV Mobility API (portal: `api-portal.dkv-mobility.com`): OAuth2 client credentials (`DKV_CLIENT_ID`/`DKV_CLIENT_SECRET`), zakres „station finder/acceptance".
  - **Eurowag** — API partnerskie Eurowag (umowa + klucz `EUROWAG_API_KEY`), endpoint sieci akceptacji.
- **Punkt wpięcia:** nowy `packages/maps/src/cardacceptance.ts` z interfejsem
  `CardAcceptanceProvider { stationsAccepting(card, bbox): Promise<StationRef[]> }` + adaptery DKV/Eurowag;
  serwerowy `/api/card-acceptance` (klucze tylko serwer); filtr stacji na `/map` przełącza się z
  „orientacyjnego" na „wiążący", gdy klucz obecny.
- **Env (po umowach):** `DKV_CLIENT_ID`, `DKV_CLIENT_SECRET`, `EUROWAG_API_KEY`.

## 3. Płatności w trasie — Travis / SNAP

- **Dziś:** `pois.accepts {snap, travis}` to wyłącznie metadane informacyjne (czy punkt deklaruje akceptację).
- **Czego potrzeba:**
  - **SNAP** (parkingi/usługi) — umowa SNAP Account + API (`SNAP_API_KEY`), zakres „transactions/booking".
  - **Travis Road Services** — API partnerskie (`TRAVIS_API_KEY`).
- **Zakres bezpieczeństwa:** to przepływy płatnicze — wdrożenie wyłącznie serwerowe (service‑role),
  bez przechowywania danych kart u nas, z audytem każdej transakcji (rozszerzyć `audit_log`).
  Rozważyć osobny przegląd zgodności (PCI‑DSS SAQ‑A, jeśli przekierowanie do hostowanego pola).
- **Punkt wpięcia:** `packages/core` typy transakcji + `/api/payments/*` (serwer) + ekran w aplikacji.
- **Env (po umowach):** `SNAP_API_KEY`, `TRAVIS_API_KEY`.

---

## Jak włączymy, gdy będą klucze
1. Podaj klucze/umowy dla wybranej integracji.
2. Dodam adapter (wzorzec: env‑gated, klucz tylko serwerowo, no‑op bez klucza).
3. Ustawimy env w Vercel (Production) + redeploy; funkcja przełącza się z trybu „poglądowego" na „wiążący".
4. Bramki + wydanie + wpis w [CHANGELOG.md](../CHANGELOG.md).
