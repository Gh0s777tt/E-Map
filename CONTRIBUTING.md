# Współpraca — E‑Logistic

Dziękujemy za zainteresowanie. Repozytorium jest **własnościowe** (patrz
[`LICENSE`](LICENSE)) i publiczne poglądowo — zewnętrzne wkłady przyjmujemy
wyłącznie po uprzednim uzgodnieniu. Poniższe zasady obowiązują też pracę wewnętrzną.

## Model hostingu

- **GitLab** [`Gh0s777tt/e-logistic`](https://gitlab.com/Gh0s777tt/e-logistic) — **źródło prawdy**: tu trafiają zmiany i całe CI/CD.
- **GitHub** [`Gh0s777tt/E-Map`](https://github.com/Gh0s777tt/E-Map) — publiczny mirror (Actions wyłączone).

## Wymagania

- **Node ≥ 26** (patrz `.nvmrc`), **pnpm 11.5.2** (`corepack enable`).
- Szybki start → [`README`](README.md#-szybki-start).

## Proces

1. Gałąź z `main`: `feat/…`, `fix/…`, `docs/…`, `chore/…`, `ci/…`, `refactor/…`.
2. Zmiany małe i tematyczne. Instaluj hooki: `pnpm install` (lefthook wpina się przez `prepare`).
3. Przed wysłaniem uruchom bramki lokalnie: **`pnpm check`**.
4. **Merge Request do `main`** (nie push bezpośredni). Wymagany zielony pipeline.

## Konwencja commitów

**[Conventional Commits](https://www.conventionalcommits.org/)** — wersjonowanie
i changelog są automatyzowane (`semantic-release`). Typy: `feat`, `fix`, `docs`,
`chore`, `refactor`, `test`, `ci`, `perf`, `build`. Zmiana łamiąca: `feat!:` lub
stopka `BREAKING CHANGE:`. Opisy commitów i MR — **po polsku**.

## Bramki jakości (muszą być zielone)

| Bramka | Komenda |
|:--|:--|
| Lint + format (Biome, **nie** ESLint/Prettier) | `pnpm lint` / `pnpm format` |
| Typy (TypeScript strict) | `pnpm typecheck` |
| Testy | `pnpm test` |
| Spójność dokumentacji z kodem | `pnpm docs:check` |
| Wszystko naraz | `pnpm check` |

## Styl i zasady

- Motyw UI: **czerwień `#E50914` na czerni `#0a0a0a`** (bez wyjątków).
- Dokumentacja i changelog — po polsku; parytet i18n (wszystkie języki = te same klucze).
- Sekrety wyłącznie w env (`.env.example` jako szablon) — nigdy w repo.
- Szczegóły zasad: [`CLAUDE.md`](CLAUDE.md).

Zgłoszenia bezpieczeństwa: [`SECURITY.md`](SECURITY.md). Kodeks: [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
