# ☁️ Wdrożenie — E‑Logistic

Produkcyjny WebApp stoi na **Vercel**, dane na **Supabase**. Routing TIR przez **GraphHopper**.

- **Demo na żywo:** https://e-logistic-one.vercel.app
- **Projekt Vercel:** `e-logistic` (team `kraina-duchow`), Root Directory = `apps/web`, framework Next.js.
- **Supabase:** ref `jcmqbqvsvtjtxvmopcxp` (eu‑central‑1).

> ⚠️ Sekrety (klucze API, service‑role, hasła) **nigdy** nie trafiają do repo — wyłącznie do
> zmiennych środowiskowych Vercela i pliku `apps/web/.env.local` (ignorowanego przez git).

---

## 1. Architektura wdrożenia

Monorepo (pnpm + Turborepo). Pakiety `@e-logistic/*` są spożywane jako źródło TS przez
`transpilePackages` w [`next.config.ts`](apps/web/next.config.ts) — **nie ma osobnego buildu pakietów**,
wystarczy `next build` w `apps/web`. Dlatego na Vercelu ustawiamy **Root Directory = `apps/web`**,
a instalacja zależności i tak idzie z roota workspace’u (Vercel sam wykrywa `pnpm-lock.yaml`).

## 2. Zmienne środowiskowe (Vercel → Project → Settings → Environment Variables)

| Zmienna | Zakres | Uwagi |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | wszystkie | publiczna (URL projektu Supabase) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | wszystkie | publiczna (klucz anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | wszystkie | **sekret** — tylko serwer |
| `GRAPHHOPPER_API_KEY` | wszystkie | **sekret** — używany w `/api/route` (runtime) |

Te same klucze trzymaj lokalnie w `apps/web/.env.local` (szablon: `.env.example`).
W [`turbo.json`](turbo.json) są zadeklarowane w `globalEnv`, żeby Turbo nie przycinał ich przy buildzie.

## 3. Supabase — Auth (KRYTYCZNE dla logowania)

W **Supabase → Authentication → URL Configuration**:

- **Site URL:** `https://e-logistic-one.vercel.app`
- **Redirect URLs (allow list):**
  - `http://localhost:3000/**`, `http://localhost:3001/**` (dev)
  - `https://e-logistic-one.vercel.app/**` (prod)
  - `https://*-kraina-duchow.vercel.app/**` (podglądy/preview)

Bez tego logowanie OAuth / magic link / potwierdzenie e‑mail nie wróci na właściwą domenę.

## 4. Deploy

### Wariant A — Git (zalecany docelowo)
Połącz repo `Gh0s777tt/E-Map` z projektem Vercel (Vercel GitHub App). Każdy push do `main`
= deploy produkcyjny, każdy PR = podgląd. Root Directory = `apps/web`.

### Wariant B — CLI (użyty teraz)
```bash
# z katalogu repo (token z Vercel → Account Settings → Tokens; NIE commituj)
npx vercel@latest deploy --prod --yes --token=$VERCEL_TOKEN
```
Link projektu trzymany jest w `.vercel/` (ignorowany przez git).

## 5. Wymóg Node

Vercel używa swojej wersji Node. W [`package.json`](package.json) `engines.node` ustawione na
`>=22` (kompatybilne z Vercelem; lokalnie dev działa na Node 26).

## 6. Po wdrożeniu — szybka weryfikacja

```bash
curl -o /dev/null -w "%{http_code}\n" https://e-logistic-one.vercel.app/        # 200
curl -o /dev/null -w "%{http_code}\n" https://e-logistic-one.vercel.app/login   # 200
curl -X POST https://e-logistic-one.vercel.app/api/route \
  -H "Content-Type: application/json" \
  -d '{"waypoints":[{"lat":52.52,"lng":13.405},{"lat":52.23,"lng":21.01}]}'      # trasa ~570 km
```

## 7. Czego jeszcze brakuje (wymaga decyzji/kluczy właściciela)

- **OAuth Google/Apple/Microsoft** — konfiguracja providerów w panelu Supabase.
- **SMS/WhatsApp** zaproszeń — klucz Twilio.
- **Routing profilu `truck`** — płatny plan GraphHopper lub klucz HERE (flaga `truckProfile`).
- **Własna domena** — podłączenie w Vercel → Domains (wtedy zaktualizuj Site URL w Supabase).
