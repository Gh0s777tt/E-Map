<div align="center">

# 📜 CHANGELOG &nbsp;·&nbsp; E‑LOGISTIC

![Updaty](https://img.shields.io/badge/updaty-2-E50914?style=for-the-badge&labelColor=0a0a0a)
![Wersja](https://img.shields.io/badge/wersja-0.2.0-E50914?style=for-the-badge&labelColor=0a0a0a)

</div>

Format wg [Keep a Changelog](https://keepachangelog.com) + **numeracja updatów** `[#NNN]`.
Wersjonowanie: [SemVer](https://semver.org). Najnowsze na górze.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## [0.2.0] — 🧱 Faza 0: scaffold monorepo, rdzeń rozliczeń, schema RLS, web build

- `[#002]` 🧱 **Fundament kodu E‑Logistic — monorepo gotowe do pracy, web zbudowany, rdzeń przetestowany.**
  - **Monorepo** (Turborepo + pnpm): [`package.json`](package.json), [`pnpm-workspace.yaml`](pnpm-workspace.yaml), [`turbo.json`](turbo.json), [`biome.json`](biome.json), [`tsconfig.base.json`](tsconfig.base.json), [`.env.example`](.env.example), [`.gitattributes`](.gitattributes), [`.nvmrc`](.nvmrc).
  - **`packages/core`** — typy, enumy, schematy Zod (formularze Paliwo/AdBlue/Trip 1:1 ze specyfikacją, walidacja warunkowa per akcja) i **silnik rozliczeń** ([`billing.ts`](packages/core/src/billing.ts): spalanie, koszt po rabacie karty, zysk z trasy). **23 testy** ([`billing.test.ts`](packages/core/src/billing.test.ts), [`schemas.test.ts`](packages/core/src/schemas.test.ts)).
  - **`packages/ui`** — tokeny motywu red/black (`#E50914`/`#0a0a0a`), tryb dzień/noc, generator CSS vars ([`theme.ts`](packages/ui/src/theme.ts)).
  - **`packages/i18n`** — katalogi PL/EN z **parytetem kluczy** wymuszonym typami + test ([`parity.test.ts`](packages/i18n/src/parity.test.ts)).
  - **Supabase** — migracje [`0001_init_schema.sql`](supabase/migrations/0001_init_schema.sql) (PostGIS, enumy, encje, indeksy, triggery) i [`0002_rls.sql`](supabase/migrations/0002_rls.sql) (RLS dla ról owner/spedytor/kierowca/developer, bezpieczny PIN z audytem, `bootstrap_company`). Do wgrania `supabase db push` ([`supabase/README.md`](supabase/README.md)).
  - **`apps/web`** (Next.js 16 · React 19 · Tailwind 4) — szkielet panelu, motyw red/black, wpięte `core`/`ui`/`i18n`. **`next build` ✓**.
  - **`apps/mobile`** (Expo 56 · Expo Router · RN New Arch) — szkielet ekranów współdzielący rdzeń; finalizacja Expo (wersje natywne, Metro, EAS) w `[#003]` ([`apps/mobile/README.md`](apps/mobile/README.md)).
  - **CI/CD** — [`ci.yml`](.github/workflows/ci.yml) (biome, typecheck, testy, build web, gitleaks), [`codeql.yml`](.github/workflows/codeql.yml), [`dependabot.yml`](.github/dependabot.yml).
  - **Bramki:** biome czysto (36 plików) · `tsc` exit 0 (×4) · **25 testów** · `next build` ✓ · parytet i18n PL/EN. Migracje SQL napisane (walidacja na żywej bazie po `supabase link`).

## [0.1.0] — 🧠 Fundament: komplet dokumentacji architektury (do akceptacji)

- `[#001]` 🧠 **Start projektu E‑Logistic — pełna dokumentacja architektury przed pierwszą linią kodu.**
  - **README** [`README.md`](README.md): konwencja GH0ST EMPIRE (SYNC header, badge'y red/black `#E50914`/`#0a0a0a`, tabela modułów, diagram mermaid, stack, docelowa struktura repo).
  - **Architektura** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): monorepo (Turborepo+pnpm), web (Next.js 16) + mobile (Expo) równolegle, współdzielony `packages/core`, offline-first przez **PowerSync ↔ Supabase**, hybrydowa warstwa map (**MapLibre** render + abstrakcja `RoutingProvider` → adaptery **HERE/GraphHopper**), auth (OAuth/passkey/magic-link/2FA), bezpieczeństwo (RLS, szyfrowanie PIN-ów kart).
  - **Model danych** [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md): encje (firmy, użytkownicy, role, pojazdy, karty, formularze Paliwo/AdBlue/Trip, POI, zgłoszenia, stawki), multi-tenant + role Owner/Spedytor/Kierowca/Developer, polityki RLS, model historii edycji formularzy.
  - **Roadmapa** [`docs/ROADMAP.md`](docs/ROADMAP.md): Fazy 0–4 (Fundament → Rdzeń właściciela → Mapa → Społeczność → Premium nawigacja) z kryteriami ukończenia.
  - **Analiza** [`docs/ANALIZA.md`](docs/ANALIZA.md): right-sizing pełnej wizji, co kosztuje (płatne API map), co budujemy sami (zgłoszenia, ceny paliw), kolejność dająca produkt zarobkowy bez drogich API.
  - **CLAUDE.md** [`CLAUDE.md`](CLAUDE.md): zasady pracy w repo (konwencja commitów/changelogu, bramki jakości, stack).
  - **Decyzje wstępne** (od właściciela): start od dokumentacji architektury · strategia mapy = hybryda MapLibre + HERE/GraphHopper · platformy web+mobile równolegle.
  - **Otwarte:** ewentualna zmiana nazwy repo `E-Map` → `E-Logistic`; akceptacja dokumentów przed scaffoldem kodu.
