# CLAUDE.md — E‑Logistic

Zasady pracy nad tym repo (część ekosystemu **GH0ST EMPIRE**). Trzymaj się ich, aby repo
było zawsze spójne, zsynchronizowane i w jednej stylistyce z resztą (np. `E-Bot`).

## Język i styl
- Dokumentacja, changelog i opisy commitów/PR — **po polsku**.
- Motyw wizualny: **czerwień `#E50914` na czerni `#0a0a0a`** (styl Netflix). Bez wyjątków w UI/badge'ach.
- Konwencja nazw repo w ekosystemie: `E-<Nazwa>`.

## Stack (✅ = w kodzie · 🔜 = docelowe; szczegóły w docs/ARCHITECTURE.md)
- ✅ Node 26 · TypeScript 6 (strict) · **pnpm** · **Turborepo** · **Biome** (lint+format, NIE ESLint/Prettier).
- ✅ Web: Next.js 16 · React 19 · Tailwind 4 · własne prymitywy UI. 🔜 shadcn/ui.
- ✅ Mobile: Expo SDK 56 · React Native New Architecture · Expo Router.
- ✅ Backend: Supabase (Postgres 17 + PostGIS · Auth · Realtime · Storage). 🔜 Edge Functions/Deno (dziś rolę pełnią trasy `/api` Next.js/Vercel).
- ✅ Offline: **outbox** (localStorage web / AsyncStorage mobile). 🔜 PowerSync (lokalny SQLite ↔ Supabase).
- ✅ Mapy: MapLibre GL (render) + abstrakcja `RoutingProvider` (adaptery HERE/GraphHopper).
- ✅ Walidacja: Zod (współdzielona web↔mobile w `packages/core`).
- 🔜 Stan: TanStack Query / Zustand (dziś React hooks). 🔜 Obserwowalność: Sentry.

## Wersjonowanie i changelog (KRYTYCZNE — „na bieżąco")
- **SemVer** + numeracja updatów `[#NNN]` (kolejne, bez luk, chronologicznie).
- Każda istotna zmiana = wpis na górze [`CHANGELOG.md`](CHANGELOG.md) w formacie *Keep a Changelog*,
  z linkami do zmienionych plików i sekcją „Bramki".
- Po wydaniu: **tag** `vX.Y.Z` + **GitHub Release** z treścią z changelogu.
- Nagłówek `<!-- SYNC: vX.Y.Z · #NNN · DATA -->` w README aktualizowany razem z wersją.
- Dokumenty muszą być zawsze zgodne z kodem — żadnych rozjazdów ani braków.

## Bramki jakości (przed commitem/PR)
- `biome` czysto (lint + format).
- `tsc` exit 0 (web i mobile).
- Parytet i18n (wszystkie języki mają te same klucze).
- Build przechodzi (web: `next build`, mobile: `expo` typecheck/prebuild wg etapu).
- Migracje Supabase i polityki RLS spójne ze schematem (patrz docs/DATA-MODEL.md).

## Bezpieczeństwo
- Multi-tenant przez RLS — kierowca widzi tylko swoje dane, właściciel tylko swoją firmę.
- **PIN-y kart paliwowych i dane wrażliwe**: szyfrowane (Supabase Vault/pgcrypto). **Ustawia** owner; **odczyt** dla aktywnych członków firmy (kierowca musi znać PIN, by zapłacić w automacie) — każdy odczyt audytowany. Nigdy w logach, nigdy w repo.
- Sekrety wyłącznie w env (`.env.example` jako szablon). `gitleaks`/scan w CI.

## Git
- Praca na branchach (`feat/…`, `fix/…`, `docs/…`), PR do `main`.
- Commity opisowe, powiązane z `[#NNN]`.
- Bramki jakości (sekcja wyżej) muszą być zielone przed PR — nie merguj z czerwonymi bramkami.
