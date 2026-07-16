<!-- Audyt zmiennych środowiskowych Vercel (web e-logistic) + poradnik uzupełnienia. -->
<!-- Stan na #358. Projekt: kraina-duchow/e-logistic (prj_IYIEJlgw3bRE4BTPLYbqB7Erqnd3). -->

# ⚙️ Vercel — zmienne środowiskowe (web E-Logistic)

## ✅ Co JUŻ jest w Vercel (Production)
| Zmienna | Do czego |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY` | baza/Auth/serwer |
| `HERE_API_KEY` · `GRAPHHOPPER_API_KEY` | routing TIR + myto (fallback) |
| `NEXT_PUBLIC_MAPTILER_KEY` | render mapy + geokoder (fallback) |
| `NEXT_PUBLIC_SITE_URL` | passkey/origin |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY` · `VAPID_SUBJECT` · `CRON_SECRET` | push + cron |
| `RESEND_API_KEY` | raporty PDF mailem |
| `FUEL_PRICE_API_KEY` | ceny paliw |
| `UPSTASH_REDIS_REST_URL` · `UPSTASH_REDIS_REST_TOKEN` | rate-limiting |

## ❌ Czego BRAKUJE — trzeba dodać

### 🔴 KRYTYCZNE dla #358 (TomTom na web) — bez tego funkcje TomTom na stronie są uśpione
| Zmienna | Typ | Wartość | Do czego |
|---|---|---|---|
| `TOMTOM_API_KEY` | **serwer** | klucz TomTom | routing TIR + incydenty ruchu w `/api/route` i `/api/traffic` |
| `NEXT_PUBLIC_TOMTOM_KEY` | **klient** | ten sam klucz TomTom | geokoder mapy/formularzy, warstwa ruchu, „paliwo/parking po drodze" |

> To ten sam klucz co `EXPO_PUBLIC_TOMTOM_KEY` w mobile (EAS). Można użyć jednego klucza dla obu,
> albo — bezpieczniej — osobnego klucza web zrestrykcjonowanego do domeny Vercel.

### 🟡 OPCJONALNE (dodaj tylko jeśli używasz danej funkcji)
| Zmienna | Kiedy potrzebne |
|---|---|
| `FAKTUROWNIA_API_TOKEN` · `FAKTUROWNIA_DOMAIN` | eksport faktur do Fakturownia (`/api/fakturownia/export`) — dziś brak w Vercel → eksport nieaktywny |
| `NEXT_PUBLIC_SENTRY_DSN` | monitoring błędów (opcjonalny) |

---

## 📋 Poradnik krok po kroku — dodanie kluczy TomTom

### Metoda A — Panel Vercel (dashboard, najprościej)
1. Wejdź na **vercel.com** → projekt **e-logistic** (team *kraina-duchow*).
2. **Settings** (górne menu) → **Environment Variables** (lewe menu).
3. Dodaj pierwszą zmienną:
   - **Key:** `TOMTOM_API_KEY`
   - **Value:** *(wklej swój klucz TomTom)*
   - **Environments:** zaznacz **Production, Preview, Development** (jak `HERE_API_KEY`).
   - Kliknij **Save**.
4. Dodaj drugą zmienną:
   - **Key:** `NEXT_PUBLIC_TOMTOM_KEY`
   - **Value:** *(ten sam klucz TomTom)*
   - **Environments:** **Production, Preview, Development**.
   - **Save**.
5. **Redeploy** (env zmienne wchodzą dopiero przy nowym buildzie):
   - **Deployments** → najnowszy → menu **⋯** → **Redeploy** → potwierdź.
   - Albo poczekaj na następny push do `main` (auto-deploy).

### Metoda B — Vercel CLI (z terminala; szybciej)
Z katalogu `apps/web` (projekt jest zlinkowany):
```bash
cd apps/web
# serwer (routing + ruch)
printf 'TWÓJ_KLUCZ_TOMTOM' | vercel env add TOMTOM_API_KEY production
printf 'TWÓJ_KLUCZ_TOMTOM' | vercel env add TOMTOM_API_KEY preview
printf 'TWÓJ_KLUCZ_TOMTOM' | vercel env add TOMTOM_API_KEY development
# klient (geokoder + ruch + po drodze)
printf 'TWÓJ_KLUCZ_TOMTOM' | vercel env add NEXT_PUBLIC_TOMTOM_KEY production
printf 'TWÓJ_KLUCZ_TOMTOM' | vercel env add NEXT_PUBLIC_TOMTOM_KEY preview
printf 'TWÓJ_KLUCZ_TOMTOM' | vercel env add NEXT_PUBLIC_TOMTOM_KEY development
# redeploy produkcji
vercel --prod
```

### Co realnie włączają na web (przy obecnej konfiguracji)
- ✅ **Geokoder TomTom** (wyszukiwarka mapy + formularze), **warstwa ruchu/incydentów**, **„paliwo/parking po drodze"** — używają `NEXT_PUBLIC_TOMTOM_KEY` (klient) → **działają od razu** po redeployu.
- ⚠️ **Routing** zostaje na **HERE** (jest pierwszy w łańcuchu `HERE→TomTom→GraphHopper→mock`, bo ma realne myto). `TOMTOM_API_KEY` to **fallback** — TomTom policzy trasę dopiero, gdy usuniesz `HERE_API_KEY`. To celowe; nie ruszaj, jeśli HERE ma być główny.

### Weryfikacja po deployu
1. `vercel env ls production` → na liście muszą być `TOMTOM_API_KEY` i `NEXT_PUBLIC_TOMTOM_KEY`.
2. Na stronie mapy: wyszukaj miejsce (geokoder TomTom), wytycz trasę, włącz **„Utrudnienia (TomTom)"** i **„Paliwo po drodze"** — powinny działać.

---

## 🔒 Bezpieczeństwo klucza TomTom
`NEXT_PUBLIC_TOMTOM_KEY` trafia do bundla klienta (jak MapTiler) — **zrestrykcjonuj go w panelu TomTom**:
domena `*.vercel.app` + Twoja domena produkcyjna, zakres produktów Search + Routing + Traffic, alert limitu.
Dla `TOMTOM_API_KEY` (serwer) możesz użyć osobnego, nierestrykcjonowanego domenowo klucza.
