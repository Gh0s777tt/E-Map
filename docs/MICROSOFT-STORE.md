<!-- SYNC: po v1.175.0 · #322 · 2026-07-13 -->
# 🪟 Microsoft Store — publikacja panelu E-Logistic (PWA → MSIX)

Panel web jest pełnoprawną **PWA** (#279 + #322: manifest z `id`/`scope`, service worker
rejestrowany przy każdym wejściu, ikony 192/512). Do Microsoft Store trafia jako paczka
**MSIX** generowana przez **PWABuilder** — bez utrzymywania osobnej aplikacji Windows:
sklepowa apka to okno (WebView2) wskazujące na `https://e-logistic-one.vercel.app`,
więc każdy deploy na Vercel od razu aktualizuje też „aplikację Windows".

## Krok 0 — co już jest w kodzie (✅ #322)
- [`app/manifest.ts`](../apps/web/app/manifest.ts) — komplet pól wymaganych przez PWABuilder
  (`id`, `scope`, `start_url`, `display: standalone`, ikony w tym maskable, `lang`, `categories`).
- [`app/layout.tsx`](../apps/web/app/layout.tsx) — service worker `public/sw.js` rejestruje się
  przy każdym wejściu (wcześniej: dopiero po włączeniu push).
- Test: `https://www.pwabuilder.com` → wklej `https://e-logistic-one.vercel.app` → zakładka
  „Windows" powinna świecić na zielono (score bez czerwonych braków).

## Krok 1 — konto Partner Center (🧑 właściciel, jednorazowo)
1. https://partner.microsoft.com/dashboard → **Zarejestruj się** w programie „Aplikacje i gry"
   (konto Microsoft; opłata jednorazowa ~**19 USD** dla konta indywidualnego, ~99 USD firmowego).
2. Po rejestracji: **Apps and games → New product → App (MSIX)** i **zarezerwuj nazwę** `E-Logistic`.
3. Z zakładki **Product identity** zanotuj 3 wartości (potrzebne w kroku 2):
   - `Package/Identity/Name` (np. `12345PUBLISHER.ELogistic`),
   - `Package/Identity/Publisher` (np. `CN=A1B2C3D4-…`),
   - `Publisher display name`.

## Krok 2 — paczka MSIX (PWABuilder)
1. https://www.pwabuilder.com → URL produkcyjny → **Package for Stores → Windows**.
2. Wpisz wartości identity z kroku 1 (Package ID / Publisher ID / Publisher display name),
   wersja np. `1.0.0.0`, ikony podciągną się z manifestu.
3. Pobierz ZIP — zawiera `.msixbundle` (sklepowy, **niepodpisany** — podpisuje Store)
   oraz `.msix` sideload do testów lokalnych.

## Krok 3 — przesłanie do recenzji
1. Partner Center → produkt `E-Logistic` → **Start your submission**.
2. **Packages**: wgraj `.msixbundle` z kroku 2.
3. **Properties**: kategoria *Business*; **Store listing** (PL): opis/screeny — gotowe teksty
   z [apps/mobile/store/listing.md](../apps/mobile/store/listing.md) pasują 1:1 (screeny: zrzuty panelu).
4. **Pricing**: Free · rynki: wszystkie. **Privacy policy**: `https://e-logistic-one.vercel.app/privacy`.
5. Submit → recenzja zwykle 24–72 h.

## Aktualizacje
Treść aplikacji aktualizuje się sama (to panel web). Nową paczkę MSIX wysyła się tylko przy
zmianie manifestu/ikon/nazwy — wygenerować ponownie w PWABuilder z podbitą wersją i wgrać
w nowej submission.

## Blokery po stronie właściciela
- [ ] Rejestracja Partner Center + rezerwacja nazwy (krok 1) — wymaga konta Microsoft i płatności.
- [ ] Przekazanie 3 wartości *Product identity* — wtedy generuję paczkę i przygotowuję submission.
