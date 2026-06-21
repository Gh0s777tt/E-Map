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

## 7. Powiadomienia push (Web Push) — włączenie

Kod jest gotowy; do uruchomienia potrzeba kluczy VAPID i migracji.

1. **Migracja DB** — zastosuj [`supabase/migrations/0020_push_subscriptions.sql`](supabase/migrations/0020_push_subscriptions.sql)
   (SQL Editor w Supabase lub Management API — jak pozostałe migracje).
2. **Wygeneruj klucze VAPID**:
   ```bash
   npx web-push generate-vapid-keys
   ```
3. **Ustaw env w Vercel** (Production) — następnie redeploy:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = *Public Key*
   - `VAPID_PRIVATE_KEY` = *Private Key*  (sekret)
   - `VAPID_SUBJECT` = `mailto:twoj@email` (kontakt)
   - `CRON_SECRET` = długi losowy ciąg (chroni `/api/cron/notify`)
   ```bash
   printf '%s' "<PUBLIC>"  | npx vercel@latest env add NEXT_PUBLIC_VAPID_PUBLIC_KEY production
   printf '%s' "<PRIVATE>" | npx vercel@latest env add VAPID_PRIVATE_KEY production
   printf '%s' "mailto:..." | npx vercel@latest env add VAPID_SUBJECT production
   printf '%s' "<SECRET>"  | npx vercel@latest env add CRON_SECRET production
   ```
4. **Cron** — [`apps/web/vercel.json`](apps/web/vercel.json) uruchamia `/api/cron/notify` codziennie o 07:00
   (dosyła nieprzeczytane powiadomienia jako push). Vercel sam dołącza `Authorization: Bearer $CRON_SECRET`.
5. **Użytkownik** — w **Ustawienia → Powiadomienia push** klika „Włącz powiadomienia" (zgoda przeglądarki).
6. (Opcjonalnie) dodaj ikonę `apps/web/public/icon-192.png` (192×192) — pojawi się w powiadomieniu.

## 8. Czego jeszcze brakuje (wymaga decyzji/kluczy właściciela)

- **OAuth Google/Apple/Microsoft** — konfiguracja providerów w panelu Supabase.
- **SMS/WhatsApp** zaproszeń — klucz Twilio.
- **Ceny paliwa z API** (Tankerkönig DE) — klucz `FUEL_PRICE_API_KEY` (przygotowywane).
- **Akceptacja kart / Travis / SNAP** — API partnerów (DKV/Eurowag) — wymaga umów.
- **Własna domena** — podłączenie w Vercel → Domains (wtedy zaktualizuj Site URL w Supabase).
